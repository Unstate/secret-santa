# Тайный Санта: один образ — API (Rust) + статика фронта (dist).
# Стадии: dependencies (node deps) → build (сборка фронта) → rust-build → runner.
# Каждая стадия берёт минимум файлов ради кэша слоёв и минимального образа.

# --- dependencies: зависимости фронта ---
# Пока фронта нет (пустой каталог) — просто пропускаем; когда появится
# pnpm-lock.yaml, заменить COPY на точечные манифесты для кэша слоёв.
FROM node:24-alpine AS dependencies
WORKDIR /app
COPY frontend/ ./
RUN if [ -f package.json ]; then \
        corepack enable pnpm && (pnpm install --frozen-lockfile || pnpm install); \
    fi

# --- build: собираем фронт в dist; без фронта кладём заглушку ---
FROM node:24-alpine AS build
WORKDIR /app
COPY --from=dependencies /app ./
COPY frontend/ ./
RUN if [ -f package.json ]; then \
        corepack enable pnpm && pnpm build; \
    else \
        mkdir -p dist && printf '<!doctype html><title>Тайный Санта</title><p>Фронтенд ещё не собран</p>' > dist/index.html; \
    fi

# --- rust-build: зависимости кэшируются через фиктивные исходники ---
FROM rust:1-alpine AS rust-build
RUN apk add --no-cache musl-dev
WORKDIR /build
COPY backend/Cargo.toml backend/Cargo.lock ./
RUN mkdir src \
    && printf 'pub fn placeholder() {}\n' > src/lib.rs \
    && printf 'fn main() {}\n' > src/main.rs \
    && cargo build --release
COPY backend/src ./src
COPY backend/migrations ./migrations
RUN touch src/lib.rs src/main.rs && cargo build --release

# --- runner: минимальный рантайм ---
FROM alpine:3.21 AS runner
RUN apk add --no-cache ca-certificates
COPY --from=rust-build /build/target/release/backend /app/backend
COPY --from=build /app/dist /app/dist
WORKDIR /app
ENV PORT=8080 RUST_LOG=info
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["/app/backend"]
