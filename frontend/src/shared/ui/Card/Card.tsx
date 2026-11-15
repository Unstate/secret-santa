import type { HTMLAttributes } from 'react'
import { cx } from '@/shared/lib'
import styles from './Card.module.scss'

export interface CardProps extends HTMLAttributes<HTMLElement> {
  raised?: boolean
}

export function Card({ raised = false, className, children, ...rest }: CardProps) {
  return (
    <section className={cx(styles.card, raised && styles.raised, className)} {...rest}>
      {children}
    </section>
  )
}
