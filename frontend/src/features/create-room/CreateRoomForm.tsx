import { useState } from 'react'
import { z } from 'zod'
import { Button, Card, Field, GiftIcon, Input, useToast } from '@/shared/ui'
import { usePost } from '@/shared/hooks'
import { saveSessionToken } from '@/shared/api'
import { ROOM_NAME_MAX, zodFieldErrors } from '@/shared/lib/validation'
import { parseRubles, rublesToKopecks } from '@/shared/lib/money'
import type { CreateRoomRequest, CreateRoomResponse } from '@/shared/api'
import { loadPlayerProfile } from '@/features/player-profile/profile'
import styles from './CreateRoomForm.module.scss'

const createRoomSchema = z.object({
  roomName: z.string().trim().min(1, 'Введите название комнаты'),
  budget: z
    .string()
    .trim()
    .min(1, 'Укажи бюджет')
    .refine((value) => parseRubles(value) != null, 'Введите бюджет числом, например 2000'),
})

interface FormState {
  roomName: string
  budget: string
}

export function CreateRoomForm() {
  const [form, setForm] = useState<FormState>({ roomName: '', budget: '2000' })
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const create = usePost<CreateRoomRequest, CreateRoomResponse>('/rooms')
  const toast = useToast()

  async function handleSubmit(event: React.SubmitEvent) {
    event.preventDefault()
    const profile = loadPlayerProfile()
    if (profile.name.trim().length === 0) {
      toast.error('Укажи имя в профиле выше')
      return
    }
    const parsed = createRoomSchema.safeParse(form)
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error))
      return
    }
    setErrors({})

    const rubles = parseRubles(parsed.data.budget)
    if (rubles == null) return
    const result = await create.post({
      name: parsed.data.roomName,
      budget: rublesToKopecks(rubles),
      organizerName: profile.name.trim(),
      avatar: profile.avatarId,
    })
    if (result.ok) {
      saveSessionToken(result.data.room.code, result.data.player.token)
      toast.success(`Комната «${result.data.room.name}» создана — код ${result.data.room.code}`)
    } else {
      toast.error(result.error.message)
    }
  }

  return (
    <Card className={styles.card}>
      <h2 className={styles.title}>
        <GiftIcon className={styles.icon} />
        Создать комнату
      </h2>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Field label="Название комнаты" error={errors.roomName}>
          <Input
            value={form.roomName}
            onChange={(event) => setForm({ ...form, roomName: event.target.value })}
            placeholder="Например: Тёплая компания"
            maxLength={ROOM_NAME_MAX}
            invalid={errors.roomName != null}
          />
        </Field>
        <Field label="Бюджет подарка" hint="До, в рублях — без копеек" error={errors.budget}>
          <Input
            value={form.budget}
            onChange={(event) => setForm({ ...form, budget: event.target.value })}
            inputMode="decimal"
            placeholder="2000"
            invalid={errors.budget != null}
          />
        </Field>
        <Button type="submit" icon={<GiftIcon />} block loading={create.loading}>
          Создать комнату
        </Button>
      </form>
    </Card>
  )
}
