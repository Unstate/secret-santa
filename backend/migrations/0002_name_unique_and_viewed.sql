-- Имя игрока уникально в рамках комнаты.
create unique index players_room_name_uidx on players (room_id, name);

-- Ресафл запрещён, если результат уже кто-то видел (docs/BACKEND.md §7).
alter table assignments add column viewed_at timestamptz;
