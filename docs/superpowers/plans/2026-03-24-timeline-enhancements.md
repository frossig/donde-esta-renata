# Timeline Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add photo thumbnails, auto-refresh, aggregated reactions, and a Web Share button to the timeline and photo viewer.

**Architecture:** All DB queries run server-side in `app/page.tsx` and are passed as props to `MapView`. The share button lives entirely in `PhotoViewer` with client-side feature detection. No new API routes or dependencies needed.

**Tech Stack:** Next.js 16.2.1 (App Router), React 19, TypeScript (strict), Turso/SQLite, Tailwind CSS, R2 for media.

**Verification:** No test runner is set up. Verify each task with `npx tsc --noEmit` (type-check). Final build verification with `npm run build`.

---

## File Map

| File | What changes |
|------|-------------|
| `app/page.tsx` | +2 DB queries (thumbnails, reactions); pass 2 new props to MapView |
| `app/components/MapView.tsx` | +2 new props; thumbnail row render; reaction summary render; auto-refresh interval |
| `app/stops/[id]/photos/[photoId]/PhotoViewer.tsx` | Share button with feature detection |

---

## Task 1: Photo Thumbnails in Timeline Cards

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/components/MapView.tsx`

### Step 1.1 — Add thumbnail query to `app/page.tsx`

After the `photoCounts` query (around line 36), add:

```typescript
// Fetch up to 4 most-recent thumbnail keys per stop
const thumbnailsResult = await db.execute(
  `SELECT id, stop_id, r2_key, thumbnail_key
   FROM (
     SELECT id, stop_id, r2_key, thumbnail_key, taken_at, uploaded_at,
            ROW_NUMBER() OVER (PARTITION BY stop_id ORDER BY taken_at DESC, uploaded_at DESC) AS rn
     FROM photos
     WHERE stop_id IS NOT NULL
   )
   WHERE rn <= 4`
)

