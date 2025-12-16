'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Form, Input, Button, Typography, Space, Alert, Select, Divider } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined, EnvironmentOutlined, GiftOutlined, GoogleOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { supabaseClient } from '../../../lib/supabase-client'
import { generateReferralCode } from '../../../lib/utils'

const { Title, Text } = Typography
const { Option } = Select

interface RegisterFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
  phone?: string
  cityId: string
  referralCode?: string
}

export default function RegisterPage() {
  const [form] = Form.useForm()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cities, setCities] = useState<any[]>([])
  const [referralCode, setReferralCode] = useState('')
  const [referralValidation, setReferralValidation] = useState<{
    isValid: boolean | null
    message: string
    referrerName?: string
  }>({ isValid: null, message: '' })

  // Get referral code from URL
  useEffect(() => {
    const ref = searchParams.get('ref')
    if (ref) {
      setReferralCode(ref)
      form.setFieldsValue({ referralCode: ref })
    }
  }, [searchParams, form])

  // Fetch cities
  useEffect(() => {
    const fetchCities = async () => {
      const { data } = await supabaseClient
        .from('cities')
        .select('*')
        .eq('is_active', true)
        .order('name')
      
      if (data) {
        setCities(data)
      }
    }
    
    fetchCities()
  }, [])

  // Validate referral code when user types it
  const validateReferralCode = async (code: string) => {
    if (!code || code.length < 3) {
      setReferralValidation({ isValid: null, message: '' })
      return
    }

    try {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('id, name, referral_code')
        .eq('referral_code', code.toUpperCase())
        .single()

      if (error || !data) {
        setReferralValidation({
          isValid: false,
          message: 'Invalid referral code'
        })
      } else {
        setReferralValidation({
          isValid: true,
          message: `Valid! You'll get 100 bonus points from ${data.name}`
        })
      }
    } catch (err) {
      setReferralValidation({
        isValid: false,
        message: 'Invalid referral code'
      })
    }
  }

  const handleGoogleSignUp = async () => {
    console.log('[Register] Google signup clicked')
    setLoading(true)
    setError(null)

    try {
      // Get selected city from form (if user selected one before clicking Google)
      const cityId = form.getFieldValue('cityId')
      const referralCode = form.getFieldValue('referralCode')
      
      console.log('[Register] Form data:', { cityId, referralCode })
      console.log('[Register] Calling signInWithOAuth...')
      
      const { data, error } = await supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?signup=true`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
          // Pass signup data through OAuth state
          ...(cityId || referralCode ? {
            data: {
              city_id: cityId,
              referral_code: referralCode,
              is_signup: true
            }
          } : {})
        },
      })

      console.log('[Register] OAuth response:', { data, error })

      if (error) {
        console.error('[Register] OAuth error:', error)
        setError(error.message)
        setLoading(false)
        return
      }

      if (data?.url) {
        console.log('[Register] OAuth URL received:', data.url)
        
        // Check if we're in the mobile app
        const isMobile = !!(window as any).ReactNativeWebView || !!(window as any).isMobileApp
        
        if (isMobile) {
          // Send OAuth request to mobile app
          console.log('[Register] Sending oauth_request to mobile app')
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
      console.error('[Register] Exception during OAuth:', err)
      setError(err.message || 'An error occurred during Google sign-up')
      setLoading(false)
    }
  }

  const handleRegister = async (values: RegisterFormData) => {
    setLoading(true)
    setError(null)

    try {
      // Create user with email verification enabled
      const { data, error } = await supabaseClient.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            name: values.name,
            phone: values.phone,
            city_id: values.cityId,
            referral_code: values.referralCode,
          },
        },
      })

      if (error) {
        setError(error.message)
        return
      }

      if (data.user) {
        // Note: Profile is automatically created by instant_user_setup database trigger
        
        // Wait a moment for trigger to complete
        await new Promise(resolve => setTimeout(resolve, 500))

        // Handle referral bonus if code was provided and valid
        if (values.referralCode && referralValidation.isValid) {
          try {
            const { data: referralResult, error: referralError } = await supabaseClient
              .rpc('handle_referral_signup', {
                new_user_id: data.user.id,
                referral_code_used: values.referralCode.toUpperCase()
              })
            
            if (referralResult?.success) {
              console.log('✅ Referral bonus applied:', referralResult.message)
            } else if (referralError) {
              console.error('❌ Referral error:', referralError)
            }
          } catch (err) {
            console.error('❌ Referral processing failed:', err)
          }
        }

        // Update profile with additional data from signup form
        try {
          await supabaseClient
            .from('profiles')
            .update({
              name: values.name,
              phone: values.phone || null,
              city_id: values.cityId
            })
            .eq('id', data.user.id)
        } catch (err) {
          console.error('Profile update error:', err)
        }

        // Redirect to verification page
        router.push(`/auth/verify-email?email=${encodeURIComponent(values.email)}`)
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration')
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
        className="flex-1 flex flex-col px-6 py-6 overflow-y-auto"
      >
        <div className="flex-1">
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
            <Title level={2} className="mb-2">Join Next Update!</Title>
            <Text type="secondary">Create your account and start earning points</Text>
          </div>

          {/* Referral Bonus Alert */}
          {referralCode && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-4"
            >
              <Alert
                message="🎉 Referral Bonus!"
                description="You'll get 100 points for joining with a referral code!"
                type="success"
                showIcon
                icon={<GiftOutlined />}
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

          {/* Registration Form */}
          <Form
            form={form}
            onFinish={handleRegister}
            layout="vertical"
            size="large"
            scrollToFirstError
          >
            <Form.Item
              name="name"
              rules={[
                { required: true, message: 'Please enter your name' },
                { min: 2, message: 'Name must be at least 2 characters' }
              ]}
            >
              <Input
                prefix={<UserOutlined />}
                placeholder="Full name"
                className="rounded-xl"
              />
            </Form.Item>

            <Form.Item
              name="email"
              rules={[
                { required: true, message: 'Please enter your email' },
                { type: 'email', message: 'Please enter a valid email' }
              ]}
            >
              <Input
                prefix={<MailOutlined />}
                placeholder="Email address"
                className="rounded-xl"
              />
            </Form.Item>

            <Form.Item
              name="phone"
              rules={[
                { pattern: /^[6789]\d{9}$/, message: 'Please enter a valid 10-digit mobile number' }
              ]}
            >
              <Input
                prefix={<PhoneOutlined />}
                placeholder="Mobile number (optional)"
                className="rounded-xl"
                maxLength={10}
              />
            </Form.Item>

            <Form.Item
              name="cityId"
              rules={[
                { required: true, message: 'Please select your city' }
              ]}
            >
              <Select
                placeholder="Select your city"
                className="rounded-xl"
                showSearch
                filterOption={(input, option) =>
                  option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
                }
              >
                {cities.map(city => (
                  <Option key={city.id} value={city.id}>
                    <EnvironmentOutlined className="mr-2" />
                    {city.name}
                    {city.state && `, ${city.state}`}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'Please enter your password' },
                { min: 6, message: 'Password must be at least 6 characters' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Password"
                className="rounded-xl"
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              dependencies={['password']}
              rules={[
                { required: true, message: 'Please confirm your password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('password') === value) {
                      return Promise.resolve()
                    }
                    return Promise.reject(new Error('Passwords do not match'))
                  },
                }),
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="Confirm password"
                className="rounded-xl"
              />
            </Form.Item>

            {!referralCode && (
              <Form.Item
                name="referralCode"
                help={referralValidation.message || "Optional: Enter a friend's referral code to get bonus points"}
                validateStatus={
                  referralValidation.isValid === true ? 'success' :
                  referralValidation.isValid === false ? 'error' : ''
                }
              >
                <Input
                  prefix={<GiftOutlined />}
                  placeholder="Referral code (optional)"
                  className="rounded-xl"
                  style={{ textTransform: 'uppercase' }}
                  status={
                    referralValidation.isValid === false ? 'error' : undefined
                  }
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase()
                    form.setFieldsValue({ referralCode: value })
                    validateReferralCode(value)
                  }}
                  onBlur={(e) => validateReferralCode(e.target.value)}
                />
              </Form.Item>
            )}

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-purple-500 border-0 font-semibold"
                size="large"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </Form.Item>
          </Form>

          <Divider>
            <Text type="secondary">or continue with</Text>
          </Divider>

          {/* Google Sign Up Button */}
          <Button
            icon={<GoogleOutlined />}
            onClick={handleGoogleSignUp}
            loading={loading}
            disabled={loading}
            className="w-full h-12 rounded-xl mb-6 font-semibold flex items-center justify-center"
            size="large"
          >
            Continue with Google
          </Button>

          {/* Sign In Link */}
          <div className="text-center">
            <Text type="secondary">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary font-semibold hover:underline">
                Sign in
              </Link>
            </Text>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 pb-safe">
          <Text type="secondary" className="text-xs">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>
            {' '}and{' '}
            <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
          </Text>
        </div>
      </motion.div>
    </div>
  )
}
