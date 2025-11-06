'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Form, Input, Button, Typography, Alert } from 'antd'
import { MailOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { supabaseClient } from '../../../lib/supabase-client'

const { Title, Text } = Typography

export default function ForgotPasswordPage() {
  const [form] = Form.useForm()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (values: { email: string }) => {
    setLoading(true)
    setError(null)

    try {
      const email = values.email.trim().toLowerCase()

      const { error } = await supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      })

      if (error) {
        setError(error.message)
        return
      }

      setSuccess(true)
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <Alert
              message="Password Reset Email Sent"
              description="Please check your email for a password reset link. If you don't see it, check your spam folder."
              type="success"
              showIcon
              className="mb-6"
            />
            <div className="text-center space-y-4">
              <Link href="/auth/login">
                <Button type="primary" className="w-full">
                  Back to Login
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    )
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
              <MailOutlined className="text-white text-2xl" />
            </motion.div>
            <Title level={2} className="mb-2">Forgot Password?</Title>
            <Text type="secondary">
              Enter your email address and we'll send you a link to reset your password.
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

            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-purple-500 border-0 font-semibold"
                size="large"
              >
                {loading ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </Form.Item>
          </Form>

          {/* Back to Login */}
          <div className="text-center mt-6">
            <Link href="/auth/login" className="text-primary hover:underline inline-flex items-center">
              <ArrowLeftOutlined className="mr-2" />
              Back to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

