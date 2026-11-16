import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { XIcon } from '../icons/icons'
import styles from './Modal.module.scss'

export interface ModalProps {
  onClose: () => void
  title: string
  children: React.ReactNode
}

// Диалог поверх страницы: родитель сам монтирует и размонтирует его.
// Esc и клик в оверлей закрывают, скролл тела заблокирован, фокус на панели.
export function Modal({ onClose, title, children }: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const savedOverflow = useRef('')

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    savedOverflow.current = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panelRef.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = savedOverflow.current
    }
  }, [onClose])

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
      >
        <div className={styles.head}>
          <h2 className={styles.title}>{title}</h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Закрыть">
            <XIcon size={18} />
          </button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}
