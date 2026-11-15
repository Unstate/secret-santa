//! Комнаты: создание, просмотр, настройки, вход по коду.

use axum::{
    Json,
    extract::{Path, State},
};
use serde::{Deserialize, Serialize};

use crate::{
    auth::{self, AuthedPlayer, Organizer},
    db,
    error::ApiError,
    state::AppState,
    ws::RoomEvent,
};

/// Каталог милых животных на фронте: id от 0 до 31.
const MAX_AVATAR_ID: i16 = 31;

fn validate_name(name: &str, max_chars: usize) -> Result<String, ApiError> {
    let name = name.trim();
    if name.is_empty() || name.chars().count() > max_chars {
        return Err(ApiError::Validation(format!(
            "имя должно быть от 1 до {max_chars} символов"
        )));
    }
    Ok(name.to_string())
}

fn validate_budget(budget: i64) -> Result<i32, ApiError> {
    // Бюджет «до», в копейках: i32 хватает с запасом (≈21 млн ₽).
    if !(0..=i32::MAX as i64).contains(&budget) {
        return Err(ApiError::Validation(
            "бюджет — неотрицательное число копеек".into(),
        ));
    }
    Ok(budget as i32)
}

fn validate_avatar(avatar: i16) -> Result<(), ApiError> {
    if !(0..=MAX_AVATAR_ID).contains(&avatar) {
        return Err(ApiError::Validation(
            "аватар — id милого животного из каталога".into(),
        ));
    }
    Ok(())
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRoomRequest {
    /// Название комнаты.
    name: String,
    /// Бюджет «до», копейки.
    budget: i64,
    organizer_name: String,
    avatar: i16,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerWithToken {
    #[serde(flatten)]
    player: db::players::Player,
    /// Показывается один раз; клиент хранит его в localStorage.
    token: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRoomResponse {
    room: db::rooms::Room,
    player: PlayerWithToken,
}

pub async fn create_room(
    State(state): State<AppState>,
    Json(req): Json<CreateRoomRequest>,
) -> Result<Json<CreateRoomResponse>, ApiError> {
    let name = validate_name(&req.name, 64)?;
    let organizer_name = validate_name(&req.organizer_name, 32)?;
    validate_avatar(req.avatar)?;
    let budget = validate_budget(req.budget)?;

    let token = auth::generate_token();
    let mut tx = state.db.begin().await?;
    let room = db::rooms::insert(&mut tx, &name, budget).await?;
    let organizer = db::players::insert(
        // generic-параметру нужна явная deref-коэрция (&mut Transaction не Executor)
        &mut *tx,
        room.id,
        &organizer_name,
        req.avatar,
        true,
        &auth::hash_token(&token),
    )
    .await?;
    tx.commit().await?;

    Ok(Json(CreateRoomResponse {
        room,
        player: PlayerWithToken {
            player: organizer,
            token,
        },
    }))
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RoomDetails {
    #[serde(flatten)]
    room: db::rooms::Room,
    players: Vec<db::players::Player>,
    /// Тот, кто спросил: по нему фронт отличает организатора от гостя.
    me: db::players::Player,
}

pub async fn get_room(
    State(state): State<AppState>,
    Path(code): Path<String>,
    player: AuthedPlayer,
) -> Result<Json<RoomDetails>, ApiError> {
    let room = db::rooms::find_by_code(&state.db, &code)
        .await?
        .ok_or(ApiError::RoomNotFound)?;
    if player.room_id != room.id {
        return Err(ApiError::Forbidden);
    }
    let players = db::players::list_by_room(&state.db, room.id).await?;
    Ok(Json(RoomDetails {
        room,
        players,
        me: player,
    }))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JoinRequest {
    name: String,
    avatar: i16,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct JoinResponse {
    player: PlayerWithToken,
}

pub async fn join(
    State(state): State<AppState>,
    Path(code): Path<String>,
    Json(req): Json<JoinRequest>,
) -> Result<Json<JoinResponse>, ApiError> {
    let name = validate_name(&req.name, 32)?;
    validate_avatar(req.avatar)?;

    let room = db::rooms::find_by_code(&state.db, &code)
        .await?
        .ok_or(ApiError::RoomNotFound)?;
    // После шафла состав менять нельзя: у новых игроков не было бы пары.
    if room.status != "lobby" {
        return Err(ApiError::WrongStatus);
    }
    if db::players::find_by_name_in_room(&state.db, room.id, &name)
        .await?
        .is_some()
    {
        return Err(ApiError::NameTaken);
    }

    let token = auth::generate_token();
    let player = db::players::insert(
        &state.db,
        room.id,
        &name,
        req.avatar,
        false,
        &auth::hash_token(&token),
    )
    .await?;

    state.events.publish(
        &room.code,
        RoomEvent::PlayerJoined {
            player_id: player.id,
            name: player.name.clone(),
            avatar: player.avatar,
        },
    );

    Ok(Json(JoinResponse {
        player: PlayerWithToken { player, token },
    }))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PatchRoomRequest {
    name: Option<String>,
    budget: Option<i64>,
}

pub async fn patch_room(
    State(state): State<AppState>,
    Path(code): Path<String>,
    organizer: Organizer,
    Json(req): Json<PatchRoomRequest>,
) -> Result<Json<db::rooms::Room>, ApiError> {
    let room = db::rooms::find_by_code(&state.db, &code)
        .await?
        .ok_or(ApiError::RoomNotFound)?;
    if organizer.room_id != room.id {
        return Err(ApiError::Forbidden);
    }

    let name = match &req.name {
        Some(name) => validate_name(name, 64)?,
        None => room.name.clone(),
    };
    let budget = match req.budget {
        Some(budget) => validate_budget(budget)?,
        None => room.budget,
    };

    let room = db::rooms::update_settings(&state.db, room.id, &name, budget).await?;
    state.events.publish(
        &room.code,
        RoomEvent::RoomUpdated {
            name: room.name.clone(),
            budget: room.budget,
        },
    );
    Ok(Json(room))
}
