use sqlx::PgPool;

use crate::ws::EventHub;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub events: EventHub,
}
