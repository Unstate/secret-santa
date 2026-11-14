# Тайный Санта

Веб-приложение для распределения подарков: комната по ссылке-приглашению, шафл
с исключениями в скрытую, вишлисты с Wildberries/Ozon, милые животные и снег.

- `backend/` — API на Rust: axum + sqlx (PostgreSQL) + WebSocket. Дизайн —
  [docs/BACKEND.md](docs/BACKEND.md).
- `frontend/` — фронтенд (FSD: app / features / widgets / shared).
- `docs/` — дизайн-документы.

## Локальная разработка

Нужны: Rust stable, Node 24 + pnpm, PostgreSQL 17+.

Пошаговая инструкция для разработки фронтенда (три способа поднять Postgres,
тестовые данные, шпаргалка по API) —
[docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md). Коротко:

```bash
docker compose up -d db                          # или свой Postgres
cp .env.example .env
cargo run --manifest-path backend/Cargo.toml     # API на :8080, миграции — автоматически
pnpm install && pnpm --dir frontend dev          # фронт на :5173
scripts/dev-seed.sh 4                            # тестовая комната + токены игроков
```

## Тесты

```bash
# unit + property-тесты шафла
cargo test --manifest-path backend/Cargo.toml

# + интеграционные (REST-сценарии и WebSocket на живом Postgres)
SANTA_TEST_DB=postgres://santa:santa@localhost:5432/santa \
  cargo test --manifest-path backend/Cargo.toml
```

## Хуки git (husky)

После `git init` и `pnpm install` в корне включаются хуки:

- `pre-commit` — быстрое: `cargo fmt --check`, `cargo clippy -D warnings`,
  typecheck фронта;
- `pre-push` — полная проверка: `cargo test` + сборка фронта
  (упавший билд не уедет в master).

## CI/CD (GitHub Actions)

- **ci.yml** — на PR и push в `master`: fmt/clippy/тесты бекенда (интеграционные
  идут против сервиса Postgres) + сборка фронта, когда он появится.
- **deploy.yml** — на push в `master`: сборка образа (стадии `dependencies` →
  `build` → `rust-build` → `runner` на node:24-alpine/rust/alpine) → GHCR →
  ssh-деплой: `docker compose pull && docker compose up -d`.

Настройка деплоя:

1. секреты репозитория: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`;
2. на сервере в `/opt/secret-santa` — `docker-compose.prod.yml` с вашим
   `image: ghcr.io/<owner>/<repo>:latest`;
3. `docker login ghcr.io` на сервере (или public package в GHCR).
