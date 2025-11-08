// Extract URLs from text
export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g
  return text.match(urlRegex) || []
}

// Check if URL is a YouTube video
export function isYouTubeUrl(url: string): boolean {
  return /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/.test(url)
}

// Extract YouTube video ID
export function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/)
  return match ? match[1] : null
}

// Get YouTube thumbnail
export function getYouTubeThumbnail(videoId: string): string {
  // maxresdefault.jpg is not always available; hqdefault.jpg is a reliable fallback
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
}

// Get YouTube embed URL
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`
}

// Check if URL is an image
export function isImageUrl(url: string): boolean {
  return /\.(jpg|jpeg|png|gif|webp|bmp|svg)$/i.test(url)
}

// Get domain from URL
export function getDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return url
  }
}

// Format URL for display
export function formatUrl(url: string): string {
  try {
    const urlObj = new URL(url)
    const domain = urlObj.hostname.replace('www.', '')
    const path = urlObj.pathname.length > 30 
      ? urlObj.pathname.substring(0, 30) + '...' 
      : urlObj.pathname
    return domain + path
  } catch {
    return url
  }
}

// Get Open Graph metadata (mock for now, would need API in production)
export interface LinkPreviewData {
  url: string
  title?: string
  description?: string
  image?: string
  domain: string
  type: 'youtube' | 'image' | 'link'
}

export function getLinkPreview(url: string): LinkPreviewData {
  const domain = getDomain(url)
  
  // YouTube video
  if (isYouTubeUrl(url)) {
    const videoId = getYouTubeId(url)
    return {
      url,
      title: 'YouTube Video',
      image: videoId ? getYouTubeThumbnail(videoId) : undefined,
      domain: 'youtube.com',
      type: 'youtube'
    }
  }
  
  // Image URL
  if (isImageUrl(url)) {
    return {
      url,
      title: 'Image',
      image: url,
      domain,
      type: 'image'
    }
  }
  
  // Generic link
  return {
    url,
    title: formatUrl(url),
    domain,
    type: 'link'
  }
}
