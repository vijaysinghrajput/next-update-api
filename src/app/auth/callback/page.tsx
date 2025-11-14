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
        // Get the code from URL (email verification)
        const code = searchParams.get('code')
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        if (error) {
          setStatus('error')
          setMessage(errorDescription || 'Verification failed')
          return
        }

        if (code) {
          // Exchange the code for a session
          const { data, error: exchangeError } = await supabaseClient.auth.exchangeCodeForSession(code)

          if (exchangeError) {
            setStatus('error')
            setMessage(exchangeError.message)
            return
          }

          if (data?.user) {
            // Check if email is confirmed
            if (data.user.email_confirmed_at) {
              setStatus('success')
              setMessage('Email verified successfully!')
              
              // Redirect to home after 2 seconds
              setTimeout(() => {
                router.push('/')
              }, 2000)
            } else {
              setStatus('error')
              setMessage('Email verification incomplete')
            }
          }
        } else {
          // No code, might be already logged in
          const { data: { user } } = await supabaseClient.auth.getUser()
          
          if (user?.email_confirmed_at) {
            setStatus('success')
            setMessage('Already verified!')
            setTimeout(() => router.push('/'), 1000)
          } else {
            setStatus('error')
            setMessage('Invalid verification link')
          }
        }
      } catch (err: any) {
        setStatus('error')
        setMessage(err.message || 'An error occurred during verification')
      }
    }

    handleCallback()
  }, [searchParams, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <Spin size="large" />
          <p className="mt-4 text-gray-600">Verifying your email...</p>
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
          title="Email Verified Successfully!"
          subTitle={message || 'Redirecting to home...'}
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
