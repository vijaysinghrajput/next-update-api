import { NextRequest, NextResponse } from 'next/server'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

// This route runs on the server and can safely use private env vars

const BUCKET_NAME = process.env.R2_BUCKET_NAME
const PUBLIC_URL = process.env.R2_PUBLIC_URL
const ENDPOINT = process.env.R2_ENDPOINT
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY

if (!BUCKET_NAME || !PUBLIC_URL || !ENDPOINT || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.warn('[R2] Missing one or more environment variables. Uploads will fail until configured.')
}

const r2Client = new S3Client({
  region: 'auto',
  endpoint: ENDPOINT,
  credentials: {
    accessKeyId: ACCESS_KEY_ID || '',
    secretAccessKey: SECRET_ACCESS_KEY || '',
  },
})

export async function POST(req: NextRequest) {
  try {
    if (!BUCKET_NAME || !PUBLIC_URL) {
      return NextResponse.json({ error: 'R2 not configured' }, { status: 500 })
    }

    const form = await req.formData()
    const file = form.get('file') as File | null
    const key = String(form.get('key') || '')
    const contentType = String(form.get('contentType') || 'application/octet-stream')

    if (!file) {
      return NextResponse.json({ error: 'File is required' }, { status: 400 })
    }
    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })

    await r2Client.send(command)

    return NextResponse.json({
      success: true,
      url: `${PUBLIC_URL}/${key}`,
      key,
    })
  } catch (error: any) {
    console.error('[R2 Upload] Error:', error?.message || error)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}


