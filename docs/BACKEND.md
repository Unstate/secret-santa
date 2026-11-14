# Тайный Санта — дизайн бекенда (Rust)

Статус: черновик архитектуры. Фронт — FSD (см. общий README), бекенд — Rust, описан здесь.

---

## 1. Вердикт: без бекенда нельзя

В требованиях есть противоречие: «проект без бекенда на IndexedDB» против
«шафл в скрытую», «организатор не видит порядок», «игроки заходят по ссылке».
Почему чистый фронтенд не работает:

1. **IndexedDB локальна для браузера.** Комната живёт на устройстве организатора,
   игроки заходят с других устройств — у каждого свой изолированный IndexedDB.
   Передавать состав комнаты, вишлисты и назначения между устройствами не через что.
2. **Секретность пар требует третьей стороны.** Если шафл выполняется
   на устройстве организатора, пары присутствуют в его памяти и трафике — UI их
   лишь прячет. Серверный шафл держит пары вне клиента; раскрываются они только
   явно — кнопкой-проверкой организатора (§4, §11).
3. **Парсинг WB/Ozon из браузера блокируется CORS.** Запросы к `card.wb.ru` и
   `ozon.ru` из чужого origin запрещены — модуль парсинга обязан жить на бекенде.

**Роль IndexedDB во фронтенде (остаётся, но как кэш):**
- токен игрока (сессия в комнате),
- запомненные имя и аватар,
- снапшот состояния комнаты для мгновенного старта.

Источник истины всегда — сервер; IndexedDB только ускоряет повторный вход.

P2P-альтернатива (WebRTC) всё равно требует signaling-сервер и постоянно
включённый браузер-хост — не рекомендуется.

---

## 2. Стек

| Задача | Выбор |
|---|---|
| HTTP + WebSocket | `axum` (tokio) |
| БД | PostgreSQL + `sqlx` (миграции, compile-time SQL) |
| Middleware / статика | `tower-http` (CORS, trace, `ServeDir`) |
| DTO | `serde`, `serde_json` |
| ID / токены / хэш | `uuid`, `rand`, `sha2` |
| Ошибки | `thiserror` (ApiError), `anyhow` — только в main |
| Парсер | `reqwest` (rustls) + `scraper` |
| Наблюдаемость | `tracing` + `tracing-subscriber` |
| Тесты | `proptest` (шафл), интеграционные REST+WS на живом Postgres (`tokio-tungstenite`) |

PostgreSQL, а не SQLite: всё равно деплоим через docker-compose, два разработчика,
конкурентные WS-обновления. SQLite допустим, если захочется ещё проще
(`features = ["sqlite"]`, файл в volume) — схема не меняется.

rustls вместо openssl — чтобы alpine-образ собирался без возни с musl-openssl.

---

## 3. Схема БД

```sql
create table rooms (
    id          uuid primary key default gen_random_uuid(),
    code        varchar(8)  not null unique,          -- код приглашения для ссылки
    name        varchar(64) not null,
    budget      integer     not null,                 -- «до», в копейках
    status      varchar(16) not null default 'lobby', -- lobby | shuffled | closed
    created_at  timestamptz not null default now()
);

create table players (
    id           uuid primary key default gen_random_uuid(),
    room_id      uuid not null references rooms(id) on delete cascade,
    name         varchar(32) not null,
    avatar       smallint    not null,                 -- id милой картинки-животного
    is_organizer boolean     not null default false,
    token_hash   char(64)    not null unique,          -- sha256(token), сам token не храним
    created_at   timestamptz not null default now(),
    last_seen_at timestamptz not null default now()
);

-- имя уникально в рамках комнаты
create unique index players_room_name_uidx on players (room_id, name);

-- «игроку A не может достаться игрок B» => (A, B)
create table exclusions (
    player_id           uuid not null references players(id) on delete cascade,
    blocked_recipient_id uuid not null references players(id) on delete cascade,
    primary key (player_id, blocked_recipient_id),
    check (player_id <> blocked_recipient_id)
);

-- появляется ТОЛЬКО в момент шафла, одной транзакцией
create table assignments (
    room_id      uuid not null references rooms(id) on delete cascade,
    giver_id     uuid not null unique references players(id) on delete cascade,
    recipient_id uuid not null unique references players(id) on delete cascade,
    viewed_at    timestamptz,                          -- null = результат не открывали
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
```

Деньги — всегда integer в копейках, никаких float.

---

## 4. Матрица видимости (инвариант продукта)

