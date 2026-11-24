import { useCallback, useState } from 'react'
import { ApiError, api } from '@/shared/api'
import { toApiError } from './request'
import type { RequestResult } from './request'

// В отличие от остальных хуков путь приходит в вызов: DELETE почти всегда
// адресует конкретный подресурс (…/items/{id}), известный только в момент клика.
export function useDelete() {
  const [error, setError] = useState<ApiError | null>(null)
  const [loading, setLoading] = useState(false)

  const del = useCallback(async (path: string): Promise<RequestResult<undefined>> => {
    setLoading(true)
    setError(null)
    try {
      await api.delete(path)
      return { ok: true, data: undefined }
    } catch (cause) {
      const apiError = toApiError(cause)
      setError(apiError)
      return { ok: false, error: apiError }
    } finally {
      setLoading(false)
    }
  }, [])

  return { error, loading, del }
}
