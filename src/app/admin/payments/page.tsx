'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Typography, 
  Avatar, 
  message, 
  Tag, 
  Modal, 
  Form, 
  Input, 
  Image,
  Statistic,
  InputNumber,
  Select
} from 'antd'
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  EyeOutlined,
  WalletOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  DollarOutlined
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import { supabaseClient } from '../../../lib/supabase-client'
import { isAdmin, formatNumber } from '../../../lib/utils'
import AdminLayout from '../../../components/layout/AdminLayout'
import { getProxiedImageUrl } from '../../../lib/r2-storage'

const { Title, Text } = Typography
const { TextArea } = Input
const { Option } = Select

interface PaymentRequest {
  id: string
  user_id: string
  amount: number
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  processed_by: string | null
  screenshot_url: string
  created_at: string
  updated_at: string
  profiles?: { 
    name?: string 
    email?: string
    avatar_url?: string | null 
    points_balance?: number
  }
  processed_by_profile?: {
    name?: string
    email?: string
  }
}

interface PaymentStats {
  total_requests: number
  pending_requests: number
  approved_requests: number
  rejected_requests: number
  total_amount_requested: number
  total_amount_approved: number
}

export default function AdminPaymentsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([])
  const [stats, setStats] = useState<PaymentStats>({
    total_requests: 0,
    pending_requests: 0,
    approved_requests: 0,
    rejected_requests: 0,
    total_amount_requested: 0,
    total_amount_approved: 0
  })
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [actionModalVisible, setActionModalVisible] = useState(false)
  const [viewingRequest, setViewingRequest] = useState<PaymentRequest | null>(null)
  const [actionRequest, setActionRequest] = useState<PaymentRequest | null>(null)
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [adminEmail, setAdminEmail] = useState<string>('')
  const [adminUserId, setAdminUserId] = useState<string>('')
  const [form] = Form.useForm()

  const guard = async () => {
    const { data: { session } } = await supabaseClient.auth.getSession()
    const email = session?.user?.email || ''
    if (!session || !isAdmin(email)) {
      router.replace('/auth/login')
      return false
    }
    setAdminEmail(email)
    setAdminUserId(session.user.id)
    setIsAuthorized(true)
    return true
  }

  const fetchPaymentRequests = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabaseClient
        .from('payment_requests')
        .select(`
          *,
          profiles:user_id (name, email, avatar_url, points_balance),
          processed_by_profile:processed_by (name, email)
        `) 
        .order('created_at', { ascending: false })
      
      if (error) {
        console.error('[Payments] fetch error', error)
        message.error('Failed to fetch payment requests')
        return
      }
      
      setPaymentRequests((data as PaymentRequest[]) || [])
      await fetchStats()
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const { data: requests, error } = await supabaseClient
        .from('payment_requests')
        .select('status, amount')
      
      if (error) {
        console.error('[Payments] stats error', error)
        return
      }
      
      const stats = requests?.reduce((acc, req) => {
        acc.total_requests++
        acc.total_amount_requested += req.amount
        
        if (req.status === 'pending') acc.pending_requests++
        else if (req.status === 'approved') {
          acc.approved_requests++
          acc.total_amount_approved += req.amount
        }
        else if (req.status === 'rejected') acc.rejected_requests++
        
        return acc
      }, {
        total_requests: 0,
        pending_requests: 0,
        approved_requests: 0,
        rejected_requests: 0,
        total_amount_requested: 0,
        total_amount_approved: 0
      }) || {
        total_requests: 0,
        pending_requests: 0,
        approved_requests: 0,
        rejected_requests: 0,
        total_amount_requested: 0,
        total_amount_approved: 0
      }
      
      setStats(stats)
    } catch (error) {
      console.error('[Payments] stats exception', error)
    }
  }

  useEffect(() => {
    (async () => {
      if (await guard()) {
        await fetchPaymentRequests()
      }
    })()
  }, [])

  const approve = async (id: string) => {
    try {
      const request = paymentRequests.find(r => r.id === id)
      if (!request) return

      // 1) Update payment request
      const { error: updErr } = await supabaseClient
        .from('payment_requests')
        .update({ status: 'approved', admin_notes: 'Approved', processed_by: adminUserId, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (updErr) {
        console.error('[Payments] approve update error', updErr)
        message.error(updErr.message || 'Failed to approve payment')
        return
      }

      // 2) Insert points transaction (no reference_id)
      const { error: txErr } = await supabaseClient.from('points_transactions').insert({
        user_id: request.user_id,
        type: 'admin_credit',
        amount: request.amount,
        description: `Payment approved +${request.amount} points`
      })
      if (txErr) {
        console.error('[Payments] tx error', txErr)
        message.error(txErr.message || 'Failed to record transaction')
        return
      }

      // 3) Update profile balance
      const { data: profile, error: profErr } = await supabaseClient
        .from('profiles')
        .select('points_balance')
        .eq('id', request.user_id)
        .single()
      if (profErr) {
        console.error('[Payments] profile fetch error', profErr)
        message.error(profErr.message || 'Failed to fetch profile')
        return
      }
      const current = (profile?.points_balance as number | undefined) ?? 0
      const { error: balErr } = await supabaseClient
        .from('profiles')
        .update({ points_balance: current + request.amount, updated_at: new Date().toISOString() })
        .eq('id', request.user_id)
      if (balErr) {
        console.error('[Payments] balance update error', balErr)
        message.error(balErr.message || 'Failed to update balance')
        return
      }

      setPaymentRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved', admin_notes: 'Approved' } : r))
      message.success('Payment approved')
    } catch (e: any) {
      console.error('[Payments] approve exception', e)
      message.error(e?.message || 'Failed to approve payment')
    }
  }

  const reject = async (id: string) => {
    try {
      const { error } = await supabaseClient
        .from('payment_requests')
        .update({ status: 'rejected', admin_notes: 'Invalid proof', processed_by: adminUserId, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) {
        console.error('[Payments] reject error', error)
        message.error(error.message || 'Failed to reject payment')
        return
      }

      setPaymentRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected', admin_notes: 'Invalid proof' } : r))
      message.success('Payment rejected')
    } catch (e: any) {
      console.error('[Payments] reject exception', e)
      message.error(e?.message || 'Failed to reject payment')
    }
  }

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (record: PaymentRequest) => (
        <div className="flex items-center space-x-2">
          <Avatar src={getProxiedImageUrl(record.profiles?.avatar_url)} size="small">
            {record.profiles?.name?.[0]?.toUpperCase()}
          </Avatar>
          <div>
            <Text strong>{record.profiles?.name}</Text>
            <br />
            <Text type="secondary" className="text-xs">{record.profiles?.email}</Text>
          </div>
        </div>
      )
    },
    {
      title: 'Proof',
      key: 'proof',
      render: (record: PaymentRequest) => (
        <a href={getProxiedImageUrl(record.screenshot_url) || record.screenshot_url} target="_blank" rel="noreferrer">
          <img src={getProxiedImageUrl(record.screenshot_url) || record.screenshot_url} alt="Proof" className="w-16 h-16 object-cover rounded" />
        </a>
      )
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      render: (v: number) => `${formatNumber(v)} points`
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (s: PaymentRequest['status']) => (
        <Tag color={s === 'approved' ? 'green' : s === 'rejected' ? 'red' : 'orange'}>{s}</Tag>
      )
    },
    {
      title: 'Date',
      dataIndex: 'created_at',
      render: (date: string) => new Date(date).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: PaymentRequest) => (
        <Space>
          <Button 
            size="small" 
            type="primary" 
            icon={<CheckCircleOutlined />} 
            onClick={() => approve(record.id)} 
            disabled={record.status !== 'pending'}
            loading={loading}
          >
            Approve
          </Button>
          <Button 
            size="small" 
            danger 
            icon={<CloseCircleOutlined />} 
            onClick={() => reject(record.id)} 
            disabled={record.status !== 'pending'}
            loading={loading}
          >
            Reject
          </Button>
          <Button 
            size="small" 
            icon={<EyeOutlined />} 
            onClick={() => {
              setViewingRequest(record)
              setViewModalVisible(true)
            }}
          >
            View
          </Button>
        </Space>
      )
    }
  ]

  if (!isAuthorized) {
    return null
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
            <Card>
              <Statistic
                title="Total Requests"
                value={stats.total_requests}
                prefix={<WalletOutlined />}
              />
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card>
              <Statistic
                title="Pending"
                value={stats.pending_requests}
                prefix={<ClockCircleOutlined />}
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card>
              <Statistic
                title="Approved"
                value={stats.approved_requests}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card>
              <Statistic
                title="Rejected"
                value={stats.rejected_requests}
                prefix={<CloseCircleOutlined />}
                valueStyle={{ color: '#ff4d4f' }}
              />
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <Card>
              <Statistic
                title="Total Requested"
                value={formatNumber(stats.total_amount_requested)}
                suffix="pts"
                prefix={<DollarOutlined />}
              />
            </Card>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card>
              <Statistic
                title="Total Approved"
                value={formatNumber(stats.total_amount_approved)}
                suffix="pts"
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </motion.div>
        </div>

        {/* Payment Requests Table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
          <Card title="Payment Requests" className="shadow-sm">
            <Table
              rowKey="id"
              loading={loading}
              dataSource={paymentRequests}
              columns={columns as any}
              pagination={{ pageSize: 20 }}
              scroll={{ x: 800 }}
            />
          </Card>
        </motion.div>

        {/* View Modal */}
        <Modal
          title="Payment Request Details"
          open={viewModalVisible}
          onCancel={() => {
            setViewModalVisible(false)
            setViewingRequest(null)
          }}
          footer={null}
          width={600}
        >
          {viewingRequest && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar src={getProxiedImageUrl(viewingRequest.profiles?.avatar_url)} size={64}>
                  {viewingRequest.profiles?.name?.[0]?.toUpperCase()}
                </Avatar>
                <div>
                  <Text strong className="text-lg">{viewingRequest.profiles?.name}</Text>
                  <br />
                  <Text type="secondary">{viewingRequest.profiles?.email}</Text>
                  <br />
                  <Text type="secondary">Balance: {formatNumber(viewingRequest.profiles?.points_balance || 0)} points</Text>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Text strong>Amount Requested:</Text>
                  <br />
                  <Text className="text-lg">{formatNumber(viewingRequest.amount)} points</Text>
                </div>
                <div>
                  <Text strong>Status:</Text>
                  <br />
                  <Tag color={viewingRequest.status === 'approved' ? 'green' : viewingRequest.status === 'rejected' ? 'red' : 'orange'}>
                    {viewingRequest.status}
                  </Tag>
                </div>
              </div>

              <div>
                <Text strong>Screenshot Proof:</Text>
                <br />
                <Image
                  src={getProxiedImageUrl(viewingRequest.screenshot_url) || viewingRequest.screenshot_url}
                  alt="Payment Proof"
                  className="mt-2 max-w-full"
                />
              </div>

              {viewingRequest.admin_notes && (
                <div>
                  <Text strong>Admin Notes:</Text>
                  <br />
                  <Text>{viewingRequest.admin_notes}</Text>
                </div>
              )}

              {viewingRequest.processed_by_profile && (
                <div>
                  <Text strong>Processed By:</Text>
                  <br />
                  <Text>{viewingRequest.processed_by_profile.name} ({viewingRequest.processed_by_profile.email})</Text>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                <div>
                  <Text strong>Created:</Text>
                  <br />
                  <Text>{new Date(viewingRequest.created_at).toLocaleString()}</Text>
                </div>
                <div>
                  <Text strong>Updated:</Text>
                  <br />
                  <Text>{new Date(viewingRequest.updated_at).toLocaleString()}</Text>
                </div>
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AdminLayout>
  )
}
