import { Card } from '@/shared/ui'
import styles from './NotFoundPage.module.scss'

export function NotFoundPage() {
  return (
    <main className={styles.page}>
      <Card>
        <h1 className={styles.title}>404</h1>
        <p className={styles.text}>Такой страницы нет — проверьте код комнаты.</p>
      </Card>
    </main>
  )
}
