// CLIENT-SAFE R2 HELPERS
// Note: We do NOT construct S3 client in the browser. All uploads go through /api/r2/upload
// to keep credentials on the server. PUBLIC_URL is only used to build returned URLs server-side.
// ✅ IMPORTANT: Make sure to set this in Vercel environment variables:
// NEXT_PUBLIC_R2_PUBLIC_URL=https://pub-08e1a83abb1d4ff0ac0fceba0438ba9c.r2.dev
// Or your custom domain if using one
const PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://pub-08e1a83abb1d4ff0ac0fceba0438ba9c.r2.dev'

export interface UploadResult {
  success: boolean
  url?: string
  key?: string
  error?: string
}

/**
 * Upload file to R2 storage
 */
export async function uploadToR2(
  file: Buffer | Uint8Array | string | Blob,
  key: string,
  contentType: string = 'application/octet-stream'
): Promise<UploadResult> {
  try {
    // Always call server route to upload securely
    const form = new FormData()
    const blob = file instanceof Blob ? file : new Blob([file as any], { type: contentType })
    form.append('file', blob)
    form.append('key', key)
    form.append('contentType', contentType)

    // Add timeout to avoid hanging UI
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25000)
    const res = await fetch('/api/r2/upload', {
      method: 'POST',
      body: form,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout))

    if (!res.ok) {
      // Try parsing JSON, else read text
      let errMsg = 'Upload failed'
      try {
        const data = await res.json()
        if (data?.details) {
          errMsg = `${data.error || errMsg}: ${data.details}`
        } else if (data?.error) {
          errMsg = data.error
        }
      } catch {
        try { errMsg = await res.text() } catch {}
      }
      throw new Error(errMsg)
    }

    const data = await res.json().catch(() => ({}))
    // Use the direct R2 public URL returned from the API
    return { success: true, url: data.url, key: data.key }
  } catch (error) {
    console.error('R2 upload error:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Upload failed' }
  }
}

/**
 * Delete file from R2 storage
 */
export async function deleteFromR2(key: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Implement a server route if delete is needed from the client in future
    console.warn('Delete from R2 is not available from client. Implement /api/r2/delete if needed.')
    return { success: false, error: 'Not implemented' }
  } catch (error) {
    return { success: false, error: 'Delete failed' }
  }
}

/**
 * Generate unique file key with timestamp and random string
 */
export function generateFileKey(originalName: string, folder: string = ''): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 8)
  const extension = originalName.split('.').pop()
  const baseName = originalName.split('.')[0].replace(/[^a-zA-Z0-9]/g, '_')
  
  const key = folder 
    ? `${folder}/${timestamp}_${random}_${baseName}.${extension}`
    : `${timestamp}_${random}_${baseName}.${extension}`
    
  return key
}

/**
 * Upload multiple files to R2
 */
export async function uploadMultipleToR2(
  files: Array<{
    buffer: Buffer | Uint8Array | string
    originalName: string
    contentType: string
    folder?: string
  }>
): Promise<UploadResult[]> {
  const uploadPromises = files.map(async (file) => {
    const key = generateFileKey(file.originalName, file.folder)
    return uploadToR2(file.buffer, key, file.contentType)
  })

  return Promise.all(uploadPromises)
}

/**
 * Utility function to get file extension and validate image/video types
 */
export function validateMediaFile(filename: string, buffer: Buffer): {
  isValid: boolean
  type: 'image' | 'video' | null
  contentType: string
  error?: string
} {
  const extension = filename.toLowerCase().split('.').pop()
  
  // Supported image formats
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp']
  // Supported video formats  
  const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm']
  
  if (!extension) {
    return {
      isValid: false,
      type: null,
      contentType: 'application/octet-stream',
      error: 'No file extension found'
    }
  }

  if (imageExtensions.includes(extension)) {
    return {
      isValid: true,
      type: 'image',
      contentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`
    }
  }

  if (videoExtensions.includes(extension)) {
    return {
      isValid: true,
      type: 'video',
      contentType: `video/${extension}`
    }
  }

  return {
    isValid: false,
    type: null,
    contentType: 'application/octet-stream',
    error: 'Unsupported file format'
  }
}

/**
 * File size validation (in bytes)
 */
export function validateFileSize(buffer: Buffer, maxSizeMB: number = 10): {
  isValid: boolean
  sizeMB: number
  error?: string
} {
  const sizeMB = buffer.length / (1024 * 1024)
  
  if (sizeMB > maxSizeMB) {
    return {
      isValid: false,
      sizeMB,
      error: `File size (${sizeMB.toFixed(2)}MB) exceeds limit of ${maxSizeMB}MB`
    }
  }

  return {
    isValid: true,
    sizeMB
  }
}

/**
 * Get R2 image URL - Uses direct public URL for better performance
 * No need to proxy through API since bucket is public
 */
export function getProxiedImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  
  // ✅ FIX: Use public R2 URLs directly - no proxy needed
  // R2 bucket is already public, so we can access images directly
  // This is faster and more reliable than proxying through API
  
  // If it's a relative path (starts with posts/, avatars/, etc.), prepend public URL
  if ((url.startsWith('posts/') || url.startsWith('avatars/') || url.match(/^[a-z]+\//)) && !url.includes('://')) {
    if (PUBLIC_URL) {
      return `${PUBLIC_URL}/${url}`
    }
  }
  
  // Replace old domain with new public URL if needed
  if (url.includes('ghar-khojo.r2.dev/')) {
    try {
      const urlObj = new URL(url)
      const pathWithKey = urlObj.pathname
      if (PUBLIC_URL) {
        return `${PUBLIC_URL}${pathWithKey}`
      }
    } catch (e) {
      console.warn('Failed to convert old R2 URL to new public URL:', e)
    }
  }
  
  // If it's already a valid R2 public URL (new domain), return as is
  if (url.includes('pub-08e1a83abb1d4ff0ac0fceba0438ba9c.r2.dev/') || (url.includes('pub-') && url.includes('.r2.dev/'))) {
    return url
  }
  
  // If it's a proxied URL, convert back to public URL for better performance
  if (url.includes('/api/r2/get?key=')) {
    try {
      const urlObj = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost')
      const key = urlObj.searchParams.get('key')
      if (key && PUBLIC_URL) {
        return `${PUBLIC_URL}/${key}`
      }
    } catch (e) {
      console.warn('Failed to convert proxy URL to public URL:', e)
    }
  }
  
  // If it's already a relative or external URL, return as is
  return url
}
