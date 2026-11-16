// Сессии комнат: код комнаты → токен места (можно состоять в нескольких).
const STORAGE_KEY = 'santa-sessions'

function readSessions(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw == null) return {}
    const parsed = JSON.parse(raw) as Record<string, unknown>
    const sessions: Record<string, string> = {}
    for (const [code, token] of Object.entries(parsed)) {
      if (typeof token === 'string' && token.length > 0) sessions[code] = token
    }
    return sessions
  } catch {
    return {}
  }
}

export function readSessionToken(roomCode: string): string | null {
  return readSessions()[roomCode.trim().toUpperCase()] ?? null
}

export function readSessionCodes(): string[] {
  return Object.keys(readSessions())
}

export function removeSessionToken(roomCode: string): void {
  const sessions = { ...readSessions() }
  delete sessions[roomCode.trim().toUpperCase()]
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch {
  }
}

export function saveSessionToken(roomCode: string, token: string): void {
  const sessions = { ...readSessions(), [roomCode.trim().toUpperCase()]: token }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions))
  } catch {
  }
}
