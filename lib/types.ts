// ─── Shared domain types ──────────────────────────────────────────────────────

export interface PhotoData {
  id: string
  stop_id: string | null
  r2_key: string
  thumbnail_key: string | null
  taken_at: string | null
  lat: number | null
  lng: number | null
  media_type: string
  uploaded_at: string
  assignment: string | null
}

export interface ReactionData {
  id: string
  photo_id: string
  emoji: string | null
  comment: string | null
  reactor: string
  created_at: string
}

export interface StopThumbnail {
  id: string
  imgKey: string
}

export type ReactionsByStop = Record<string, Record<string, number>>
