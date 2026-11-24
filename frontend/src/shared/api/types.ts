export type RoomStatus = 'lobby' | 'shuffled'

export type ApiErrorCode =
  | 'room_not_found'
  | 'name_taken'
  | 'not_organizer'
  | 'forbidden'
  | 'unauthorized'
  | 'wrong_status'
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
  /** Комментарий к своему вишлисту — видит тот, кому выпало дарить. */
  wishlistComment: string | null
}

export interface PlayerWithToken extends Player {
  token: string
}

export interface RoomDetails extends Room {
  players: Player[]
  me: Player
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
  /** Комментарий получателя к своему вишлисту. */
  comment: string | null
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
}

export interface AddWishlistItemRequest {
  title: string
  url?: string
  price?: number
}

export interface PatchWishlistItemRequest {
  title?: string
  url?: string
  price?: number
}

export type RoomEvent =
  | { type: 'roomUpdated'; name: string; budget: number }
  | { type: 'playerJoined'; playerId: string; name: string; avatar: number }
  | { type: 'playerLeft'; playerId: string }
  | { type: 'exclusionsUpdated' }
  | { type: 'wishlistUpdated'; playerId: string }
  | { type: 'shuffleCompleted' }
  | { type: 'roomReset' }
