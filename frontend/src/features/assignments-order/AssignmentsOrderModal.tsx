import { useEffect } from 'react'
import { ArrowRightIcon, Avatar, Modal, Spinner } from '@/shared/ui'
import { useGet } from '@/shared/hooks'
import type { AssignmentPair } from '@/shared/api'
import styles from './AssignmentsOrderModal.module.scss'

interface AssignmentsOrderModalProps {
  code: string
  onClose: () => void
}

// Ресафл разрешён всегда, так что показываем порядок сразу при открытии
// попапа — без подтверждений.
export function AssignmentsOrderModal({ code, onClose }: AssignmentsOrderModalProps) {
  const { data: pairs, error, loading, get } = useGet<AssignmentPair[]>(`/rooms/${code}/assignments`)

  useEffect(() => {
    void get()
  }, [get])

  const sorted = [...(pairs ?? [])].sort((a, b) =>
    a.giver.name.localeCompare(b.giver.name, 'ru'),
  )

  return (
    <Modal onClose={onClose} title="Порядок игроков">
      <p className={styles.text}>
        Весь порядок пар — только для тебя. После ресафла попап покажет уже новый порядок.
      </p>
      {loading && sorted.length === 0 && <Spinner size={22} />}
      {error != null && !loading && (
        <p className={styles.text}>{error.message} — попробуй открыть ещё раз.</p>
      )}
      {sorted.length > 0 && (
        <ul className={styles.pairs}>
          {sorted.map((pair) => (
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
      )}
    </Modal>
  )
}
