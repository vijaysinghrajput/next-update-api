'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Form, Input, Button, Typography, Alert } from 'antd'
import { LockOutlined, CheckCircleOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { supabaseClient } from '../../../lib/supabase-client'

const { Title, Text } = Typography

export default function ResetPasswordPage() {
  const [form] = Form.useForm()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [validToken, setValidToken] = useState(false)
  const [checking, setChecking] = useState(true)

  // Check if we have a valid recovery token
  useEffect(() => {
    const checkToken = async () => {
      try {
        const { data: { session }, error } = await supabaseClient.auth.getSession()
        
        if (error || !session) {
          setError('Invalid or expired reset link. Please request a new one.')
          setValidToken(false)
        } else {
          setValidToken(true)
        }
      } catch (err) {
        setError('Invalid reset link')
        setValidToken(false)
      } finally {
        setChecking(false)
      }
    }

    checkToken()
  }, [])

  const handleSubmit = async (values: { password: string, confirmPassword: string }) => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabaseClient.auth.updateUser({
        password: values.password
      })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess(true)
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/auth/login?message=' + encodeURIComponent('Password reset successful! You can now login with your new password.'))
      }, 3000)
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center px-6">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <Text>Verifying reset link...</Text>
        </div>
      </div>
    )
  }

  if (!validToken) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full px-6"
        >
          <div className="">
            <Alert
              message="Invalid or Expired Link"
              description={error || 'This password reset link is invalid or has expired. Please request a new one.'}
              type="error"
              showIcon
              className="mb-6"
            />
            <div className="text-center space-y-4">
              <Link href="/auth/forgot-password">
                <Button type="primary" className="w-full h-12 rounded-xl">
                  Request New Reset Link
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button className="w-full h-12 rounded-xl">
                  Back to Login
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full px-6"
        >
          <div className="text-center">
            <CheckCircleOutlined className="text-green-500 text-6xl mb-4" />
            <Title level={2} className="text-green-600 mb-2">Password Reset Successful!</Title>
            <Text className="text-gray-600">
              Your password has been successfully reset. Redirecting to login...
            </Text>
          </div>
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
              className="w-16 h-16 bg-gradient-to-r from-primary to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4"
            >
              <LockOutlined className="text-white text-2xl" />
            </motion.div>
            <Title level={2} className="mb-2">Reset Your Password</Title>
            <Text type="secondary">
              Enter your new password below
            </Text>
          </div>

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

          {/* Form */}
          <Form
            form={form}
            onFinish={handleSubmit}
            layout="vertical"
            size="large"
            autoComplete="off"
          >
            <Form.Item
              name="password"
              rules={[
                { required: true, message: 'Please enter your new password' },
                { min: 6, message: 'Password must be at least 6 characters' }
              ]}
            >
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="New password"
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
                placeholder="Confirm new password"
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
                {loading ? 'Resetting Password...' : 'Reset Password'}
              </Button>
            </Form.Item>
          </Form>

          {/* Back to Login */}
          <div className="text-center mt-auto pt-6 pb-safe">
            <Link href="/auth/login" className="text-primary hover:underline">
              Back to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
