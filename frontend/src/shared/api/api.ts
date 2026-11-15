import { ApiClient } from './ApiClient'
import { readSessionToken } from './session'

export const api = new ApiClient({
  baseUrl: import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8080/api/v1' : '/api/v1'),
  // Токен привязан к комнате, код достаём из пути вида /rooms/{code}/…
  getToken: (path) => {
    const match = /^\/rooms\/([^/]+)/.exec(path)
    return match ? readSessionToken(match[1]) : null
  },
})
