'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, theme, App } from 'antd'
import { usePathname } from 'next/navigation'
import { supabaseClient } from './supabase-client'
import { Profile } from './supabase'

// Query Client with optimized caching strategy to prevent excessive refetching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // Data stays fresh for 5 minutes
      gcTime: 15 * 60 * 1000, // Keep unused data in cache for 15 minutes
      refetchOnWindowFocus: false, // ❌ DON'T refetch on window focus (causes loops)
      refetchOnMount: false, // ❌ DON'T refetch on every mount (causes excessive fetches)
      refetchOnReconnect: true, // ✅ DO refetch when internet reconnects
      retry: 1, // Retry failed requests once
      retryDelay: 1000, // Wait 1 second before retrying
    },
  },
})

// App Context for global state
interface AppContextType {
  user: Profile | null
  selectedCity: string | null
  userCity: string | null
  isLoading: boolean
  isCityReady: boolean // New: indicates city is loaded and ready
  setSelectedCity: (city: string) => void
  refreshUser: () => Promise<void>
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export const useApp = () => {
  const context = useContext(AppContext)
  if (!context) {
    throw new Error('useApp must be used within AppProvider')
  }
  return context
}

// Theme configuration
const themeConfig = {
  algorithm: theme.defaultAlgorithm,
  token: {
    colorPrimary: '#007AFF',
    colorSuccess: '#34C759',
    colorWarning: '#FF9500',
    colorError: '#FF3B30',
    colorInfo: '#007AFF',
    borderRadius: 12,
    fontFamily: 'var(--font-primary)',
  },
  components: {
    Button: {
      borderRadius: 24,
      controlHeight: 44,
      fontWeight: 600,
    },
    Input: {
      borderRadius: 12,
      controlHeight: 44,
    },
    Card: {
      borderRadius: 16,
    },
  },
}

interface ProvidersProps {
  children: React.ReactNode
}

// Route change handler component
function RouteChangeHandler({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  
  useEffect(() => {
    // Just log route changes, let React Query handle its own cache
    console.log('🔄 Route changed to:', pathname)
    // Don't invalidate queries on every route change - it causes too many refetches
    // React Query will refetch when components mount with refetchOnMount: 'always'
  }, [pathname])
  
  return <>{children}</>
}

export function Providers({ children }: ProvidersProps) {
  const [user, setUser] = useState<Profile | null>(null)
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [userCity, setUserCity] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCityReady, setIsCityReady] = useState(false)

  const refreshUser = async () => {
    try {
      setIsLoading(true)
      const { data: { user: authUser } } = await supabaseClient.auth.getUser()
      
      if (authUser) {
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('*, cities(name)')
          .eq('id', authUser.id)
          .single()
        
        if (profile) {
          setUser(profile)
          
          // Set user's signup city as their home city
          if (profile.cities?.name) {
            setUserCity(profile.cities.name)
            
            // If no city selected yet, use user's city as default
            if (!selectedCity) {
              console.log('📍 Setting default city from user profile:', profile.cities.name)
              setSelectedCity(profile.cities.name)
              localStorage.setItem('selectedCity', profile.cities.name)
              setIsCityReady(true) // City is now ready
            }
          }
          // Ensure loading finishes AFTER all state is set
          setIsLoading(false)
        } else {
          setIsLoading(false)
        }
      } else {
        setUser(null)
        setUserCity(null)
        setSelectedCity(null)
        setIsCityReady(false)
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      setUser(null)
      setUserCity(null)
      setIsCityReady(false)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true
    let isInitialized = false // Track if we've already initialized

    const initializeApp = async () => {
      if (isInitialized) {
        console.log('⏭️ App already initialized, skipping...')
        return
      }
      
      try {
        console.log('🚀 Initializing app...')
        
        // Step 1: Load saved city from localStorage FIRST
        const savedCity = localStorage.getItem('selectedCity')
        if (savedCity && mounted) {
          console.log('📍 Restored saved city:', savedCity)
          setSelectedCity(savedCity)
          setIsCityReady(true) // City is ready immediately from localStorage
        }

        // Step 2: Fetch user data (this will update city if needed)
        await refreshUser()
        
        // Step 3: If no saved city but user has city, mark as ready
        if (!savedCity && mounted) {
          const cityFromUser = localStorage.getItem('selectedCity')
          if (cityFromUser) {
            console.log('📍 City set from user profile:', cityFromUser)
            setIsCityReady(true)
          }
        }
        
        isInitialized = true
        console.log('✅ App initialization complete')
      } catch (error) {
        console.error('❌ Failed to initialize app:', error)
        setIsLoading(false)
        setIsCityReady(false)
      }
    }

    initializeApp()

    // Listen for auth changes (with debouncing to prevent excessive calls)
    let authTimeout: NodeJS.Timeout | null = null
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        // Debounce auth state changes
        if (authTimeout) clearTimeout(authTimeout)
        
        authTimeout = setTimeout(async () => {
          if (event === 'SIGNED_IN') {
            console.log('🔐 User signed in, loading profile...')
            await refreshUser()
          } else if (event === 'SIGNED_OUT') {
            console.log('🚪 User signed out, clearing data...')
            setUser(null)
            setUserCity(null)
            setSelectedCity(null)
            setIsCityReady(false)
            isInitialized = false
          } else if (event === 'TOKEN_REFRESHED') {
            console.log('🔄 Token refreshed (no data reload needed)')
            // Don't reload data, just acknowledge the token refresh
          } else {
            console.log('📡 Auth event:', event, '(no action needed)')
          }
        }, 300) // 300ms debounce
      }
    )

    return () => {
      mounted = false
      if (authTimeout) clearTimeout(authTimeout)
      subscription.unsubscribe()
    }
  }, [])

  // Save selected city to localStorage
  const handleSetSelectedCity = (city: string) => {
    console.log('📍 Setting city:', city)
    setSelectedCity(city)
    localStorage.setItem('selectedCity', city)
    setIsCityReady(true) // Mark city as ready when manually set
  }

  const appContextValue: AppContextType = {
    user,
    selectedCity,
    userCity,
    isLoading,
    isCityReady,
    setSelectedCity: handleSetSelectedCity,
    refreshUser,
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={themeConfig}>
        <App>
          <AppContext.Provider value={appContextValue}>
            <RouteChangeHandler>
              {children}
            </RouteChangeHandler>
          </AppContext.Provider>
        </App>
      </ConfigProvider>
    </QueryClientProvider>
  )
}