| Данные | Организатор | Игрок |
|---|---|---|
| Состав комнаты, аватары | ✅ | ✅ |
| Бюджет | ✅ (редактирует) | ✅ (видит) |
| Исключения | ✅ (задаёт) | ❌ |
| Вишлисты всех | ✅ | ✅ |
| «Кому я дарю» | как участник: ✅ только свой | ✅ только свой |
| Полный порядок пар | ✅ кнопка-проверка, organizer-only | ❌ |

Полный маппинг `giver→recipient` отдаёт единственный эндпоинт
`GET /rooms/{code}/assignments` и только по токену организатора — осознанное
решение: кнопка «на всякий случай» + проверка работы шафла (§11). Игрокам и
WS-событиям пары недоступны никогда; эндпоинт один — его легко держать
под наблюдением при ревью.

---

## 5. REST API (`/api/v1`)

Аутентификация: `Authorization: Bearer <player_token>`.
Токен — 32 случайных байта в hex, в БД только sha256. Создаётся при join,
хранится у клиента в IndexedDB. Потеря токена = потеря места в комнате.

| Метод | Путь | Кто | Что |
|---|---|---|---|
| POST | `/rooms` | любой | создать комнату `{name, budget}` → `{room, player, token}` (создатель = организатор) |
| GET | `/rooms/{code}` | участник | `{name, budget, status, players[]}` |
| POST | `/rooms/{code}/join` | любой | `{name, avatar}` → `{player, token}` |
| PATCH | `/rooms/{code}` | организатор | имя, бюджет |
| PUT | `/rooms/{code}/exclusions` | организатор | полная замена списка `[{{playerId, blockedRecipientId}}]` + серверная проверка разрешимости |
| POST | `/rooms/{code}/shuffle` | организатор | запуск шафла (см. §7) |
| GET | `/rooms/{code}/assignments` | организатор | полный порядок пар — кнопка-проверка шафла (§4) |
| GET | `/rooms/{code}/me/assignment` | участник | `{recipient: {name, avatar, wishlist[]}}` или 409, если шафла ещё не было |
| GET | `/rooms/{code}/wishlist` | участник | все вишлисты комнаты одним списком |
| POST | `/rooms/{code}/wishlist/items` | участник | добавить item; если передан `url` — сервер парсит |
| PATCH / DELETE | `/rooms/{code}/wishlist/items/{id}` | владелец | правка / удаление |
| POST | `/tools/parse-product` | участник | `{source, code}` → `{link, title?, imageUrl?, price?, inStock?, parsed}` (превью в форме, §8) |
| DELETE | `/rooms/{code}/players/{id}` | организатор | кик (опционально, фаза 2) |
| WS | `/rooms/{code}/ws?token=` | участник | поток событий |

Коды ошибок (единый JSON `{code, message}`): `room_not_found`, `name_taken`,
`not_organizer`, `wrong_status`, `shuffle_impossible`, `shuffle_not_ready`,
`parse_failed`, `forbidden`…

---

## 6. WebSocket

Один WS на комнату. Сервер: `DashMap<code, broadcast::Sender<Event>>` в памяти.

**Клиент → сервер:** только `ping/pong`. Никаких команд — все мутации через REST,
чтобы не плодить второй протокол.

**Сервер → клиент:**
- `room.updated` `{name, budget, status}`
- `player.joined` / `player.left` `{player}`
- `exclusions.updated` — рассылается **только организатору**
- `wishlist.updated` `{playerId, items[]}` — всем (вишлисты публичны внутри комнаты)
- `shuffle.completed` `{}` — всем; пар в событии нет

**Переподключение:** после reconnect клиент перезапрашивает
`GET /rooms/{code}` (+ `me/assignment`). События — лишь триггер перерисовки,
истина всегда в REST. Это снимает вопросы пропущенных событий и офлайн-окон.

---

## 7. Шафл с исключениями (ядро логики)

Чистая функция в `domain/shuffle.rs`, без axum/sqlx — вся тестируемость здесь.

**Модель.** Нужна перестановка-дерэнджмент π:
`π(p) ≠ p` (самому себе не даришь), `π(p) ∉ blocked(p)` (исключения),
π — биекция («один игрок выпадает ровно один раз»).

**Шаг 1 — проверка разрешимости.** Строим двудольный граф «дарители × получатели»
с рёбрами allowed и ищем perfect matching (алгоритм Куна — при n ≤ 100 достаточно).
Нет полного паросочетания → `422 shuffle_impossible` + человеческое объяснение.

