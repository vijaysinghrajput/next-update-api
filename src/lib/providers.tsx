'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigProvider, theme } from 'antd'
import { usePathname } from 'next/navigation'
import { supabaseClient } from './supabase-client'
import { Profile } from './supabase'

// Query Client with better caching and refetching strategy
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60 * 1000, // Data stays fresh for 2 minutes (reduced from 5)
      gcTime: 10 * 60 * 1000, // Keep unused data in cache for 10 minutes
      refetchOnWindowFocus: true, // Refetch when window regains focus
      refetchOnMount: 'always', // Always refetch on mount (was just true)
      refetchOnReconnect: true, // Refetch when reconnecting
      retry: 1, // Retry failed requests once
    },
  },
})

// App Context for global state
interface AppContextType {
  user: Profile | null
  selectedCity: string | null
  userCity: string | null
  isLoading: boolean
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
    // Invalidate all queries when route changes (except for static assets)
    console.log('🔄 Route changed to:', pathname)
    queryClient.invalidateQueries()
  }, [pathname])
  
  return <>{children}</>
}

export function Providers({ children }: ProvidersProps) {
  const [user, setUser] = useState<Profile | null>(null)
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [userCity, setUserCity] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
              setSelectedCity(profile.cities.name)
              localStorage.setItem('selectedCity', profile.cities.name)
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
        setIsLoading(false)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      setUser(null)
      setUserCity(null)
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    const initializeApp = async () => {
      try {
        // Load saved city from localStorage first
        const savedCity = localStorage.getItem('selectedCity')
        if (savedCity && mounted) {
          setSelectedCity(savedCity)
        }

        // Then fetch user data (this will set isLoading to false)
        await refreshUser()
      } catch (error) {
        console.error('Failed to initialize app:', error)
        setIsLoading(false)
      }
    }

    initializeApp()

    // Listen for auth changes
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return
        
        if (event === 'SIGNED_IN') {
          await refreshUser()
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
          setUserCity(null)
          setSelectedCity(null)
        }
      }
    )

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  // Save selected city to localStorage
  const handleSetSelectedCity = (city: string) => {
    setSelectedCity(city)
    localStorage.setItem('selectedCity', city)
  }

  const appContextValue: AppContextType = {
    user,
    selectedCity,
    userCity,
    isLoading,
    setSelectedCity: handleSetSelectedCity,
    refreshUser,
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ConfigProvider theme={themeConfig}>
        <AppContext.Provider value={appContextValue}>
          <RouteChangeHandler>
            {children}
          </RouteChangeHandler>
        </AppContext.Provider>
      </ConfigProvider>
    </QueryClientProvider>
  )
}
