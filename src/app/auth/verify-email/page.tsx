'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Form, Input, Button, Typography, Space, Alert, Card, Statistic } from 'antd'
import { MailOutlined, CheckCircleOutlined, ClockCircleOutlined, EditOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { supabaseClient } from '../../../lib/supabase-client'

const { Title, Text, Paragraph } = Typography

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [form] = Form.useForm()
  
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [changeEmailMode, setChangeEmailMode] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [countdown, setCountdown] = useState(0)
  const [isVerified, setIsVerified] = useState(false)

  // Get email from URL or current user
  useEffect(() => {
    const emailParam = searchParams.get('email')
    
    const checkUser = async () => {
      const { data: { session } } = await supabaseClient.auth.getSession()
      const { data: { user } } = await supabaseClient.auth.getUser()
      
      if (user) {
        setEmail(emailParam || user.email || '')
        
        // Check if email is already verified
        if (user.email_confirmed_at) {
          // Check if user just signed up (account created in last 2 minutes)
          const accountAge = new Date().getTime() - new Date(user.created_at).getTime()
          const isNewAccount = accountAge < 2 * 60 * 1000 // 2 minutes
          
          if (isNewAccount) {
            // Just signed up - don't auto redirect, let them see the page
            setMessage({
              type: 'success',
              text: '✅ Your email has been verified! You can now continue to the app.'
            })
            // Don't set isVerified true, let them click to continue
          } else {
            // Older account that's already verified
            setIsVerified(true)
            setMessage({
              type: 'success',
              text: 'Your email is already verified! Redirecting to home...'
            })
            setTimeout(() => router.push('/'), 2000)
          }
        } else {
          // Email NOT confirmed - show verification instructions
          setMessage({
            type: 'info',
            text: '📧 Please check your email and click the verification link we sent you.'
          })
        }
      } else if (emailParam) {
        // User not logged in but has email from signup
        setEmail(emailParam)
        setMessage({
          type: 'info',
          text: '📧 Verification email sent! Please check your inbox and click the link to verify your email.'
        })
      } else {
        // No user and no email - redirect to register
        console.log('⚠️ No user or email param, redirecting to register')
        router.push('/auth/register')
      }
    }
    
    checkUser()
  }, [searchParams, router])

  // Countdown timer for resend button
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Handle resend verification email
  const handleResendEmail = async () => {
    if (!email) {
      setMessage({ type: 'error', text: 'Email address is required' })
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      console.log('🔄 Resending verification email to:', email)
      
      const { error } = await supabaseClient.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        console.error('❌ Resend error:', error)
        setMessage({ type: 'error', text: error.message })
      } else {
        console.log('✅ Verification email sent successfully')
        setMessage({
          type: 'success',
          text: '✅ Verification email sent! Please check your inbox and spam folder.'
        })
        setCountdown(60) // 60 second cooldown
      }
    } catch (err: any) {
      console.error('❌ Resend exception:', err)
      setMessage({ type: 'error', text: err.message || 'Failed to send verification email' })
    } finally {
      setLoading(false)
    }
  }

  // Handle change email
  const handleChangeEmail = async (values: { newEmail: string }) => {
    setLoading(true)
    setMessage(null)

    try {
      const { data: { user } } = await supabaseClient.auth.getUser()
      
      if (!user) {
        setMessage({ type: 'error', text: 'You must be logged in to change your email' })
        return
      }

      // Update email
      const { error } = await supabaseClient.auth.updateUser({
        email: values.newEmail
      })

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setEmail(values.newEmail)
        setChangeEmailMode(false)
        setMessage({
          type: 'success',
          text: 'Email updated! A verification link has been sent to your new email address.'
        })
        setCountdown(60)
        form.resetFields()
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to update email' })
    } finally {
      setLoading(false)
    }
  }

  // Check verification status
  const checkVerificationStatus = async () => {
    setLoading(true)
    setMessage(null)
    
    try {
      console.log('🔍 Checking verification status...')
      
      // Get current session
      const { data: { session } } = await supabaseClient.auth.getSession()
      
      if (!session) {
        console.log('⚠️ No active session - user not logged in')
        setMessage({ 
          type: 'info', 
          text: '📧 Verification email sent! Please click the link in your email to verify and login.' 
        })
        return
      }
      
      // Refresh session to get latest data
      const { error: refreshError } = await supabaseClient.auth.refreshSession()
      
      if (refreshError) {
        console.log('⚠️ Session refresh failed (might not be logged in):', refreshError.message)
      }
      
      // Get fresh user data
      const { data: { user }, error } = await supabaseClient.auth.getUser()
      
      if (error || !user) {
        console.log('⚠️ No user found - waiting for verification')
        setMessage({ 
          type: 'info', 
          text: '⏳ Waiting for email verification. Please click the link in your email first.' 
        })
        return
      }

      console.log('📧 User email:', user.email)
      console.log('✅ Email confirmed at:', user.email_confirmed_at)

      if (user.email_confirmed_at) {
        console.log('🎉 Email is verified!')
        setMessage({
          type: 'success',
          text: '✅ Email verified successfully! You can now continue to the app.'
        })
      } else {
        console.log('⏳ Email not verified yet')
        setMessage({
          type: 'info',
          text: '⏳ Email not verified yet. Please check your inbox and click the verification link.'
        })
      }
    } catch (err: any) {
      console.error('❌ Check status exception:', err)
      setMessage({ 
        type: 'info', 
        text: '📧 Please click the verification link in your email to continue.' 
      })
    } finally {
      setLoading(false)
    }
  }

  // Continue to app (for verified users)
  const continueToApp = () => {
    router.push('/')
  }

  if (isVerified) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center px-6"
        >
          <CheckCircleOutlined className="text-green-500 text-6xl mb-4" />
          <Title level={2} className="text-green-600">Email Verified!</Title>
          <Text>Redirecting to home page...</Text>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="flex-1 flex flex-col px-6 py-8"
      >
        <div className="flex-1">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', bounce: 0.4 }}
              className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4"
            >
              <MailOutlined className="text-white text-2xl" />
            </motion.div>
            <Title level={2} className="mb-2">Verify Your Email</Title>
            <Text type="secondary">
              We've sent a verification link to
            </Text>
            <div className="mt-2">
              <Text strong className="text-base">{email}</Text>
            </div>
          </div>

          {/* Message Alert */}
          {message && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-4"
            >
              <Alert
                message={message.text}
                type={message.type}
                showIcon
                closable
                onClose={() => setMessage(null)}
              />
            </motion.div>
          )}

          {/* Change Email Mode */}
          {changeEmailMode ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <Form
                form={form}
                onFinish={handleChangeEmail}
                layout="vertical"
                size="large"
              >
                <Form.Item
                  name="newEmail"
                  label="New Email Address"
                  rules={[
                    { required: true, message: 'Please enter your new email' },
                    { type: 'email', message: 'Please enter a valid email address' }
                  ]}
                >
                  <Input
                    prefix={<MailOutlined />}
                    placeholder="Enter new email address"
                    className="rounded-xl"
                  />
                </Form.Item>

                <Space className="w-full" direction="vertical" size="middle">
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    className="w-full h-12 rounded-xl"
                    size="large"
                  >
                    Update Email
                  </Button>
                  <Button
                    onClick={() => setChangeEmailMode(false)}
                    className="w-full h-12 rounded-xl"
                    size="large"
                  >
                    Cancel
                  </Button>
                </Space>
              </Form>
            </motion.div>
          ) : (
            <Space className="w-full" direction="vertical" size="large">
              {/* Instructions */}
              <Card className="border-blue-200 bg-blue-50">
                <Space direction="vertical" size="small">
                  <Text strong className="text-blue-700">
                    📧 Check your email
                  </Text>
                  <Paragraph className="mb-0 text-sm text-gray-600">
                    1. Open the verification email we sent you<br/>
                    2. Click the verification link<br/>
                    3. Come back here and check status
                  </Paragraph>
                  <Text type="secondary" className="text-xs">
                    💡 Tip: Check your spam folder if you don't see it
                  </Text>
                </Space>
              </Card>

              {/* Action Buttons */}
              {message?.type === 'success' && message?.text.includes('verified') ? (
                // Show Continue button if verified
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={continueToApp}
                  className="w-full h-12 rounded-xl bg-green-500 hover:bg-green-600 border-0"
                  size="large"
                >
                  Continue to App →
                </Button>
              ) : (
                // Show normal verification buttons
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  onClick={checkVerificationStatus}
                  loading={loading}
                  className="w-full h-12 rounded-xl"
                  size="large"
                >
                  I've Verified - Check Status
                </Button>
              )}

              <Button
                icon={<MailOutlined />}
                onClick={handleResendEmail}
                loading={loading}
                disabled={countdown > 0}
                className="w-full h-12 rounded-xl"
                size="large"
              >
                {countdown > 0 ? `Resend in ${countdown}s` : 'Resend Verification Email'}
              </Button>

              <Button
                icon={<EditOutlined />}
                onClick={() => setChangeEmailMode(true)}
                className="w-full h-12 rounded-xl"
                size="large"
              >
                Change Email Address
              </Button>

              {/* Skip for Now */}
              <div className="text-center pt-4">
                <Link href="/auth/login" className="text-gray-500 hover:text-primary text-sm">
                  ← Back to Login
                </Link>
              </div>
            </Space>
          )}
        </div>

        {/* Footer Note */}
        <div className="text-center mt-auto pt-6 pb-safe">
          <Text type="secondary" className="text-xs">
            🔒 Email verification helps keep your account secure
          </Text>
        </div>
      </motion.div>
    </div>
  )
}
