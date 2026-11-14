# Локальный запуск бекенда (для разработки фронтенда)

Цель: за пару минут поднять API на `http://localhost:8080`, чтобы фронт на
`:5173` мог с ним работать. Полный дизайн API — [BACKEND.md](BACKEND.md),
здесь только практика.

## 1. Что понадобится

| Инструмент | Зачем | Проверка |
|---|---|---|
| Rust stable | собрать и запустить бекенд | `cargo --version` |
| PostgreSQL 17+ | база (любой способ из шага 2) | `psql --version` |
| curl | ручные запросы, сид-скрипт | — |
| python3 | сид-скрипт разбирает ответы | `python3 --version` |
| Node 24 + npm | сам фронт (бекенду не нужен) | `node --version` |

Нет Rust: `curl https://sh.rustup.rs -sSf | sh`.

## 2. Поднять Postgres — любой один способ

### Способ A — Docker (если демон запущен)

Из корня репозитория:

```bash
docker compose up -d db     # база santa/santa на localhost:5432
```

### Способ B — системный PostgreSQL (Ubuntu, есть sudo)

```bash
sudo systemctl enable --now postgresql
sudo -u postgres psql -c "create role santa login password 'santa'"
sudo -u postgres createdb -O santa santa
```

### Способ C — личный кластер без sudo

Postgres не работает под root, но под своим пользователем — пожалуйста.
Кластер живёт в домашней папке, ничего не трогает в системе:

```bash
# бинари лежат в /usr/lib/postgresql/<версия>/bin — посмотрите свою версию
PG=/usr/lib/postgresql/18/bin

mkdir -p ~/.santa-pg
$PG/initdb -D ~/.santa-pg/data -U santa --auth=trust
$PG/pg_ctl -D ~/.santa-pg/data -o "-p 5432 -k $HOME/.santa-pg" \
    -l ~/.santa-pg/postgres.log start
$PG/createdb -h 127.0.0.1 -p 5432 -U santa santa
```

Остановить: `$PG/pg_ctl -D ~/.santa-pg/data stop`, запустить снова — та же
команда `start`. Данные живут в `~/.santa-pg/data`.

## 3. Настроить окружение

```bash
cp .env.example .env        # из корня репозитория
```

По умолчанию: `DATABASE_URL=postgres://santa:santa@localhost:5432/santa`,
`PORT=8080`, `RUST_LOG=info`. Файл ищется в корне, даже если запускаться из
`backend/`.

## 4. Запустить бекенд

```bash
cargo run --manifest-path backend/Cargo.toml
```

Миграции применяются автоматически при старте. Проверка:

```bash
curl http://localhost:8080/healthz    # → ok
```

⚠️ **Для разработки фронта запускайте без `--release`.** CORS для
`localhost:5173` открыт только в debug-сборке (`cfg!(debug_assertions)`).
В release CORS закрыт — это прод-режим «всё с одного origin».

## 5. Нагенерить тестовых данных

```bash
scripts/dev-seed.sh 4
```

Создаст комнату «Дев-комната» (организатор + 3 игрока) и напечатает код и
токены:

```
Комната: K7XJ2M9P
  Оля      avatar=1  организатор  token=2d65…
  Аня      avatar=5  игрок        token=43ff…
  Боря     avatar=10 игрок       token=9593…
  Вера     avatar=15 игрок       token=…
```

Комната в статусе `lobby` — можно сразу играться: добавлять игроков,
исключения, шафл, вишлисты. Все запросы от имени игрока — с заголовком
`Authorization: Bearer <token>`.

## 6. Что нужно знать фронту

- База API: `http://localhost:8080/api/v1`; health: `/healthz`.
- Токен выдаётся **один раз** в ответах `POST /rooms` и `POST .../join` —
  хранить в IndexedDB и слать в `Authorization: Bearer`.
- WebSocket: `ws://localhost:8080/api/v1/rooms/{code}/ws?token=<token>`.
  События — JSON с полем `type`: `roomUpdated`, `playerJoined`,
  `exclusionsUpdated` (только организатору), `wishlistUpdated`,
  `shuffleCompleted`. Пары в событиях не передаются никогда. После
  реконнекта — перечитать `GET /rooms/{code}`.
- Ошибки: любой ненулевой статус → `{"code": "...", "message": "..."}`.
  Коды: `room_not_found`, `name_taken`, `not_organizer`, `forbidden`,
  `unauthorized`, `wrong_status`, `reshuffle_blocked`, `shuffle_impossible`,
  `shuffle_not_ready`, `item_not_found`, `validation_failed`.
- Деньги — целые **копейки** (`budget: 200000` = 2 000 ₽).
- `POST /tools/parse-product` может вернуть `parsed: false` (например, WB
  режет запросы по IP) — показывайте ручной ввод, ссылка в ответе всё равно
  есть.

Шпаргалка эндпоинтов (полные схемы — BACKEND.md §5):

| Что | Запрос |
|---|---|
| создать комнату (создатель = организатор) | `POST /api/v1/rooms` `{name, budget, organizerName, avatar}` |
| войти по коду | `POST /api/v1/rooms/{code}/join` `{name, avatar}` |
| состояние комнаты + игроки | `GET /api/v1/rooms/{code}` |
| настройки комнаты | `PATCH /api/v1/rooms/{code}` `{name?, budget?}` (орг) |
| исключения, полная замена | `PUT /api/v1/rooms/{code}/exclusions` `{exclusions: [{playerId, blockedRecipientId}]}` (орг) |
| шафл / ресафл | `POST /api/v1/rooms/{code}/shuffle` (орг) |
| кому я дарю + вишлист получателя | `GET /api/v1/rooms/{code}/me/assignment` |
| полный порядок пар | `GET /api/v1/rooms/{code}/assignments` (орг) |
| все вишлисты комнаты | `GET /api/v1/rooms/{code}/wishlist` |
| добавить товар | `POST /api/v1/rooms/{code}/wishlist/items` `{source?, code?, title?, url?, imageUrl?, price?, inStock?}` |
| править / удалить свой товар | `PATCH` / `DELETE /api/v1/rooms/{code}/wishlist/items/{id}` |
| превью товара по коду | `POST /api/v1/tools/parse-product` `{source, code}` |

## 7. Сбросить данные

```bash
# личный кластер или системный Postgres:
psql postgres://santa@localhost:5432/postgres \
    -c 'drop database if exists santa;' -c 'create database santa owner santa;'

# docker:
docker compose down -v && docker compose up -d db
```

Миграции накатятся заново при следующем старте бекенда.

## 8. Если что-то не поднимается

| Симптом | Причина / лечение |
|---|---|
| `DATABASE_URL не задан` | нет `.env` в корне — шаг 3 |
| `не удалось подключиться к Postgres` | БД не запущена или другой порт: `pg_isready -h 127.0.0.1 -p 5432` |
| `address already in use` на 8080 | `PORT=8081 cargo run --manifest-path backend/Cargo.toml` |
| фронт ловит ошибку CORS | бекенд запущен с `--release` — перезапустите обычным `cargo run` |
| `relation "rooms" does not exist` | база старая или пустая без миграций — пересоздайте (шаг 7) |
| `create role` уже существует (способ B) | это ок, пропускайте и переходите к `createdb` |
| интеграционные тесты пропускаются | им нужна отдельная база: `SANTA_TEST_DB=...` — см. README |
