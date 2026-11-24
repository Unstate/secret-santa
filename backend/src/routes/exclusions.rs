use std::collections::{BTreeSet, HashMap};

use axum::{
    Json,
    extract::{Path, State},
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

use crate::{
    auth::Organizer, db, domain::shuffle::mutual_blocked, domain::validate, error::ApiError,
    state::AppState, ws::RoomEvent,
};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExclusionsRequest {
    exclusions: Vec<ExclusionPair>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExclusionPair {
    player_id: Uuid,
    blocked_recipient_id: Uuid,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SavedExclusion {
    player_id: Uuid,
    blocked_recipient_id: Uuid,
}

pub async fn get_exclusions(
    State(state): State<AppState>,
    Path(code): Path<String>,
    organizer: Organizer,
) -> Result<Json<Vec<SavedExclusion>>, ApiError> {
    let room = db::rooms::find_by_code(&state.db, &code)
        .await?
        .ok_or(ApiError::RoomNotFound)?;
    if organizer.room_id != room.id {
        return Err(ApiError::Forbidden);
    }

    let pairs = db::exclusions::list_by_room(&state.db, room.id).await?;
    let saved = pairs
        .into_iter()
        .map(|(player_id, blocked_recipient_id)| SavedExclusion {
            player_id,
            blocked_recipient_id,
        })
        .collect();
    Ok(Json(saved))
}

pub async fn put_exclusions(
    State(state): State<AppState>,
    Path(code): Path<String>,
    organizer: Organizer,
    Json(req): Json<ExclusionsRequest>,
) -> Result<Json<Vec<SavedExclusion>>, ApiError> {
    let room = db::rooms::find_by_code(&state.db, &code)
        .await?
        .ok_or(ApiError::RoomNotFound)?;
    if organizer.room_id != room.id {
        return Err(ApiError::Forbidden);
    }
    if room.status != "lobby" {
        return Err(ApiError::WrongStatus);
    }

    let players = db::players::list_by_room(&state.db, room.id).await?;
    let index_by_id: HashMap<Uuid, usize> = players
        .iter()
        .enumerate()
        .map(|(index, player)| (player.id, index))
        .collect();

    let mut blocked: BTreeSet<(usize, usize)> = BTreeSet::new();
    for pair in &req.exclusions {
        let giver = *index_by_id.get(&pair.player_id).ok_or_else(|| {
            ApiError::Validation("исключение указывает на игрока не из этой комнаты".into())
        })?;
        let recipient = *index_by_id.get(&pair.blocked_recipient_id).ok_or_else(|| {
            ApiError::Validation("исключение указывает на игрока не из этой комнаты".into())
        })?;
        if giver == recipient {
            return Err(ApiError::Validation(
                "игрок не может быть исключён сам у себя".into(),
            ));
        }
        blocked.insert((giver, recipient));
    }

    let names: Vec<&str> = players.iter().map(|player| player.name.as_str()).collect();
    // Исключения взаимны (см. domain::shuffle) — feasibility проверяем на
    // симметричном множестве, иначе примем набор, который потом не соберётся.
    let mutual = mutual_blocked(&blocked);
    if !validate::perfect_matching_exists(players.len(), &mutual) {
        return Err(ApiError::ShuffleImpossible(
            validate::impossibility_reasons(&names, &mutual),
        ));
    }

    let pairs: Vec<(Uuid, Uuid)> = req
        .exclusions
        .iter()
        .map(|pair| (pair.player_id, pair.blocked_recipient_id))
        .collect();
    let mut tx = state.db.begin().await?;
    db::exclusions::replace_all(&mut tx, room.id, &pairs).await?;
    tx.commit().await?;

    state
        .events
        .publish(&room.code, RoomEvent::ExclusionsUpdated);

    let saved = blocked
        .iter()
        .map(|(giver, recipient)| SavedExclusion {
            player_id: players[*giver].id,
            blocked_recipient_id: players[*recipient].id,
        })
        .collect();
    Ok(Json(saved))
}
