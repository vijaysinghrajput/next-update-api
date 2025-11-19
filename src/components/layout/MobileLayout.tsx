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
  BellOutlined
} from '@ant-design/icons'
import { Badge, Avatar, Dropdown, Space, message } from 'antd'
import { motion, AnimatePresence } from 'framer-motion'
import { useApp } from '../../lib/providers'
import { formatNumber } from '../../lib/utils'
import { supabaseClient } from '../../lib/supabase-client'
import { getProxiedImageUrl } from '../../lib/r2-storage'

interface MobileLayoutProps {
  children: React.ReactNode
}

const navigationItems = [
  { key: '/', icon: HomeOutlined, label: 'Home' },
  { key: '/explore', icon: CompassOutlined, label: 'Explore' },
  { key: '/create', icon: PlusCircleOutlined, label: 'Create' },
  { key: '/wallet', icon: WalletOutlined, label: 'Wallet' },
  { key: '/profile', icon: UserOutlined, label: 'Profile' },
]

export default function MobileLayout({ children }: MobileLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, selectedCity, userCity, setSelectedCity } = useApp()
  const [showCitySelector, setShowCitySelector] = useState(false)
  const [citiesFromDB, setCitiesFromDB] = useState<Array<{ id: string; name: string }>>([])

  const handleLogout = async () => {
    try {
      await supabaseClient.auth.signOut()
    } catch (e) {
      // ignore
    } finally {
      try { localStorage.removeItem('selectedCity') } catch {}
      message.success('Logged out')
      router.replace('/auth/login')
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

  const profileItems = [
    {
      key: 'profile',
      label: 'My Profile',
      onClick: () => router.push('/profile')
    },
    {
      key: 'logout',
      label: 'Logout',
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
            {/* Notifications */}
            <Badge count={5} size="small">
              <BellOutlined className="text-xl text-gray-600 cursor-pointer hover:text-primary transition-colors" />
            </Badge>

            {/* Profile */}
            <Dropdown 
              menu={{ items: profileItems }}
              trigger={['click']}
              placement="bottomRight"
            >
              <div className="flex items-center cursor-pointer">
                <Avatar 
                  src={getProxiedImageUrl(user?.avatar_url)}
                  size={32}
                  className="border-2 border-primary"
                >
                  {user?.name?.[0]?.toUpperCase()}
                </Avatar>
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
                onClick={() => router.push(item.key)}
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
    </div>
  )
}