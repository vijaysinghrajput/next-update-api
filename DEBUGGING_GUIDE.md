# 🔍 Data Loading Debugging Guide

## Problem Solved
Your app was experiencing excessive data reloading due to:
1. ✅ **FIXED**: `refetchOnMount: 'always'` - Now set to `false`
2. ✅ **FIXED**: `refetchOnWindowFocus: true` - Now set to `false`
3. ✅ **FIXED**: Auth state changes triggering full app refresh - Now debounced
4. ✅ **FIXED**: Route changes invalidating all queries - Removed

## Changes Made

### 1. Query Client Configuration (`src/lib/providers.tsx`)
```typescript
// BEFORE (Causes excessive refetches)
refetchOnMount: 'always'
refetchOnWindowFocus: true
staleTime: 2 * 60 * 1000

// AFTER (Optimized caching)
refetchOnMount: false
refetchOnWindowFocus: false
staleTime: 5 * 60 * 1000
```

### 2. Auth State Management
- Added debouncing (300ms) to prevent rapid auth events
- Prevented data reload on token refresh
- Only reloads on actual sign-in/sign-out

### 3. Query Hooks Optimization
- Added explicit `refetchOnMount: false`
- Added explicit `refetchOnWindowFocus: false`
- Increased cache time from 10min to 15min
- Added enhanced logging with timestamps

## Browser Console Debug Commands

Open your browser console and use these commands:

### View Current Query Statistics
```javascript
debugLogger.getQueryStats()
```

### View Specific Query Stats
```javascript
debugLogger.getQueryStats('posts-infinite-Gorakhpur')
```

### Print Full Debug Summary
```javascript
debugLogger.printSummary()
```

### Clear Debug Stats
```javascript
debugLogger.clearStats()
```

### Enable Verbose Logging
```javascript
debugLogger.configure({ verbose: true })
```

### Disable Query Tracking
```javascript
debugLogger.configure({ trackQueries: false })
```

### Check React Query Cache
```javascript
// Get the query client instance
const queryClient = window.__REACT_QUERY_CLIENT__

// View all cached queries
queryClient.getQueryCache().getAll()

// View specific query data
queryClient.getQueryData(['posts', 'infinite', 'Gorakhpur', 'YOUR_USER_ID'])
```

## What to Look For

### ✅ Normal Behavior
```
📥 Query Fetch: "posts-infinite-Gorakhpur" [Page 0] - Fetch #1
✅ Query Success: "posts-infinite-Gorakhpur" [Page 0] - 10 items
🔄 Loading more items...
📥 Query Fetch: "posts-infinite-Gorakhpur" [Page 1] - Fetch #2 (30000ms since last fetch)
```

### ⚠️ Problem Signs
```
⚠️ RAPID REFETCH DETECTED: "posts-infinite-Gorakhpur" - 5 fetches (500ms since last fetch)
```

## Testing Steps

1. **Test Navigation**
   - Navigate between pages (Home → Explore → Profile → Home)
   - Posts should NOT refetch when returning to Home
   - Should use cached data

2. **Test Window Focus**
   - Switch to another tab and back
   - Posts should NOT refetch
   - Should display cached data

3. **Test Infinite Scroll**
   - Scroll down to load more posts
   - Should load next page without reloading previous pages
   - Watch console for "Loading more items..."

4. **Test Pull to Refresh**
   - Pull down on home page
   - Should invalidate cache and refetch
   - This is INTENTIONAL behavior

## Performance Monitoring

### Check Fetch Timing
Look for the timing info in logs:
```
📥 Query Fetch: "posts-infinite-Gorakhpur" [Page 0] - Fetch #2 (30000ms since last fetch)
                                                                 ^^^^^^^ Should be > 5000ms
```

If timing is < 1000ms between fetches, that's a problem!

### Monitor Network Requests
1. Open DevTools → Network tab
2. Filter by "posts" or "supabase"
3. Navigate around the app
4. You should see FEWER requests now

## Expected Behavior

### On Initial Load
1. ✅ Fetch posts once
2. ✅ Cache for 5 minutes
3. ✅ Display immediately on subsequent mounts

### On Navigation
1. ✅ NO automatic refetch
2. ✅ Use cached data
3. ✅ Data stays fresh for 5 minutes

### On Pull to Refresh
1. ✅ Invalidate cache
2. ✅ Refetch fresh data
3. ✅ Update UI

### On Infinite Scroll
1. ✅ Load next page only
2. ✅ Keep previous pages cached
3. ✅ No duplicate fetches

## Troubleshooting

### Still seeing excessive fetches?

Check your console for:
```javascript
// Run this in console
debugLogger.printSummary()
```

Look for queries with high fetch counts:
- Fetch count > 3 in 30 seconds = Problem
- Time between fetches < 1000ms = Problem

### Data not updating when it should?

If data is too stale, adjust in `providers.tsx`:
```typescript
staleTime: 2 * 60 * 1000, // Reduce to 2 minutes
```

### Manual Cache Invalidation

If you need to force a refresh:
```javascript
// In browser console
queryClient.invalidateQueries({ queryKey: ['posts', 'infinite'] })
```

## Debug Logger API

### Configuration Options
```javascript
debugLogger.configure({
  enabled: true,           // Enable/disable all logging
  verbose: false,          // Show component mount/unmount
  trackQueries: true,      // Track query fetches
  trackAuth: true,         // Track auth events
  trackNavigation: true,   // Track route changes
})
```

### Manual Logging
```javascript
// Track custom events
debugLogger.queryFetch('my-query', 0)
debugLogger.querySuccess('my-query', 10, 0)
debugLogger.queryError('my-query', error, 0)
debugLogger.authEvent('SIGNED_IN', { userId: '123' })
debugLogger.navigationChange('/home', '/explore')
```

## Need Help?

1. Run `debugLogger.printSummary()` in console
2. Copy the output
3. Check fetch counts and timing
4. Look for rapid refetch warnings
5. Monitor network tab for duplicate requests

---

**Last Updated**: Nov 3, 2025
**Status**: ✅ Optimized and Ready
