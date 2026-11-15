import { useEffect, useMemo, useState } from 'react'
import { ArrowRightIcon, Avatar, Button, Card, PlusIcon, Spinner, XIcon, useToast } from '@/shared/ui'
import { useGet, usePut } from '@/shared/hooks'
import type { ExclusionPair, Player } from '@/shared/api'
import styles from './RoomExclusionsCard.module.scss'

interface RoomExclusionsCardProps {
  code: string
  players: Player[]
  onSaved: () => void
}

const pairKey = (pair: ExclusionPair): string => `${pair.playerId}>${pair.blockedRecipientId}`

// Черновик поверх сохранённого: added — новые пары, removed — ключи пар,
// убранных из сохранённых. PUT всегда уходит целиком (полная замена на сервере).
export function RoomExclusionsCard({ code, players, onSaved }: RoomExclusionsCardProps) {
  const path = `/rooms/${code}/exclusions`
  const { data: saved, error: loadError, loading: loadingSaved, get } = useGet<ExclusionPair[]>(path)
  const { put, loading: saving } = usePut<{ exclusions: ExclusionPair[] }, ExclusionPair[]>(path)
  const [added, setAdded] = useState<ExclusionPair[]>([])
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set())
  const [giverId, setGiverId] = useState('')
  const [recipientId, setRecipientId] = useState('')
  const toast = useToast()

  useEffect(() => {
    void get()
  }, [get])

  const playerById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players],
  )
  const draft = useMemo<ExclusionPair[]>(
    () => [...(saved ?? []).filter((pair) => !removed.has(pairKey(pair))), ...added],
    [saved, added, removed],
  )
  const dirty = added.length > 0 || removed.size > 0

  function removePair(pair: ExclusionPair) {
    const key = pairKey(pair)
    if ((saved ?? []).some((item) => pairKey(item) === key)) {
      setRemoved(new Set(removed).add(key))
    } else {
      setAdded(added.filter((item) => pairKey(item) !== key))
    }
  }

  const canAdd =
    giverId !== '' &&
    recipientId !== '' &&
    giverId !== recipientId &&
    !draft.some((pair) => pairKey(pair) === pairKey({ playerId: giverId, blockedRecipientId: recipientId }))

  function addPair() {
    if (!canAdd) return
    setAdded([...added, { playerId: giverId, blockedRecipientId: recipientId }])
    setRecipientId('')
  }

  async function handleSave() {
    const result = await put({ exclusions: draft })
    if (result.ok) {
      toast.success('Исключения сохранены')
      setAdded([])
      setRemoved(new Set())
      void get() // сервер прислал нормализованный список — пересинхронизировать базу
      onSaved()
    } else {
      toast.error(result.error.message)
    }
  }

  return (
    <Card className={styles.card}>
      <h2 className={styles.title}>Исключения</h2>
      <p className={styles.text}>Пары «не дарит →» учитываются в шафле: выбранные не получат друг друга.</p>

      {loadingSaved && <Spinner size={22} />}
      {loadError != null && !loadingSaved && (
        <p className={styles.empty}>Не получилось загрузить исключения — попробуй перезагрузить страницу.</p>
      )}

      {saved != null && (
        <>
          {draft.length === 0 ? (
            <p className={styles.empty}>Пока пусто — любой может подарить любому.</p>
          ) : (
            <ul className={styles.pairs}>
              {draft.map((pair) => {
                const giver = playerById.get(pair.playerId)
                const recipient = playerById.get(pair.blockedRecipientId)
                return (
                  <li key={pairKey(pair)} className={styles.pair}>
                    <span className={styles.side}>
                      {giver != null && <Avatar id={giver.avatar} size={26} />}
                      <span className={styles.name}>{giver?.name ?? 'игрок'}</span>
                    </span>
                    <ArrowRightIcon size={16} className={styles.arrow} />
                    <span className={styles.side}>
                      {recipient != null && <Avatar id={recipient.avatar} size={26} />}
                      <span className={styles.name}>{recipient?.name ?? 'игрок'}</span>
                    </span>
                    <button type="button" className={styles.mini} onClick={() => removePair(pair)} aria-label="Убрать пару">
                      <XIcon size={15} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}

          {players.length < 3 ? (
            <p className={styles.empty}>Для исключений нужно минимум три игрока.</p>
          ) : (
            <div className={styles.addRow}>
              <select
                className={styles.select}
                value={giverId}
                onChange={(event) => setGiverId(event.target.value)}
                aria-label="Кто не дарит"
              >
                <option value="" disabled>
                  кто не дарит
                </option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
              <ArrowRightIcon size={16} className={styles.arrow} />
              <select
                className={styles.select}
                value={recipientId}
                onChange={(event) => setRecipientId(event.target.value)}
                aria-label="Кому не дарит"
              >
                <option value="" disabled>
                  кому не дарит
                </option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
              <button type="button" className={styles.mini} onClick={addPair} disabled={!canAdd} aria-label="Добавить пару">
                <PlusIcon size={17} />
              </button>
            </div>
          )}

          <Button variant="soft" block loading={saving} disabled={!dirty} onClick={handleSave}>
            Сохранить
          </Button>
        </>
      )}
    </Card>
  )
}
