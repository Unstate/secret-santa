import { useEffect, useState } from 'react'
import { Badge, Button, Card, Input, PencilIcon, Spinner, XIcon, useToast } from '@/shared/ui'
import { api } from '@/shared/api'
import type { WishlistItem } from '@/shared/api'
import { toApiError, useGet } from '@/shared/hooks'
import { formatMoney, parseRubles, rublesToKopecks } from '@/shared/lib'
import { AddWishlistItemForm } from './AddWishlistItemForm'
import styles from './WishlistCard.module.scss'

interface WishlistCardProps {
  roomCode: string
  meId: string
}

interface EditState {
  id: string
  title: string
  price: string
}

// Свой вишлист: правит и удаляет только владелец (это проверяет и сервер).
export function WishlistCard({ roomCode, meId }: WishlistCardProps) {
  const base = `/rooms/${roomCode}/wishlist`
  const { data, error: loadError, loading, get } = useGet<WishlistItem[]>(base)
  const [adding, setAdding] = useState(false)
  const [edit, setEdit] = useState<EditState | null>(null)
  const [editError, setEditError] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const toast = useToast()

  useEffect(() => {
    void get()
  }, [get])

  const myItems = (data ?? []).filter((item) => item.playerId === meId)

  function closeForms() {
    setAdding(false)
    setEdit(null)
    setEditError(null)
  }

  async function handleDelete(item: WishlistItem) {
    setBusyId(item.id)
    try {
      await api.delete(`${base}/items/${item.id}`)
      void get()
    } catch (cause) {
      toast.error(toApiError(cause).message)
    } finally {
      setBusyId(null)
    }
  }

  async function handleEditSave(item: WishlistItem) {
    const title = edit?.title.trim() ?? ''
    if (title === '') {
      setEditError('Название не может быть пустым')
      return
    }
    let priceKopecks: number | undefined
    if (edit?.price.trim() !== '') {
      const rubles = parseRubles(edit?.price ?? '')
      if (rubles == null) {
        setEditError('Цена — числом, например 1200 или 1200,50')
        return
      }
      priceKopecks = rublesToKopecks(rubles)
    }
    setBusyId(item.id)
    try {
      await api.patch(`${base}/items/${item.id}`, {
        title,
        price: priceKopecks ?? null,
      })
      void get()
      closeForms()
    } catch (cause) {
      toast.error(toApiError(cause).message)
    } finally {
      setBusyId(null)
    }
  }

  function startEdit(item: WishlistItem) {
    setEdit({
      id: item.id,
      title: item.title,
      price: item.price == null ? '' : String(item.price / 100),
    })
    setEditError(null)
  }

  return (
    <Card className={styles.card}>
      <div className={styles.head}>
        <h2 className={styles.title}>Мой вишлист</h2>
        {!adding && edit == null && (
          <Button variant="soft" size="m" icon={<PencilIcon size={16} />} onClick={() => setAdding(true)}>
            Добавить
          </Button>
        )}
      </div>
      <p className={styles.text}>Что ты хочешь получить — увидит тот, кто тебе подарит.</p>

      {loading && myItems.length === 0 && <Spinner size={22} />}
      {loadError != null && !loading && (
        <p className={styles.empty}>Не получилось загрузить вишлист — перезагрузи страницу.</p>
      )}

      {data != null && edit == null && !adding && myItems.length === 0 && (
        <p className={styles.empty}>Пока пусто. Добавь пару идей — дарильщику будет проще.</p>
      )}

      {myItems.length > 0 && (
        <ul className={styles.items}>
          {myItems.map((item) =>
            edit?.id === item.id ? (
              <li key={item.id} className={styles.editRow}>
                <Input
                  value={edit.title}
                  onChange={(event) => setEdit({ ...edit, title: event.target.value })}
                  aria-label="Название товара"
                />
                <Input
                  value={edit.price}
                  onChange={(event) => setEdit({ ...edit, price: event.target.value })}
                  placeholder="цена, ₽"
                  inputMode="decimal"
                  aria-label="Цена, ₽"
                />
                {editError != null && <p className={styles.editError}>{editError}</p>}
                <div className={styles.editButtons}>
                  <Button size="m" loading={busyId === item.id} onClick={() => void handleEditSave(item)}>
                    Сохранить
                  </Button>
                  <Button variant="ghost" size="m" onClick={closeForms}>
                    Отмена
                  </Button>
                </div>
              </li>
            ) : (
              <li key={item.id} className={styles.item}>
                <span className={styles.itemMain}>
                  {item.url != null ? (
                    <a href={item.url} target="_blank" rel="noreferrer">
                      {item.title}
                    </a>
                  ) : (
                    item.title
                  )}
                </span>
                <span className={styles.itemMeta}>
                  {item.source !== 'manual' && (
                    <Badge tone="neutral">{item.source === 'wildberries' ? 'WB' : 'Ozon'}</Badge>
                  )}
                  {item.inStock === false && <Badge tone="gold">нет в наличии</Badge>}
                  {item.price != null && <span className={styles.price}>{formatMoney(item.price)}</span>}
                </span>
                <span className={styles.itemButtons}>
                  <button
                    type="button"
                    className={styles.mini}
                    onClick={() => startEdit(item)}
                    aria-label="Изменить товар"
                  >
                    <PencilIcon size={15} />
                  </button>
                  <button
                    type="button"
                    className={styles.mini}
                    onClick={() => void handleDelete(item)}
                    disabled={busyId === item.id}
                    aria-label="Удалить товар"
                  >
                    <XIcon size={15} />
                  </button>
                </span>
              </li>
            ),
          )}
        </ul>
      )}

      {adding && (
        <AddWishlistItemForm
          roomCode={roomCode}
          onAdded={() => {
            closeForms()
            void get()
          }}
          onCancel={closeForms}
        />
      )}
    </Card>
  )
}
