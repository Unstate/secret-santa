import type { ReactNode } from 'react'
import { cx } from '@/shared/lib'
import styles from './Field.module.scss'

export interface FieldProps {
  label: string
  children: ReactNode
  hint?: string
  error?: string
  className?: string
}

export function Field({ label, children, hint, error, className }: FieldProps) {
  return (
    <label className={cx(styles.field, className)}>
      <span className={styles.label}>{label}</span>
      {children}
      {error ? (
        <span className={styles.error} role="alert">
          {error}
        </span>
      ) : (
        hint && <span className={styles.hint}>{hint}</span>
      )}
    </label>
  )
}
