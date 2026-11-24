import { useState } from 'react'
import { Button, Field, Input, useToast } from '@/shared/ui'
import type { AddWishlistItemRequest, WishlistItem } from '@/shared/api'
import { usePost } from '@/shared/hooks'
import { parseRubles, rublesToKopecks } from '@/shared/lib'
import styles from './AddWishlistItemForm.module.scss'

interface AddWishlistItemFormProps {
  roomCode: string
  onAdded: (item: WishlistItem) => void
  onCancel: () => void
}

interface FieldErrors {
  title?: string
  price?: string
  url?: string
}

export function AddWishlistItemForm({ roomCode, onAdded, onCancel }: AddWishlistItemFormProps) {
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [url, setUrl] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const { post, loading: adding } = usePost<AddWishlistItemRequest, WishlistItem>(
    `/rooms/${roomCode}/wishlist/items`,
  )
  const toast = useToast()

  async function add() {
    const trimmedTitle = title.trim()
    if (trimmedTitle === '') {
      setErrors({ title: 'Впиши название' })
      return
    }

    const trimmedUrl = url.trim()
    if (trimmedUrl !== '' && !/^https?:\/\//.test(trimmedUrl)) {
      setErrors({ url: 'Ссылка должна начинаться с http(s)://' })
      return
    }

    let priceKopecks: number | undefined
    if (price.trim() !== '') {
      const rubles = parseRubles(price)
      if (rubles == null) {
        setErrors({ price: 'Цена — числом, например 1200 или 1200,50' })
        return
      }
      priceKopecks = rublesToKopecks(rubles)
    }

    const body: AddWishlistItemRequest = { title: trimmedTitle }
    if (trimmedUrl !== '') body.url = trimmedUrl
    if (priceKopecks != null) body.price = priceKopecks

    setErrors({})
    const result = await post(body)
    if (result.ok) {
      onAdded(result.data)
    } else {
      toast.error(result.error.message)
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault()
        void add()
      }}
      noValidate
    >
      <Field label="Название товара" error={errors.title}>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="что это за подарок"
        />
      </Field>
      <Field label="Цена, ₽ — необязательно" error={errors.price}>
        <Input
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          placeholder="например 1200"
          inputMode="decimal"
        />
      </Field>
      <Field label="Ссылка — необязательно" error={errors.url}>
        <Input
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder="https://…"
          inputMode="url"
        />
      </Field>

      <div className={styles.buttons}>
        <Button type="submit" size="m" loading={adding}>
          Добавить в вишлист
        </Button>
        <Button variant="ghost" size="m" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </form>
  )
}
