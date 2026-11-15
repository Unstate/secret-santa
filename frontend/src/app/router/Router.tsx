import { BrowserRouter, Route, Routes } from 'react-router'
import { DevShowcase, HomePage, NotFoundPage, RoomPage } from '@/pages'

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/room/:code" element={<RoomPage />} />
        {import.meta.env.DEV && <Route path="/dev/ui" element={<DevShowcase />} />}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
