/**
 * Clears all test data from local DB and R2 (dev/ prefix only).
 * Run with: npx tsx scripts/reset-dev-data.ts
 */

import { createClient } from '@libsql/client'
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3'
import { config } from 'dotenv'

config({ path: '.env.local' })

async function resetDevData() {
  console.log('🧹 Limpiando datos de prueba...\n')

  // ── Local DB ────────────────────────────────────────────────────────────────
  const db = createClient({ url: 'file:local.db' })

  const { rows: photoRows } = await db.execute('SELECT COUNT(*) as c FROM photos')
  const { rows: reactionRows } = await db.execute('SELECT COUNT(*) as c FROM reactions')
  console.log(`DB: ${reactionRows[0].c} reacciones, ${photoRows[0].c} fotos`)

  await db.execute('DELETE FROM reactions')
  await db.execute('DELETE FROM photos')
  await db.execute(`
    UPDATE trip_status SET
      state = 'at_stop',
      current_stop_id = NULL,
      from_stop_id = NULL,
      to_stop_id = NULL,
      transport_mode = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = 1
  `)
  // Also clear is_current on all stops
  await db.execute('UPDATE stops SET is_current = 0')

  console.log('✅ DB limpia (reactions, photos, trip_status, is_current reset)\n')

  // ── R2 dev/ prefix ──────────────────────────────────────────────────────────
  const accountId  = process.env.R2_ACCOUNT_ID
  const accessKey  = process.env.R2_ACCESS_KEY_ID
  const secretKey  = process.env.R2_SECRET_ACCESS_KEY
  const bucketName = process.env.R2_BUCKET_NAME

  if (!accountId || !accessKey || !secretKey || !bucketName) {
    console.log('⚠️  R2 env vars no encontradas, saltando limpieza de R2')
    return
  }

  const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
  })

  // List all objects with dev/ prefix
  let continuationToken: string | undefined
  const toDelete: { Key: string }[] = []

  do {
    const list = await r2.send(new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: 'dev/',
      ContinuationToken: continuationToken,
    }))
    for (const obj of list.Contents ?? []) {
      if (obj.Key) toDelete.push({ Key: obj.Key })
    }
    continuationToken = list.NextContinuationToken
  } while (continuationToken)

  if (toDelete.length === 0) {
    console.log('R2: no hay archivos con prefijo dev/')
    return
  }

  console.log(`R2: eliminando ${toDelete.length} archivos con prefijo dev/...`)

  // Delete in batches of 1000 (S3 API limit)
  for (let i = 0; i < toDelete.length; i += 1000) {
    const batch = toDelete.slice(i, i + 1000)
    await r2.send(new DeleteObjectsCommand({
      Bucket: bucketName,
      Delete: { Objects: batch, Quiet: true },
    }))
  }

  console.log(`✅ R2 limpio (${toDelete.length} archivos eliminados)\n`)
  console.log('🎉 Listo para deploy!')
}

resetDevData().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
