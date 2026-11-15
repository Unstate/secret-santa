import { useCallback, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { cx } from '@/shared/lib/cx'
import { ToastContext } from './context'
import type { ToastApi, ToastTone } from './context'
import styles from './Toast.module.scss'

const LIFETIME_MS = 5000

interface Toast {
  id: number
  message: string
  tone: ToastTone
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current++
      setToasts((current) => [...current, { id, message, tone }])
      window.setTimeout(() => dismiss(id), LIFETIME_MS)
    },
    [dismiss],
  )

  const api = useMemo<ToastApi>(
    () => ({
      error: (message) => push('error', message),
      success: (message) => push('success', message),
    }),
    [push],
  )

  return (
    <ToastContext value={api}>
      {children}
      <div className={styles.list} aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={cx(styles.toast, styles[toast.tone])} role="status">
            <span className={styles.message}>{toast.message}</span>
            <button
              type="button"
              className={styles.close}
              onClick={() => dismiss(toast.id)}
              aria-label="Закрыть уведомление"
            >
              ×
            </button>
            <span className={styles.bar} style={{ animationDuration: `${LIFETIME_MS}ms` }} />
          </div>
        ))}
      </div>
    </ToastContext>
  )
}
