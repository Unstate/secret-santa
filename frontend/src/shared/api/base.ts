// Единая база для HTTP- и WS-клиентов: VITE_API_URL, в dev — бекенд на :8080,
// в проде — тот же origin (Caddy проксирует /api).
export const API_BASE_URL = (
  import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8080/api/v1' : '/api/v1')
).replace(/\/+$/, '')
