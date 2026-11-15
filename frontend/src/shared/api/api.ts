import { ApiClient } from './ApiClient'

export const api = new ApiClient({
  baseUrl: import.meta.env.VITE_API_URL ?? (import.meta.env.DEV ? 'http://localhost:8080/api/v1' : '/api/v1'),
})
