'use client'

import { useEffect } from 'react'
import { initMobileBridge } from '@/utils/mobileBridge'

export default function MobileBridgeInit() {
  useEffect(() => {
    // Initialize mobile bridge immediately when component mounts
    console.log('[MobileBridgeInit] Component mounted, initializing...')
    console.log('[MobileBridgeInit] User agent:', navigator.userAgent)
    console.log('[MobileBridgeInit] Has ReactNativeWebView:', !!(window as any).ReactNativeWebView)
    console.log('[MobileBridgeInit] Has isMobileApp flag:', !!(window as any).isMobileApp)
    
    initMobileBridge()
    
    console.log('[MobileBridgeInit] Initialization complete')
  }, [])

  return null
}
