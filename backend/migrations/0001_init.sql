-- Начальная схема Тайного Санты.
-- Деньги везде integer в копейках, никаких float.

create table rooms (
    id         uuid primary key default gen_random_uuid(),
    code       varchar(8)  not null unique,          -- код приглашения для ссылки
    name       varchar(64) not null,
    budget     integer     not null,                 -- «до», в копейках
    status     varchar(16) not null default 'lobby', -- lobby | shuffled | closed
    created_at timestamptz not null default now()
);

create table players (
    id           uuid primary key default gen_random_uuid(),
    room_id      uuid not null references rooms(id) on delete cascade,
    name         varchar(32) not null,
    avatar       smallint    not null,                 -- id милой картинки-животного
    is_organizer boolean     not null default false,
    token_hash   char(64)    not null unique,          -- sha256(token), сам токен не храним
    created_at   timestamptz not null default now(),
    last_seen_at timestamptz not null default now()
);

create index players_room_id_idx on players (room_id);

-- «игроку A не может достаться игрок B» => (A, B)
create table exclusions (
    player_id            uuid not null references players(id) on delete cascade,
    blocked_recipient_id uuid not null references players(id) on delete cascade,
    primary key (player_id, blocked_recipient_id),
    check (player_id <> blocked_recipient_id)
);

-- появляется ТОЛЬКО в момент шафла, одной транзакцией
create table assignments (
    room_id      uuid not null references rooms(id) on delete cascade,
    giver_id     uuid not null unique references players(id) on delete cascade,
    recipient_id uuid not null unique references players(id) on delete cascade,
    created_at   timestamptz not null default now(),
    primary key (room_id, giver_id)
);

create table wishlist_items (
    id         uuid primary key default gen_random_uuid(),
    room_id    uuid not null references rooms(id) on delete cascade,
    player_id  uuid not null references players(id) on delete cascade,
    title      varchar(200) not null,
    url        text,
    image_url  text,
    price      bigint,                       -- копейки, как отдал парсер
    in_stock   boolean,                      -- null = неизвестно (ручной ввод)
    source     varchar(16) not null,         -- manual | wildberries | ozon
    position   integer not null default 0,
    created_at timestamptz not null default now()
);

create index wishlist_items_room_player_idx on wishlist_items (room_id, player_id);
