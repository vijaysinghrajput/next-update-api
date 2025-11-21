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
  Statistic
} from 'antd'
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  EyeOutlined,
  SafetyCertificateOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import { supabaseClient } from '../../../lib/supabase-client'
import { isAdmin } from '../../../lib/utils'
import AdminLayout from '../../../components/layout/AdminLayout'
import { getProxiedImageUrl } from '../../../lib/r2-storage'

const { Title, Text } = Typography
const { TextArea } = Input

interface KycSubmission {
  id: string
  user_id: string
  aadhar_front_url: string
  aadhar_back_url: string
  status: 'pending' | 'verified' | 'rejected'
  rejection_reason: string | null
  verified_by: string | null
  created_at: string
  updated_at: string
  profiles?: { 
    name?: string 
    email?: string
    avatar_url?: string | null 
  }
  verified_by_profile?: {
    name?: string
    email?: string
  }
}

interface KycStats {
  total_submissions: number
  pending_submissions: number
  verified_submissions: number
  rejected_submissions: number
}

export default function AdminKycPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [submissions, setSubmissions] = useState<KycSubmission[]>([])
  const [stats, setStats] = useState<KycStats>({
    total_submissions: 0,
    pending_submissions: 0,
    verified_submissions: 0,
    rejected_submissions: 0
  })
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [actionModalVisible, setActionModalVisible] = useState(false)
  const [viewingSubmission, setViewingSubmission] = useState<KycSubmission | null>(null)
  const [actionSubmission, setActionSubmission] = useState<KycSubmission | null>(null)
  const [actionType, setActionType] = useState<'verify' | 'reject'>('verify')
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [form] = Form.useForm()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession()
      if (!session) {
        router.replace('/auth/login')
        return
      }

      const email = session.user.email || ''
      if (!isAdmin(email)) {
        router.replace('/auth/login')
        return
      }

      setCurrentUserId(session.user.id)
      setIsAuthorized(true)
      fetchKycData()
    } catch (error) {
      router.replace('/auth/login')
    }
  }

  const fetchKycData = async () => {
    setLoading(true)
    try {
      const { data: submissionsData, error: submissionsError } = await supabaseClient
        .from('kyc_submissions')
        .select(`
          *,
          profiles:user_id (
            name,
            email,
            avatar_url
          ),
          verified_by_profile:verified_by (
            name,
            email
          )
        `)
        .order('created_at', { ascending: false })

      if (submissionsError) throw submissionsError

      setSubmissions(submissionsData || [])

      // Calculate stats
      if (submissionsData) {
        const total = submissionsData.length
        const pending = submissionsData.filter(s => s.status === 'pending').length
        const verified = submissionsData.filter(s => s.status === 'verified').length
        const rejected = submissionsData.filter(s => s.status === 'rejected').length

        setStats({
          total_submissions: total,
          pending_submissions: pending,
          verified_submissions: verified,
          rejected_submissions: rejected
        })
      }

    } catch (error) {
      console.error('Error fetching KYC data:', error)
      message.error('Failed to fetch KYC submissions')
    } finally {
      setLoading(false)
    }
  }

  const showViewModal = (submission: KycSubmission) => {
    setViewingSubmission(submission)
    setViewModalVisible(true)
  }

  const showActionModal = (submission: KycSubmission, action: 'verify' | 'reject') => {
    setActionSubmission(submission)
    setActionType(action)
    setActionModalVisible(true)
    form.resetFields()
  }

  const handleKycAction = async (values: any) => {
    if (!actionSubmission) return

    try {
      const updateData: any = {
        status: actionType === 'verify' ? 'verified' : 'rejected',
        verified_by: currentUserId,
        updated_at: new Date().toISOString()
      }

      if (actionType === 'reject' && values.rejection_reason) {
        updateData.rejection_reason = values.rejection_reason.trim()
      } else if (actionType === 'verify') {
        updateData.rejection_reason = null
      }

      const { error } = await supabaseClient
        .from('kyc_submissions')
        .update(updateData)
        .eq('id', actionSubmission.id)

      if (error) throw error

      // Update user verification status if verified
      if (actionType === 'verify') {
        const { error: profileError } = await supabaseClient
          .from('profiles')
          .update({ is_verified: true })
          .eq('id', actionSubmission.user_id)

        if (profileError) throw profileError
      }

      message.success(`KYC ${actionType === 'verify' ? 'verified' : 'rejected'} successfully`)
      setActionModalVisible(false)
      fetchKycData()
    } catch (error) {
      console.error('Error updating KYC:', error)
      message.error('Failed to update KYC submission')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'orange'
      case 'verified': return 'green'
      case 'rejected': return 'red'
      default: return 'default'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <ClockCircleOutlined />
      case 'verified': return <CheckCircleOutlined />
      case 'rejected': return <ExclamationCircleOutlined />
      default: return null
    }
  }

  const kycColumns = [
    {
      title: 'User',
      key: 'user',
      render: (record: KycSubmission) => (
        <Space>
          <Avatar 
            src={record.profiles?.avatar_url} 
            size={40}
          />
          <Space direction="vertical" size={0}>
            <Text strong>{record.profiles?.name}</Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.profiles?.email}
            </Text>
          </Space>
        </Space>
      )
    },
    {
      title: 'Documents',
      key: 'documents',
      render: (record: KycSubmission) => (
        <Space>
          <Image
            src={getProxiedImageUrl(record.aadhar_front_url) || ''}
            alt="Aadhar Front"
            width={60}
            height={40}
            style={{ objectFit: 'cover', borderRadius: '4px' }}
          />
          <Image
            src={getProxiedImageUrl(record.aadhar_back_url) || ''}
            alt="Aadhar Back"
            width={60}
            height={40}
            style={{ objectFit: 'cover', borderRadius: '4px' }}
          />
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)} icon={getStatusIcon(status)}>
          {status.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Submitted',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (createdAt: string) => (
        <Text style={{ fontSize: '12px' }}>
          {new Date(createdAt).toLocaleDateString()}
        </Text>
      )
    },
    {
      title: 'Verified By',
      key: 'verified_by',
      render: (record: KycSubmission) => (
        record.verified_by_profile ? (
          <Text style={{ fontSize: '12px' }}>
            {record.verified_by_profile.name}
          </Text>
        ) : (
          <Text type="secondary">-</Text>
        )
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: KycSubmission) => (
        <Space direction="vertical" size="small">
          <Button 
            type="link" 
            icon={<EyeOutlined />} 
            onClick={() => showViewModal(record)}
            size="small"
          >
            View
          </Button>
          {record.status === 'pending' && (
            <>
              <Button 
                type="link" 
                icon={<CheckCircleOutlined />} 
                onClick={() => showActionModal(record, 'verify')}
                size="small"
                style={{ color: '#52c41a' }}
              >
                Verify
              </Button>
              <Button 
                type="link" 
                danger
                icon={<CloseCircleOutlined />} 
                onClick={() => showActionModal(record, 'reject')}
                size="small"
              >
                Reject
              </Button>
            </>
          )}
        </Space>
      )
    }
  ]

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <Statistic 
              title="Total Submissions" 
              value={stats.total_submissions} 
              prefix={<SafetyCertificateOutlined />}
            />
          </Card>
          <Card>
            <Statistic 
              title="Pending Review" 
              value={stats.pending_submissions} 
              valueStyle={{ color: '#faad14' }}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
          <Card>
            <Statistic 
              title="Verified" 
              value={stats.verified_submissions} 
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Card>
          <Card>
            <Statistic 
              title="Rejected" 
              value={stats.rejected_submissions} 
              valueStyle={{ color: '#cf1322' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Card>
        </div>

        <Card>
          <div className="flex justify-between items-center mb-6">
            <Title level={2}>KYC Management</Title>
          </div>

          <Table
            dataSource={submissions}
            columns={kycColumns}
            loading={loading}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Total ${total} submissions`
            }}
          />
        </Card>

        {/* View Modal */}
        <Modal
          title="KYC Submission Details"
          open={viewModalVisible}
          onCancel={() => setViewModalVisible(false)}
          footer={null}
          width={700}
        >
          {viewingSubmission && (
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              <Space>
                <Avatar 
                  src={viewingSubmission.profiles?.avatar_url} 
                  size={60}
                />
                <div>
                  <Title level={4}>{viewingSubmission.profiles?.name}</Title>
                  <Text type="secondary">{viewingSubmission.profiles?.email}</Text>
                </div>
              </Space>

              <div>
                <Text strong>Status: </Text>
                <Tag color={getStatusColor(viewingSubmission.status)} icon={getStatusIcon(viewingSubmission.status)}>
                  {viewingSubmission.status.toUpperCase()}
                </Tag>
              </div>

              <div>
                <Title level={5}>Aadhar Documents</Title>
                <Space size="large">
                  <div>
                    <Text>Front Side:</Text>
                    <br />
                    <Image
                      src={getProxiedImageUrl(viewingSubmission.aadhar_front_url) || ''}
                      alt="Aadhar Front"
                      width={200}
                    />
                  </div>
                  <div>
                    <Text>Back Side:</Text>
                    <br />
                    <Image
                      src={getProxiedImageUrl(viewingSubmission.aadhar_back_url) || ''}
                      alt="Aadhar Back"
                      width={200}
                    />
                  </div>
                </Space>
              </div>

              {viewingSubmission.rejection_reason && (
                <div>
                  <Text strong>Rejection Reason: </Text>
                  <Text type="danger">{viewingSubmission.rejection_reason}</Text>
                </div>
              )}

              {viewingSubmission.verified_by_profile && (
                <div>
                  <Text strong>Verified By: </Text>
                  <Text>{viewingSubmission.verified_by_profile.name}</Text>
                </div>
              )}

              <div>
                <Text strong>Submitted: </Text>
                <Text>{new Date(viewingSubmission.created_at).toLocaleString()}</Text>
              </div>
            </Space>
          )}
        </Modal>

        {/* Action Modal */}
        <Modal
          title={`${actionType === 'verify' ? 'Verify' : 'Reject'} KYC Submission`}
          open={actionModalVisible}
          onCancel={() => setActionModalVisible(false)}
          onOk={form.submit}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleKycAction}
          >
            {actionType === 'reject' && (
              <Form.Item
                name="rejection_reason"
                label="Rejection Reason"
                rules={[{ required: true, message: 'Please provide rejection reason' }]}
              >
                <TextArea 
                  rows={4} 
                  placeholder="Explain why the KYC submission is rejected"
                />
              </Form.Item>
            )}
            {actionType === 'verify' && (
              <div>
                <Text>Are you sure you want to verify this KYC submission?</Text>
                <br />
                <Text type="secondary">The user will be marked as verified.</Text>
              </div>
            )}
          </Form>
        </Modal>
      </motion.div>
    </AdminLayout>
  )
}
