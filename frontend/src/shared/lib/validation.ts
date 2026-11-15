import type { ZodError } from 'zod'

export const ROOM_NAME_MAX = 64
export const PLAYER_NAME_MAX = 32
export const ROOM_CODE_LENGTH = 8

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase()
}

/** Первая ошибка на каждое поле из zod-результата. */
export function zodFieldErrors(error: ZodError): Record<string, string> {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? '')
    if (!(key in out)) out[key] = issue.message
  }
  return out
}
