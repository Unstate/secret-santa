use sqlx::PgPool;

use crate::{parser::ParserRegistry, ws::EventHub};

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub events: EventHub,
    pub parsers: ParserRegistry,
}
