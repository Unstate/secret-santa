import { useState } from 'react'
import { useNavigate } from 'react-router'
import { z } from 'zod'
import { ArrowRightIcon, Button, Card, Field, HashIcon, Input, useToast } from '@/shared/ui'
import { usePost } from '@/shared/hooks'
import { apiErrorText, readSessionToken, saveSessionToken } from '@/shared/api'
import { normalizeRoomCode } from '@/shared/lib/validation'
import type { JoinRequest, JoinResponse } from '@/shared/api'
import { loadPlayerProfile } from '@/features/player-profile/profile'
import styles from './JoinRoomForm.module.scss'

const joinRoomSchema = z.object({
  code: z.string().trim().min(1, 'Введите код комнаты'),
})

export function JoinRoomForm() {
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const join = usePost<JoinRequest, JoinResponse>(`/rooms/${normalizeRoomCode(code)}/join`)
  const toast = useToast()
  const navigate = useNavigate()

  async function handleSubmit(event: React.SubmitEvent) {
    event.preventDefault()
    const profile = loadPlayerProfile()
    if (profile.name.trim().length === 0) {
      toast.error('Укажи имя в профиле выше')
      return
    }
    const parsed = joinRoomSchema.safeParse({ code })
    if (!parsed.success) {
      setError(parsed.error.issues[0].message)
      return
    }
    setError(null)

    const normalized = normalizeRoomCode(code)
    if (readSessionToken(normalized) != null) {
      toast.success('У тебя уже есть место в этой комнате')
      navigate(`/room/${normalized}`)
      return
    }
    const result = await join.post({ name: profile.name.trim(), avatar: profile.avatarId })
    if (result.ok) {
      saveSessionToken(normalized, result.data.player.token)
      navigate(`/room/${normalized}`)
    } else {
      toast.error(apiErrorText(result.error))
    }
  }

  return (
    <Card className={styles.card}>
      <h2 className={styles.title}>
        <HashIcon className={styles.icon} />
        Войти по коду
      </h2>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        <Field label="Код комнаты" hint="Из ссылки-приглашения" error={error ?? undefined}>
          <Input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="AB2CDE45"
            maxLength={8}
            className={styles.code}
            invalid={error != null}
            autoComplete="off"
            spellCheck={false}
          />
        </Field>
        <Button type="submit" variant="soft" icon={<ArrowRightIcon />} block loading={join.loading}>
          Войти
        </Button>
        <p className={styles.hint}>Имя и аватар возьмутся из профиля выше.</p>
      </form>
    </Card>
  )
}
