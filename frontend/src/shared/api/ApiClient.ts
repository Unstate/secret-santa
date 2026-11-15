import type { ApiErrorBody } from './types'

export class ApiError extends Error {
  readonly status: number
  readonly code: string

  constructor(status: number, code: string, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

export interface ApiClientDeps {
  baseUrl: string
  getToken?: (path: string) => string | null
  fetch?: typeof fetch
}

type Json = unknown

export class ApiClient {
  private readonly baseUrl: string
  private readonly getToken: (path: string) => string | null
  private readonly fetchImpl: typeof fetch

  constructor(deps: ApiClientDeps) {
    this.baseUrl = deps.baseUrl.replace(/\/+$/, '')
    this.getToken = deps.getToken ?? (() => null)
    this.fetchImpl = deps.fetch ?? fetch.bind(globalThis)
  }

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers)
    if (init.body != null && !headers.has('content-type')) {
      headers.set('content-type', 'application/json')
    }
    const token = this.getToken(path)
    if (token != null && !headers.has('authorization')) {
      headers.set('authorization', `Bearer ${token}`)
    }

    const response = await this.fetchImpl(this.baseUrl + path, { ...init, headers })

    if (!response.ok) {
      throw await toApiError(response)
    }
    if (response.status === 204) {
      return undefined as T
    }
    return (await response.json()) as T
  }

  get<T>(path: string): Promise<T> {
    return this.request<T>(path)
  }

  post<T>(path: string, body?: Json, headers?: HeadersInit): Promise<T> {
    return this.request<T>(path, { method: 'POST', body: serialize(body), headers })
  }

  put<T>(path: string, body: Json, headers?: HeadersInit): Promise<T> {
    return this.request<T>(path, { method: 'PUT', body: serialize(body), headers })
  }

  patch<T>(path: string, body: Json, headers?: HeadersInit): Promise<T> {
    return this.request<T>(path, { method: 'PATCH', body: serialize(body), headers })
  }

  delete(path: string): Promise<void> {
    return this.request<void>(path, { method: 'DELETE' })
  }
}

function serialize(body: unknown): string | undefined {
  return body === undefined ? undefined : JSON.stringify(body)
}

async function toApiError(response: Response): Promise<ApiError> {
  let body: ApiErrorBody | null = null
  try {
    body = (await response.json()) as ApiErrorBody
  } catch {
  }
  return new ApiError(
    response.status,
    body?.code ?? 'internal',
    body?.message ?? response.statusText,
  )
}
