import { createContext, useContext } from 'react'

export type ToastTone = 'error' | 'success'

export interface ToastApi {
  error: (message: string) => void
  success: (message: string) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
  const value = useContext(ToastContext)
  if (value == null) {
    throw new Error('useToast вызван вне ToastProvider')
  }
  return value
}