const photosByStop: Record<string, { id: string; imgKey: string }[]> = {}
for (const row of thumbnailsResult.rows) {
  const stopId = row.stop_id as string
  const imgKey = (row.thumbnail_key as string | null) ?? (row.r2_key as string)
  if (!photosByStop[stopId]) photosByStop[stopId] = []
  photosByStop[stopId].push({ id: row.id as string, imgKey })
}
```

- [ ] Add the query and mapping above to `app/page.tsx`

### Step 1.2 — Pass `photosByStop` to `MapView` in `app/page.tsx`

Update the return statement (currently line 108):

```typescript
return (
  <MapView
    stops={computedStops}
    tripStatus={computedTripStatus}
    photoCounts={photoCounts}
    photosByStop={photosByStop}
  />
)
```

- [ ] Update the `MapView` JSX call to include `photosByStop={photosByStop}`

### Step 1.3 — Add `photosByStop` to `MapView` Props interface

In `app/components/MapView.tsx`, update the `Props` interface (currently lines 27–31):

```typescript
interface Props {
  stops: Stop[]
  tripStatus: TripStatus | null
  photoCounts: Record<string, number>
  photosByStop: Record<string, { id: string; imgKey: string }[]>
}
```

Update the function signature:

```typescript
export default function MapView({ stops, tripStatus, photoCounts, photosByStop }: Props) {
```

- [ ] Update Props interface and function signature in `MapView.tsx`

### Step 1.4 — Render thumbnail row in each card

In `MapView.tsx`, inside the card's `<button>`, after the photo count paragraph (currently around line 263), add:

```typescript
{/* Thumbnail strip */}
{state !== 'pending' && photosByStop[stop.id]?.length > 0 && (
  <div className="mt-2 flex gap-1.5 overflow-hidden">
    {photosByStop[stop.id].slice(0, 4).map((p) => (
      <img
        key={p.id}
        src={`/api/media/${encodeURIComponent(p.imgKey)}`}
        alt=""
        loading="lazy"
        style={{
          width: 64,
          height: 64,
          objectFit: 'cover',
          borderRadius: 8,
          flexShrink: 0,
        }}
      />
    ))}
  </div>
)}
```

- [ ] Add the thumbnail strip JSX after the photo count paragraph

### Step 1.5 — Type-check

```bash
cd /Users/fausto/Projects/donde-esta-renata && npx tsc --noEmit
```

Expected: no errors.

- [ ] Run type-check and fix any errors

### Step 1.6 — Commit

```bash
cd /Users/fausto/Projects/donde-esta-renata
git add app/page.tsx app/components/MapView.tsx
git commit -m "feat: show photo thumbnails in timeline stop cards"
```

- [ ] Commit

---

## Task 2: Auto-Refresh Every 5 Minutes

**Files:**
- Modify: `app/components/MapView.tsx`

### Step 2.1 — Add `useEffect` import (if not already present)

`useEffect` is not currently imported in `MapView.tsx`. Add it to the React import at the top:

```typescript
import { useEffect } from 'react'
```

The file currently has no React imports (hooks come from the `'react'` package). Add this as the first line after `'use client'`:

```typescript
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
```

- [ ] Add `useEffect` import to `MapView.tsx`

### Step 2.2 — Add the refresh interval

Inside `MapView`, after the `const router = useRouter()` line (line 51), add:

```typescript
useEffect(() => {
  const id = setInterval(() => router.refresh(), 5 * 60 * 1000)
  return () => clearInterval(id)
}, []) // empty deps — runs once on mount
```

- [ ] Add the `useEffect` with `setInterval` after the router declaration

### Step 2.3 — Type-check

```bash
cd /Users/fausto/Projects/donde-esta-renata && npx tsc --noEmit
```

Expected: no errors.

- [ ] Run type-check and fix any errors

### Step 2.4 — Commit

```bash
cd /Users/fausto/Projects/donde-esta-renata
git add app/components/MapView.tsx
git commit -m "feat: auto-refresh timeline data every 5 minutes"
```

- [ ] Commit

---

## Task 3: Aggregated Reactions in Timeline Cards

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/components/MapView.tsx`

### Step 3.1 — Add reactions aggregation query to `app/page.tsx`

After the `thumbnailsResult` block from Task 1, add:

```typescript
// Fetch aggregated emoji reactions per stop
const reactionsResult = await db.execute(
  `SELECT p.stop_id, r.emoji, COUNT(*) AS count
   FROM reactions r
   JOIN photos p ON r.photo_id = p.id
   WHERE r.emoji IS NOT NULL AND p.stop_id IS NOT NULL
   GROUP BY p.stop_id, r.emoji
   ORDER BY count DESC`
)

const reactionsByStop: Record<string, Record<string, number>> = {}
for (const row of reactionsResult.rows) {
  const stopId = row.stop_id as string
  const emoji = row.emoji as string
  const count = Number(row.count ?? 0)
  if (!reactionsByStop[stopId]) reactionsByStop[stopId] = {}
  reactionsByStop[stopId][emoji] = count
}
```

- [ ] Add the reactions query and mapping to `app/page.tsx`

### Step 3.2 — Pass `reactionsByStop` to `MapView`

Update the `MapView` JSX call:

```typescript
return (
  <MapView
    stops={computedStops}
    tripStatus={computedTripStatus}
    photoCounts={photoCounts}
    photosByStop={photosByStop}
    reactionsByStop={reactionsByStop}
  />
)
```

- [ ] Add `reactionsByStop={reactionsByStop}` to the `MapView` call

### Step 3.3 — Add `reactionsByStop` to `MapView` Props interface

In `app/components/MapView.tsx`, extend the Props interface again:

```typescript
interface Props {
  stops: Stop[]
  tripStatus: TripStatus | null
  photoCounts: Record<string, number>
  photosByStop: Record<string, { id: string; imgKey: string }[]>
  reactionsByStop: Record<string, Record<string, number>>
}
```

Update the function signature:

```typescript
export default function MapView({ stops, tripStatus, photoCounts, photosByStop, reactionsByStop }: Props) {
```

- [ ] Update Props interface and function signature

### Step 3.4 — Render reaction summary in each card

In `MapView.tsx`, after the thumbnail strip added in Task 1, add:

```typescript
{/* Reaction summary */}
{state !== 'pending' && (() => {
  const emojiMap = reactionsByStop[stop.id]
  if (!emojiMap) return null
  const entries = Object.entries(emojiMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
  if (entries.length === 0) return null
  return (
    <p className="mt-1.5" style={{ fontSize: 13, color: '#b8905a', fontWeight: 500 }}>
      {entries.map(([emoji, count]) => `${emoji} ${count}`).join('  ')}
    </p>
  )
})()}
```

- [ ] Add reaction summary JSX after the thumbnail strip

### Step 3.5 — Type-check

```bash
cd /Users/fausto/Projects/donde-esta-renata && npx tsc --noEmit
```

Expected: no errors.

- [ ] Run type-check and fix any errors

### Step 3.6 — Commit

```bash
cd /Users/fausto/Projects/donde-esta-renata
git add app/page.tsx app/components/MapView.tsx
git commit -m "feat: show aggregated emoji reactions on timeline cards"
```

- [ ] Commit

---

## Task 4: Share Button in PhotoViewer

**Files:**
- Modify: `app/stops/[id]/photos/[photoId]/PhotoViewer.tsx`

### Step 4.1 — Add `canShare` state and feature detection

In `PhotoViewer.tsx`, the existing state declarations start around line 48. Add after them:

```typescript
// ── Share state ──
const [canShare, setCanShare] = useState(false)
useEffect(() => {
  setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
}, [])
```

`useState` and `useEffect` are already imported (line 5).

- [ ] Add `canShare` state and detection `useEffect`

### Step 4.2 — Add share handler

After the `canShare` effect, add:

```typescript
const handleShare = () => {
  navigator.share({ title: stop.name, url: window.location.href }).catch(() => {})
}
```

- [ ] Add `handleShare` function

### Step 4.3 — Add share button to top bar

The current top bar (lines 172–192) ends with the `{currentPhotoIndex + 1} / {total}` counter. Replace that counter `<span>` with a wrapper that puts the share button to its left:

```typescript
<div className="flex items-center gap-3">
  {canShare && (
    <button
      onClick={handleShare}
      aria-label="Compartir foto"
      className="flex items-center justify-center transition-opacity hover:opacity-70 active:opacity-50"
      style={{ color: '#8a6040' }}
    >
      <svg
        width={22}
        height={22}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>
    </button>
  )}
  <span
    className="text-sm font-medium tabular-nums"
    style={{ color: '#8a6040' }}
  >
    {currentPhotoIndex + 1} / {total}
  </span>
</div>
```

- [ ] Replace the counter `<span>` with the wrapper `<div>` containing the share button and counter

### Step 4.4 — Type-check

```bash
cd /Users/fausto/Projects/donde-esta-renata && npx tsc --noEmit
```

Expected: no errors.

- [ ] Run type-check and fix any errors

### Step 4.5 — Commit

```bash
cd /Users/fausto/Projects/donde-esta-renata
git add app/stops/[id]/photos/[photoId]/PhotoViewer.tsx
git commit -m "feat: add Web Share API button to photo viewer"
```

- [ ] Commit

---

## Final Verification

### Step F.1 — Full build

```bash
cd /Users/fausto/Projects/donde-esta-renata && npm run build
```

Expected: build completes with no errors. Warnings about prerender are fine (page is `force-dynamic`).

- [ ] Run build and verify success

### Step F.2 — Manual smoke test checklist

On a real device or browser:
- [ ] Timeline cards for visited/current stops show up to 4 thumbnail images
- [ ] Pending stops have no thumbnails
- [ ] Emoji reaction summary (e.g., ❤️ 8  😍 3) appears on cards that have reactions
- [ ] On iPhone Safari, photo viewer top bar shows a share icon that opens the native share sheet
- [ ] On desktop Chrome (no Web Share), share icon does not appear
- [ ] Leaving the timeline open for 5 minutes triggers a silent data refresh (check Network tab for a server request)
