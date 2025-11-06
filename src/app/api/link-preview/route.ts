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
    const timeout = setTimeout(() => controller.abort(), 10000) // Increased timeout

    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        }
      })

      clearTimeout(timeout)

      if (!res.ok) {
        // Return basic data even if fetch failed
        return NextResponse.json({
          url,
          domain: getDomain(url)
        } satisfies OgData)
      }

      const html = await res.text()

      const title = extractAnyOg(html, ['og:title', 'twitter:title'])
        || html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]
        || undefined

      const description = extractAnyOg(html, ['og:description', 'twitter:description'])
        || html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i)?.[1]
        || undefined

      let image = extractAnyOg(html, ['og:image', 'og:image:url', 'twitter:image', 'twitter:image:src'])

      // Resolve relative image URLs
      if (image && !/^https?:\/\//i.test(image)) {
        try {
          image = new URL(image, url).toString()
        } catch {
          image = undefined
        }
      }

      // Clean up image URL (remove query params that might cause issues)
      if (image) {
        try {
          const imgUrl = new URL(image)
          // Keep only essential query params
          imgUrl.search = ''
          image = imgUrl.toString()
        } catch {
          // Keep original if URL parsing fails
        }
      }

      const payload: OgData = {
        url,
        domain: getDomain(url),
        title: title?.trim() || undefined,
        description: description?.trim() || undefined,
        image: image || undefined
      }

      return NextResponse.json(payload)
    } catch (fetchError: any) {
      clearTimeout(timeout)
      
      // If fetch failed, return basic data
      if (fetchError.name === 'AbortError') {
        console.error('Link preview fetch timeout:', url)
      } else {
        console.error('Link preview fetch error:', url, fetchError.message)
      }
      
      return NextResponse.json({
        url,
        domain: getDomain(url)
      } satisfies OgData)
    }
  } catch (error: any) {
    console.error('Link preview API error:', error.message)
    return NextResponse.json(
      { error: 'Failed to fetch metadata', message: error.message },
      { status: 500 }
    )
  }
}


