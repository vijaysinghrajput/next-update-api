'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Form, Input, Button, Typography, Space, Alert, Select, Divider } from 'antd'
import { UserOutlined, LockOutlined, MailOutlined, PhoneOutlined, EnvironmentOutlined, GiftOutlined } from '@ant-design/icons'
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

  const handleRegister = async (values: RegisterFormData) => {
    setLoading(true)
    setError(null)

    try {
      // Create user with instant confirmation (no email verification)
      const { data, error } = await supabaseClient.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          emailRedirectTo: undefined, // Skip email verification completely
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
        // Create user profile dynamically
        const { data: profileResult, error: profileError } = await supabaseClient
          .rpc('create_user_profile', {
            user_id: data.user.id,
            user_email: values.email,
            user_name: values.name,
            user_phone: values.phone || null,
            user_city_id: values.cityId,
            referral_code_used: null // Handle referral separately
          })

        if (profileError) {
          console.error('Profile creation error:', profileError)
        }

        // Handle referral bonus if code was provided and valid
        if (values.referralCode && referralValidation.isValid) {
          const { data: referralResult, error: referralError } = await supabaseClient
            .rpc('handle_referral_signup', {
              new_user_id: data.user.id,
              referral_code_used: values.referralCode
            })
          
          if (referralResult?.success) {
            console.log('Referral bonus applied:', referralResult.message)
          } else {
            console.error('Referral error:', referralResult?.error)
          }
        }

        // Check if user was created and confirmed instantly
        if (data.user && data.user.email_confirmed_at) {
          // User is instantly confirmed - try immediate login
          const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
            email: values.email,
            password: values.password,
          })

          if (!signInError && signInData.user) {
            // Perfect! Instant login successful
            router.push('/')
            return
          }
        }

        // If user created but not instantly confirmed, wait briefly then try login
        if (data.user) {
          await new Promise(resolve => setTimeout(resolve, 500))
          
          const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
            email: values.email,
            password: values.password,
          })

          if (!signInError && signInData.user) {
            // Success after brief wait
            router.push('/')
            return
          }
          
          // If still failing, user can login manually
          console.log('Registration completed, user can now login')
          const message = encodeURIComponent('Account created successfully! You can now login.')
          router.push(`/auth/login?message=${message}`)
        }
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during registration')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="bg-white rounded-2xl shadow-xl p-8">
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
            <Text type="secondary">or</Text>
          </Divider>

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
        <div className="text-center mt-6">
          <Text type="secondary" className="text-sm">
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
