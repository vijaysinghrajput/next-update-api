'use client'

import React, { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { 
  HomeOutlined, 
  CompassOutlined, 
  PlusCircleOutlined, 
  WalletOutlined, 
  UserOutlined,
  HeartOutlined,
  MessageOutlined,
  ShareAltOutlined,
  EnvironmentOutlined,
  BellOutlined,
  LogoutOutlined
} from '@ant-design/icons'
import { Badge, Avatar, Dropdown, Space, message } from 'antd'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../lib/providers'
import { formatNumber } from '../../lib/utils'
import { supabaseClient } from '../../lib/supabase-client'
import { getProxiedImageUrl } from '../../lib/r2-storage'
import CitySelectionModal from '../shared/CitySelectionModal'

interface MobileLayoutProps {
  children: React.ReactNode
}

interface NavigationItem {
  key: string
  icon: React.ComponentType<any>
  label: string
  onClick?: () => void
}

export default function MobileLayout({ children }: MobileLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, selectedCity, userCity, setSelectedCity, isGuest, showCitySelection, setShowCitySelection } = useApp()
  const [showCitySelector, setShowCitySelector] = useState(false)
  const [citiesFromDB, setCitiesFromDB] = useState<Array<{ id: string; name: string }>>([])

  // Dynamic navigation items based on authentication status
  const navigationItems = isGuest ? [
    { key: '/', icon: HomeOutlined, label: 'Home' },
    { key: '/explore', icon: CompassOutlined, label: 'Explore' },
    { 
      key: '/auth/login', 
      icon: UserOutlined, 
      label: 'Login',
      onClick: () => handleAuthAction('login')
    },
  ] : [
    { key: '/', icon: HomeOutlined, label: 'Home' },
    { key: '/explore', icon: CompassOutlined, label: 'Explore' },
    { key: '/create', icon: PlusCircleOutlined, label: 'Create' },
    { key: '/wallet', icon: WalletOutlined, label: 'Wallet' },
    { key: '/profile', icon: UserOutlined, label: 'Profile' },
  ]

  const handleCitySelect = (city: string) => {
    setSelectedCity(city)
    setShowCitySelection(false)
  }

  const handleAuthAction = (action: string) => {
    // Redirect to auth with return path
    const returnPath = pathname !== '/auth/login' && pathname !== '/auth/register' ? pathname : '/'
    const authPath = action === 'register' ? '/auth/register' : '/auth/login'
    router.push(`${authPath}?returnTo=${encodeURIComponent(returnPath)}`)
  }

  const handleLogout = async () => {
    try {
      await supabaseClient.auth.signOut()
    } catch (e) {
      // ignore
    } finally {
      try { 
        // Keep selected city when logging out
        // localStorage.removeItem('selectedCity') 
      } catch {}
      message.success('Logged out')
      // Stay on current page instead of redirecting
    }
  }

  // Fetch cities for the selector
  useEffect(() => {
    const fetchCities = async () => {
      const { data } = await supabaseClient
        .from('cities')
        .select('id, name')
        .eq('is_active', true)
        .order('name')
      
      if (data) {
        setCitiesFromDB(data)
      }
    }
    
    fetchCities()
  }, [])

  // Route protection for guest users
  useEffect(() => {
    const protectedRoutes = ['/create', '/wallet', '/profile']
    
    if (isGuest && protectedRoutes.includes(pathname)) {
      message.info('Please login to access this feature')
      handleAuthAction('login')
    }
  }, [pathname, isGuest])

  // Don't show layout for auth pages, admin pages, terms, or privacy pages
  if (pathname.startsWith('/auth') || pathname.startsWith('/admin') || pathname.startsWith('/terms') || pathname.startsWith('/privacy')) {
    return <>{children}</>
  }

  // Use only database cities (no hardcoded fallback)
  const cities = citiesFromDB.map(c => c.name)

  const cityItems = cities.map(city => ({
    key: city,
    label: city,
    onClick: () => setSelectedCity(city)
  }))

  const profileItems = isGuest ? [
    {
      key: 'login',
      label: (
        <div className="flex items-center space-x-2">
          <UserOutlined className="text-blue-500" />
          <span className="font-medium">Login</span>
        </div>
      ),
      onClick: () => handleAuthAction('login')
    },
    {
      key: 'register',
      label: (
        <div className="flex items-center space-x-2">
          <PlusCircleOutlined className="text-green-500" />
          <span className="font-medium">Sign Up</span>
        </div>
      ),
      onClick: () => handleAuthAction('register')
    }
  ] : [
    {
      key: 'profile',
      label: (
        <div className="flex items-center space-x-2">
          <UserOutlined />
          <span>My Profile</span>
        </div>
      ),
      onClick: () => router.push('/profile')
    },
    {
      key: 'wallet',
      label: (
        <div className="flex items-center space-x-2">
          <WalletOutlined />
          <span>My Wallet</span>
        </div>
      ),
      onClick: () => router.push('/wallet')
    },
    {
      key: 'logout',
      label: (
        <div className="flex items-center space-x-2">
          <LogoutOutlined />
          <span>Logout</span>
        </div>
      ),
      onClick: handleLogout
    }
  ]

  return (
    <div
      className="relative mx-auto w-full max-w-xl min-h-screen flex flex-col bg-transparent"
      style={{
        paddingBottom: 'calc(var(--safe-area-bottom, 0px) + 88px)',
        paddingLeft: 'var(--safe-area-left, 0px)',
        paddingRight: 'var(--safe-area-right, 0px)',
        WebkitTapHighlightColor: 'transparent',
        WebkitTouchCallout: 'none',
        touchAction: 'manipulation',
      }}
    >
      {/* Top Header */}
      <motion.header 
        className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-gray-200 px-4 pb-3 shadow-sm"
        style={{ paddingTop: 'calc(var(--safe-area-top, 0px) + 14px)' }}
        initial={{ y: -60 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center justify-between">
          {/* City Selector */}
          <Dropdown 
            menu={{ items: cityItems }}
            trigger={['click']}
            placement="bottomLeft"
          >
            <div className="flex items-center cursor-pointer hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors">
              <EnvironmentOutlined className="text-primary mr-2" />
              <span className="font-semibold text-gray-800">{selectedCity || 'Select City'}</span>
              {userCity && userCity !== selectedCity && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                  Home: {userCity}
                </span>
              )}
            </div>
          </Dropdown>

          {/* Right Side */}
          <div className="flex items-center space-x-3">
            {/* Profile */}
            <Dropdown 
              menu={{ items: profileItems }}
              trigger={['click']}
              placement="bottomRight"
            >
              <div className="flex items-center cursor-pointer">
                {isGuest ? (
                  <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-3 py-2 rounded-full">
                    <UserOutlined className="text-sm" />
                    <span className="text-sm font-medium">Login</span>
                  </div>
                ) : (
                  <Avatar 
                    src={getProxiedImageUrl(user?.avatar_url)}
                    size={32}
                    className="border-2 border-primary"
                  >
                    {user?.name?.[0]?.toUpperCase()}
                  </Avatar>
                )}
              </div>
            </Dropdown>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="flex-1 overflow-x-hidden px-3 sm:px-4 pt-4 pb-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom Navigation */}
      <motion.nav 
        className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 px-4 pt-2 z-50 shadow-[0_-8px_24px_rgba(15,23,42,0.12)]"
        style={{
          paddingBottom: 'calc(var(--safe-area-bottom, 0px) + 12px)',
        }}
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="flex items-center justify-around mx-auto w-full max-w-xl">
          {navigationItems.map((item) => {
            const isActive = pathname === item.key
            const Icon = item.icon
            
            return (
              <motion.button
                key={item.key}
                onClick={() => {
                  if (item.onClick) {
                    item.onClick()
                  } else {
                    router.push(item.key)
                  }
                }}
                className={`flex flex-col items-center justify-center px-4 py-2 rounded-2xl min-w-[64px] transition-all duration-200 relative ${
                  isActive 
                    ? 'bg-gradient-to-br from-blue-600 to-indigo-500 text-white shadow-md shadow-blue-200/60 ring-1 ring-blue-500/40' 
                    : 'text-slate-500 hover:text-slate-700 bg-white/5'
                }`}
                whileTap={{ scale: 0.95 }}
                whileHover={{ scale: 1.05 }}
              >
                <Icon className="text-xl mb-1" />
                <span className="text-xs font-medium">{item.label}</span>
              </motion.button>
            )
          })}
        </div>
      </motion.nav>

      {/* City Selection Modal for Guest Users */}
      <CitySelectionModal
        open={showCitySelection}
        onCitySelect={handleCitySelect}
        onClose={() => setShowCitySelection(false)}
        showSkip={true}
        title={isGuest ? "Welcome to Next Update!" : "Select Your City"}
        description={isGuest 
          ? "Choose your city to see local news and connect with your community"
          : "Change your city to see different local content"
        }
      />
    </div>
  )
}