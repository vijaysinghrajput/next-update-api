import { LinkPreviewData, getLinkPreview } from './linkPreview'

const previewCache = new Map<string, LinkPreviewData>()

export function getBasePreviews(urls: string[]): LinkPreviewData[] {
  return urls.map(url => {
    const cached = previewCache.get(url)
    if (cached) return cached

    const generated = getLinkPreview(url)
    previewCache.set(url, generated)
    return generated
  })
}

export async function enhancePreviews(previews: LinkPreviewData[]): Promise<LinkPreviewData[]> {
  return Promise.all(previews.map(async (preview) => {
    if (preview.type !== 'link') {
      previewCache.set(preview.url, preview)
      return preview
    }

    const cached = previewCache.get(preview.url)
    if (cached && cached.type !== 'link' && cached.title && cached.description) {
      return cached
    }

    let lastError: Error | null = null
    for (let attempt = 0; attempt < 2; attempt++) {
      let timeout: NodeJS.Timeout | null = null
      try {
        const controller = new AbortController()
        timeout = setTimeout(() => controller.abort(), 8000)

        const res = await fetch('/api/link-preview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: preview.url }),
          signal: controller.signal
        })

        if (timeout) clearTimeout(timeout)

        if (!res.ok) {
          const errorData = await res.json().catch(() => null)
          if (errorData && !errorData.error) {
            const enriched: LinkPreviewData = {
              ...preview,
              title: errorData.title || preview.title,
              description: errorData.description || preview.description,
              image: errorData.image || preview.image,
              domain: errorData.domain || preview.domain
            }
            previewCache.set(preview.url, enriched)
            return enriched
          }
          throw new Error(`HTTP ${res.status}`)
        }

        const data = await res.json()
        if (data.error) {
          return preview
        }

        const enriched: LinkPreviewData = {
          ...preview,
          title: data.title || preview.title,
          description: data.description || preview.description,
          image: data.image || preview.image,
          domain: data.domain || preview.domain
        }
        previewCache.set(preview.url, enriched)
        return enriched
      } catch (error: any) {
        if (timeout) clearTimeout(timeout)
        lastError = error
        if (attempt < 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
        }
      }
    }

    if (lastError) {
      console.debug('Link preview enhancement failed:', preview.url, lastError)
    }

    const fallback = previewCache.get(preview.url)
    return fallback || preview
  }))
}

export function clearPreviewCache() {
  previewCache.clear()
}

