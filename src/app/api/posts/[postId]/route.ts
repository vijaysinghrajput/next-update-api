'use server'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not set')
}

if (!serviceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set')
}

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})

export async function PATCH(request: Request, { params }: { params: { postId: string } }) {
  const postId = params.postId

  if (!postId) {
    return NextResponse.json({ error: 'Post id is required' }, { status: 400 })
  }

  let payload: {
    title?: string | null
    caption?: string | null
    mediaUrls?: string[]
    mediaType?: 'image' | 'video'
    removedExistingUrls?: string[]
  }

  try {
    payload = await request.json()
  } catch (error) {
    return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
  }

  const authHeader = request.headers.get('authorization') || ''
  const tokenMatch = authHeader.match(/^Bearer (.+)$/)
  const accessToken = tokenMatch?.[1]

  if (!accessToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(accessToken)

  if (authError || !authData?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = authData.user.id

  const { data: post, error: postError } = await supabaseAdmin
    .from('posts')
    .select('id, user_id')
    .eq('id', postId)
    .maybeSingle()

  if (postError) {
    return NextResponse.json({ error: postError.message }, { status: 400 })
  }

  if (!post || post.user_id !== userId) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const updatePayload: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (payload.title !== undefined) {
    updatePayload.title = payload.title
  }

  if (payload.caption !== undefined) {
    updatePayload.caption = payload.caption
  }

  if (payload.mediaUrls !== undefined) {
    updatePayload.media_urls = Array.isArray(payload.mediaUrls) ? payload.mediaUrls : []
  }

  if (payload.mediaType !== undefined) {
    const normalizedMediaType = payload.mediaType === 'video' ? 'video' : 'image'
    updatePayload.media_type = normalizedMediaType
  }

  const removedExistingUrls = Array.isArray(payload.removedExistingUrls)
    ? payload.removedExistingUrls.filter((url): url is string => typeof url === 'string' && url.length > 0)
    : []

  const { data: updatedPost, error: updateError } = await supabaseAdmin
    .from('posts')
    .update(updatePayload)
    .eq('id', postId)
    .select(`
      *,
      profiles:user_id (
        id,
        name,
        avatar_url,
        is_verified,
        has_blue_tick
      )
    `)
    .maybeSingle()

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 })
  }

  return NextResponse.json(
    { data: updatedPost, removedExistingUrls },
    { status: 200 }
  )
}

