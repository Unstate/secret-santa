//! Шафл и просмотр результатов.
//!
//! Инвариант: полный порядок пар отдаётся только организатору (кнопка-проверка),
//! игрок видит только своего получателя. Пары никогда не уходят по WS.

use std::collections::{BTreeSet, HashMap};

use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use serde::Serialize;
use uuid::Uuid;

use crate::{
    auth::{AuthedPlayer, Organizer},
    db, domain,
    error::ApiError,
    state::AppState,
    ws::RoomEvent,
};

pub async fn shuffle(
    State(state): State<AppState>,
    Path(code): Path<String>,
    organizer: Organizer,
) -> Result<StatusCode, ApiError> {
    let room = db::rooms::find_by_code(&state.db, &code)
        .await?
        .ok_or(ApiError::RoomNotFound)?;
    if organizer.room_id != room.id {
        return Err(ApiError::Forbidden);
    }
    // В лобби шафл всегда доступен; в статусе shuffled — только как ресафл,
    // пока результат никто не открывал (docs/BACKEND.md §7).
    let any_viewed = db::assignments::any_viewed(&state.db, room.id).await?;
    match room.status.as_str() {
        "lobby" => {}
        "shuffled" if !any_viewed => {}
        // Открыли результаты после прошлого шафла — пересобирать нельзя.
        "shuffled" => return Err(ApiError::ReshuffleBlocked),
        _ => return Err(ApiError::WrongStatus),
    }

    let players = db::players::list_by_room(&state.db, room.id).await?;
    let exclusions = db::exclusions::list_by_room(&state.db, room.id).await?;

    let index_by_id: HashMap<Uuid, usize> = players
        .iter()
        .enumerate()
        .map(|(index, player)| (player.id, index))
        .collect();
    let blocked: BTreeSet<(usize, usize)> = exclusions
        .iter()
        .filter_map(|(giver, recipient)| {
            Some((*index_by_id.get(giver)?, *index_by_id.get(recipient)?))
        })
        .collect();
    let names: Vec<&str> = players.iter().map(|player| player.name.as_str()).collect();

    // Блок ограничивает время жизни ThreadRng (!Send): хендлер не должен
    // держать его через await-точки.
    let assignment = {
        let mut rng = rand::rng();
        domain::shuffle::shuffle(&names, &blocked, &mut rng).map_err(ApiError::from)?
    };

    let pairs: Vec<(Uuid, Uuid)> = assignment
        .iter()
        .enumerate()
        .map(|(giver_index, &recipient_index)| {
            (players[giver_index].id, players[recipient_index].id)
        })
        .collect();

    let mut tx = state.db.begin().await?;
    db::assignments::replace_all(&mut tx, room.id, &pairs).await?;
    db::rooms::set_status(&mut *tx, room.id, "shuffled").await?;
    tx.commit().await?;

    state
        .events
        .publish(&room.code, RoomEvent::ShuffleCompleted);
    Ok(StatusCode::NO_CONTENT)
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RecipientDto {
    id: Uuid,
    name: String,
    avatar: i16,
}

fn to_dto(player: db::players::Player) -> RecipientDto {
    RecipientDto {
        id: player.id,
        name: player.name,
        avatar: player.avatar,
    }
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MyAssignmentResponse {
    recipient: RecipientDto,
    wishlist: Vec<db::wishlist::WishlistItem>,
}

/// «Кому я дарю»: свой получатель с его вишлистом. Повторный вызов
/// безопасен — вернёт того же.
pub async fn my_assignment(
    State(state): State<AppState>,
    Path(code): Path<String>,
    player: AuthedPlayer,
) -> Result<Json<MyAssignmentResponse>, ApiError> {
    let room = db::rooms::find_by_code(&state.db, &code)
        .await?
        .ok_or(ApiError::RoomNotFound)?;
    if player.room_id != room.id {
        return Err(ApiError::Forbidden);
    }

    let recipient = db::assignments::find_recipient_of(&state.db, player.id)
        .await?
        .ok_or(ApiError::ShuffleNotReady)?;
    db::assignments::mark_viewed(&state.db, player.id).await?;
    let wishlist = db::wishlist::list_by_player(&state.db, recipient.id).await?;

    Ok(Json(MyAssignmentResponse {
        recipient: to_dto(recipient),
        wishlist,
    }))
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssignmentPair {
    giver: RecipientDto,
    recipient: RecipientDto,
}

/// Полный порядок пар — organizer-only, кнопка-проверка шафла (§4, §11).
pub async fn all_assignments(
    State(state): State<AppState>,
    Path(code): Path<String>,
    organizer: Organizer,
) -> Result<Json<Vec<AssignmentPair>>, ApiError> {
    let room = db::rooms::find_by_code(&state.db, &code)
        .await?
        .ok_or(ApiError::RoomNotFound)?;
    if organizer.room_id != room.id {
        return Err(ApiError::Forbidden);
    }

    let players: HashMap<Uuid, db::players::Player> = db::players::list_by_room(&state.db, room.id)
        .await?
        .into_iter()
        .map(|player| (player.id, player))
        .collect();
    let pairs = db::assignments::list_pairs(&state.db, room.id).await?;

    let mut result = Vec::with_capacity(pairs.len());
    for (giver_id, recipient_id) in pairs {
        let giver = players.get(&giver_id).ok_or_else(|| {
            ApiError::Internal(anyhow::anyhow!("в парах шафла нет игрока {giver_id}"))
        })?;
        let recipient = players.get(&recipient_id).ok_or_else(|| {
            ApiError::Internal(anyhow::anyhow!("в парах шафла нет игрока {recipient_id}"))
        })?;
        result.push(AssignmentPair {
            giver: to_dto(giver.clone()),
            recipient: to_dto(recipient.clone()),
        });
    }

    // Просмотр организатором тоже считается «увиденным» — ресафл после него
    // заблокирован (docs/BACKEND.md §7).
    db::assignments::mark_all_viewed(&state.db, room.id).await?;
    Ok(Json(result))
}
