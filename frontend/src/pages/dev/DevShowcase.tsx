import { Avatar, Badge, Button, Card, Field, Input, Snowfall, ThemeToggle } from '@/shared/ui'
import styles from './DevShowcase.module.scss'

export function DevShowcase() {
  return (
    <div className={styles.page}>
      <Snowfall />
      <header className={styles.header}>
        <h1>Витрина UI-кита</h1>
        <ThemeToggle />
      </header>

      <main className={styles.content}>
        <Card>
          <h2>Кнопки</h2>
          <div className={styles.row}>
            <Button>Создать комнату</Button>
            <Button variant="soft">Мягкая</Button>
            <Button variant="ghost">Прозрачная</Button>
            <Button variant="danger" size="m">
              Удалить
            </Button>
            <Button loading size="m">
              С спиннером
            </Button>
          </div>
        </Card>

        <Card>
          <h2>Поля</h2>
          <div className={styles.fields}>
            <Field label="Имя" hint="Не длиннее 32 символов">
              <Input placeholder="Оля" />
            </Field>
            <Field label="Имя" error="Введите имя">
              <Input invalid placeholder="" />
            </Field>
          </div>
        </Card>

        <Card>
          <h2>Бейджи</h2>
          <div className={styles.row}>
            <Badge>организатор</Badge>
            <Badge tone="accent">секрет</Badge>
            <Badge tone="green">готово</Badge>
            <Badge tone="gold">новый год</Badge>
            <Badge tone="neutral">черновик</Badge>
          </div>
        </Card>

        <Card>
          <h2>32 аватарки</h2>
          <div className={styles.avatars}>
            {Array.from({ length: 32 }, (_, id) => (
              <figure key={id} className={styles.cell}>
                <Avatar id={id} size={72} />
                <figcaption>{id}</figcaption>
              </figure>
            ))}
          </div>
        </Card>
      </main>
    </div>
  )
}
