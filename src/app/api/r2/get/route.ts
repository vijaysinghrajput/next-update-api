import { NextRequest } from 'next/server'
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const BUCKET_NAME = process.env.R2_BUCKET_NAME
const ENDPOINT = process.env.R2_ENDPOINT
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY

const r2Client = new S3Client({
  region: 'auto',
  endpoint: ENDPOINT?.trim(),
  credentials: {
    accessKeyId: (ACCESS_KEY_ID || '').trim(),
    secretAccessKey: (SECRET_ACCESS_KEY || '').trim(),
  },
})

export async function GET(req: NextRequest) {
  try {
    if (!BUCKET_NAME) {
      return new Response('R2 not configured', { status: 500 })
    }
    const { searchParams } = new URL(req.url)
    const key = searchParams.get('key')
    if (!key) return new Response('key is required', { status: 400 })

    const res = await r2Client.send(new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }))
    const body = res.Body as ReadableStream
    const headers = new Headers()
    if (res.ContentType) headers.set('Content-Type', res.ContentType)
    if (res.ETag) headers.set('ETag', res.ETag)
    if (res.ContentLength) headers.set('Content-Length', String(res.ContentLength))
    headers.set('Cache-Control', 'public, max-age=31536000, immutable')
    return new Response(body as any, { headers, status: 200 })
  } catch (e: any) {
    console.error('[R2 Get] Error', e?.message || e)
    return new Response('Not found', { status: 404 })
  }
}


