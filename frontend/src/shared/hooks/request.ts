import { ApiError } from '@/shared/api'

export type RequestResult<T> = { ok: true; data: T } | { ok: false; error: ApiError }

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  return new ApiError(0, 'network', 'Нет соединения с сервером')
}
