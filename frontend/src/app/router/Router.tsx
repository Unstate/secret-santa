import { BrowserRouter, Route, Routes, useParams } from 'react-router'

function HomePage() {
  return (
    <main>
      <h1>Тайный Санта</h1>
      <p>Создать комнату или войти по коду — здесь.</p>
    </main>
  )
}

function RoomPage() {
  const { code } = useParams<{ code: string }>()
  return (
    <main>
      <h1>Комната {code}</h1>
    </main>
  )
}

function NotFoundPage() {
  return (
    <main>
      <h1>404</h1>
      <p>Такой страницы нет — проверьте код комнаты.</p>
    </main>
  )
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/room/:code" element={<RoomPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
