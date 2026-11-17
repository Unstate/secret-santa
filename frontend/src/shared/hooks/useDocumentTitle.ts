import { useEffect } from 'react'

// Базовый заголовок — тот же, что в index.html <title>.
const BASE_TITLE = 'Тайный Санта — распределение подарков по-честному'

// Заголовок вкладки: title == null — базовый, иначе «{title} — Тайный Санта».
export function useDocumentTitle(title: string | null) {
  useEffect(() => {
    document.title = title == null ? BASE_TITLE : `${title} — Тайный Санта`
  }, [title])
}
