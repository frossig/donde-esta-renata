// NOTE: CORS must be enabled on the R2 bucket to allow PUT requests from the browser.
// In the R2 dashboard, add a CORS rule:
//   Allowed Origins: https://your-domain.com (or * for dev)
//   Allowed Methods: PUT, GET
//   Allowed Headers: Content-Type

import { S3Client } from '@aws-sdk/client-s3'

function createR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing R2 environment variables: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY')
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  })
}

let _r2: S3Client | null = null
export function getR2(): S3Client {
  if (!_r2) _r2 = createR2Client()
  return _r2
}

export function getBucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME
  if (!bucket) throw new Error('Missing R2_BUCKET_NAME environment variable')
  return bucket
}
