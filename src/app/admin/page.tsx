'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ConfigProvider } from 'antd'
import AdminDashboard from '../../components/admin/AdminDashboard'
import AdminLayout from '../../components/layout/AdminLayout'
import { supabaseClient } from '../../lib/supabase-client'
import { isAdmin } from '../../lib/utils'

export default function AdminPage() {
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    let mounted = true
    const checkAuth = async () => {
      try {
        // Wait for existing session (avoids transient null on first mount)
        const { data: { session } } = await supabaseClient.auth.getSession()
        if (!session) {
          router.replace('/auth/login')
          return
        }

        const email = session.user.email || ''
        if (!isAdmin(email)) {
          router.replace('/auth/login')
          return
        }

        if (mounted) setIsAuthorized(true)
      } catch (error) {
        router.replace('/auth/login')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    checkAuth()
    return () => { mounted = false }
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#007AFF',
        },
      }}
    >
      <AdminLayout>
        <AdminDashboard />
      </AdminLayout>
    </ConfigProvider>
  )
}
