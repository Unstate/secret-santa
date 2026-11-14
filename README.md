# Тайный Санта

Веб-приложение для распределения подарков: комната по ссылке-приглашению, шафл
с исключениями в скрытую, вишлисты с Wildberries/Ozon, милые животные и снег.

- `backend/` — API на Rust: axum + sqlx (PostgreSQL) + WebSocket. Дизайн —
  [docs/BACKEND.md](docs/BACKEND.md).
- `frontend/` — фронтенд (FSD: app / features / widgets / shared).
- `docs/` — дизайн-документы.

## Структура репозитория

- `backend/`, `frontend/` — код приложения (в каждой папке свой многостадийный
  `Dockerfile`)
- `docs/` — дизайн-документы: [BACKEND.md](docs/BACKEND.md) (архитектура API),
  [LOCAL_SETUP.md](docs/LOCAL_SETUP.md) (подъём бекенда для фронта),
  [TODO.md](docs/TODO.md) (что осталось), [BUGS.md](docs/BUGS.md) (грабли)
- `docker-compose.yml` — дев-Postgres; `docker-compose.prod.yml` — прод
  (frontend-Caddy с авто-HTTPS + backend + Postgres, без автозапуска при перезагрузке)
- `.github/workflows/` — CI (fmt/clippy/test) и авто-деплой из master
- `scripts/dev-seed.sh` — тестовая комната с токенами для разработки фронта
- `.env.example` — шаблон переменных окружения (реальный `.env` в git не ходит)

## Локальная разработка

Нужны: Rust stable, Node 24 + npm, PostgreSQL 17+.

Пошаговая инструкция для разработки фронтенда (три способа поднять Postgres,
тестовые данные, шпаргалка по API) —
[docs/LOCAL_SETUP.md](docs/LOCAL_SETUP.md). Коротко:

```bash
docker compose up -d db                          # или свой Postgres
cp .env.example .env
cargo run --manifest-path backend/Cargo.toml     # API на :8080, миграции — автоматически
npm --prefix frontend install && npm --prefix frontend run dev   # фронт на :5173
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

## CI/CD (GitHub Actions)

- **ci.yml** — на PR и push в `master`: fmt/clippy/тесты бекенда (интеграционные
  идут против сервиса Postgres) + сборка фронта, когда он появится.
- **deploy.yml** — на push в `master`: сборка двух образов (`backend/Dockerfile`
  и `frontend/Dockerfile`) → GHCR (`<repo>-backend`, `<repo>-frontend`) →
  ssh-деплой: `docker compose pull && docker compose up -d`.

Настройка деплоя:

1. секреты репозитория: `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`;
2. на сервере в `/opt/secret-santa` — `docker-compose.prod.yml` с вашим
   `image: ghcr.io/<owner>/<repo>-…:latest` и файл `.env` со строкой
   `DOMAIN=ваш-домен` (домен — с A-записью на IP сервера);
3. на сервере открыты порты 80/443 — Caddy сам получит сертификат Let's Encrypt;
4. `docker login ghcr.io` на сервере (или public package в GHCR); без GHCR
   образы соберутся на сервере сами при первом `docker compose up -d`.
