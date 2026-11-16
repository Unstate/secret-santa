import { useEffect, useMemo, useState } from 'react'
import { ArrowRightIcon, Avatar, Button, Modal, Spinner, XIcon, useToast } from '@/shared/ui'
import { cx } from '@/shared/lib'
import { useGet, usePut } from '@/shared/hooks'
import type { ExclusionPair, Player } from '@/shared/api'
import styles from './RoomExclusionsModal.module.scss'

interface RoomExclusionsModalProps {
  code: string
  players: Player[]
  // После шафла бэкенд принимает PUT только в лобби — попап только смотрит.
  readOnly?: boolean
  onClose: () => void
  onSaved: () => void
}

const pairKey = (pair: ExclusionPair): string => `${pair.playerId}>${pair.blockedRecipientId}`

// Черновик пар поверх сохранённых: чипы «кто не дарит» → «кому не дарит».
// Руки правят только локальные changes (null = черновик ещё не трогали и
// показываем saved); PUT всегда уходит целиком (полная замена на сервере).
export function RoomExclusionsModal({
  code,
  players,
  readOnly = false,
  onClose,
  onSaved,
}: RoomExclusionsModalProps) {
  const path = `/rooms/${code}/exclusions`
  const { data: saved, error: loadError, loading: loadingSaved, get } = useGet<ExclusionPair[]>(path)
  const { put, loading: saving } = usePut<{ exclusions: ExclusionPair[] }, ExclusionPair[]>(path)
  const [changes, setChanges] = useState<ExclusionPair[] | null>(null)
  const [giverId, setGiverId] = useState('')
  const toast = useToast()

  useEffect(() => {
    void get()
  }, [get])

  // Черновик: руки → сохранённые. Пока ничего не правили, дублируем saved.
  const draft = changes ?? saved ?? null

  const playerById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  )
  const giver = giverId !== '' ? (playerById.get(giverId) ?? null) : null

  const savedKeys = useMemo(() => new Set((saved ?? []).map(pairKey)), [saved])
  const draftKeys = useMemo(() => new Set((draft ?? []).map(pairKey)), [draft])
  const dirty =
    changes != null &&
    (draftKeys.size !== savedKeys.size || [...draftKeys].some((key) => !savedKeys.has(key)))

  function toggleRecipient(recipientId: string) {
    if (giverId === '' || giverId === recipientId) return
    // Функциональный апдейт: даже два быстрых клика подряд не потеряют пару.
    setChanges((current) => {
      const base = current ?? saved ?? []
      const exists = base.some(
        (pair) => pair.playerId === giverId && pair.blockedRecipientId === recipientId,
      )
      return exists
        ? base.filter(
            (pair) => !(pair.playerId === giverId && pair.blockedRecipientId === recipientId),
          )
        : [...base, { playerId: giverId, blockedRecipientId: recipientId }]
    })
  }

  function removePair(pair: ExclusionPair) {
    setChanges((current) =>
      (current ?? saved ?? []).filter((item) => pairKey(item) !== pairKey(pair)),
    )
  }

  async function handleSave() {
    if (draft == null) return
    const result = await put({ exclusions: draft })
    if (result.ok) {
      toast.success('Исключения сохранены')
      setChanges(null)
      void get() // сервер прислал нормализованный список — пересинхронизировать базу
      onSaved()
      onClose()
    } else {
      toast.error(result.error.message)
    }
  }

  const recipientChips = players.filter((player) => player.id !== giverId)
  const giverExclusions = (draft ?? []).filter((pair) => pair.playerId === giverId)

  return (
    <Modal onClose={onClose} title="Исключения">
      {readOnly && (
        <p className={styles.note}>
          Шафл уже проведён — исключения можно посмотреть, но не изменить.
        </p>
      )}
      {loadingSaved && draft == null && <Spinner size={22} />}
      {loadError != null && draft == null && (
        <p className={styles.note}>
          Не получилось загрузить исключения — попробуй перезагрузить страницу.
        </p>
      )}

      {players.length < 3 ? (
        <p className={styles.note}>Для исключений нужно минимум три игрока.</p>
      ) : (
        draft != null && (
          <div className={styles.sections}>
            <section>
              <h3 className={styles.sectionTitle}>Кто не дарит</h3>
              <div className={styles.chips} role="radiogroup" aria-label="Кто не дарит">
                {players.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    role="radio"
                    aria-checked={player.id === giverId}
                    className={cx(styles.chip, player.id === giverId && styles.chipActive)}
                    onClick={() => setGiverId(player.id === giverId ? '' : player.id)}
                  >
                    <Avatar id={player.avatar} size={26} />
                    <span className={styles.chipName}>{player.name}</span>
                    {player.isOrganizer && <span className={styles.chipBadge}>орг</span>}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className={styles.sectionTitle}>
                {giver != null ? (
                  <>
                    <Avatar id={giver.avatar} size={22} />
                    {giver.name} не дарит
                  </>
                ) : (
                  'Кому не дарит'
                )}
              </h3>
              {giver == null ? (
                <p className={styles.note}>Сначала выбери выше, кто не дарит.</p>
              ) : (
                <>
                  <div className={styles.chips} aria-label={`Кому ${giver.name} не дарит`}>
                    {recipientChips.map((player) => {
                      const blocked = giverExclusions.some(
                        (pair) => pair.blockedRecipientId === player.id,
                      )
                      return (
                        <button
                          key={player.id}
                          type="button"
                          aria-pressed={blocked}
                          disabled={readOnly}
                          className={cx(styles.chip, blocked && styles.chipActive)}
                          onClick={() => toggleRecipient(player.id)}
                        >
                          <Avatar id={player.avatar} size={26} />
                          <span className={styles.chipName}>{player.name}</span>
                        </button>
                      )
                    })}
                  </div>
                  <p className={styles.hint}>
                    {readOnly
                      ? 'Тыкай на игроков слева, чтобы посмотреть их исключения.'
                      : `Тыкни на одного или нескольких — им ${giver.name} не подарит.`}
                  </p>
                </>
              )}
            </section>

            <section>
              <h3 className={styles.sectionTitle}>Итог</h3>
              {draft.length === 0 ? (
                <p className={styles.note}>Пока пусто — любой может подарить любому.</p>
              ) : (
                <ul className={styles.pairs}>
                  {draft.map((pair) => {
                    const pairGiver = playerById.get(pair.playerId)
                    const recipient = playerById.get(pair.blockedRecipientId)
                    return (
                      <li key={pairKey(pair)} className={styles.pair}>
                        <span className={styles.side}>
                          {pairGiver != null && <Avatar id={pairGiver.avatar} size={24} />}
                          <span className={styles.name}>{pairGiver?.name ?? 'игрок'}</span>
                        </span>
                        <ArrowRightIcon size={15} className={styles.arrow} />
                        <span className={styles.side}>
                          {recipient != null && <Avatar id={recipient.avatar} size={24} />}
                          <span className={styles.name}>{recipient?.name ?? 'игрок'}</span>
                        </span>
                        <button
                          type="button"
                          className={styles.mini}
                          onClick={() => removePair(pair)}
                          disabled={readOnly}
                          aria-label="Убрать пару"
                        >
                          <XIcon size={14} />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            {!readOnly && (
              <Button variant="soft" block loading={saving} disabled={!dirty} onClick={handleSave}>
                Сохранить
              </Button>
            )}
          </div>
        )
      )}
    </Modal>
  )
}
