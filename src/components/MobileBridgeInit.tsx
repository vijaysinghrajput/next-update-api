'use client'

import { useEffect } from 'react'
import { initMobileBridge } from '@/utils/mobileBridge'

export default function MobileBridgeInit() {
  useEffect(() => {
    // Initialize mobile bridge immediately when component mounts
    console.log('[MobileBridgeInit] Initializing mobile bridge...')
    initMobileBridge()
  }, [])

  return null
}
