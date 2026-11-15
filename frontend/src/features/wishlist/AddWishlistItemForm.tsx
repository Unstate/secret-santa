import { useState } from 'react'
import { Badge, Button, Field, Input, SegmentedControl, useToast } from '@/shared/ui'
import { api, readSessionToken } from '@/shared/api'
import type { AddWishlistItemRequest, ParseProductResponse, WishlistItem, WishlistSource } from '@/shared/api'
import { toApiError } from '@/shared/hooks'
import { formatMoney, parseRubles, rublesToKopecks } from '@/shared/lib'
import styles from './AddWishlistItemForm.module.scss'

interface AddWishlistItemFormProps {
  roomCode: string
  onAdded: (item: WishlistItem) => void
  onCancel: () => void
}

const SOURCE_OPTIONS: Array<{ value: WishlistSource; label: string }> = [
  { value: 'wildberries', label: 'WB' },
  { value: 'ozon', label: 'Ozon' },
  { value: 'manual', label: 'Вручную' },
]

interface FieldErrors {
  title?: string
  price?: string
  url?: string
}

// Добавление товара. Для маркетплейса — два шага: код → превью через
// /tools/parse-product; если данные недоступны (parsed: false), название
// вписывается руками, ссылка всё равно сгенерируется из кода.
export function AddWishlistItemForm({ roomCode, onAdded, onCancel }: AddWishlistItemFormProps) {
  const [mode, setMode] = useState<WishlistSource>('wildberries')
  const [productCode, setProductCode] = useState('')
  const [preview, setPreview] = useState<ParseProductResponse | null>(null)
  const [checking, setChecking] = useState(false)
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [url, setUrl] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [adding, setAdding] = useState(false)
  const toast = useToast()

  function switchMode(next: WishlistSource) {
    setMode(next)
    setPreview(null)
    setProductCode('')
    setTitle('')
    setPrice('')
    setUrl('')
    setErrors({})
  }

  async function check() {
    if (productCode.trim() === '') return
    setChecking(true)
    try {
      // /tools не содержит код комнаты — токен комнаты вешаем сами.
      const token = readSessionToken(roomCode)
      const result = await api.post<ParseProductResponse>(
        '/tools/parse-product',
        { source: mode, code: productCode.trim() },
        token != null ? { authorization: `Bearer ${token}` } : undefined,
      )
      setPreview(result)
    } catch (cause) {
      toast.error(toApiError(cause).message)
    } finally {
      setChecking(false)
    }
  }

  async function add() {
    const trimmedTitle = title.trim()
    const body: AddWishlistItemRequest = {}

    if (mode === 'manual') {
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
      body.source = 'manual'
      body.title = trimmedTitle
      body.price = priceKopecks
      body.url = trimmedUrl === '' ? undefined : trimmedUrl
    } else {
      if (preview == null) return
      if (needsTitle) {
        if (trimmedTitle === '') {
          setErrors({ title: 'Впиши название' })
          return
        }
        body.title = trimmedTitle
      } else {
        body.title = (preview.title ?? '').trim()
      }
      body.source = mode
      body.code = preview.code
    }

    setAdding(true)
    setErrors({})
    try {
      const item = await api.post<WishlistItem>(`/rooms/${roomCode}/wishlist/items`, body)
      onAdded(item)
    } catch (cause) {
      toast.error(toApiError(cause).message)
    } finally {
      setAdding(false)
    }
  }

  const marketplace = mode !== 'manual'
  // Превью есть, но названия в нём нет — запрашиваем ручной ввод.
  const needsTitle = preview != null && (preview.title ?? '').trim() === ''

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault()
        void add()
      }}
      noValidate
    >
      <SegmentedControl
        options={SOURCE_OPTIONS}
        value={mode}
        onChange={switchMode}
        aria-label="Откуда товар"
      />

      {marketplace && (
        <>
          <div className={styles.codeRow}>
            <Input
              value={productCode}
              onChange={(event) => setProductCode(event.target.value)}
              placeholder={mode === 'wildberries' ? 'артикул WB, например 198340521' : 'код товара Ozon'}
              inputMode="numeric"
            />
            <Button variant="soft" size="m" loading={checking} onClick={check} disabled={productCode.trim() === ''}>
              Проверить
            </Button>
          </div>
          {preview != null && (
            <div className={styles.preview}>
              {preview.parsed ? (
                <>
                  <p className={styles.previewTitle}>{preview.title}</p>
                  <p className={styles.previewMeta}>
                    {preview.price != null && preview.price > 0 && (
                      <span className={styles.previewPrice}>{formatMoney(preview.price)}</span>
                    )}
                    {preview.inStock === false && <Badge tone="neutral">нет в наличии</Badge>}
                    {preview.link != null && (
                      <a href={preview.link} target="_blank" rel="noreferrer">
                        ссылка на товар
                      </a>
                    )}
                  </p>
                </>
              ) : (
                <p className={styles.previewFallback}>
                  Данные товара недоступны — впиши название сам, ссылку приложим из кода.
                </p>
              )}
            </div>
          )}
          {needsTitle && (
            <Field label="Название товара" error={errors.title}>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="что это за подарок"
              />
            </Field>
          )}
        </>
      )}

      {mode === 'manual' && (
        <>
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
        </>
      )}

      <div className={styles.buttons}>
        <Button
          type="submit"
          size="m"
          loading={adding}
          disabled={marketplace && preview == null}
        >
          Добавить в вишлист
        </Button>
        <Button variant="ghost" size="m" onClick={onCancel}>
          Отмена
        </Button>
      </div>
    </form>
  )
}
