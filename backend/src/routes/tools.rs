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
    code: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ParseProductResponse {
    source: Source,
    code: String,
    link: Option<String>,
    title: Option<String>,
    image_url: Option<String>,
    price: Option<i64>,
    in_stock: Option<bool>,
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
