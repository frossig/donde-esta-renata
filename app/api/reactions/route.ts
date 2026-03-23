import { getDb } from '@/lib/db'
import { getRoleFromCookies } from '@/lib/auth'

const VALID_REACTORS = ['Faus', 'Alfo', 'Papá', 'Mamá'] as const
type Reactor = (typeof VALID_REACTORS)[number]

const VALID_EMOJIS = ['❤️', '😍', '😂', '🤩', '👏']

// ─── GET /api/reactions?photoId=xxx ───────────────────────────────────────────

export async function GET(request: Request) {
  const role = await getRoleFromCookies()
  if (!role) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const photoId = searchParams.get('photoId')

  if (!photoId) {
    return Response.json({ error: 'photoId is required' }, { status: 400 })
  }

  const db = await getDb()
  const result = await db.execute({
    sql: `SELECT id, photo_id, emoji, comment, reactor, created_at
          FROM reactions
          WHERE photo_id = ?
          ORDER BY created_at ASC`,
    args: [photoId],
  })

  const reactions = result.rows.map((r) => ({
    id:         r.id         as string,
    photo_id:   r.photo_id   as string,
    emoji:      r.emoji      as string | null,
    comment:    r.comment    as string | null,
    reactor:    r.reactor    as string,
    created_at: r.created_at as string,
  }))

  return Response.json({ reactions })
}

// ─── POST /api/reactions ──────────────────────────────────────────────────────

export async function POST(request: Request) {
  const role = await getRoleFromCookies()
  if (!role) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { photoId, emoji, comment, reactor } = body as {
    photoId?: unknown
    emoji?: unknown
    comment?: unknown
    reactor?: unknown
  }

  // Validate required fields
  if (!photoId || typeof photoId !== 'string') {
    return Response.json({ error: 'photoId is required' }, { status: 400 })
  }

  if (!reactor || typeof reactor !== 'string') {
    return Response.json({ error: 'reactor is required' }, { status: 400 })
  }

  if (!(VALID_REACTORS as readonly string[]).includes(reactor)) {
    return Response.json(
      { error: `reactor must be one of: ${VALID_REACTORS.join(', ')}` },
      { status: 400 },
    )
  }

  const emojiVal = typeof emoji === 'string' && emoji.length > 0 ? emoji : null
  const commentRaw = typeof comment === 'string' ? comment.trim() : null
  const commentVal = commentRaw && commentRaw.length > 0 ? commentRaw : null

  // Validate emoji value
  if (emojiVal !== null && !VALID_EMOJIS.includes(emojiVal)) {
    return Response.json({ error: 'Invalid emoji' }, { status: 400 })
  }

  // At least one of emoji or comment must be present
  if (!emojiVal && !commentVal) {
    return Response.json(
      { error: 'At least one of emoji or comment must be provided' },
      { status: 400 },
    )
  }

  // Comment length validation
  if (commentVal && commentVal.length > 200) {
    return Response.json(
      { error: 'Comment must be 200 characters or fewer' },
      { status: 400 },
    )
  }

  const db = await getDb()

  // Verify photo exists
  const photoResult = await db.execute({
    sql: `SELECT id FROM photos WHERE id = ?`,
    args: [photoId],
  })

  if (photoResult.rows.length === 0) {
    return Response.json({ error: 'Photo not found' }, { status: 404 })
  }

  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  await db.execute({
    sql: `INSERT INTO reactions (id, photo_id, emoji, comment, reactor, created_at)
          VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(photo_id, reactor) DO UPDATE SET
            emoji = excluded.emoji,
            comment = excluded.comment,
            created_at = excluded.created_at`,
    args: [id, photoId, emojiVal, commentVal, reactor as Reactor, createdAt],
  })

  // Fetch the saved reaction to return it
  const savedResult = await db.execute({
    sql: `SELECT id, photo_id, emoji, comment, reactor, created_at
          FROM reactions
          WHERE photo_id = ? AND reactor = ?`,
    args: [photoId, reactor],
  })

  const saved = savedResult.rows[0]
  return Response.json({
    reaction: {
      id:         saved.id         as string,
      photo_id:   saved.photo_id   as string,
      emoji:      saved.emoji      as string | null,
      comment:    saved.comment    as string | null,
      reactor:    saved.reactor    as string,
      created_at: saved.created_at as string,
    },
  })
}
