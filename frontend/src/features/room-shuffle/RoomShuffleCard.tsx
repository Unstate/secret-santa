import { useState } from 'react'
import { Button, Card, ShuffleIcon, useToast } from '@/shared/ui'
import { usePost } from '@/shared/hooks'
import styles from './RoomShuffleCard.module.scss'

interface RoomShuffleCardProps {
  code: string
  shuffled: boolean
  onDone: () => void
}

export function RoomShuffleCard({ code, shuffled, onDone }: RoomShuffleCardProps) {
  const shuffle = usePost<void>(`/rooms/${code}/shuffle`)
  const [blocked, setBlocked] = useState(false)
  const toast = useToast()

  async function handleShuffle() {
    const result = await shuffle.post()
    if (result.ok) {
      setBlocked(false)
      toast.success(shuffled ? 'Пары пересобраны' : 'Пары собраны')
      onDone()
    } else if (result.error.code === 'reshuffle_blocked') {
      // не только тост: пусть остаётся в карточке, почему ресафл закрыт
      setBlocked(true)
    } else {
      toast.error(result.error.message)
    }
  }

  return (
    <Card className={styles.card}>
      <h2 className={styles.title}>
        <ShuffleIcon className={styles.icon} />
        {shuffled ? 'Ресафл' : 'Шафл'}
      </h2>
      <p className={styles.text}>
        {blocked
          ? 'Пересобрать пары не выйдет: кто-то уже открыл, кому он дарит.'
          : shuffled
            ? 'Пары уже собраны. Пересобрать можно, пока никто не открыл, кому он дарит.'
            : 'Случайно раздадим, кто кому дарит. После шафла новые игроки войти не смогут — зови всех заранее.'}
      </p>
      <Button
        onClick={handleShuffle}
        icon={<ShuffleIcon />}
        block
        loading={shuffle.loading}
        disabled={blocked}
      >
        {shuffled ? 'Пересобрать пары' : 'Провести шафл'}
      </Button>
    </Card>
  )
}
