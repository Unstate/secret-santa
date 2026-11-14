use sqlx::PgPool;

use crate::{parser::ParserRegistry, ws::EventHub};

/// Общее состояние приложения; клонируется в каждый хендлер.
#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    /// WebSocket-хаб: подписки и broadcast событий комнат.
    pub events: EventHub,
    /// Парсеры товаров вишлиста (WB / Ozon), изолированы за трейтом.
    pub parsers: ParserRegistry,
}
