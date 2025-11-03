/**
 * Enhanced Debug Logger for tracking data loading issues
 * Use this to monitor React Query behavior and data flow
 */

interface LogConfig {
  enabled: boolean
  verbose: boolean
  trackQueries: boolean
  trackAuth: boolean
  trackNavigation: boolean
}

class DebugLogger {
  private config: LogConfig = {
    enabled: process.env.NODE_ENV === 'development',
    verbose: false,
    trackQueries: true,
    trackAuth: true,
    trackNavigation: true,
  }

  private queryStats = new Map<string, {
    fetchCount: number
    lastFetch: number
    errors: number
  }>()

  configure(config: Partial<LogConfig>) {
    this.config = { ...this.config, ...config }
  }

  // Query tracking
  queryFetch(queryKey: string, page?: number) {
    if (!this.config.enabled || !this.config.trackQueries) return

    const stats = this.queryStats.get(queryKey) || {
      fetchCount: 0,
      lastFetch: 0,
      errors: 0,
    }

    const now = Date.now()
    const timeSinceLastFetch = now - stats.lastFetch

    stats.fetchCount++
    stats.lastFetch = now

    this.queryStats.set(queryKey, stats)

    const pageInfo = page !== undefined ? ` [Page ${page}]` : ''
    const timingInfo = stats.fetchCount > 1 ? ` (${timeSinceLastFetch}ms since last fetch)` : ''

    if (timeSinceLastFetch < 1000 && stats.fetchCount > 1) {
      console.warn(
        `⚠️ RAPID REFETCH DETECTED: "${queryKey}"${pageInfo} - ${stats.fetchCount} fetches${timingInfo}`
      )
    } else {
      console.log(
        `📥 Query Fetch: "${queryKey}"${pageInfo} - Fetch #${stats.fetchCount}${timingInfo}`
      )
    }
  }

  querySuccess(queryKey: string, itemCount: number, page?: number) {
    if (!this.config.enabled || !this.config.trackQueries) return

    const pageInfo = page !== undefined ? ` [Page ${page}]` : ''
    console.log(`✅ Query Success: "${queryKey}"${pageInfo} - ${itemCount} items`)
  }

  queryError(queryKey: string, error: any, page?: number) {
    if (!this.config.enabled || !this.config.trackQueries) return

    const stats = this.queryStats.get(queryKey)
    if (stats) {
      stats.errors++
    }

    const pageInfo = page !== undefined ? ` [Page ${page}]` : ''
    console.error(`❌ Query Error: "${queryKey}"${pageInfo}`, error)
  }

  // Auth tracking
  authEvent(event: string, details?: any) {
    if (!this.config.enabled || !this.config.trackAuth) return

    console.log(`🔐 Auth Event: ${event}`, details || '')
  }

  // Navigation tracking
  navigationChange(from: string, to: string) {
    if (!this.config.enabled || !this.config.trackNavigation) return

    console.log(`🧭 Navigation: ${from} → ${to}`)
  }

  // Performance tracking
  componentMount(componentName: string) {
    if (!this.config.enabled || !this.config.verbose) return

    console.log(`🔵 Component Mounted: ${componentName}`)
  }

  componentUnmount(componentName: string) {
    if (!this.config.enabled || !this.config.verbose) return

    console.log(`🔴 Component Unmounted: ${componentName}`)
  }

  // State tracking
  stateChange(stateName: string, oldValue: any, newValue: any) {
    if (!this.config.enabled || !this.config.verbose) return

    console.log(`🔄 State Change: ${stateName}`, { from: oldValue, to: newValue })
  }

  // Get statistics
  getQueryStats(queryKey?: string) {
    if (queryKey) {
      return this.queryStats.get(queryKey)
    }
    return Object.fromEntries(this.queryStats)
  }

  // Print summary
  printSummary() {
    if (!this.config.enabled) return

    console.group('📊 Debug Summary')
    console.log('Query Statistics:')
    this.queryStats.forEach((stats, key) => {
      const timeSinceLastFetch = Date.now() - stats.lastFetch
      console.log(`  "${key}":`, {
        fetches: stats.fetchCount,
        errors: stats.errors,
        lastFetch: `${Math.round(timeSinceLastFetch / 1000)}s ago`,
      })
    })
    console.groupEnd()
  }

  // Clear statistics
  clearStats() {
    this.queryStats.clear()
    console.log('🧹 Debug stats cleared')
  }
}

// Singleton instance
export const debugLogger = new DebugLogger()

// Make it available in browser console for manual debugging
if (typeof window !== 'undefined') {
  (window as any).debugLogger = debugLogger
}

export default debugLogger
