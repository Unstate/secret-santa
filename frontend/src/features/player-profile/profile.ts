export interface PlayerProfile {
  name: string
  avatarId: number
}

const STORAGE_KEY = 'santa-profile'
const MAX_AVATAR_ID = 31

export function loadPlayerProfile(): PlayerProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw != null) {
      const parsed = JSON.parse(raw) as PlayerProfile
      const avatarOk = Number.isInteger(parsed.avatarId) && parsed.avatarId >= 0 && parsed.avatarId <= MAX_AVATAR_ID
      if (typeof parsed.name === 'string' && avatarOk) return parsed
    }
  } catch {
  }
  return { name: '', avatarId: Math.floor(Math.random() * (MAX_AVATAR_ID + 1)) }
}

export function savePlayerProfile(profile: PlayerProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  } catch {
  }
}
