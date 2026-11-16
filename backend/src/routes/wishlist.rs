use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{auth::AuthedPlayer, db, error::ApiError, state::AppState, ws::RoomEvent};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddItemRequest {
    title: Option<String>,
    url: Option<String>,
    image_url: Option<String>,
    price: Option<i64>,
}

pub async fn add_item(
    State(state): State<AppState>,
    Path(code): Path<String>,
    player: AuthedPlayer,
    Json(req): Json<AddItemRequest>,
) -> Result<Json<db::wishlist::WishlistItem>, ApiError> {
    let room = db::rooms::find_by_code(&state.db, &code)
        .await?
        .ok_or(ApiError::RoomNotFound)?;
    if player.room_id != room.id {
        return Err(ApiError::Forbidden);
    }

    let title = req
        .title
        .as_deref()
        .map(str::trim)
        .filter(|title| !title.is_empty())
        .map(str::to_owned);
    let image_url = req.image_url.clone();
    let price = req.price;
    if price.is_some_and(|price| price < 0) {
        return Err(ApiError::Validation(
            "цена не может быть отрицательной".into(),
        ));
    }

    let Some(title) = title else {
        return Err(ApiError::Validation("укажите название товара".into()));
    };

    let item = db::wishlist::insert(
        &state.db,
        db::wishlist::NewItem {
            room_id: room.id,
            player_id: player.id,
            title: &title,
            url: req.url.as_deref(),
            image_url: image_url.as_deref(),
            price,
        },
    )
    .await?;

    state.events.publish(
        &room.code,
        RoomEvent::WishlistUpdated {
            player_id: player.id,
        },
    );
    Ok(Json(item))
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PatchItemRequest {
    title: Option<String>,
    url: Option<String>,
    image_url: Option<String>,
    price: Option<i64>,
}

pub async fn patch_item(
    State(state): State<AppState>,
    Path((code, item_id)): Path<(String, Uuid)>,
    player: AuthedPlayer,
    Json(req): Json<PatchItemRequest>,
) -> Result<Json<db::wishlist::WishlistItem>, ApiError> {
    let room = db::rooms::find_by_code(&state.db, &code)
        .await?
        .ok_or(ApiError::RoomNotFound)?;
    if player.room_id != room.id {
        return Err(ApiError::Forbidden);
    }
    let mut item = db::wishlist::find_by_id(&state.db, item_id)
        .await?
        .ok_or(ApiError::ItemNotFound)?;
    // Правит только владелец, и только внутри своей комнаты.
    if item.room_id != room.id || item.player_id != player.id {
        return Err(ApiError::Forbidden);
    }

    if let Some(title) = &req.title {
        let title = title.trim();
        if title.is_empty() {
            return Err(ApiError::Validation("название не может быть пустым".into()));
        }
        item.title = title.to_string();
    }
    if req.url.is_some() {
        item.url = req.url.clone();
    }
    if req.image_url.is_some() {
        item.image_url = req.image_url.clone();
    }
    if let Some(price) = req.price {
        if price < 0 {
            return Err(ApiError::Validation(
                "цена не может быть отрицательной".into(),
            ));
        }
        item.price = Some(price);
    }

    let item = db::wishlist::update(&state.db, &item).await?;
    state.events.publish(
        &room.code,
        RoomEvent::WishlistUpdated {
            player_id: player.id,
        },
    );
    Ok(Json(item))
}

pub async fn delete_item(
    State(state): State<AppState>,
    Path((code, item_id)): Path<(String, Uuid)>,
    player: AuthedPlayer,
) -> Result<StatusCode, ApiError> {
    let room = db::rooms::find_by_code(&state.db, &code)
        .await?
        .ok_or(ApiError::RoomNotFound)?;
    if player.room_id != room.id {
        return Err(ApiError::Forbidden);
    }
    let item = db::wishlist::find_by_id(&state.db, item_id)
        .await?
        .ok_or(ApiError::ItemNotFound)?;
    if item.room_id != room.id || item.player_id != player.id {
        return Err(ApiError::Forbidden);
    }

    db::wishlist::delete(&state.db, item_id).await?;
    state.events.publish(
        &room.code,
        RoomEvent::WishlistUpdated {
            player_id: player.id,
        },
    );
    Ok(StatusCode::NO_CONTENT)
}

pub async fn list_wishlist(
    State(state): State<AppState>,
    Path(code): Path<String>,
    player: AuthedPlayer,
) -> Result<Json<Vec<db::wishlist::WishlistItem>>, ApiError> {
    let room = db::rooms::find_by_code(&state.db, &code)
        .await?
        .ok_or(ApiError::RoomNotFound)?;
    if player.room_id != room.id {
        return Err(ApiError::Forbidden);
    }
    let items = db::wishlist::list_by_room(&state.db, room.id).await?;
    Ok(Json(items))
}
