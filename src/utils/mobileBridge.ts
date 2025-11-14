/**
 * Mobile App Bridge - Detects and communicates with React Native WebView
 * This file enables native features when the website runs in the mobile app
 */

import { APP_STORE_LINK } from '@/lib/utils'

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void
    }
    Android?: Record<string, any>
    webkit?: Record<string, any>
    isMobileApp?: boolean
    isNextUpdateApp?: boolean
    __mobileBridgeInitialized?: boolean
    __nativeFileUploadResolvers?: Record<string, { resolve: (files: File[]) => void; reject: (error: Error) => void }>
  }
}

type NativeFileMeta = {
  key?: string
  url?: string
  type?: string
  size?: number
}

const getNativeMetaStore = (): WeakMap<File, NativeFileMeta> | undefined => {
  if (typeof window === 'undefined') return undefined
  const globalAny = window as any
  if (!globalAny.__nativeFileMeta) {
    globalAny.__nativeFileMeta = new WeakMap<File, NativeFileMeta>()
  }
  return globalAny.__nativeFileMeta as WeakMap<File, NativeFileMeta>
}

// Detect if running in mobile app
export const isMobileApp = (): boolean => {
  if (typeof window === 'undefined') return false
  
  // Check for React Native WebView
  if (window.ReactNativeWebView) return true
  
  // Check user agent
  const ua = navigator.userAgent || ''
  if (ua.includes('NextUpdateApp')) return true
  
  // Check for custom flag set by injected JavaScript
  return !!(window as any).isMobileApp || !!(window as any).isNextUpdateApp
}

// Send message to React Native app
export const sendToNativeApp = (type: string, data: any = {}): void => {
  const bridge = window.ReactNativeWebView
  if (!isMobileApp() || !bridge) {
    console.debug('[MobileBridge] Not in mobile app, skipping:', type)
    return
  }
  
  try {
    bridge.postMessage(JSON.stringify({
      type,
      ...data,
      timestamp: Date.now()
    }))
  } catch (error) {
    console.error('[MobileBridge] Error sending message:', error)
  }
}

