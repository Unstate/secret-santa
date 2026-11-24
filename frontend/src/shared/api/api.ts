import { ApiClient } from './ApiClient'
import { API_BASE_URL } from './base'
import { readSessionToken } from './session'

export const api = new ApiClient({
  baseUrl: API_BASE_URL,
  // Токен привязан к комнате, код достаём из пути вида /rooms/{code}/…
  getToken: (path) => {
    const match = /^\/rooms\/([^/]+)/.exec(path)
    return match ? readSessionToken(match[1]) : null
  },
})
