//! Аутентификация: bearer-токен игрока → sha256 → поиск в БД.
//! Extractor'ы axum: `AuthedPlayer` — любой участник комнаты,
//! `Organizer` — только организатор (403 для остальных).

use axum::{
    extract::FromRequestParts,
    http::{header::AUTHORIZATION, request::Parts},
};
use sha2::{Digest, Sha256};

use crate::{db, error::ApiError, state::AppState};

pub fn hash_token(token: &str) -> String {
    hex::encode(Sha256::digest(token.as_bytes()))
}

/// 32 случайных байта в hex; наружу отдаётся один раз, в БД — только sha256.
pub fn generate_token() -> String {
    use rand::RngCore;

    let mut bytes = [0u8; 32];
    rand::rng().fill_bytes(&mut bytes);
    hex::encode(bytes)
}

pub type AuthedPlayer = db::players::Player;

impl FromRequestParts<AppState> for AuthedPlayer {
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let token = parts
            .headers
            .get(AUTHORIZATION)
            .and_then(|value| value.to_str().ok())
            .and_then(|value| value.strip_prefix("Bearer "))
            .ok_or(ApiError::Unauthorized)?;

        let token_hash = hash_token(token);
        db::players::find_by_token_hash(&state.db, &token_hash)
            .await?
            .ok_or(ApiError::Unauthorized)
    }
}

pub struct Organizer(pub AuthedPlayer);

impl std::ops::Deref for Organizer {
    type Target = AuthedPlayer;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl FromRequestParts<AppState> for Organizer {
    type Rejection = ApiError;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &AppState,
    ) -> Result<Self, Self::Rejection> {
        let player = AuthedPlayer::from_request_parts(parts, state).await?;
        if !player.is_organizer {
            return Err(ApiError::NotOrganizer);
        }
        Ok(Organizer(player))
    }
}
