import { useEffect, useRef, useState } from 'react'
import { RoomSocket } from '@/shared/api'
import type { RoomEvent, RoomSocketStatus } from '@/shared/api'

interface UseRoomEventsOptions {
  roomCode: string | null
  token: string | null
  onEvent: (event: RoomEvent) => void
  onReconnect?: () => void
}

// WS-события комнаты: подключение живёт, пока жив эффект. Колбэки — через
// ref, чтобы сокет не пересоздавался на каждый рендер; соединение — источник
// триггеров, истина всегда в REST.
export function useRoomEvents({ roomCode, token, onEvent, onReconnect }: UseRoomEventsOptions): RoomSocketStatus {
  const [socketStatus, setSocketStatus] = useState<RoomSocketStatus>('closed')
  const onEventRef = useRef(onEvent)
  const onReconnectRef = useRef(onReconnect)
  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])
  useEffect(() => {
    onReconnectRef.current = onReconnect
  }, [onReconnect])

  const active = roomCode != null && roomCode.length > 0 && token != null
  useEffect(() => {
    if (!active) return
    const socket = new RoomSocket(roomCode, token, {
      onEvent: (event) => onEventRef.current(event),
      onStatusChange: setSocketStatus,
      onReconnected: () => onReconnectRef.current?.(),
    })
    socket.start()
    const wake = () => socket.reconnectNow()
    const wakeIfVisible = () => {
      if (document.visibilityState === 'visible') wake()
    }
    window.addEventListener('online', wake)
    document.addEventListener('visibilitychange', wakeIfVisible)
    return () => {
      window.removeEventListener('online', wake)
      document.removeEventListener('visibilitychange', wakeIfVisible)
      socket.stop()
    }
  }, [roomCode, token, active])

  // Без комнаты/токена сокета нет — статус «закрыто» выводим при рендере.
  return active ? socketStatus : 'closed'
}
