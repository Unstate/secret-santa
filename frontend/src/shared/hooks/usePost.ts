import { useCallback, useState } from 'react'
import { ApiError, api } from '@/shared/api'
import { toApiError } from './request'
import type { RequestResult } from './request'

export function usePost<TBody = void, TResponse = unknown>(path: string) {
  const [data, setData] = useState<TResponse | null>(null)
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(false)

  const post = useCallback(
    async (body: TBody): Promise<RequestResult<TResponse>> => {
      setLoading(true)
      setError(null)
      try {
        const response = await api.post<TResponse>(path, body)
        setData(response)
        return { ok: true, data: response }
      } catch (cause) {
        const apiError = toApiError(cause)
        setError(apiError)
        return { ok: false, error: apiError }
      } finally {
        setLoading(false)
      }
    },
    [path],
  )

  return { data, error, loading, post }
}