// File Upload Bridge
export const requestNativeFileUpload = (
  accept: string = '*/*',
  multiple: boolean = false,
  maxFiles: number = 1
): Promise<File[]> => {
  console.log('[MobileBridge] requestNativeFileUpload invoked', { accept, multiple, maxFiles, inApp: isMobileApp() })
  return new Promise((resolve, reject) => {
    if (!isMobileApp()) {
      // Fallback to regular file input
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = accept
      input.multiple = multiple
      input.onchange = (e) => {
        const files = Array.from((e.target as HTMLInputElement).files || [])
        resolve(files)
      }
      input.click()
      return
    }
    
    const requestId = `file_upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Store resolver
    ;(window as any).__nativeFileUploadResolvers = (window as any).__nativeFileUploadResolvers || {}
    ;(window as any).__nativeFileUploadResolvers[requestId] = { resolve, reject }
    
    // Request file upload from native app
    sendToNativeApp('file_upload_request', {
      accept,
      multiple,
      maxFiles,
      requestId
    })
    
    // Timeout after 30 seconds
    setTimeout(() => {
      if ((window as any).__nativeFileUploadResolvers?.[requestId]) {
        delete (window as any).__nativeFileUploadResolvers[requestId]
        reject(new Error('File upload timeout'))
      }
    }, 30000)
  })
}

// Handle file selection response from native app
export const handleNativeFileResponse = (requestId: string, files: File[]): void => {
  const resolvers = (window as any).__nativeFileUploadResolvers
  if (!resolvers || !resolvers[requestId]) {
    console.warn('[MobileBridge] No resolver found for request:', requestId)
    return
  }
  console.log('[MobileBridge] Resolving native upload', { requestId, fileCount: files.length, files })
  const { resolve } = resolvers[requestId]
  delete resolvers[requestId]
  resolve(files)
}

// Phone Call Bridge
export const makePhoneCall = (phone: string): void => {
  if (!phone) return
  
  // Clean phone number
  const cleaned = phone.replace(/\D/g, '')
  if (!cleaned) return
  
  if (isMobileApp()) {
    sendToNativeApp('phone_call', { phone: cleaned })
  } else {
    // Fallback to tel: link
    window.location.href = `tel:${cleaned}`
  }
}

// WhatsApp Bridge
export const openWhatsApp = (phone: string, message?: string): void => {
  if (!phone) return
  
  // Clean phone number
  const cleaned = phone.replace(/\D/g, '')
  if (!cleaned) return
  
  if (isMobileApp()) {
    sendToNativeApp('whatsapp', { phone: cleaned, message })
  } else {
    // Fallback to WhatsApp web
    const url = message
      ? `https://wa.me/${cleaned}?text=${encodeURIComponent(message)}`
      : `https://wa.me/${cleaned}`
    window.open(url, '_blank')
  }
}

// Share Bridge
export const shareContent = (data: {
  title?: string
  text?: string
  url?: string
  image?: string
}): void => {
  // Add app store link to share content
  const shareData = {
    title: data.title,
    text: data.text ? `${data.text}\n\nDownload the app: ${APP_STORE_LINK}` : `Download the app: ${APP_STORE_LINK}`,
    url: data.url || APP_STORE_LINK,
  }
  
  if (isMobileApp()) {
    sendToNativeApp('share', shareData)
  } else if (navigator.share) {
    // Use native Web Share API if available
    navigator.share(shareData).catch(err => console.log('Share failed:', err))
  } else {
    // Fallback: copy to clipboard
    const text = [shareData.title, shareData.text, shareData.url].filter(Boolean).join('\n')
    navigator.clipboard.writeText(text).then(() => {
      alert('Content copied to clipboard!')
    })
  }
}

// External Link Handler
export const openExternalLink = (url: string): void => {
  if (!url) return
  
  // Don't open same-origin links externally
  try {
    const urlObj = new URL(url, window.location.origin)
    if (urlObj.origin === window.location.origin) {
      // Internal link - let Next.js handle it
      return
    }
  } catch {
    // Invalid URL, ignore
    return
  }
  
  if (isMobileApp()) {
    sendToNativeApp('external_link', { url })
  } else {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

// Initialize mobile app bridge
export const initMobileBridge = (): void => {
  if (typeof window === 'undefined') return
  
  // Prevent double initialization
  if ((window as any).__mobileBridgeInitialized) {
    return
  }
  ;(window as any).__mobileBridgeInitialized = true
  
  // Message handler function
  const handleNativeMessage = async (event: MessageEvent) => {
    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
        
        if (data.type === 'file_selected' && data.requestId) {
          console.log('[MobileBridge] ===== FILE_SELECTED EVENT =====')
          console.log('[MobileBridge] Native file_selected payload:', JSON.stringify(data, null, 2))
          console.log('[MobileBridge] Number of files:', data.files?.length || 0)
          
          // Convert file data to File objects
          const files = (data.files || []).map((fileData: any, index: number) => {
            console.log(`[MobileBridge] Processing file ${index + 1}:`, {
              name: fileData.name,
              url: fileData.url,
              type: fileData.type,
              size: fileData.size,
              key: fileData.key
            })
            
            const normalizeUri = (input?: string): string | undefined => {
              if (!input || typeof input !== 'string') return input
              const trimmed = input.trim()
              return trimmed.replace(/^[`'"]+|[`'\"]+$/g, '')
            }

            const cleanUrl = normalizeUri(fileData.url)
            const fileName = fileData.name || fileData.key?.split('/').pop() || 'file'
            
            console.log(`[MobileBridge] Clean URL for file ${index + 1}:`, cleanUrl)
            
            // Create a minimal File object - no need to fetch since file is already uploaded to R2
            const blob = new Blob([], { type: fileData.type || 'application/octet-stream' })
            const file = new File([blob], fileName, {
              type: fileData.type || 'application/octet-stream',
              lastModified: Date.now()
            })
            
            // Store metadata for downstream consumers (Ant Upload, etc.)
            const metaStore = getNativeMetaStore()
            const metadata = {
              key: fileData.key,
              url: cleanUrl,
              type: fileData.type || 'application/octet-stream',
              size: fileData.size || 0,
            }
            metaStore?.set(file, metadata)
            console.log(`[MobileBridge] Stored metadata for file ${index + 1}:`, metadata)

            // Set properties that Ant Design Upload expects
            const uid = fileData.key || `native-${Date.now()}-${Math.random().toString(36).slice(2)}`
            ;(file as any).uid = uid
            ;(file as any).originFileObj = file
            ;(file as any).status = 'done'
            ;(file as any).url = cleanUrl
            ;(file as any).thumbUrl = cleanUrl
            ;(file as any).r2Url = cleanUrl
            ;(file as any).name = fileName
            ;(file as any).size = fileData.size || 0
            ;(file as any).type = fileData.type || 'application/octet-stream'

            console.log(`[MobileBridge] Created file object ${index + 1}:`, { 
              fileName, 
              url: cleanUrl, 
              uid,
              status: (file as any).status,
              r2Url: (file as any).r2Url
            })
            return file
          })
          
          console.log('[MobileBridge] Total files created:', files.length)
          console.log('[MobileBridge] Calling handleNativeFileResponse with requestId:', data.requestId)
          console.log('[MobileBridge] Total files created:', files.length)
          console.log('[MobileBridge] Calling handleNativeFileResponse with requestId:', data.requestId)
          handleNativeFileResponse(data.requestId, files)
          console.log('[MobileBridge] handleNativeFileResponse completed')

          if (data.uploadErrors?.length) {
            console.error('[MobileBridge] Upload errors:', data.uploadErrors)
            alert(data.uploadErrors[0])
          }
        }
      } catch (error) {
        console.error('[MobileBridge] ===== ERROR IN MESSAGE HANDLER =====')
        console.error('[MobileBridge] Error handling message:', error)
        console.error('[MobileBridge] Error stack:', (error as Error).stack)
      }
  }
  
  // Listen for messages from React Native WebView (document and window)
  // React Native WebView posts messages that trigger 'message' event on document
  document.addEventListener('message', handleNativeMessage as any)
  window.addEventListener('message', handleNativeMessage)
  
  console.log('[MobileBridge] Message listeners registered on both document and window')
  
  // Enhance file inputs to use native picker
  if (isMobileApp()) {
    // Prevent default file input behavior and use native picker
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      
      // Check if click is on or inside upload button/area
      const uploadTrigger = target.closest('.ant-upload, .ant-upload-select, [class*="upload"]')
      const fileInput = target.closest('input[type="file"]') as HTMLInputElement
      
      if (uploadTrigger || fileInput) {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        
        console.log('[MobileBridge] Upload clicked, requesting native picker')
        
        // Get the actual file input element
        let input = fileInput
        if (!input && uploadTrigger) {
          input = uploadTrigger.querySelector('input[type="file"]') as HTMLInputElement
        }
        
        const accept = input?.accept || 'image/*,video/*'
        const multiple = input?.multiple || true
        const maxFiles = 5
        
        requestNativeFileUpload(accept, multiple, maxFiles)
          .then((files) => {
            if (files && files.length > 0) {
              console.log('[MobileBridge] Native files received:', files.length)
              // Trigger the Upload component's onChange
              if (input) {
                const dataTransfer = new DataTransfer()
                files.forEach(file => dataTransfer.items.add(file))
                input.files = dataTransfer.files
                
                // Trigger change event
                const event = new Event('change', { bubbles: true })
                input.dispatchEvent(event)
              }
            }
          })
          .catch((error) => {
            console.error('[MobileBridge] Native file upload failed:', error)
          })
        
        return false
      }
    }, true) // Use capture phase to intercept early
    
    // Enhance phone links
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      const link = target.closest('a[href^="tel:"]') as HTMLAnchorElement
      
      if (link) {
        e.preventDefault()
        const phone = link.href.replace('tel:', '')
        makePhoneCall(phone)
      }
    })
    
    // Enhance WhatsApp links
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      const link = target.closest('a[href*="wa.me"], a[href*="whatsapp"]') as HTMLAnchorElement
      
      if (link) {
        e.preventDefault()
        const href = link.href
        const phoneMatch = href.match(/wa\.me\/(\d+)/) || href.match(/whatsapp.*phone=(\d+)/)
        if (phoneMatch) {
          openWhatsApp(phoneMatch[1])
        }
      }
    })
    
    // Enhance external links
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      const link = target.closest('a[href]') as HTMLAnchorElement
      
      if (link && link.href) {
        const href = link.href
        const currentOrigin = window.location.origin
        
        // Skip internal links, mailto, tel, javascript
        if (
          href.startsWith(currentOrigin) ||
          href.startsWith('/') ||
          href.startsWith('mailto:') ||
          href.startsWith('tel:') ||
          href.startsWith('javascript:') ||
          href.includes('wa.me') ||
          href.includes('whatsapp')
        ) {
          return
        }
        
        // External link - open in browser
        if (link.target === '_blank' || link.hasAttribute('data-external')) {
          e.preventDefault()
          openExternalLink(href)
        }
      }
    })
  }
  
  console.log('[MobileBridge] Initialized', { isMobileApp: isMobileApp() })
}

// Auto-initialize on load - deferred for performance
if (typeof window !== 'undefined') {
  // Use requestIdleCallback for better performance, fallback to setTimeout
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(() => {
      initMobileBridge()
    }, { timeout: 2000 })
  } else {
    setTimeout(() => {
      initMobileBridge()
    }, 1000)
  }
}

export {}
