import { useState } from 'react'
import { Button, Modal, ShuffleIcon, useToast } from '@/shared/ui'
import { usePost } from '@/shared/hooks'
import { apiErrorText } from '@/shared/api'
import styles from './RoomShuffleModal.module.scss'

interface RoomShuffleModalProps {
  code: string
  shuffled: boolean
  onClose: () => void
  onDone: () => void
}

export function RoomShuffleModal({ code, shuffled, onClose, onDone }: RoomShuffleModalProps) {
  const shuffle = usePost<void>(`/rooms/${code}/shuffle`)
  const reset = usePost<void>(`/rooms/${code}/reset`)
  const [confirmingReset, setConfirmingReset] = useState(false)
  const toast = useToast()

  async function handleShuffle() {
    const result = await shuffle.post()
    if (result.ok) {
      toast.success(shuffled ? 'Пары пересобраны' : 'Пары собраны')
      onDone()
      onClose()
    } else {
      toast.error(apiErrorText(result.error))
    }
  }

  // Ошибся составом или исключениями — сброс в лобби вместо пересоздания
  // комнаты: пары удаляются, вишлисты и исключения остаются.
  async function handleReset() {
    const result = await reset.post()
    if (result.ok) {
      toast.success('Шафл сброшен — комната вернулась в лобби')
      onDone()
      onClose()
    } else {
      toast.error(apiErrorText(result.error))
    }
  }

  return (
    <Modal onClose={onClose} title={shuffled ? 'Ресафл' : 'Шафл'}>
      {confirmingReset ? (
        <>
          <p className={styles.text}>
            Пары удалятся, комната вернётся в лобби. Вишлисты и исключения останутся, вход по
            ссылке снова откроется. У тех, кто открыл «Кому я дарю», результат сбросится.
          </p>
          <div className={styles.resetButtons}>
            <Button variant="danger" block loading={reset.loading} onClick={handleReset}>
              Сбросить шафл
            </Button>
            <Button variant="ghost" size="m" onClick={() => setConfirmingReset(false)}>
              Отмена
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className={styles.text}>
            {shuffled
              ? 'Пары уже собраны. Пересобрать можно в любой момент — у тех, кто открыл результат, при следующем чтении появится новый получатель.'
              : 'Случайно раздадим, кто кому дарит. После шафла новые игроки войти не смогут — зови всех заранее.'}
          </p>
          <Button onClick={handleShuffle} icon={<ShuffleIcon />} block loading={shuffle.loading}>
            {shuffled ? 'Пересобрать пары' : 'Провести шафл'}
          </Button>
          {shuffled && (
            <Button
              variant="ghost"
              size="m"
              block
              onClick={() => setConfirmingReset(true)}
            >
              Сбросить шафл в лобби
            </Button>
          )}
        </>
      )}
    </Modal>
  )
}