Классический неразрешимый пример: 3 игрока A, B, C с блокировками A→B и B→A.
Тогда A и B оба могут дарить только C — невозможно. Лучше поймать это на этапе
сохранения исключений (PUT /exclusions сразу валидирует), чем в момент шафла.

**Шаг 2 — генерация.** Randomized backtracking:
1. перемешать порядок дарителей;
2. каждому дарителю — случайный свободный разрешённый получатель;
3. тупик → откат по дереву; (опционально pruning через проверку Холла на остатке);
4. существование уже доказано matching'ом, значит backtracking гарантированно
   завершается; при n ≤ 100 — мгновенно.

**Шаг 3 — запись.** Одна транзакция: `INSERT assignments` + `rooms.status = 'shuffled'`.
Массив пар никуда не логируем; из API он доступен только организатору (§4).

**Ресафл (реализовано):** поле `viewed_at` в `assignments`. Шафл доступен
в `lobby`; в `shuffled` ресафл разрешён, только пока `viewed_at is null` у всех
пар. Просмотр своего получателя (`me/assignment`) и кнопка-проверка организатора
(`assignments`) проставляют `viewed_at` — после этого ресафл отвечает
`409 reshuffle_blocked`.

---

## 8. Парсер: маркетплейс + артикул (URL не парсим)

Решение (15.11): в форме вишлиста пользователь выбирает радиобатоном
маркетплейс (WB / Ozon) и вставляет **код товара (артикул)**. Ссылка на товар
генерируется на сайте — формат URL известен. Это снимает целый класс проблем
парсинга произвольных ссылок: редиректы, сокращалки, мобильные версии страниц.

- **Wildberries:** `https://www.wildberries.ru/catalog/{код}/detail.aspx`.
  Данные подтягиваем надёжно через публичный card-API:
  `GET https://card.wb.ru/cards/v2/detail?appType=1&curr=rub&dest=-1257786&nm={код}`
  → название, цена (`salePriceU`, копейки), остатки → `in_stock`. Картинка —
  basket-хост, вычисляемый из артикула (диапазоны корзин), fallback `og:image`.
- **Ozon:** `https://www.ozon.ru/product/{код}/`. Данные — best effort через
  og-теги страницы (анти-бот может отдать заглушку). Не получили — игрок вводит
  название вручную; кликабельная ссылка при этом уже сгенерирована.

```rust
#[async_trait]
trait ProductParser: Send + Sync {
    fn source(&self) -> Source;
    async fn parse(&self, code: &str) -> Result<ProductInfo, ParseError>;
}
```

**Реализовано (15.11).** WB: `card.wb.ru/cards/v2` — название, `salePriceU`
(копейки), остатки по размерам → `in_stock`; картинка — basket-хост по формуле
(таблица ранних корзин, дальше шаг 216 волюмов; URL проверяется HEAD-запросом,
пробуются соседи на случай сдвига границ). Ozon: og-теги страницы,
цена из `og:price:amount`, `in_stock` по og не определить — `None`.

**Нюанс:** WB режет запросы по IP (датацентры получают 403) — с таких сетей
метаданные недоступны; ссылка и ручной ввод работают всегда. Финальную
проверку парсера делайте с сети прода/дома.

**Контракт:** `POST /tools/parse-product {source, code}` →
`{source, code, link, title?, imageUrl?, price?, inStock?, parsed}`. Ссылка
строится детерминированно и доступна всегда; метаданные — как повезло
(`parsed: false` → фронт показывает ручной ввод). Провал парсинга никогда
не блокирует создание вишлиста. Парсер — самый хрупкий модуль, поэтому
изолирован за трейтом и не влияет на остальную игру.

---

## 9. Структура backend-кода (под двух разработчиков)

Одна крейта, модули по фичам. Узкие файлы = минимум конфликтов в git.
(Если захочется жёстких границ — вынос `domain` и `parser` в отдельные крейты
workspace, но на старте это лишняя церемония.)

