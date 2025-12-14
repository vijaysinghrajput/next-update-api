'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Spin, Result } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { supabaseClient } from '../../../lib/supabase-client'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the code from URL (email verification or OAuth)
        const code = searchParams.get('code')
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (error) {
          setStatus('error')
          setMessage(errorDescription || 'Authentication failed')
          setTimeout(() => router.push('/auth/login'), 3000)
          return
        }

        if (code) {
          // Exchange the code for a session (works for both email and OAuth)
          const { data, error: exchangeError } = await supabaseClient.auth.exchangeCodeForSession(code)

          if (exchangeError) {
            setStatus('error')
            setMessage(exchangeError.message)
            setTimeout(() => router.push('/auth/login'), 3000)
            return
          }

          if (data?.user) {
            // Ensure user has a profile (create if missing, important for OAuth users)
            const { data: profile } = await supabaseClient
              .from('profiles')
              .select('id')
              .eq('id', data.user.id)
              .single()

            if (!profile) {
              try {
                // Create profile for new OAuth user
                const userName = data.user.user_metadata?.full_name || 
                                data.user.user_metadata?.name || 
                                data.user.email?.split('@')[0] || 
                                'User'
                
                await supabaseClient.rpc('create_user_profile', {
                  user_id: data.user.id,
                  user_email: data.user.email!,
                  user_name: userName,
                  user_phone: data.user.user_metadata?.phone || null,
                  user_city_id: null,
                  referral_code_used: null
                })
              } catch (profileError) {
                console.error('Error creating profile:', profileError)
                // Continue anyway, profile might already exist
              }
            }

            setStatus('success')
            
            // Check if user is admin
            const email = data.user.email?.toLowerCase()
            const isAdmin = email === 'admin@nextupdate.in' || email === 'support@nextupdate.in'
            
            if (isAdmin) {
              setMessage('Login successful! Redirecting to admin panel...')
              setTimeout(() => router.push('/admin'), 2000)
            } else {
              setMessage('Login successful! Redirecting...')
              setTimeout(() => router.push('/'), 2000)
            }
          }
        } else {
          // No code, might be already logged in
          const { data: { user } } = await supabaseClient.auth.getUser()
          
          if (user) {
            setStatus('success')
            setMessage('Already authenticated!')
            const email = user.email?.toLowerCase()
            const isAdmin = email === 'admin@nextupdate.in' || email === 'support@nextupdate.in'
            setTimeout(() => router.push(isAdmin ? '/admin' : '/'), 1000)
          } else {
            setStatus('error')
            setMessage('Invalid authentication link')
            setTimeout(() => router.push('/auth/login'), 3000)
          }
        }
      } catch (err: any) {
        setStatus('error')
        setMessage(err.message || 'An error occurred during authentication')
        setTimeout(() => router.push('/auth/login'), 3000)
      }
    }

    handleCallback()
  }, [searchParams, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <Spin size="large" />
          <p className="mt-4 text-gray-600">Authenticating...</p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <Result
          status="success"
          icon={<CheckCircleOutlined className="text-green-500" />}
          title="Authentication Successful!"
          subTitle={message || 'Redirecting...'}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
      <Result
        status="error"
        icon={<CloseCircleOutlined className="text-red-500" />}
        title="Verification Failed"
        subTitle={message}
        extra={
          <a href="/auth/verify-email" className="text-primary hover:underline">
            Back to Verification Page
          </a>
        }
      />
    </div>
  )
}
