# Бекенд: сборка Rust, минимальный рантайм alpine.
# Стадии: rust-build (кэш зависимостей через фиктивные исходники) → runner.
# Контекст сборки — каталог backend/ (см. docker-compose.prod.yml).

# --- rust-build: сначала зависимости, потом реальный код ---
FROM rust:1-alpine AS rust-build
RUN apk add --no-cache musl-dev
WORKDIR /build
COPY Cargo.toml Cargo.lock ./
# Фиктивные src, чтобы зависимости собрались и закэшировались в слое
RUN mkdir src \
    && printf 'pub fn placeholder() {}\n' > src/lib.rs \
    && printf 'fn main() {}\n' > src/main.rs \
    && cargo build --release
COPY src ./src
COPY migrations ./migrations
RUN touch src/lib.rs src/main.rs && cargo build --release

# --- runner: только бинарник; миграции зашиты внутрь sqlx::migrate!() ---
FROM alpine:3.21 AS runner
RUN apk add --no-cache ca-certificates
COPY --from=rust-build /build/target/release/backend /app/backend
WORKDIR /app
ENV PORT=8080 RUST_LOG=info
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
    CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
ENTRYPOINT ["/app/backend"]
