import { useParams } from 'react-router'
import { Card } from '@/shared/ui'
import styles from './RoomPage.module.scss'

export function RoomPage() {
  const { code } = useParams<{ code: string }>()
  return (
    <main className={styles.page}>
      <Card>
        <h1 className={styles.title}>Комната {code}</h1>
        <p className={styles.text}>
          Экран комнаты соберём на следующем шаге: сессия в IndexedDB, лобби и WS.
        </p>
      </Card>
    </main>
  )
}