```
backend/src/
  lib.rs            # run(): конфиг, пул, build_router(), graceful shutdown;
                    # статика фронта из dist/ (ServeDir + fallback index.html)
  main.rs           # тонкий bin: backend::run()
  state.rs          # AppState {db, events: ws-hub, parsers}
  error.rs          # ApiError + IntoResponse, единый JSON ошибок
  auth.rs           # extractor'ы Player / Organizer (Bearer → sha256 → lookup)
  ws.rs             # hub: подписки комнат, broadcast, keep-alive
  db/               # sqlx-репозитории по таблицам (rooms.rs, players.rs, ...)
  routes/
    rooms.rs        # create / get / patch / join
    exclusions.rs   # PUT, только Organizer
    shuffle.rs      # POST shuffle, GET me/assignment, GET assignments (organizer)
    wishlist.rs     # CRUD
    tools.rs        # parse-product
    ws.rs           # GET /rooms/{code}/ws: upgrade + фильтрация событий по роли
  domain/
    shuffle.rs      # ЧИСТАЯ shuffle(players, exclusions) -> Vec<(giver, recipient)>
    validate.rs     # проверка разрешимости (matching)
  parser/
    mod.rs          # trait + registry + fallback
    wildberries.rs
    ozon.rs
  migrations/       # sqlx migrate

backend/tests/
  api.rs            # интеграционные (SANTA_TEST_DB): полный цикл комнаты,
                    # вишлист с правами, WS-события на реальном сервере
```

Деление между двумя разработчиками (пример): один — `rooms + ws + shuffle + domain`,
второй — `wishlist + parser + auth + tools`. `domain/` — чистые функции,
на них юнит- и property-тесты: биекция, нет self, нет запрещённых пар, при
отсутствии исключений совпадает с классическим derangement.

---

## 10. Docker / CI / CD (реализовано)

**Один контейнер** (`Dockerfile` в корне): axum раздаёт `/api/v1` + статику
фронта из `dist/` (`ServeDir` + fallback на `index.html` для SPA-роутов).
nginx не нужен.

Стадии Dockerfile:

```
dependencies node:24-alpine — deps фронта (без фронта стадия — no-op)
build        node:24-alpine — pnpm build → dist (или заглушка-страница)
rust-build   rust:1-alpine  — кэш зависимостей через фиктивные lib/main,
                              затем реальная сборка (musl, rustls)
runner       alpine:3.21    — ca-certificates, бинарник, dist/, HEALTHCHECK
```

- Локально: `docker-compose.yml` (только Postgres), приложение — `cargo run`.
- Прод: `docker-compose.prod.yml` (app из GHCR + Postgres с volume и
  healthcheck).
- **ci.yml**: fmt / clippy `-D warnings` / тесты бекенда с сервисом Postgres
  (`SANTA_TEST_DB` — интеграционные гоняются в CI); фронт-джоба включается
  автоматически, когда появится `frontend/package.json`.
- **deploy.yml**: push в `master` → docker build/push в GHCR (теги `latest` и
  sha) → ssh-деплой: `docker compose pull && up -d`. Секреты: `DEPLOY_HOST`,
  `DEPLOY_USER`, `DEPLOY_SSH_KEY`.
- **Husky** — живёт во `frontend/` и настраивается командой фронта (в корне
  репозитория его нет). Бекендовые проверки в любом случае гейтит CI:
  fmt / clippy `-D warnings` / тесты на каждый PR и push в `master`.

---

## 11. Решения и оставшиеся вопросы

**Решено (15.11):**

1. **Кнопка «показать порядок игроков»** — инструмент организатора: проверка
   работы шафла + «на всякий случай». Реализация: `GET /rooms/{code}/assignments`,
   organizer-only (см. §4). Игроки по-прежнему видят только своего получателя;
   пары игроков недоступны никому кроме организатора и никогда не приходят
   по WS.
2. **Бюджет** — одно число «до» (`rooms.budget`, копейки).
3. **Парсер** — радиобатон «WB / Ozon» + артикул; ссылка генерируется из кода,
   данные подтягиваются best effort (§8).
4. **Минимум игроков** — 3.

**Осталось решить:**

- восстановление сессии при потере токена (вишлисты при повторном входе?);
- тайминги: нужен ли дедлайн «шафл закрывается в дату X»;
- чат/комментарии — не планируются?

**Реализовано в бекенде (15.11):** полный REST + WS-роут (§5, §6), шафл
с исключениями, кнопка-проверка организатора, ресафл по правилу §7, вишлисты
с генерацией ссылок из артикула, единые ошибки `{code, message}`. Проверено
смоук-тестом и интеграционными тестами на живом Postgres (полный цикл комнаты,
права, WS-события). Парсеры реализованы: WB через card-API, Ozon через
og-теги (WB может отдавать 403 по IP — fallback на ручной ввод). Крейт
собран как lib + bin: интеграционные тесты из `tests/` дергают его напрямую.
