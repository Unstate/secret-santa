import type { HTMLAttributes } from 'react'
import { cx } from '@/shared/lib'
import styles from './Badge.module.scss'

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: 'primary' | 'accent' | 'green' | 'gold' | 'neutral'
}

export function Badge({ tone = 'primary', className, children, ...rest }: BadgeProps) {
  return (
    <span className={cx(styles.badge, styles[tone], className)} {...rest}>
      {children}
    </span>
  )
}
