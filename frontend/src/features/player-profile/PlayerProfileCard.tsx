import { useEffect, useState } from 'react'
import { Avatar, AvatarPicker, Card, Field, Input } from '@/shared/ui'
import { loadPlayerProfile, savePlayerProfile } from './profile'
import styles from './PlayerProfileCard.module.scss'

export interface PlayerProfileCardProps {
  className?: string
}

export function PlayerProfileCard({ className }: PlayerProfileCardProps) {
  const [profile, setProfile] = useState(loadPlayerProfile)
  const [nameTouched, setNameTouched] = useState(false)

  useEffect(() => {
    savePlayerProfile(profile)
  }, [profile])

  const nameEmpty = profile.name.trim().length === 0
  const showError = nameTouched && nameEmpty

  return (
    <Card className={className}>
      <h2 className={styles.title}>
        <Avatar id={profile.avatarId} size={30} />
        Кто ты
      </h2>
      <div className={styles.row}>
        <Field label="Имя" hint="Так тебя увидят остальные" error={showError ? 'Введите имя' : undefined}>
          <Input
            value={profile.name}
            onChange={(event) => setProfile({ ...profile, name: event.target.value })}
            onBlur={() => setNameTouched(true)}
            placeholder="Оля"
            maxLength={32}
            invalid={showError}
          />
        </Field>
        <Field label="Аватар" hint="Один и тот же и для своей комнаты, и для чужой">
          <AvatarPicker
            value={profile.avatarId}
            onChange={(avatarId) => setProfile({ ...profile, avatarId })}
            label="Выбери зверя"
          />
        </Field>
      </div>
    </Card>
  )
}
