export type RoomStatus = 'lobby' | 'shuffled'

export type WishlistSource = 'manual' | 'wildberries' | 'ozon'

export type ApiErrorCode =
  | 'room_not_found'
  | 'name_taken'
  | 'not_organizer'
  | 'forbidden'
  | 'unauthorized'
  | 'wrong_status'
  | 'reshuffle_blocked'
  | 'shuffle_impossible'
  | 'shuffle_not_ready'
  | 'item_not_found'
  | 'validation_failed'
  | 'internal'

export interface ApiErrorBody {
  code: ApiErrorCode
  message: string
}


export interface Room {
  id: string
  code: string
  name: string
  budget: number
  status: RoomStatus
}

export interface Player {
  id: string
  roomId: string
  name: string
  avatar: number
  isOrganizer: boolean
}

export interface PlayerWithToken extends Player {
  token: string
}

export interface RoomDetails extends Room {
  players: Player[]
}

export interface CreateRoomRequest {
  name: string
  budget: number
  organizerName: string
  avatar: number
}

export interface CreateRoomResponse {
  room: Room
  player: PlayerWithToken
}

export interface JoinRequest {
  name: string
  avatar: number
}

export interface JoinResponse {
  player: PlayerWithToken
}

export interface PatchRoomRequest {
  name?: string
  budget?: number
}

export interface ExclusionPair {
  playerId: string
  blockedRecipientId: string
}

export interface Recipient {
  id: string
  name: string
  avatar: number
}

export interface MyAssignmentResponse {
  recipient: Recipient
  wishlist: WishlistItem[]
}

export interface AssignmentPair {
  giver: Recipient
  recipient: Recipient
}

export interface WishlistItem {
  id: string
  roomId: string
  playerId: string
  title: string
  url: string | null
  imageUrl: string | null
  price: number | null
  inStock: boolean | null
  source: WishlistSource
}

export interface AddWishlistItemRequest {
  source?: WishlistSource
  code?: string
  title?: string
  url?: string
  imageUrl?: string
  price?: number
  inStock?: boolean
}

export interface PatchWishlistItemRequest {
  title?: string
  url?: string
  imageUrl?: string
  price?: number
  inStock?: boolean
}

export interface ParseProductRequest {
  source: Exclude<WishlistSource, 'manual'>
  code: string
}

export interface ParseProductResponse {
  source: WishlistSource
  code: string
  link: string | null
  title: string | null
  imageUrl: string | null
  price: number | null
  inStock: boolean | null
  parsed: boolean
}

export type RoomEvent =
  | { type: 'roomUpdated'; name: string; budget: number }
  | { type: 'playerJoined'; playerId: string; name: string; avatar: number }
  | { type: 'playerLeft'; playerId: string }
  | { type: 'exclusionsUpdated' }
  | { type: 'wishlistUpdated'; playerId: string }
  | { type: 'shuffleCompleted' }
