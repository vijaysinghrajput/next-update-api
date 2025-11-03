'use client'

import React, { useState, useRef, useCallback, useEffect } from 'react'
import { Spin } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { motion, AnimatePresence } from 'framer-motion'

interface PullToRefreshProps {
  onRefresh: () => Promise<void>
  children: React.ReactNode
  disabled?: boolean
  threshold?: number // Distance to pull before triggering refresh (default: 80px)
  resistance?: number // Resistance factor for pull animation (default: 2.5)
}

export default function PullToRefresh({
  onRefresh,
  children,
  disabled = false,
  threshold = 80,
  resistance = 2.5,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [canRefresh, setCanRefresh] = useState(false)
  
  const startY = useRef(0)
  const currentY = useRef(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Check if at top of scroll container
  const isAtTop = useCallback(() => {
    if (!containerRef.current) return false
    return window.scrollY === 0 || containerRef.current.scrollTop === 0
  }, [])

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing || !isAtTop()) return
    startY.current = e.touches[0].clientY
    currentY.current = startY.current
  }, [disabled, isRefreshing, isAtTop])

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (disabled || isRefreshing || startY.current === 0) return
    
    currentY.current = e.touches[0].clientY
    const distance = currentY.current - startY.current

    // Only pull down when at top
    if (distance > 0 && isAtTop()) {
      // Apply resistance to make pull feel natural
      const resistedDistance = distance / resistance
      setPullDistance(resistedDistance)
      
      // Check if pulled enough to trigger refresh
      if (resistedDistance >= threshold) {
        setCanRefresh(true)
      } else {
        setCanRefresh(false)
      }

      // Prevent default scroll when pulling
      if (distance > 10) {
        e.preventDefault()
      }
    }
  }, [disabled, isRefreshing, threshold, resistance, isAtTop])

  // Handle touch end
  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return

    // Trigger refresh if pulled enough
    if (canRefresh && pullDistance >= threshold) {
      setIsRefreshing(true)
      setPullDistance(threshold) // Lock at threshold height

      try {
        await onRefresh()
        console.log('✅ Refresh completed')
      } catch (error) {
        console.error('❌ Refresh failed:', error)
      } finally {
        setIsRefreshing(false)
        setCanRefresh(false)
        setPullDistance(0)
      }
    } else {
      // Snap back if not pulled enough
      setPullDistance(0)
      setCanRefresh(false)
    }

    startY.current = 0
    currentY.current = 0
  }, [disabled, isRefreshing, canRefresh, pullDistance, threshold, onRefresh])

  // Add touch event listeners
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('touchstart', handleTouchStart, { passive: true })
    container.addEventListener('touchmove', handleTouchMove, { passive: false })
    container.addEventListener('touchend', handleTouchEnd, { passive: true })

    return () => {
      container.removeEventListener('touchstart', handleTouchStart)
      container.removeEventListener('touchmove', handleTouchMove)
      container.removeEventListener('touchend', handleTouchEnd)
    }
  }, [handleTouchStart, handleTouchMove, handleTouchEnd])

  // Calculate pull progress (0-1)
  const progress = Math.min(pullDistance / threshold, 1)
  const showIndicator = pullDistance > 10

  return (
    <div ref={containerRef} className="relative">
      {/* Pull indicator */}
      <AnimatePresence>
        {showIndicator && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ 
              opacity: 1, 
              y: 0,
              height: pullDistance 
            }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute top-0 left-0 right-0 flex items-center justify-center bg-gradient-to-b from-blue-50 to-transparent z-10"
            style={{
              height: `${pullDistance}px`,
            }}
          >
            <div className="flex flex-col items-center space-y-1">
              <motion.div
                animate={{
                  rotate: isRefreshing ? 360 : progress * 180,
                  scale: progress,
                }}
                transition={{
                  rotate: isRefreshing ? {
                    repeat: Infinity,
                    duration: 1,
                    ease: 'linear'
                  } : {
                    type: 'spring',
                    stiffness: 300,
                    damping: 30
                  }
                }}
              >
                {isRefreshing ? (
                  <Spin />
                ) : (
                  <ReloadOutlined 
                    className={`text-2xl ${canRefresh ? 'text-blue-500' : 'text-gray-400'}`}
                  />
                )}
              </motion.div>
              
              {!isRefreshing && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: progress }}
                  className="text-xs text-gray-600"
                >
                  {canRefresh ? 'Release to refresh' : 'Pull to refresh'}
                </motion.p>
              )}

              {isRefreshing && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-xs text-blue-600"
                >
                  Refreshing...
                </motion.p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content */}
      <motion.div
        animate={{
          y: pullDistance > 0 ? pullDistance : 0,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {children}
      </motion.div>
    </div>
  )
}
