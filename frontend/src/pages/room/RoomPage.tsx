import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import {
  AssignmentsOrderModal,
  MyAssignmentCard,
  PlayerProfileCard,
  RoomExclusionsModal,
  RoomJoinCard,
  RoomSettingsModal,
  RoomShuffleModal,
  WishlistModal,
} from '@/features'
import { useGet, useRoomEvents } from '@/shared/hooks'
import { readSessionToken } from '@/shared/api'
import type { RoomDetails } from '@/shared/api'
import { formatMoney, normalizeRoomCode } from '@/shared/lib'
import {
  ArrowLeftIcon,
  Avatar,
  Badge,
  BanIcon,
  Button,
  Card,
  CopyIcon,
  GearIcon,
  GiftIcon,
  Garland,
  ListIcon,
  ShuffleIcon,
  Snowfall,
  Snowdrift,
  Spinner,
  ThemeToggle,
  useToast,
} from '@/shared/ui'
import styles from './RoomPage.module.scss'

// Всё второстепенное живёт в попапах — на странице только суть.
type ActiveModal = 'wishlist' | 'settings' | 'exclusions' | 'shuffle' | 'order' | null

export function RoomPage() {
  const { code = '' } = useParams()
  const roomCode = normalizeRoomCode(code)
  const { data: room, error, loading, get } = useGet<RoomDetails>(`/rooms/${roomCode}`)
  const sessionToken = readSessionToken(roomCode)
  const [activeModal, setActiveModal] = useState<ActiveModal>(null)
  const [wsTick, setWsTick] = useState(0)
  const close = useCallback(() => setActiveModal(null), [])
  const toast = useToast()

  useEffect(() => {
    void get()
  }, [get])

  // События WS лишь триггерят перечитывание REST — источник истины в нём.
  // Тик нужен компонентам с собственными данными (например, «кому я дарю»).
  const refresh = useCallback(() => {
    setWsTick((tick) => tick + 1)
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
        <Garland />
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
  const shuffled = details.status === 'shuffled'

  return (
    <div className={styles.page}>
      <Garland />
      <Snowfall />
      <Snowdrift />
      {header}
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>{details.name}</h1>
          <p className={styles.subtitle}>
            <Badge tone={shuffled ? 'green' : 'neutral'}>
              {shuffled ? 'шафл проведён' : 'лобби'}
            </Badge>
            бюджет до {formatMoney(details.budget)}
            <span className={styles.code}>{details.code}</span>
          </p>
        </div>

        <div className={styles.column}>
          {/* Плашка «это ты» — сразу видно, под кем ты в комнате */}
          <div className={styles.youPlate}>
            <Avatar id={details.me.avatar} size={44} />
            <span className={styles.youName}>{details.me.name}</span>
            {details.me.isOrganizer && <Badge tone="gold">организатор</Badge>}
            <Badge tone="primary">это ты</Badge>
          </div>

          <Card>
            <div className={styles.playersHead}>
              <h2 className={styles.cardTitle}>Игроки · {details.players.length}</h2>
              <Button variant="soft" size="m" icon={<CopyIcon size={16} />} onClick={copyInvite}>
                Ссылка
              </Button>
            </div>
            <ul className={styles.players}>
              {details.players.map((player) => (
                <li key={player.id} className={styles.player}>
                  <Avatar id={player.avatar} size={40} />
                  <span className={styles.playerName}>{player.name}</span>
                  {player.isOrganizer && <Badge tone="gold">организатор</Badge>}
                  {player.id === details.me.id && <Badge tone="primary">это ты</Badge>}
                </li>
              ))}
            </ul>
          </Card>

          <div className={styles.actions}>
            <Button
              variant="soft"
              icon={<GiftIcon />}
              onClick={() => setActiveModal('wishlist')}
            >
              Мой вишлист
            </Button>
            {details.me.isOrganizer && (
              <>
                <Button
                  variant="soft"
                  icon={<GearIcon />}
                  onClick={() => setActiveModal('settings')}
                >
                  Настройки
                </Button>
                <Button
                  variant="soft"
                  icon={<BanIcon />}
                  onClick={() => setActiveModal('exclusions')}
                >
                  Исключения
                </Button>
                {shuffled && (
                  <Button
                    variant="soft"
                    icon={<ListIcon />}
                    onClick={() => setActiveModal('order')}
                  >
                    Порядок пар
                  </Button>
                )}
                <Button
                  icon={<ShuffleIcon />}
                  onClick={() => setActiveModal('shuffle')}
                >
                  {shuffled ? 'Пересобрать пары' : 'Провести шафл'}
                </Button>
              </>
            )}
          </div>

          {shuffled && <MyAssignmentCard code={details.code} syncTick={wsTick} />}
        </div>
      </main>

      {/* Попапы монтируются только когда открыты — состояние всегда свежее */}
      {activeModal === 'wishlist' && (
        <WishlistModal roomCode={details.code} meId={details.me.id} onClose={close} />
      )}
      {details.me.isOrganizer && (
        <>
          {activeModal === 'settings' && (
            <RoomSettingsModal room={details} onClose={close} onSaved={get} />
          )}
          {activeModal === 'exclusions' && (
            <RoomExclusionsModal
              code={details.code}
              players={details.players}
              readOnly={shuffled}
              onClose={close}
              onSaved={refresh}
            />
          )}
          {shuffled && activeModal === 'order' && (
            <AssignmentsOrderModal code={details.code} onClose={close} />
          )}
          {activeModal === 'shuffle' && (
            <RoomShuffleModal
              code={details.code}
              shuffled={shuffled}
              onClose={close}
              onDone={get}
            />
          )}
        </>
      )}
    </div>
  )
}
