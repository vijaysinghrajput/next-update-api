import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// This route runs on the server and can safely use private env vars

const BUCKET_NAME = process.env.R2_BUCKET_NAME
const PUBLIC_URL = process.env.R2_PUBLIC_URL
const ENDPOINT = process.env.R2_ENDPOINT
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY

// Log environment check on startup
console.log('[R2 Upload] Environment Check:', {
  hasBucket: !!BUCKET_NAME,
  hasPublicUrl: !!PUBLIC_URL,
  hasEndpoint: !!ENDPOINT,
  hasAccessKey: !!ACCESS_KEY_ID,
  hasSecretKey: !!SECRET_ACCESS_KEY,
})

if (!BUCKET_NAME || !PUBLIC_URL || !ENDPOINT || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.warn('[R2] Missing one or more environment variables. Uploads will fail until configured.')
}

const r2Client = new S3Client({
  region: 'auto',
  endpoint: ENDPOINT?.trim(),
  credentials: {
    accessKeyId: (ACCESS_KEY_ID || '').trim(),
    secretAccessKey: (SECRET_ACCESS_KEY || '').trim(),
  },
})

export async function POST(req: NextRequest) {
  try {
    console.log('[R2 Upload] Received upload request')
    
    if (!BUCKET_NAME || !PUBLIC_URL) {
      console.error('[R2 Upload] Missing BUCKET_NAME or PUBLIC_URL')
      return NextResponse.json({ 
        error: 'R2 not configured',
        details: {
          hasBucket: !!BUCKET_NAME,
          hasPublicUrl: !!PUBLIC_URL,
        }
      }, { status: 500 })
    }

    if (!ENDPOINT || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
      console.error('[R2 Upload] Missing R2 credentials')
      return NextResponse.json({ 
        error: 'R2 credentials not configured',
        details: {
          hasEndpoint: !!ENDPOINT,
          hasAccessKey: !!ACCESS_KEY_ID,
          hasSecretKey: !!SECRET_ACCESS_KEY,
        }
      }, { status: 500 })
    }

    const form = await req.formData()
    const file = form.get('file') as File | null
    const key = String(form.get('key') || '')
    const contentType = String(form.get('contentType') || 'application/octet-stream')

    console.log('[R2 Upload] File:', file?.name, 'Key:', key, 'Type:', contentType)

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }
    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log('[R2 Upload] Buffer size:', buffer.length, 'bytes')

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })

    await r2Client.send(command)

    // Return direct R2 URL (bucket is publicly accessible)
    const resultUrl = `${PUBLIC_URL}/${key}`
    console.log('[R2 Upload] Success:', resultUrl)

    return NextResponse.json({
      success: true,
      url: resultUrl,
      key,
    })
  } catch (error: any) {
    console.error('[R2 Upload] Error:', error?.message || error)
    console.error('[R2 Upload] Full error:', error)
    return NextResponse.json({ 
      error: 'Upload failed',
      details: error?.message || String(error)
    }, { status: 500 })
  }
}


