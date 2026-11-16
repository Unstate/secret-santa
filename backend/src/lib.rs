pub mod auth;
pub mod db;
pub mod domain;
pub mod error;
pub mod routes;
pub mod state;
pub mod ws;

use std::time::Duration;

use anyhow::Context;
use axum::{Router, routing::get};
use tower_http::{
    cors::CorsLayer,
    services::{ServeDir, ServeFile},
    trace::TraceLayer,
};

use crate::state::AppState;

pub fn build_router(state: AppState) -> Router {
    let app = Router::new()
        .nest("/api/v1", routes::router())
        .route("/healthz", get(|| async { "ok" }))
        .layer(TraceLayer::new_for_http())
        .layer(if cfg!(debug_assertions) {
            CorsLayer::very_permissive()
        } else {
            CorsLayer::new()
        })
        .with_state(state);

    match std::path::Path::new("dist").exists() {
        true => {
            app.fallback_service(ServeDir::new("dist").fallback(ServeFile::new("dist/index.html")))
        }
        false => app,
    }
}

pub async fn run() -> anyhow::Result<()> {
    let _ = dotenvy::dotenv();

    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| tracing_subscriber::EnvFilter::new("info,tower_http=debug")),
        )
        .init();

    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8080);
    let database_url =
        std::env::var("DATABASE_URL").context("DATABASE_URL не задан (см. .env.example)")?;

    let db = sqlx::postgres::PgPoolOptions::new()
        .max_connections(10)
        .acquire_timeout(Duration::from_secs(5))
        .connect(&database_url)
        .await
        .context("не удалось подключиться к Postgres")?;
    sqlx::migrate!()
        .run(&db)
        .await
        .context("миграции не применились")?;

    let state = AppState {
        db,
        events: ws::EventHub::default(),
    };

    let listener = tokio::net::TcpListener::bind(("0.0.0.0", port)).await?;
    tracing::info!("бекенд слушает :{port}");
    axum::serve(listener, build_router(state))
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("обработчик ctrl_c не должен падать");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("обработчик SIGTERM не должен падать")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}
