import { useState } from 'react'
import { cx } from '@/shared/lib'
import { MoonIcon, SunIcon } from '../icons/icons'
import styles from './ThemeToggle.module.scss'

type Theme = 'light' | 'dark'

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light',
  )

  function toggle() {
    const next: Theme = theme === 'light' ? 'dark' : 'light'
    document.documentElement.dataset.theme = next
    try {
      localStorage.setItem('santa-theme', next)
    } catch {
    }
    setTheme(next)
  }

  return (
    <button
      type="button"
      className={cx(styles.toggle)}
      onClick={toggle}
      aria-label={theme === 'light' ? 'Включить тёмную тему' : 'Включить светлую тему'}
      title={theme === 'light' ? 'Тёмная тема' : 'Светлая тема'}
    >
      {theme === 'light' ? <MoonIcon /> : <SunIcon />}
    </button>
  )
}
