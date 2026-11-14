//! Вишлисты: свои items правит владелец, видны всем в комнате.
//! Провал парсинга никогда не блокирует добавление (docs/BACKEND.md §8).

use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use serde::Deserialize;
use uuid::Uuid;

use crate::{
    auth::AuthedPlayer, db, error::ApiError, parser::Source, state::AppState, ws::RoomEvent,
};

fn source_str(source: Source) -> &'static str {
    match source {
        Source::Manual => "manual",
        Source::Wildberries => "wildberries",
        Source::Ozon => "ozon",
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AddItemRequest {
    /// `manual` по умолчанию; для wb/ozon обязателен `code`.
    source: Option<Source>,
    /// Код товара (артикул) — ссылка генерируется из него.
    code: Option<String>,
    title: Option<String>,
    url: Option<String>,
    image_url: Option<String>,
    /// Копейки.
    price: Option<i64>,
    in_stock: Option<bool>,
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

    let source = req.source.unwrap_or(Source::Manual);
    let product_code: Option<String> = match source {
        Source::Manual => None,
        _ => {
            let trimmed = req.code.as_deref().map(str::trim).unwrap_or("");
            if trimmed.is_empty() {
                return Err(ApiError::Validation(
                    "укажите код товара или выберите ручной ввод".into(),
                ));
            }
            Some(trimmed.to_string())
        }
    };

    let mut title: Option<String> = req
        .title
        .as_deref()
        .map(str::trim)
        .filter(|title| !title.is_empty())
        .map(str::to_owned);
    let mut image_url = req.image_url.clone();
    let mut price = req.price;
    if price.is_some_and(|price| price < 0) {
        return Err(ApiError::Validation(
            "цена не может быть отрицательной".into(),
        ));
    }
    let mut in_stock = req.in_stock;

    // Метаданные — best effort: не получили, значит берём то, что ввёл игрок.
    if let Some(product_code) = &product_code
        && let Ok(info) = state.parsers.parse(source, product_code).await
    {
        title = title.or(info.title);
        image_url = image_url.or(info.image_url);
        price = price.or(info.price);
        in_stock = in_stock.or(info.in_stock);
    }
    let url = match (&source, product_code.as_deref()) {
        (Source::Manual, _) => req.url.clone(),
        (_, Some(product_code)) => req
            .url
            .clone()
            .or_else(|| source.product_link(product_code)),
        (_, None) => req.url.clone(),
    };

    let Some(title) = title else {
        return Err(ApiError::Validation(
            "данные товара получить не удалось — укажите название вручную".into(),
        ));
    };

    let item = db::wishlist::insert(
        &state.db,
        db::wishlist::NewItem {
            room_id: room.id,
            player_id: player.id,
            title: &title,
            url: url.as_deref(),
            image_url: image_url.as_deref(),
            price,
            in_stock,
            source: source_str(source),
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
    /// Копейки.
    price: Option<i64>,
    in_stock: Option<bool>,
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
    if req.in_stock.is_some() {
        item.in_stock = req.in_stock;
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

/// Все вишлисты комнаты одним списком; фронт группирует по playerId.
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
