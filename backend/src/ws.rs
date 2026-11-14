//! WebSocket-хаб комнат. События — только триггеры перерисовки:
//! истина всегда в REST, после реконнекта клиент перечитывает состояние.

use std::sync::Arc;

use dashmap::DashMap;
use serde::Serialize;
use tokio::sync::broadcast;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize)]
// rename_all — для имён вариантов, rename_all_fields — для полей:
// клиент ожидает camelCase и в типе события, и в его данных.
#[serde(
    tag = "type",
    rename_all = "camelCase",
    rename_all_fields = "camelCase"
)]
pub enum RoomEvent {
    RoomUpdated {
        name: String,
        budget: i32,
    },
    PlayerJoined {
        player_id: Uuid,
        name: String,
        avatar: i16,
    },
    /// Пока без механизма выхода; появится вместе с киком игрока.
    #[allow(dead_code)]
    PlayerLeft {
        player_id: Uuid,
    },
    /// Рассылается только организатору — фильтрация на этапе отправки.
    ExclusionsUpdated,
    WishlistUpdated {
        player_id: Uuid,
    },
    /// Пары в событии не передаются никогда — только факт завершения шафла.
    ShuffleCompleted,
}

#[derive(Clone, Default)]
pub struct EventHub {
    rooms: Arc<DashMap<String, broadcast::Sender<RoomEvent>>>,
}

impl EventHub {
    pub fn subscribe(&self, room_code: &str) -> broadcast::Receiver<RoomEvent> {
        self.rooms
            .entry(room_code.to_string())
            .or_insert_with(|| broadcast::channel(64).0)
            .subscribe()
    }

    pub fn publish(&self, room_code: &str, event: RoomEvent) {
        if let Some(sender) = self.rooms.get(room_code) {
            let _ = sender.send(event); // нет подписчиков — это нормально
        }
    }
}
