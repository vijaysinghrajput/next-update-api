'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Form, Input, Button, Typography, Space, Alert, Divider } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined, GoogleOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { supabaseClient } from '../../../lib/supabase-client'

const { Title, Text } = Typography

interface LoginFormData {
  email: string
  password: string
}

export default function LoginPage() {
  const [form] = Form.useForm()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Check for success message from registration
  useEffect(() => {
    const message = searchParams.get('message')
    if (message) {
      setSuccessMessage(message)
    }
  }, [searchParams])

  const handleGoogleLogin = async () => {
    console.log('[Login] Google login clicked')
    setLoading(true)
    setError(null)

    try {
      console.log('[Login] Calling signInWithOAuth...')
      
      // Check if we're in mobile app
      const isMobile = !!(window as any).ReactNativeWebView || !!(window as any).isMobileApp
      
      // For mobile app, use a special redirect that will help us capture the session
      const redirectUrl = isMobile 
        ? `${window.location.origin}/auth/callback?mobile=true`
        : `${window.location.origin}/auth/callback`
      
      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })

      console.log('[Login] OAuth response:', { data, error })

      if (error) {
        console.error('[Login] OAuth error:', error)
        setError(error.message)
        setLoading(false)
        return
      }

      if (data?.url) {
        console.log('[Login] OAuth URL received:', data.url)
        
        if (isMobile) {
          // Send OAuth request to mobile app
          console.log('[Login] Sending oauth_request to mobile app')
          if ((window as any).ReactNativeWebView) {
            (window as any).ReactNativeWebView.postMessage(JSON.stringify({
              type: 'oauth_request',
              url: data.url
            }))
          }
        } else {
          // Browser - normal redirect
          window.location.href = data.url
        }
      }
      // Don't set loading to false here as the page will redirect
    } catch (err: any) {
      console.error('[Login] Exception during OAuth:', err)
      setError(err.message || 'An error occurred during Google sign-in')
      setLoading(false)
    }
  }

  const handleLogin = async (values: LoginFormData) => {
    setLoading(true)
    setError(null)

    try {
      const email = values.email.trim().toLowerCase()
      const password = values.password.trim()

      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials.')
        } else if (error.message.includes('Email not confirmed')) {
          setError('Please verify your email first.')
          // Redirect to verification page after 2 seconds
          setTimeout(() => {
            router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`)
          }, 2000)
        } else {
          setError(error.message)
        }
        return
      }

      if (data.user) {
        // Check if email is verified
        if (!data.user.email_confirmed_at) {
          setError('Please verify your email before logging in.')
          setTimeout(() => {
            router.push(`/auth/verify-email?email=${encodeURIComponent(email)}`)
          }, 2000)
          return
        }

        // Ensure user has a profile (create if missing)
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('id', data.user.id)
          .single()

        if (!profile) {
          try {
            await supabaseClient.rpc('create_user_profile', {
              user_id: data.user.id,
              user_email: data.user.email!,
              user_name: data.user.user_metadata?.name || data.user.email!.split('@')[0],
              user_phone: null,
              user_city_id: null,
              referral_code_used: null
            })
          } catch {}
        }

        // Wait a bit for auth state to propagate before redirecting
        await new Promise(resolve => setTimeout(resolve, 500))

        // Verify session is still valid before redirecting
        const { data: { session } } = await supabaseClient.auth.getSession()
        if (session) {
          if (email === 'admin@nextupdate.in' || email === 'support@nextupdate.in') {
            router.push('/admin')
          } else {
            router.push('/')
          }
        } else {
          setError('Session expired. Please try again.')
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col px-6 py-8 safe-area-inset"
      >
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', bounce: 0.4 }}
              className="w-16 h-16 bg-gradient-to-r from-primary to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4"
            >
              <UserOutlined className="text-white text-2xl" />
            </motion.div>
            <Title level={2} className="mb-2">Welcome Back!</Title>
            <Text type="secondary">Sign in to continue your journey</Text>
          </div>

          {/* Success Message */}
          {successMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4"
            >
              <Alert
                message={successMessage}
                type="success"
                showIcon
                closable
                onClose={() => setSuccessMessage(null)}
              />
            </motion.div>
          )}

          {/* Error Alert */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4"
            >
              <Alert
                message={error}
                type="error"
                showIcon
                closable
                onClose={() => setError(null)}
              />
            </motion.div>
          )}

          {/* Login Form */}
          <Form
            form={form}
            onFinish={handleLogin}
            layout="vertical"
            size="large"
            autoComplete="off"
          >
            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' }
              ]}
              normalize={(v) => (v || '').trim()}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="Email address"
                className="rounded-xl"
                inputMode="email"
              />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'Please enter your password' },
                { min: 6, message: 'Password must be at least 6 characters' }
              ]}
              normalize={(v) => (v || '').trim()}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Password"
                className="rounded-xl"
              />
            </Form.Item>

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-purple-500 border-0 font-semibold"
                size="large"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </Button>
            </Form.Item>
          </Form>

          <Divider>
            <Text type="secondary">or continue with</Text>
          </Divider>

          {/* Google Sign In Button */}
          <Button
            icon={<GoogleOutlined />}
            onClick={handleGoogleLogin}
            loading={loading}
            disabled={loading}
            className="w-full h-12 rounded-xl mb-6 font-semibold flex items-center justify-center"
            size="large"
          >
            Continue with Google
          </Button>

          {/* Sign Up Link */}
          <div className="text-center">
            <Text type="secondary">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="text-primary font-semibold hover:underline">
                Sign up now
              </Link>
            </Text>
          </div>

          {/* Forgot Password */}
          <div className="text-center mt-4">
            <Link href="/auth/forgot-password" className="text-sm text-gray-500 hover:text-primary">
              Forgot your password?
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-auto pt-6 pb-safe">
          <Text type="secondary" className="text-xs">
            By signing in, you agree to our{' '}
            <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </Text>
        </div>
      </motion.div>
    </div>
  )
}
