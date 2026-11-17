import { useEffect, useRef, useState } from 'react'
import { Avatar, Button, Card, useToast } from '@/shared/ui'
import { useGet } from '@/shared/hooks'
import { formatMoney } from '@/shared/lib'
import type { MyAssignmentResponse } from '@/shared/api'
import styles from './MyAssignmentCard.module.scss'

interface MyAssignmentCardProps {
  code: string
  // Растёт при каждом событии комнаты (WS) — триггер живой синхронизации.
  syncTick?: number
}

export function MyAssignmentCard({ code, syncTick = 0 }: MyAssignmentCardProps) {
  const { get, loading } = useGet<MyAssignmentResponse>(`/rooms/${code}/me/assignment`)
  const [assignment, setAssignment] = useState<MyAssignmentResponse | null>(null)
  const revealedRef = useRef(false)
  const toast = useToast()

  async function reveal() {
    const result = await get()
    if (result.ok) {
      revealedRef.current = true
      setAssignment(result.data)
    } else {
      toast.error(result.error.message)
    }
  }

  // После открытия карточка живёт: обновил вишлист получатель — увидел сразу;
  // организатор пересобрал пары — появился новый получатель; сбросил шафл —
  // карточка возвращается в закрытое состояние.
  useEffect(() => {
    if (!revealedRef.current) return
    void get().then((result) => {
      if (result.ok) {
        setAssignment(result.data)
      } else if (result.error.code === 'shuffle_not_ready') {
        revealedRef.current = false
        setAssignment(null)
      }
    })
  }, [syncTick, get])

  return (
    <Card className={styles.card}>
      <h2 className={styles.title}>Кому я дарю</h2>
      {assignment == null ? (
        <>
          <p className={styles.text}>
            Узнаешь получателя и его вишлист. Что получатель добавит позже — увидишь здесь сразу.
          </p>
          <Button block loading={loading} onClick={reveal}>
            Открыть, кому я дарю
          </Button>
        </>
      ) : (
        <>
          <div className={styles.recipient}>
            <Avatar id={assignment.recipient.avatar} size={56} />
            <span className={styles.recipientName}>{assignment.recipient.name}</span>
          </div>
          <h3 className={styles.wishlistTitle}>Его вишлист</h3>
          {assignment.comment != null && (
            <p className={styles.comment}>
              <span className={styles.commentLabel}>Комментарий:</span>
              {assignment.comment}
            </p>
          )}
          {assignment.wishlist.length === 0 ? (
            <p className={styles.empty}>Вишлист пустой — выбери подарок на свой вкус.</p>
          ) : (
            <ul className={styles.items}>
              {assignment.wishlist.map((item) => (
                <li key={item.id} className={styles.item}>
                  <span className={styles.itemTitle}>
                    {item.url != null ? (
                      <a href={item.url} target="_blank" rel="noreferrer">
                        {item.title}
                      </a>
                    ) : (
                      item.title
                    )}
                  </span>
                  <span className={styles.itemMeta}>
                    {item.price != null && <span className={styles.price}>{formatMoney(item.price)}</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </Card>
  )
}
