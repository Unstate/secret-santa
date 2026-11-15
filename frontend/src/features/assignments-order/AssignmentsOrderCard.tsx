import { useState } from 'react'
import { ArrowRightIcon, Avatar, Button, Card, useToast } from '@/shared/ui'
import { useGet } from '@/shared/hooks'
import type { AssignmentPair } from '@/shared/api'
import styles from './AssignmentsOrderCard.module.scss'

interface AssignmentsOrderCardProps {
  code: string
}

// GET /assignments проставляет viewed_at всем парам и навсегда закрывает
// ресафл — поэтому показ подтверждается в два клика.
export function AssignmentsOrderCard({ code }: AssignmentsOrderCardProps) {
  const { get, loading } = useGet<AssignmentPair[]>(`/rooms/${code}/assignments`)
  const [confirming, setConfirming] = useState(false)
  const [pairs, setPairs] = useState<AssignmentPair[] | null>(null)
  const toast = useToast()

  async function show() {
    const result = await get()
    if (result.ok) {
      setPairs([...result.data].sort((a, b) => a.giver.name.localeCompare(b.giver.name, 'ru')))
      setConfirming(false)
    } else {
      toast.error(result.error.message)
    }
  }

  return (
    <Card className={styles.card}>
      <h2 className={styles.title}>Порядок игроков</h2>
      {pairs == null ? (
        <>
          <p className={styles.text}>
            Проверка шафла: увидишь весь порядок пар. Только для тебя — игроки видят лишь своих
            получателей.
          </p>
          {confirming ? (
            <div className={styles.confirm}>
              <p className={styles.confirmText}>
                После показа пересобрать пары уже нельзя — для всех. Показываем?
              </p>
              <div className={styles.confirmButtons}>
                <Button variant="danger" size="m" loading={loading} onClick={show}>
                  Показать, ресафл закрыт
                </Button>
                <Button variant="ghost" size="m" onClick={() => setConfirming(false)}>
                  Отмена
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="soft" block onClick={() => setConfirming(true)}>
              Показать порядок
            </Button>
          )}
        </>
      ) : (
        <>
          <ul className={styles.pairs}>
            {pairs.map((pair) => (
              <li key={pair.giver.id} className={styles.pair}>
                <span className={styles.side}>
                  <Avatar id={pair.giver.avatar} size={26} />
                  <span className={styles.name}>{pair.giver.name}</span>
                </span>
                <ArrowRightIcon size={16} className={styles.arrow} />
                <span className={styles.side}>
                  <Avatar id={pair.recipient.avatar} size={26} />
                  <span className={styles.name}>{pair.recipient.name}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className={styles.closedNote}>Ресафл теперь закрыт — кто-то уже видел порядок.</p>
        </>
      )}
    </Card>
  )
}
