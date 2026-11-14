//! WebSocket комнаты: поток событий `RoomEvent`.
//! Клиент не командует по WS — все мутации через REST;
//! после реконнекта состояние перечитывается из REST (docs/BACKEND.md §6).

use axum::{
    extract::{
        Path, Query, State,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    response::Response,
};
use serde::Deserialize;
use tokio::sync::broadcast;

use crate::{auth, db, error::ApiError, state::AppState, ws::RoomEvent};

#[derive(Debug, Deserialize)]
pub struct WsQuery {
    token: String,
}

pub async fn room_ws(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
    Path(code): Path<String>,
    Query(params): Query<WsQuery>,
) -> Result<Response, ApiError> {
    let room = db::rooms::find_by_code(&state.db, &code)
        .await?
        .ok_or(ApiError::RoomNotFound)?;
    let player = db::players::find_by_token_hash(&state.db, &auth::hash_token(&params.token))
        .await?
        .ok_or(ApiError::Unauthorized)?;
    if player.room_id != room.id {
        return Err(ApiError::Forbidden);
    }

    let events = state.events.subscribe(&room.code);
    let is_organizer = player.is_organizer;

    Ok(ws.on_upgrade(move |socket| handle_socket(socket, events, is_organizer)))
}

async fn handle_socket(
    mut socket: WebSocket,
    mut events: broadcast::Receiver<RoomEvent>,
    is_organizer: bool,
) {
    loop {
        tokio::select! {
            event = events.recv() => {
                let event = match event {
                    Ok(event) => event,
                    Err(broadcast::error::RecvError::Lagged(_)) => continue,
                    Err(_) => break,
                };
                // Исключения видит только организатор (docs/BACKEND.md §4).
                if matches!(event, RoomEvent::ExclusionsUpdated) && !is_organizer {
                    continue;
                }
                let Ok(text) = serde_json::to_string(&event) else {
                    continue;
                };
                if socket.send(Message::Text(text.into())).await.is_err() {
                    break;
                }
            }
            incoming = socket.recv() => {
                // Клиент шлёт что угодно — протокол не командный; соединение
                // живёт, пока жив клиент.
                match incoming {
                    Some(Ok(_)) => {}
                    _ => break,
                }
            }
        }
    }
}
