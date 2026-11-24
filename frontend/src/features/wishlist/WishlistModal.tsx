import { useEffect, useState } from 'react'
import {
  Button,
  Input,
  Modal,
  PencilIcon,
  PlusIcon,
  Spinner,
  Textarea,
  XIcon,
  useToast,
} from '@/shared/ui'
import { useDelete, useGet, usePatch, usePut } from '@/shared/hooks'
import type { WishlistItem } from '@/shared/api'
import { formatMoney, parseRubles, rublesToKopecks } from '@/shared/lib'
import { AddWishlistItemForm } from './AddWishlistItemForm'
import styles from './WishlistModal.module.scss'

interface WishlistModalProps {
  roomCode: string
  meId: string
  /** Текущий комментарий игрока к вишлисту (приходит из данных комнаты). */
  comment: string | null
  onClose: () => void
}

interface EditState {
  id: string
  title: string
  price: string
}

// Свой вишлист: правит и удаляет только владелец (это проверяет и сервер).
export function WishlistModal({ roomCode, meId, comment, onClose }: WishlistModalProps) {
  const base = `/rooms/${roomCode}/wishlist`
  const { data, error: loadError, loading, get } = useGet<WishlistItem[]>(base)
  const [adding, setAdding] = useState(false)
  const [edit, setEdit] = useState<EditState | null>(null)
  const { put, loading: commentBusy } = usePut<{ comment: string | null }, void>(
    `/rooms/${roomCode}/me/wishlist-comment`,
  )
  // Path стабилен на время формы правки: пока edit не открыт, он пустой и
  // никуда не вызывается.
  const { patch, loading: saving } = usePatch<{ title: string; price: number | null }, void>(
    `${base}/items/${edit?.id ?? ''}`,
  )
  const { del, loading: deleting } = useDelete()
  const [editError, setEditError] = useState<string | null>(null)
  const toast = useToast()

  // Комментарий для дарящего: черновик поверх сохранённого значения.
  const [commentDraft, setCommentDraft] = useState<string | null>(null)
  const [commentSaved, setCommentSaved] = useState<string | null>(null)
  const savedComment = commentSaved ?? (comment ?? '')
  const commentValue = commentDraft ?? savedComment
  const commentDirty = commentValue !== savedComment

  useEffect(() => {
    void get()
  }, [get])

  const myItems = (data ?? []).filter((item) => item.playerId === meId)

  function closeForms() {
    setAdding(false)
    setEdit(null)
    setEditError(null)
  }

  function handleClose() {
    closeForms()
    onClose()
  }

  async function handleDelete(item: WishlistItem) {
    const result = await del(`${base}/items/${item.id}`)
    if (result.ok) {
      void get()
    } else {
      toast.error(result.error.message)
    }
  }

  async function handleEditSave() {
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
    const result = await patch({ title, price: priceKopecks ?? null })
    if (result.ok) {
      void get()
      closeForms()
    } else {
      toast.error(result.error.message)
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

  async function handleCommentSave() {
    const text = commentValue.trim()
    const result = await put({ comment: text === '' ? null : text })
    if (result.ok) {
      setCommentSaved(text)
      setCommentDraft(null)
      toast.success('Комментарий сохранён — его увидит твой дарильщик')
    } else {
      toast.error(result.error.message)
    }
  }

  return (
    <Modal onClose={handleClose} title="Мой вишлист">
      <p className={styles.text}>Что ты хочешь получить — увидит тот, кто тебе подарит.</p>

      <div className={styles.commentBlock}>
        <div className={styles.commentHead}>
          <span className={styles.commentLabel}>Комментарий для дарящего</span>
          <span className={styles.commentCounter}>{commentValue.length}/500</span>
        </div>
        <Textarea
          value={commentValue}
          onChange={(event) => setCommentDraft(event.target.value)}
          maxLength={500}
          rows={2}
          placeholder="Например: «Кружку хочу точно, из остального — что понравится»"
          aria-label="Комментарий для дарящего"
        />
        {commentDirty && (
          <Button size="m" loading={commentBusy} onClick={() => void handleCommentSave()}>
            Сохранить комментарий
          </Button>
        )}
      </div>

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
                  <Button size="m" loading={saving} onClick={() => void handleEditSave()}>
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
                  {item.price != null && <span className={styles.price}>{formatMoney(item.price)}</span>}
                </span>
                <span className={styles.itemButtons}>
                  <button
                    type="button"
                    className={styles.mini}
                    onClick={() => startEdit(item)}
                    disabled={deleting}
                    aria-label="Изменить товар"
                  >
                    <PencilIcon size={15} />
                  </button>
                  <button
                    type="button"
                    className={styles.mini}
                    onClick={() => void handleDelete(item)}
                    disabled={deleting}
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

      {adding ? (
        <AddWishlistItemForm
          roomCode={roomCode}
          onAdded={() => {
            closeForms()
            void get()
          }}
          onCancel={closeForms}
        />
      ) : (
        edit == null && (
          <Button variant="soft" size="m" icon={<PlusIcon size={16} />} onClick={() => setAdding(true)}>
            Добавить подарок
          </Button>
        )
      )}
    </Modal>
  )
}
