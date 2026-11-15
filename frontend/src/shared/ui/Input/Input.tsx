import type { InputHTMLAttributes } from 'react'
import { cx } from '@/shared/lib'
import styles from './Input.module.scss'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean
}

export function Input({ invalid = false, className, ...rest }: InputProps) {
  return <input className={cx(styles.input, invalid && styles.invalid, className)} {...rest} />
}
