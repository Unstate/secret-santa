# Фронтенд: сборка vite, отдача статики через Caddy.
# Контекст сборки — каталог frontend/ (см. docker-compose.prod.yml).

# --- dependencies: только манифесты, слой кэшируется ---
FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build: только то, что нужно tsc и vite ---
FROM node:24-alpine AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY index.html vite.config.ts tsconfig.json tsconfig.app.json tsconfig.node.json ./
COPY public ./public
COPY src ./src
RUN npm run build

# --- runner: только статика и конфиг Caddy ---
FROM caddy:2-alpine AS runner
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80 443
