// CLIENT-SAFE R2 HELPERS
// Note: We do NOT construct S3 client in the browser. All uploads go through /api/r2/upload
// to keep credentials on the server. PUBLIC_URL is only used to build returned URLs server-side.
const PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || process.env.R2_PUBLIC_URL

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
        errMsg = data?.error || errMsg
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
 * Convert R2 public URL to proxied URL through our API
 * This is needed because R2 bucket public access might not be configured
 */
export function getProxiedImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  
  // If already using our proxy, return as is
  if (url.includes('/api/r2/get')) return url
  
  // Extract the key from R2 public URL
  // Check multiple R2 URL patterns
  const r2Patterns = [
    'https://ghar-khojo.r2.dev/',
    'https://pub-',
    '.r2.dev/',
    'r2.cloudflarestorage.com/',
  ]
  
  for (const pattern of r2Patterns) {
    if (url.includes(pattern)) {
      // Extract everything after the domain as the key
      const urlObj = new URL(url)
      const key = urlObj.pathname.substring(1) // Remove leading slash
      const proxiedUrl = `/api/r2/get?key=${encodeURIComponent(key)}`
      console.log('🖼️ Proxying R2 image:', url, '→', proxiedUrl)
      return proxiedUrl
    }
  }
  
  // If it's already a relative URL or external URL, return as is
  return url
}
