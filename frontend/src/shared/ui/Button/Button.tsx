import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx } from '@/shared/lib'
import { Spinner } from '../Spinner/Spinner'
import styles from './Button.module.scss'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'soft' | 'ghost' | 'danger'
  size?: 'm' | 'l'
  loading?: boolean
  block?: boolean
  icon?: ReactNode
}

export function Button({
  variant = 'primary',
  size = 'l',
  loading = false,
  block = false,
  icon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled ?? loading}
      className={cx(styles.button, styles[variant], styles[size], block && styles.block, className)}
      {...rest}
    >
      {loading && <Spinner />}
      {icon}
      {children}
    </button>
  )
}
