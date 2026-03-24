# Timeline Enhancements — Design Spec
**Date:** 2026-03-24
**Project:** donde-esta-renata
**Status:** Approved

---

## Overview

Four independent UI/UX improvements to the main timeline (`MapView`) and the photo viewer (`PhotoViewer`). All changes are additive and mobile-first (iPhone Safari primary target).

---

## Feature 1: Thumbnails in Timeline Cards

### Goal
Show 3–4 real photo thumbnails inside each stop card so the family can preview photos without tapping in.

### Data Layer (`app/page.tsx`)
Add a single query using `ROW_NUMBER()` window function to fetch the 4 most recent photos per stop:

```sql
SELECT id, stop_id, r2_key, thumbnail_key
FROM (
  SELECT id, stop_id, r2_key, thumbnail_key, taken_at, uploaded_at,
         ROW_NUMBER() OVER (PARTITION BY stop_id ORDER BY taken_at DESC, uploaded_at DESC) AS rn
  FROM photos
  WHERE stop_id IS NOT NULL
)
WHERE rn <= 4
```

Map result into `photosByStop: Record<string, { id: string; imgKey: string }[]>` where `imgKey = thumbnail_key ?? r2_key`. `thumbnail_key` is nullable in the schema (used for video poster frames); the `??` fallback to `r2_key` handles all cases safely.

### Props
`MapView` receives a new prop: `photosByStop: Record<string, { id: string; imgKey: string }[]>`

### Render
- Shown only for `visited` and `current` stops (not `pending`)
- Horizontal row of up to 4 `<img>` tags, each 64×64px, `object-cover`, `border-radius: 8px`
- `src={`/api/media/${encodeURIComponent(imgKey)}`}` — same pattern used throughout the app (e.g., `mediaUrl()` in PhotoViewer)
- `loading="lazy"`, `alt=""` (decorative)
- Positioned below the photo count text
- Only rendered if the stop has at least 1 photo

### Constraints
- No new API routes needed — uses existing `/api/media/[key]`
- Presigned URLs are generated on each browser request (redirect pattern already in place)

---

## Feature 2: Auto-Refresh Every 5 Minutes

### Goal
Keep trip status and photo counts fresh without user interaction.

### Implementation
In `MapView` (already a client component with `const router = useRouter()` on line 51), add one `useEffect`:

```ts
useEffect(() => {
  const id = setInterval(() => router.refresh(), 5 * 60 * 1000)
  return () => clearInterval(id)
}, [])  // empty deps — interval runs once on mount; router.refresh() always reads the current router
```

- `router.refresh()` re-fetches server component data without affecting client-side React state (no form state or in-flight mutations exist in `MapView`)
- Interval starts on mount, cleans up on unmount
- No loading state or user-visible indicator needed

---

## Feature 3: Aggregated Reactions in Timeline Cards

### Goal
Show a quick emoji summary (e.g., ❤️ 8  😍 3) on each stop card so the family sees engagement at a glance.

### Data Layer (`app/page.tsx`)
Add a query joining `reactions` → `photos`:

```sql
SELECT p.stop_id, r.emoji, COUNT(*) AS count
FROM reactions r
JOIN photos p ON r.photo_id = p.id
WHERE r.emoji IS NOT NULL AND p.stop_id IS NOT NULL
GROUP BY p.stop_id, r.emoji
ORDER BY count DESC
```

Map into `reactionsByStop: Record<string, Record<string, number>>`:
- Outer key: `stop_id`
- Inner key: emoji string → count

### Props
`MapView` receives: `reactionsByStop: Record<string, Record<string, number>>`

### Render
- Shown for `visited` and `current` stops only
- Rendered below the thumbnail row (or below photo count if no thumbnails)
- Show up to 3 emojis, sorted by count descending; ties broken by the order returned from the DB (stable)
- Format: `❤️ 8  😍 3  🤩 1`
- Same typographic style as photo count: `fontSize: 13`, `color: '#b8905a'`, `fontWeight: 500`
- Only rendered if at least one reaction exists for the stop

---

## Feature 4: Share Button in PhotoViewer

### Goal
Let family members share a photo URL via the native iOS share sheet.

### Implementation (`app/stops/[id]/photos/[photoId]/PhotoViewer.tsx`)

`stop` is already a required prop: `stop: { id: string; name: string }`. `stop.name` is used directly in the share call.

**Feature detection** (runs once on mount):
```ts
const [canShare, setCanShare] = useState(false)
useEffect(() => {
  setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
}, [])
```

**Share handler:**
```ts
const handleShare = () => {
  navigator.share({ title: stop.name, url: window.location.href }).catch(() => {})
}
```

Errors from `navigator.share()` (including user cancellation, which throws `AbortError`) are silently swallowed — no toast or error state needed.

**URL shared:** `window.location.href` — the photo viewer URL (e.g., `/stops/[id]/photos/[photoId]`). The app is fully auth-gated; recipients need to log in to view it. This is intentional — the app is private to the family.

**Render:** If `canShare`, add a share button to the top bar (right side, alongside the "X / N" counter). Tapping it calls `handleShare()`. If the browser does not support `navigator.share`, the button does not render — no fallback UI.

### Top bar layout (updated)
```
[← Stop name]         [share icon]  [X / N]
```

Share icon: upload/share symbol (↑ in a box), 24px, color `#8a6040` to match the counter.

---

## Architecture Summary

| File | Changes |
|------|---------|
| `app/page.tsx` | +2 DB queries (thumbnails, reactions); extend `MapView` props |
| `app/components/MapView.tsx` | New props + thumbnail row + reaction summary + auto-refresh interval |
| `app/stops/[id]/photos/[photoId]/PhotoViewer.tsx` | Share button with feature detection |
| `lib/types.ts` | No changes needed |
| API routes | No changes needed |

All DB queries run server-side. No new API endpoints. No new dependencies.
