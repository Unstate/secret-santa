import type { TextareaHTMLAttributes } from 'react'
import { cx } from '@/shared/lib'
import styles from './Textarea.module.scss'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean
}

export function Textarea({ invalid = false, className, ...rest }: TextareaProps) {
  return <textarea className={cx(styles.textarea, invalid && styles.invalid, className)} {...rest} />
}
