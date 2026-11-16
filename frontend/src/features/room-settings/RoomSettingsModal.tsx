import { useState } from 'react'
import { z } from 'zod'
import { Button, Field, Input, Modal, useToast } from '@/shared/ui'
import { usePatch } from '@/shared/hooks'
import { ROOM_NAME_MAX, zodFieldErrors } from '@/shared/lib/validation'
import { parseRubles, rublesToKopecks } from '@/shared/lib/money'
import { apiErrorText } from '@/shared/api'
import type { PatchRoomRequest, Room } from '@/shared/api'
import styles from './RoomSettingsModal.module.scss'

const settingsSchema = z.object({
  name: z.string().trim().min(1, 'Введите название комнаты'),
  budget: z
    .string()
    .trim()
    .min(1, 'Укажи бюджет')
    .refine((value) => parseRubles(value) != null, 'Введите бюджет числом, например 2000'),
})

interface FormState {
  name: string
  budget: string
}

interface RoomSettingsModalProps {
  room: Room
  onClose: () => void
  onSaved: () => void
}

export function RoomSettingsModal({ room, onClose, onSaved }: RoomSettingsModalProps) {
  // Попап монтируется только при открытии — форма стартует с актуальных значений.
  const [form, setForm] = useState<FormState>({ name: room.name, budget: String(room.budget / 100) })
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const { patch, loading } = usePatch<PatchRoomRequest, Room>(`/rooms/${room.code}`)
  const toast = useToast()

  async function handleSubmit(event: React.SubmitEvent) {
    event.preventDefault()
    const parsed = settingsSchema.safeParse(form)
    if (!parsed.success) {
      setErrors(zodFieldErrors(parsed.error))
      return
    }
    setErrors({})

    const rubles = parseRubles(parsed.data.budget)
    if (rubles == null) return
    const result = await patch({ name: parsed.data.name, budget: rublesToKopecks(rubles) })
    if (result.ok) {
      toast.success('Настройки сохранены')
      onSaved()
      onClose()
    } else {
      toast.error(apiErrorText(result.error))
    }
  }

  return (
    <Modal onClose={onClose} title="Настройки комнаты">
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Field label="Название комнаты" error={errors.name}>
          <Input
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            maxLength={ROOM_NAME_MAX}
            invalid={errors.name != null}
          />
        </Field>
        <Field label="Бюджет подарка" hint="До, в рублях — без копеек" error={errors.budget}>
          <Input
            value={form.budget}
            onChange={(event) => setForm({ ...form, budget: event.target.value })}
            inputMode="decimal"
            invalid={errors.budget != null}
          />
        </Field>
        <Button type="submit" variant="soft" block loading={loading}>
          Сохранить
        </Button>
      </form>
    </Modal>
  )
}
