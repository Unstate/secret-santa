import { API_BASE_URL } from './base'
import type { RoomEvent } from './types'

export type RoomSocketStatus = 'connecting' | 'open' | 'reconnecting' | 'closed'

export interface RoomSocketHandlers {
  onEvent: (event: RoomEvent) => void
  onStatusChange: (status: RoomSocketStatus) => void
  onReconnected: () => void
}

const BASE_DELAY_MS = 1000
const MAX_DELAY_MS = 15_000

// Живое соединение комнаты. События — только триггеры перерисовки, истина в
// REST: после каждого reopen вызывается onReconnected, и клиент перечитывает
// GET /rooms/{code} — пропущенные за офлайн-окно события не нужны.
export class RoomSocket {
  private readonly url: string
  private readonly handlers: RoomSocketHandlers
  private socket: WebSocket | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private attempts = 0
  private stopped = false
  private status: RoomSocketStatus = 'closed'

  constructor(roomCode: string, token: string, handlers: RoomSocketHandlers) {
    this.url = buildRoomWsUrl(roomCode, token)
    this.handlers = handlers
  }

  start(): void {
    this.stopped = false
    this.connect()
  }

  stop(): void {
    this.stopped = true
    if (this.reconnectTimer != null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.detachSocket()
    this.setStatus('closed')
  }

  // После сна вкладки или возвращения сети: пересоединиться немедленно,
  // не дожидаясь backoff-таймера. Открытое живое соединение не трогаем.
  reconnectNow(): void {
    if (this.stopped || this.status === 'open') return
    if (this.reconnectTimer != null) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.detachSocket()
    this.connect()
  }

  private connect(): void {
    if (this.stopped) return
    this.setStatus(this.attempts === 0 ? 'connecting' : 'reconnecting')
    const socket = new WebSocket(this.url)
    this.socket = socket
    socket.onopen = () => {
      const reconnected = this.attempts > 0
      this.attempts = 0
      this.setStatus('open')
      if (reconnected) this.handlers.onReconnected()
    }
    socket.onmessage = (message: MessageEvent) => {
      if (typeof message.data !== 'string') return
      let parsed: unknown
      try {
        parsed = JSON.parse(message.data)
      } catch {
        return
      }
      this.handlers.onEvent(parsed as RoomEvent)
    }
    socket.onclose = () => {
      this.socket = null
      if (this.stopped) return
      this.attempts += 1
      this.scheduleReconnect()
    }
    // onerror не обрабатываем: за ним всегда следует onclose
  }

  private scheduleReconnect(): void {
    this.setStatus('reconnecting')
    const delay = reconnectDelay(this.attempts)
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  private detachSocket(): void {
    const socket = this.socket
    this.socket = null
    if (socket == null) return
    socket.onopen = null
    socket.onmessage = null
    socket.onclose = null
    socket.close()
  }

  private setStatus(status: RoomSocketStatus): void {
    this.status = status
    this.handlers.onStatusChange(status)
  }
}

// 1с, 2с, 4с… до 15с, с небольшим джиттером против синхронных ретраев.
function reconnectDelay(attempts: number): number {
  const backoff = Math.min(BASE_DELAY_MS * 2 ** (attempts - 1), MAX_DELAY_MS)
  return backoff + Math.random() * 300
}

function buildRoomWsUrl(roomCode: string, token: string): string {
  const base = /^https?:\/\//.test(API_BASE_URL)
    ? API_BASE_URL.replace(/^http/, 'ws')
    : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}${API_BASE_URL}`
  const url = new URL(`${base}/rooms/${encodeURIComponent(roomCode)}/ws`)
  url.searchParams.set('token', token)
  return url.toString()
}
