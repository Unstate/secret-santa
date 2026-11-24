import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { ArrowRightIcon, Badge, Card, Spinner } from '@/shared/ui'
import { api, readSessionCodes, removeSessionToken } from '@/shared/api'
import { toApiError } from '@/shared/hooks'
import type { RoomDetails } from '@/shared/api'
import styles from './MyRoomsCard.module.scss'

interface MyRoomsCardProps {
  className?: string
}

// Комнаты, где у игрока есть место (токен в localStorage). Живые данные —
// из GET /rooms/{code}; мёртвые сессии (комната удалена, токен протух)
// подчищаются, чтобы не показывать пустышки.
export function MyRoomsCard({ className }: MyRoomsCardProps) {
  const [codes] = useState(readSessionCodes)
  const [rooms, setRooms] = useState<RoomDetails[] | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    if (codes.length === 0) return
    let cancelled = false
    void (async () => {
      const details = await Promise.all(
        codes.map(async (code) => {
          try {
            return await api.get<RoomDetails>(`/rooms/${code}`)
          } catch (cause) {
            const error = toApiError(cause)
            if (
              error.code === 'unauthorized' ||
              error.code === 'forbidden' ||
              error.code === 'room_not_found'
            ) {
              removeSessionToken(code)
            }
            return null
          }
        }),
      )
      if (!cancelled) setRooms(details.filter((room): room is RoomDetails => room != null))
    })()
    return () => {
      cancelled = true
    }
  }, [codes])

  if (codes.length === 0) return null

  return (
    <Card className={className}>
      <h2 className={styles.title}>Мои комнаты</h2>
      {rooms == null ? (
        <Spinner size={22} />
      ) : rooms.length === 0 ? (
        // Были сессии, но все оказались мёртвыми — карточка больше не нужна.
        null
      ) : (
        <ul className={styles.rooms}>
          {rooms.map((room) => (
            <li key={room.code}>
              <button
                type="button"
                className={styles.room}
                onClick={() => navigate(`/room/${room.code}`)}
              >
                <span className={styles.name}>{room.name}</span>
                <Badge tone={room.status === 'shuffled' ? 'green' : 'neutral'}>
                  {room.status === 'shuffled' ? 'шафл проведён' : 'лобби'}
                </Badge>
                <span className={styles.code}>{room.code}</span>
                <ArrowRightIcon size={16} className={styles.arrow} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
