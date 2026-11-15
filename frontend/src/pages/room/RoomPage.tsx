import { useCallback, useEffect } from 'react'
import { Link, useParams } from 'react-router'
import {
  PlayerProfileCard,
  RoomExclusionsCard,
  RoomJoinCard,
  RoomSettingsCard,
  RoomShuffleCard,
} from '@/features'
import { useGet, useRoomEvents } from '@/shared/hooks'
import { readSessionToken } from '@/shared/api'
import type { RoomDetails } from '@/shared/api'
import { formatMoney, normalizeRoomCode } from '@/shared/lib'
import {
  ArrowLeftIcon,
  Avatar,
  Badge,
  Button,
  Card,
  CopyIcon,
  GiftIcon,
  Snowfall,
  Snowdrift,
  Spinner,
  ThemeToggle,
  useToast,
} from '@/shared/ui'
import styles from './RoomPage.module.scss'

export function RoomPage() {
  const { code = '' } = useParams()
  const roomCode = normalizeRoomCode(code)
  const { data: room, error, loading, get } = useGet<RoomDetails>(`/rooms/${roomCode}`)
  const sessionToken = readSessionToken(roomCode)
  const toast = useToast()

  useEffect(() => {
    void get()
  }, [get])

  // События WS лишь триггерят перечитывание REST — источник истины в нём.
  const refresh = useCallback(() => {
    void get()
  }, [get])
  const socketStatus = useRoomEvents({
    roomCode,
    token: sessionToken,
    onEvent: refresh,
    onReconnect: refresh,
  })

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/room/${roomCode}`)
      toast.success('Ссылка скопирована — отправь её друзьям')
    } catch {
      toast.error('Не получилось скопировать — передай код комнаты вручную')
    }
  }

  const header = (
    <header className={styles.header}>
      <Link to="/" className={styles.back}>
        <ArrowLeftIcon size={18} />
        На главную
      </Link>
      <div className={styles.headerRight}>
        {socketStatus === 'reconnecting' && <Badge tone="neutral">переподключаемся…</Badge>}
        <ThemeToggle />
      </div>
    </header>
  )

  if (room == null) {
    return (
      <div className={styles.page}>
        <Snowfall />
        <Snowdrift />
        {header}
        <main className={styles.main}>
          {loading && (
            <div className={styles.center}>
              <Spinner size={28} />
            </div>
          )}
          {(error?.code === 'unauthorized' || error?.code === 'forbidden') && (
            <div className={styles.join}>
              <PlayerProfileCard />
              <RoomJoinCard code={roomCode} onJoined={get} />
            </div>
          )}
          {error != null && error.code !== 'unauthorized' && error.code !== 'forbidden' && (
            <Card className={styles.notice}>
              <h1 className={styles.noticeTitle}>
                {error.code === 'room_not_found' ? 'Комната не найдена' : 'Что-то пошло не так'}
              </h1>
              <p className={styles.noticeText}>{error.message}</p>
              <Link to="/" className={styles.noticeLink}>
                Вернуться на главную
              </Link>
            </Card>
          )}
        </main>
      </div>
    )
  }

  const details = room

  return (
    <div className={styles.page}>
      <Snowfall />
      <Snowdrift />
      {header}
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>{details.name}</h1>
          <p className={styles.subtitle}>
            <Badge tone={details.status === 'shuffled' ? 'green' : 'neutral'}>
              {details.status === 'shuffled' ? 'шафл проведён' : 'лобби'}
            </Badge>
            бюджет до {formatMoney(details.budget)}
            <span className={styles.code}>{details.code}</span>
          </p>
        </div>
        <div className={styles.cards}>
          <Card>
            <h2 className={styles.cardTitle}>
              <GiftIcon className={styles.cardIcon} />
              Приглашение
            </h2>
            <p className={styles.cardText}>
              Отправь друзьям ссылку — откроется сразу форма входа в эту комнату.
            </p>
            <Button variant="soft" icon={<CopyIcon />} block onClick={copyInvite}>
              Скопировать ссылку
            </Button>
          </Card>
          <Card>
            <h2 className={styles.cardTitle}>Игроки · {details.players.length}</h2>
            <ul className={styles.players}>
              {details.players.map((player) => (
                <li key={player.id} className={styles.player}>
                  <Avatar id={player.avatar} size={40} />
                  <span className={styles.playerName}>{player.name}</span>
                  {player.isOrganizer && <Badge tone="gold">организатор</Badge>}
                </li>
              ))}
            </ul>
          </Card>
          {details.me.isOrganizer && <RoomSettingsCard room={details} onSaved={get} />}
          {details.me.isOrganizer && details.status === 'lobby' && (
            <RoomExclusionsCard code={details.code} players={details.players} onSaved={refresh} />
          )}
          {details.me.isOrganizer && (
            <RoomShuffleCard
              code={details.code}
              shuffled={details.status === 'shuffled'}
              onDone={get}
            />
          )}
          {!details.me.isOrganizer && details.status === 'shuffled' && (
            <Card className={styles.notice}>
              <h2 className={styles.cardTitle}>Шафл проведён</h2>
              <p className={styles.cardText}>
                Организатор раздал пары. Экран «кому я дарю» появится здесь на следующем шаге.
              </p>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
