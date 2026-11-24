import { cx } from '@/shared/lib'
import styles from './Avatar.module.scss'

const NAMES = [
  'Панда',
  'Лиса',
  'Мишка',
  'Слон',
  'Обезьяна',
  'Коала',
  'Ленивец',
  'Выдра',
  'Черепаха',
  'Ёжик',
  'Лягушка',
  'Пингвин',
  'Ламантин',
  'Нарвал',
  'Косатка',
  'Стегозавр',
  'Ти-рекс',
  'Трицератопс',
  'Диплодок',
  'Динозаврик',
  'Дино в яйце',
  'Аксолотль',
  'Краб',
  'Улитка',
  'Капибара',
  'Чихуахуа',
  'Кролик',
  'Зайчик',
  'Медведь',
  'Обезьянка',
  'Слонёнок',
  'Аксолотлик',
  // 32–47 — из набора OpenMoji (black), CC BY-SA 4.0 — см. public/avatars/LICENSE.md
  'Енот',
  'Белка',
  'Хомяк',
  'Мышка',
  'Лама',
  'Кенгуру',
  'Тигр',
  'Лев',
  'Котик',
  'Собачка',
  'Лошадка',
  'Свинка',
  'Корова',
  'Козлик',
  'Сова',
  'Бобр',
]

const CHIPS = ['#eaf2fb', '#fdeef0', '#e8f6ee', '#fdf6e0', '#efedfb', '#e6f4f8', '#fbeef6', '#f0f5e8']

export interface AvatarProps {
  id: number
  size?: number
  className?: string
}

export function Avatar({ id, size = 52, className }: AvatarProps) {
  return (
    <span
      className={cx(styles.avatar, className)}
      style={{ width: size, height: size, backgroundColor: CHIPS[id % CHIPS.length] }}
      role="img"
      aria-label={NAMES[id] ?? 'Аватар'}
    >
      <img src={`/avatars/${id}.svg`} alt="" loading="lazy" draggable={false} />
    </span>
  )
}

export interface AvatarPickerProps {
  value: number
  onChange: (id: number) => void
  label?: string
}

export function AvatarPicker({ value, onChange, label = 'Аватар' }: AvatarPickerProps) {
  return (
    <div className={styles.picker} role="radiogroup" aria-label={label}>
      {NAMES.map((name, id) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={id === value}
          aria-label={name}
          title={name}
          className={cx(styles.option, id === value && styles.selected)}
          onClick={() => onChange(id)}
        >
          <Avatar id={id} />
        </button>
      ))}
    </div>
  )
}
