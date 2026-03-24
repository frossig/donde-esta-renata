/**
 * Generates placeholder PWA icons for Donde está Renata.
 * Creates cream (#faf6f1) backgrounds with a terracotta (#c4956a) circle.
 * Run with: npx tsx scripts/generate-icons.ts
 */
import sharp from 'sharp'
import path from 'path'

const sizes = [192, 512] as const
const publicDir = path.join(process.cwd(), 'public')

// Cream background: #faf6f1  → rgb(250, 246, 241)
// Terracotta:       #c4956a  → rgb(196, 149, 106)

async function generateIcon(size: number): Promise<void> {
  const center = size / 2
  const radius = Math.round(size * 0.38)
  const innerRadius = Math.round(size * 0.24)

  // SVG: cream background, terracotta filled circle, stylised plane path
  // Plane path is drawn relative to centre; scaled to ~38% of icon size.
  const s = radius * 0.9
  const cx = center
  const cy = center

  // Simple geometric airplane shape (no emoji, no external font)
  // Body: a horizontal rounded rectangle
  // Wings: two triangles fanning out from mid-body
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#faf6f1"/>
  <circle cx="${cx}" cy="${cy}" r="${radius}" fill="#c4956a"/>
  <!-- fuselage -->
  <ellipse cx="${cx}" cy="${cy}" rx="${s * 0.55}" ry="${s * 0.13}" fill="#faf6f1"/>
  <!-- main wings -->
  <polygon points="
    ${cx - s * 0.1},${cy}
    ${cx + s * 0.25},${cy - s * 0.42}
    ${cx + s * 0.35},${cy - s * 0.18}
    ${cx - s * 0.1},${cy + s * 0.05}
  " fill="#faf6f1" opacity="0.9"/>
  <polygon points="
    ${cx - s * 0.1},${cy}
    ${cx + s * 0.25},${cy + s * 0.42}
    ${cx + s * 0.35},${cy + s * 0.18}
    ${cx - s * 0.1},${cy - s * 0.05}
  " fill="#faf6f1" opacity="0.9"/>
  <!-- tail fins -->
  <polygon points="
    ${cx - s * 0.5},${cy}
    ${cx - s * 0.25},${cy - s * 0.28}
    ${cx - s * 0.18},${cy - s * 0.08}
  " fill="#faf6f1" opacity="0.8"/>
  <polygon points="
    ${cx - s * 0.5},${cy}
    ${cx - s * 0.25},${cy + s * 0.28}
    ${cx - s * 0.18},${cy + s * 0.08}
  " fill="#faf6f1" opacity="0.8"/>
</svg>`.trim()

  const outPath = path.join(publicDir, `icon-${size}.png`)

  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(outPath)

  console.log(`Generated ${outPath}`)
}

async function main() {
  for (const size of sizes) {
    await generateIcon(size)
  }
  console.log('Done.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
