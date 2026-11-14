//! Единый формат ошибок API: HTTP-статус + `{"code", "message"}`.
//! Клиент разбирает `code`, человек читает `message`.

use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use serde_json::json;

use crate::domain::shuffle::ShuffleError;

#[derive(Debug, thiserror::Error)]
pub enum ApiError {
    #[error("комната не найдена")]
    RoomNotFound,
    #[error("такое имя в комнате уже занято")]
    NameTaken,
    #[error("доступно только организатору")]
    NotOrganizer,
    #[error("нет доступа")]
    Forbidden,
    #[error("требуется авторизация")]
    Unauthorized,
    #[error("недопустимый статус комнаты")]
    WrongStatus,
    #[error("повторный шафл недоступен: результаты уже кто-то видел")]
    ReshuffleBlocked,
    #[error("шафл невозможен с такими исключениями")]
    ShuffleImpossible(Vec<String>),
    #[error("получатель ещё не определён — шафл не проводился")]
    ShuffleNotReady,
    #[error("товар вишлиста не найден")]
    ItemNotFound,
    #[error("некорректные данные: {0}")]
    Validation(String),
    #[error("ошибка базы данных")]
    Database(#[from] sqlx::Error),
    #[error(transparent)]
    Internal(#[from] anyhow::Error),
}

impl From<ShuffleError> for ApiError {
    fn from(error: ShuffleError) -> Self {
        match error {
            ShuffleError::Impossible(reasons) => ApiError::ShuffleImpossible(reasons),
            ShuffleError::GenerationFailed => ApiError::Internal(anyhow::anyhow!(
                "шафл: генерация не сошлась после проверки разрешимости"
            )),
        }
    }
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        use ApiError::*;

        let (status, code) = match &self {
            RoomNotFound => (StatusCode::NOT_FOUND, "room_not_found"),
            ItemNotFound => (StatusCode::NOT_FOUND, "item_not_found"),
            NameTaken => (StatusCode::CONFLICT, "name_taken"),
            NotOrganizer => (StatusCode::FORBIDDEN, "not_organizer"),
            Forbidden => (StatusCode::FORBIDDEN, "forbidden"),
            Unauthorized => (StatusCode::UNAUTHORIZED, "unauthorized"),
            WrongStatus => (StatusCode::CONFLICT, "wrong_status"),
            ReshuffleBlocked => (StatusCode::CONFLICT, "reshuffle_blocked"),
            ShuffleImpossible(_) => (StatusCode::UNPROCESSABLE_ENTITY, "shuffle_impossible"),
            ShuffleNotReady => (StatusCode::CONFLICT, "shuffle_not_ready"),
            Validation(_) => (StatusCode::UNPROCESSABLE_ENTITY, "validation_failed"),
            Database(_) | Internal(_) => (StatusCode::INTERNAL_SERVER_ERROR, "internal"),
        };

        let message = match &self {
            ShuffleImpossible(reasons) => reasons.join("; "),
            // детали ошибок БД/паник наружу не отдаём
            Database(_) | Internal(_) => "внутренняя ошибка".to_string(),
            other => other.to_string(),
        };

        (status, Json(json!({ "code": code, "message": message }))).into_response()
    }
}
