import { ArrowRightIcon, Button, Card, HashIcon, useToast } from '@/shared/ui'
import { usePost } from '@/shared/hooks'
import { apiErrorText, saveSessionToken } from '@/shared/api'
import type { JoinRequest, JoinResponse } from '@/shared/api'
import { loadPlayerProfile } from '@/features/player-profile/profile'
import styles from './RoomJoinCard.module.scss'

interface RoomJoinCardProps {
  code: string
  onJoined: () => void
}

export function RoomJoinCard({ code, onJoined }: RoomJoinCardProps) {
  const join = usePost<JoinRequest, JoinResponse>(`/rooms/${code}/join`)
  const toast = useToast()

  async function handleSubmit(event: React.SubmitEvent) {
    event.preventDefault()
    const profile = loadPlayerProfile()
    if (profile.name.trim().length === 0) {
      toast.error('Укажи имя в профиле выше')
      return
    }
    const result = await join.post({ name: profile.name.trim(), avatar: profile.avatarId })
    if (result.ok) {
      saveSessionToken(code, result.data.player.token)
      toast.success(`Добро пожаловать, ${result.data.player.name}!`)
      onJoined()
    } else {
      toast.error(apiErrorText(result.error))
    }
  }

  return (
    <Card className={styles.card}>
      <h2 className={styles.title}>
        <HashIcon className={styles.icon} />
        Вход по приглашению
      </h2>
      <p className={styles.text}>
        Тебя позвали в комнату <b>{code}</b>. Заполни профиль рядом и заходи.
      </p>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Button type="submit" variant="soft" icon={<ArrowRightIcon />} block loading={join.loading}>
          Присоединиться
        </Button>
        <p className={styles.hint}>Имя и аватар возьмутся из профиля.</p>
      </form>
    </Card>
  )
}
