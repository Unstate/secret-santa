import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../styles/reset.scss'
import '../styles/theme.scss'
import { ToastProvider } from '@/shared/ui'
import { AppRouter } from '../router/Router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <AppRouter />
    </ToastProvider>
  </StrictMode>,
)
