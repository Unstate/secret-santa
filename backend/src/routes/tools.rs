//! Утилиты: превью товара вишлиста по маркетплейсу + коду.

use axum::{Json, extract::State};
use serde::{Deserialize, Serialize};

use crate::{
    auth::AuthedPlayer,
    error::ApiError,
    parser::{ProductInfo, Source},
    state::AppState,
};

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ParseProductRequest {
    source: Source,
    /// Код товара (артикул).
    code: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ParseProductResponse {
    source: Source,
    code: String,
    /// Строится детерминированно — доступна даже без метаданных.
    link: Option<String>,
    title: Option<String>,
    image_url: Option<String>,
    /// Копейки.
    price: Option<i64>,
    in_stock: Option<bool>,
    /// `false` → фронт показывает форму ручного ввода.
    parsed: bool,
}

pub async fn parse_product(
    State(state): State<AppState>,
    _player: AuthedPlayer,
    Json(req): Json<ParseProductRequest>,
) -> Result<Json<ParseProductResponse>, ApiError> {
    let code = req.code.trim().to_string();
    if code.is_empty() {
        return Err(ApiError::Validation("укажите код товара".into()));
    }

    let link = req.source.product_link(&code);
    let (info, parsed) = match state.parsers.parse(req.source, &code).await {
        Ok(info) => (info, true),
        // Незапарсившийся товар не ошибка запроса: отдаём ссылку и пустые поля.
        Err(_) => (
            ProductInfo {
                source: req.source,
                code: code.clone(),
                link: link.clone(),
                title: None,
                image_url: None,
                price: None,
                in_stock: None,
            },
            false,
        ),
    };

    Ok(Json(ParseProductResponse {
        source: info.source,
        code: info.code,
        link: info.link,
        title: info.title,
        image_url: info.image_url,
        price: info.price,
        in_stock: info.in_stock,
        parsed,
    }))
}
