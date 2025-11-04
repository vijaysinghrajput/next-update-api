'use client'

import React, { useState, useEffect } from 'react'
import { Card, Table, Button, Space, Typography, Avatar, Tabs, Modal, Form, InputNumber, Input, message, Select } from 'antd'
import { 
  CrownOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import { supabaseClient } from '../../lib/supabase-client'
import { formatNumber, formatRelativeTime } from '../../lib/utils'
import AdminStats from './AdminStats'
import { getProxiedImageUrl } from '../../lib/r2-storage'

const { Title, Text } = Typography
// Removed deprecated TabPane import
const { Option } = Select

interface ProfileRow {
  id: string
  name: string
  email: string
  avatar_url: string | null
  is_verified: boolean
  has_blue_tick: boolean
  points_balance: number
  created_at: string
}

interface PostRow {
  id: string
  user_id: string
  caption: string | null
  media_urls: string[]
  created_at: string
  profiles?: { name?: string; avatar_url?: string | null }
}

interface KycRow {
  id: string
  user_id: string
  status: 'pending' | 'verified' | 'rejected'
  rejection_reason: string | null
  created_at: string
  profiles?: { name?: string; avatar_url?: string | null }
}

interface PaymentRequestRow {
  id: string
  user_id: string
  amount: number
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  created_at: string
  profiles?: { name?: string; avatar_url?: string | null }
}

export default function AdminDashboard() {
  const [users, setUsers] = useState<ProfileRow[]>([])
  const [posts, setPosts] = useState<PostRow[]>([])
  const [kycSubmissions, setKycSubmissions] = useState<KycRow[]>([])
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [showPointsModal, setShowPointsModal] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [pointsForm] = Form.useForm()

  useEffect(() => {
    fetchDashboardData()
  }, [])

  useEffect(() => {
    const onFocus = () => fetchDashboardData()
    const onVisible = () => { if (document.visibilityState === 'visible') fetchDashboardData() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {

      // Fetch recent data
      const [recentUsers, recentPosts, pendingKyc, pendingPayments] = await Promise.all([
        supabaseClient.from('profiles').select('*').order('created_at', { ascending: false }).limit(10),
        supabaseClient.from('posts').select(`
          *,
          profiles:user_id (name, avatar_url)
        `).eq('is_active', true).order('created_at', { ascending: false }).limit(10),
        supabaseClient.from('kyc_submissions').select(`
          *,
          profiles:user_id (name, avatar_url)
        `).eq('status', 'pending').order('created_at', { ascending: false }),
        supabaseClient.from('payment_requests').select(`
          *,
          profiles:user_id (name, avatar_url)
        `).eq('status', 'pending').order('created_at', { ascending: false })
      ])

      setUsers((recentUsers.data as ProfileRow[]) || [])
      setPosts((recentPosts.data as PostRow[]) || [])
      setKycSubmissions((pendingKyc.data as KycRow[]) || [])
      setPaymentRequests((pendingPayments.data as PaymentRequestRow[]) || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleKycAction = async (id: string, status: 'verified' | 'rejected', reason?: string) => {
    try {
      const { error } = await supabaseClient
        .from('kyc_submissions')
        .update({
          status,
          rejection_reason: reason || null,
          verified_by: 'admin', // In real app, use current admin ID
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      // If verified, update profile
      if (status === 'verified') {
        const submission = kycSubmissions.find((s) => s.id === id)
        if (submission) {
          await supabaseClient
            .from('profiles')
            .update({ is_verified: true })
            .eq('id', submission.user_id)
        }
      }

      message.success(`KYC ${status} successfully`)
      fetchDashboardData()
    } catch (error) {
      message.error('Failed to update KYC status')
    }
  }

  const handlePaymentAction = async (id: string, status: 'approved' | 'rejected', notes?: string) => {
    try {
      const request = paymentRequests.find((r) => r.id === id)
      if (!request) return

      const { error } = await supabaseClient
        .from('payment_requests')
        .update({
          status,
          admin_notes: notes || null,
          processed_by: 'admin', // In real app, use current admin ID
          updated_at: new Date().toISOString()
        })
        .eq('id', id)

      if (error) throw error

      // If approved, add points
      if (status === 'approved') {
        await supabaseClient.from('points_transactions').insert({
          user_id: request.user_id,
          type: 'admin_credit',
          amount: request.amount,
          description: `Manual purchase approved - ${request.amount} points`,
          reference_id: id
        })

        // Update profile balance by fetching current and writing new value
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('points_balance')
          .eq('id', request.user_id)
          .single()

        const current = (profile?.points_balance as number | undefined) ?? 0
        await supabaseClient
          .from('profiles')
          .update({ points_balance: current + request.amount })
          .eq('id', request.user_id)
      }

      message.success(`Payment ${status} successfully`)
      fetchDashboardData()
    } catch (error) {
      message.error('Failed to update payment status')
    }
  }

  const handlePointsUpdate = async (values: any) => {
    if (!selectedUserId) return

    try {
      const { error } = await supabaseClient.from('points_transactions').insert({
        user_id: selectedUserId,
        type: values.type,
        amount: values.type === 'admin_debit' ? -Math.abs(values.amount) : values.amount,
        description: values.description
      })

      if (error) throw error

      // Update profile balance by fetching current and writing new value
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('points_balance')
        .eq('id', selectedUserId)
        .single()

      const delta: number = values.type === 'admin_debit' ? -Math.abs(values.amount) : Math.abs(values.amount)
      const current = (profile?.points_balance as number | undefined) ?? 0

      await supabaseClient
        .from('profiles')
        .update({ points_balance: current + delta })
        .eq('id', selectedUserId)

      message.success('Points updated successfully')
      setShowPointsModal(false)
      pointsForm.resetFields()
      fetchDashboardData()
    } catch (error) {
      message.error('Failed to update points')
    }
  }

  const userColumns = [
    {
      title: 'User',
      key: 'user',
      render: (record: ProfileRow) => (
        <div className="flex items-center space-x-2">
          <Avatar src={getProxiedImageUrl(record.avatar_url) || undefined} size="small">
            {record.name?.[0]?.toUpperCase()}
          </Avatar>
          <div>
            <div className="flex items-center space-x-1">
              <Text strong>{record.name}</Text>
              {record.is_verified && <CheckCircleOutlined className="text-green-500" />}
              {record.has_blue_tick && <CrownOutlined className="text-yellow-500" />}
            </div>
            <Text type="secondary" className="text-xs">{record.email}</Text>
          </div>
        </div>
      )
    },
    {
      title: 'Points',
      dataIndex: 'points_balance',
      render: (points: number) => formatNumber(points)
    },
    {
      title: 'Joined',
      dataIndex: 'created_at',
      render: (date: string) => formatRelativeTime(date)
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: ProfileRow) => (
        <Button
          size="small"
          onClick={() => {
            setSelectedUserId(record.id)
            setShowPointsModal(true)
          }}
        >
          Manage Points
        </Button>
      )
    }
  ]

  const kycColumns = [
    {
      title: 'User',
      key: 'user',
      render: (record: KycRow) => (
        <div className="flex items-center space-x-2">
          <Avatar src={getProxiedImageUrl(record.profiles?.avatar_url) || undefined} size="small">
            {record.profiles?.name?.[0]?.toUpperCase()}
          </Avatar>
          <Text strong>{record.profiles?.name}</Text>
        </div>
      )
    },
    {
      title: 'Submitted',
      dataIndex: 'created_at',
      render: (date: string) => formatRelativeTime(date)
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: KycRow) => (
        <Space>
          <Button
            size="small"
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => handleKycAction(record.id, 'verified')}
          >
            Approve
          </Button>
          <Button
            size="small"
            danger
            icon={<CloseCircleOutlined />}
            onClick={() => handleKycAction(record.id, 'rejected', 'Invalid documents')}
          >
            Reject
          </Button>
        </Space>
      )
    }
  ]

  const paymentColumns = [
    {
      title: 'User',
      key: 'user',
      render: (record: PaymentRequestRow) => (
        <div className="flex items-center space-x-2">
          <Avatar src={getProxiedImageUrl(record.profiles?.avatar_url) || undefined} size="small">
            {record.profiles?.name?.[0]?.toUpperCase()}
          </Avatar>
          <Text strong>{record.profiles?.name}</Text>
        </div>
      )
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      render: (amount: number) => `${formatNumber(amount)} points`
    },
    {
      title: 'Requested',
      dataIndex: 'created_at',
      render: (date: string) => formatRelativeTime(date)
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: PaymentRequestRow) => (
        <Space>
          <Button
            size="small"
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => handlePaymentAction(record.id, 'approved')}
          >
            Approve
          </Button>
          <Button
            size="small"
            danger
            icon={<CloseCircleOutlined />}
            onClick={() => handlePaymentAction(record.id, 'rejected', 'Invalid payment proof')}
          >
            Reject
          </Button>
        </Space>
      )
    }
  ]

  return (
    <div className="space-y-8">
      {/* Statistics Overview */}
      <div className="flex items-center justify-between">
        <AdminStats />
        <Button onClick={fetchDashboardData}>Refresh</Button>
      </div>

      {/* Management Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card title="Platform Management" className="shadow-sm">
          <Tabs
            defaultActiveKey="users"
            items={[
              {
                key: 'users',
                label: 'Recent Users',
                children: (
                  <Table
                    dataSource={users}
                    columns={userColumns}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 800 }}
                  />
                )
              },
              {
                key: 'kyc',
                label: 'KYC Verification',
                children: (
                  <Table
                    dataSource={kycSubmissions}
                    columns={kycColumns}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 600 }}
                  />
                )
              },
              {
                key: 'payments',
                label: 'Payment Requests',
                children: (
                  <Table
                    dataSource={paymentRequests}
                    columns={paymentColumns}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    scroll={{ x: 700 }}
                  />
                )
              }
            ]}
            size="large"
          />
        </Card>
      </motion.div>

      {/* Points Management Modal */}
      <Modal
        title="Manage User Points"
        open={showPointsModal}
        onCancel={() => setShowPointsModal(false)}
        footer={null}
      >
        <Form
          form={pointsForm}
          onFinish={handlePointsUpdate}
          layout="vertical"
        >
          <Form.Item
            name="type"
            label="Action"
            rules={[{ required: true, message: 'Please select action type' }]}
          >
            <Select placeholder="Select action">
              <Option value="admin_credit">Add Points</Option>
              <Option value="admin_debit">Deduct Points</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="amount"
            label="Amount"
            rules={[{ required: true, message: 'Please enter amount' }]}
          >
            <InputNumber
              min={1}
              className="w-full"
              placeholder="Enter points amount"
            />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <Input.TextArea
              placeholder="Enter reason for points adjustment"
              rows={3}
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" className="w-full">
              Update Points
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
