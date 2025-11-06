import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type OgData = {
  url: string
  domain: string
  title?: string
  description?: string
  image?: string
}

function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

function getDomain(url: string): string {
  try {
    const u = new URL(url)
    return u.hostname.replace('www.', '')
  } catch {
    return url
  }
}

function extractMeta(content: string, key: string, attr: 'property' | 'name' = 'property'): string | undefined {
  const rgx = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i')
  const match = content.match(rgx)
  return match?.[1]
}

function extractAnyOg(content: string, keys: string[]): string | undefined {
  for (const key of keys) {
    const byProperty = extractMeta(content, key, 'property')
    if (byProperty) return byProperty
    const byName = extractMeta(content, key, 'name')
    if (byName) return byName
  }
  return undefined
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()

    if (!url || typeof url !== 'string' || !isValidHttpUrl(url)) {
      return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 8000)

    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LinkPreviewBot/1.0; +https://example.com)'
      }
    })

    clearTimeout(timeout)

    if (!res.ok) {
      return NextResponse.json({
        url,
        domain: getDomain(url)
      } satisfies OgData)
    }

    const html = await res.text()

    const title = extractAnyOg(html, ['og:title', 'twitter:title'])
      || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]

    const description = extractAnyOg(html, ['og:description', 'twitter:description'])
      || html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i)?.[1]

    let image = extractAnyOg(html, ['og:image', 'og:image:url', 'twitter:image'])

    // Resolve relative image URLs
    if (image && !/^https?:\/\//i.test(image)) {
      try {
        image = new URL(image, url).toString()
      } catch {
        // ignore invalid image URL
      }
    }

    const payload: OgData = {
      url,
      domain: getDomain(url),
      title: title || undefined,
      description: description || undefined,
      image: image || undefined
    }

    return NextResponse.json(payload)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 })
  }
}


