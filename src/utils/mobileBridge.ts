/**
 * Mobile App Bridge - Detects and communicates with React Native WebView
 * This file enables native features when the website runs in the mobile app
 */

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
  if (isMobileApp()) {
    sendToNativeApp('share', data)
  } else if (navigator.share) {
    // Use native Web Share API if available
    navigator.share(data).catch(err => console.log('Share failed:', err))
  } else {
    // Fallback: copy to clipboard
    const text = [data.title, data.text, data.url].filter(Boolean).join('\n')
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
  
  // Listen for messages from native app
  window.addEventListener('message', (event) => {
    (async () => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
        
        if (data.type === 'file_selected' && data.requestId) {
          // Convert file data to File objects
          const files = await Promise.all((data.files || []).map(async (fileData: any) => {
            try {
              // Fetch the file from the URI
              const response = await fetch(fileData.uri)
              const blob = await response.blob()
              
              // Create a File object
              const file = new File([blob], fileData.name || 'file', {
                type: fileData.type || blob.type || 'application/octet-stream',
                lastModified: fileData.lastModified || Date.now()
              })
              
              // Store original URI for reference
              ;(file as any).uri = fileData.uri
              ;(file as any).size = fileData.size || blob.size
              
              return file
            } catch (error) {
              console.error('[MobileBridge] Error fetching file:', error)
              // Return a placeholder file if fetch fails
              const blob = new Blob([], { type: fileData.type || 'application/octet-stream' })
              const file = new File([blob], fileData.name || 'file', {
                type: fileData.type || 'application/octet-stream',
                lastModified: fileData.lastModified || Date.now()
              })
              ;(file as any).uri = fileData.uri
              ;(file as any).size = fileData.size || 0
              ;(file as any).error = error
              return file
            }
          }))
          
          handleNativeFileResponse(data.requestId, files)
        }
      } catch (error) {
        console.error('[MobileBridge] Error handling message:', error)
      }
    })()
  })
  
  // Enhance file inputs to use native picker
  if (isMobileApp()) {
    document.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      const fileInput = target.closest('input[type="file"]') as HTMLInputElement
      
      if (fileInput && !fileInput.hasAttribute('data-native-handled')) {
        e.preventDefault()
        e.stopPropagation()
        
        fileInput.setAttribute('data-native-handled', 'true')
        
        const accept = fileInput.accept || '*/*'
        const multiple = fileInput.multiple || false
        const maxFiles = multiple ? 5 : 1
        
        requestNativeFileUpload(accept, multiple, maxFiles)
          .then((files) => {
            // Create a FileList-like object
            const dataTransfer = new DataTransfer()
            files.forEach(file => dataTransfer.items.add(file))
            fileInput.files = dataTransfer.files
            
            // Trigger change event
            const event = new Event('change', { bubbles: true })
            fileInput.dispatchEvent(event)
          })
          .catch((error) => {
            console.error('[MobileBridge] File upload failed:', error)
          })
      }
    }, true) // Use capture phase
    
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

