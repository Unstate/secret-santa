import { CreateRoomForm, JoinRoomForm, MyRoomsCard, PlayerProfileCard } from '@/features'
import { useDocumentTitle } from '@/shared/hooks'
import { Snowfall, Snowdrift, ThemeToggle, SnowflakeIcon, Garland } from '@/shared/ui'
import styles from './HomePage.module.scss'

export function HomePage() {
  useDocumentTitle(null)

  return (
    <div className={styles.page}>
      <Garland />
      <Snowfall />
      <Snowdrift />
      <header className={styles.header}>
        <span className={styles.logo}>
          <SnowflakeIcon size={26} className={styles.logoIcon} />
          Тайный Санта
        </span>
        <ThemeToggle />
      </header>
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>Распределите подарки по-честному и в тайне</h1>
          <p className={styles.subtitle}>
            Создайте комнату и позвайте друзей по ссылке. Шафл с исключениями, вишлисты,
            милые звери и снег — всё остальное берём на себя.
          </p>
        </div>
        <div className={styles.cards}>
          <MyRoomsCard className={styles.myRooms} />
          <PlayerProfileCard className={styles.profile} />
          <CreateRoomForm />
          <JoinRoomForm />
        </div>
      </main>
      <footer className={styles.footer}>
        минимум 3 игрока · шафл — организатор · всё в тайне до самого праздника
      </footer>
    </div>
  )
}
