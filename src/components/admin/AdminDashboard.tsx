'use client'

import React, { useState, useEffect } from 'react'
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Typography, 
  Space, 
  Button, 
  List, 
  Avatar, 
  Tag, 
  Progress,
  Divider
} from 'antd'
import { 
  UserOutlined,
  FileTextOutlined,
  EnvironmentOutlined,
  SafetyCertificateOutlined,
  WalletOutlined,
  EyeOutlined,
  ArrowRightOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { supabaseClient } from '../../lib/supabase-client'
import { formatNumber, formatRelativeTime } from '../../lib/utils'

const { Title, Text } = Typography

interface DashboardStats {
  total_users: number
  total_posts: number
  total_cities: number
  active_cities: number
  pending_kyc: number
  pending_payments: number
  total_points_distributed: number
  engagement_rate: number
}

interface RecentActivity {
  id: string
  type: 'user_registration' | 'post_created' | 'kyc_submitted' | 'payment_requested'
  user_name: string
  user_avatar?: string
  description: string
  created_at: string
  status?: string
}

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<DashboardStats>({
    total_users: 0,
    total_posts: 0,
    total_cities: 0,
    active_cities: 0,
    pending_kyc: 0,
    pending_payments: 0,
    total_points_distributed: 0,
    engagement_rate: 0
  })
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([])

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // Fetch comprehensive dashboard statistics
      const [
        usersResult,
        postsResult,
        citiesResult,
        kycResult,
        paymentsResult,
        pointsResult
      ] = await Promise.all([
        supabaseClient.from('profiles').select('id', { count: 'exact' }),
        supabaseClient.from('posts').select('id', { count: 'exact' }).eq('is_active', true),
        supabaseClient.from('cities').select('id, is_active', { count: 'exact' }),
        supabaseClient.from('kyc_submissions').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabaseClient.from('payment_requests').select('id', { count: 'exact' }).eq('status', 'pending'),
        supabaseClient.from('points_transactions').select('amount').eq('type', 'earned')
      ])

      // Calculate stats
      const totalUsers = usersResult.count || 0
      const totalPosts = postsResult.count || 0
      const allCities = citiesResult.data || []
      const totalCities = allCities.length
      const activeCities = allCities.filter(c => c.is_active).length
      const pendingKyc = kycResult.count || 0
      const pendingPayments = paymentsResult.count || 0
      const totalPoints = pointsResult.data?.reduce((sum, t) => sum + t.amount, 0) || 0
      
      // Calculate engagement rate (posts per user)
      const engagementRate = totalUsers > 0 ? Math.round((totalPosts / totalUsers) * 100) / 100 : 0

      setStats({
        total_users: totalUsers,
        total_posts: totalPosts,
        total_cities: totalCities,
        active_cities: activeCities,
        pending_kyc: pendingKyc,
        pending_payments: pendingPayments,
        total_points_distributed: totalPoints,
        engagement_rate: engagementRate
      })

      // Fetch recent activities
      await fetchRecentActivity()

    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecentActivity = async () => {
    try {
      // Get recent user registrations
      const { data: newUsers } = await supabaseClient
        .from('profiles')
        .select('id, name, avatar_url, created_at')
        .order('created_at', { ascending: false })
        .limit(5)

      // Get recent posts
      const { data: newPosts } = await supabaseClient
        .from('posts')
        .select('id, created_at, profiles:user_id(name, avatar_url)')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5)

      // Get recent KYC submissions
      const { data: newKyc } = await supabaseClient
        .from('kyc_submissions')
        .select('id, status, created_at, profiles:user_id(name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(5)

      // Get recent payment requests
      const { data: newPayments } = await supabaseClient
        .from('payment_requests')
        .select('id, amount, status, created_at, profiles:user_id(name, avatar_url)')
        .order('created_at', { ascending: false })
        .limit(5)

      // Combine and format activities
      const activities: RecentActivity[] = []

      newUsers?.forEach(user => {
        activities.push({
          id: `user-${user.id}`,
          type: 'user_registration',
          user_name: user.name,
          user_avatar: user.avatar_url,
          description: 'New user registered',
          created_at: user.created_at
        })
      })

      newPosts?.forEach(post => {
        const profile = Array.isArray(post.profiles) ? post.profiles[0] : post.profiles
        activities.push({
          id: `post-${post.id}`,
          type: 'post_created',
          user_name: profile?.name || 'Unknown',
          user_avatar: profile?.avatar_url,
          description: 'Created a new post',
          created_at: post.created_at
        })
      })

      newKyc?.forEach(kyc => {
        const profile = Array.isArray(kyc.profiles) ? kyc.profiles[0] : kyc.profiles
        activities.push({
          id: `kyc-${kyc.id}`,
          type: 'kyc_submitted',
          user_name: profile?.name || 'Unknown',
          user_avatar: profile?.avatar_url,
          description: 'Submitted KYC documents',
          created_at: kyc.created_at,
          status: kyc.status
        })
      })

      newPayments?.forEach(payment => {
        const profile = Array.isArray(payment.profiles) ? payment.profiles[0] : payment.profiles
        activities.push({
          id: `payment-${payment.id}`,
          type: 'payment_requested',
          user_name: profile?.name || 'Unknown',
          user_avatar: profile?.avatar_url,
          description: `Requested ₹${formatNumber(payment.amount)} withdrawal`,
          created_at: payment.created_at,
          status: payment.status
        })
      })

      // Sort by date and take recent 10
      activities.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      setRecentActivity(activities.slice(0, 10))

    } catch (error) {
      console.error('Error fetching recent activity:', error)
    }
  }

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'user_registration': return <UserOutlined style={{ color: '#52c41a' }} />
      case 'post_created': return <FileTextOutlined style={{ color: '#1890ff' }} />
      case 'kyc_submitted': return <SafetyCertificateOutlined style={{ color: '#faad14' }} />
      case 'payment_requested': return <WalletOutlined style={{ color: '#722ed1' }} />
      default: return <EyeOutlined />
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'pending': return 'orange'
      case 'approved': case 'verified': return 'green'
      case 'rejected': return 'red'
      default: return 'default'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="p-6">
        <Title level={2} className="mb-6">Admin Dashboard</Title>

        {/* Main Statistics */}
        <Row gutter={[16, 16]} className="mb-8">
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Users"
                value={stats.total_users}
                prefix={<UserOutlined />}
                loading={loading}
              />
              <Progress 
                percent={Math.min((stats.total_users / 1000) * 100, 100)} 
                showInfo={false}
                size="small"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Total Posts"
                value={stats.total_posts}
                prefix={<FileTextOutlined />}
                loading={loading}
              />
              <Progress 
                percent={Math.min((stats.total_posts / 500) * 100, 100)} 
                showInfo={false}
                size="small"
                strokeColor="#1890ff"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Active Cities"
                value={stats.active_cities}
                suffix={`/ ${stats.total_cities}`}
                prefix={<EnvironmentOutlined />}
                loading={loading}
              />
              <Progress 
                percent={stats.total_cities > 0 ? (stats.active_cities / stats.total_cities) * 100 : 0} 
                showInfo={false}
                size="small"
                strokeColor="#52c41a"
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card>
              <Statistic
                title="Engagement Rate"
                value={stats.engagement_rate}
                suffix="posts/user"
                precision={2}
                loading={loading}
              />
              <Progress 
                percent={Math.min(stats.engagement_rate * 20, 100)} 
                showInfo={false}
                size="small"
                strokeColor="#722ed1"
              />
            </Card>
          </Col>
        </Row>

        {/* Pending Actions */}
        <Row gutter={[16, 16]} className="mb-8">
          <Col xs={24} sm={12} lg={8}>
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push('/admin/kyc')}
            >
              <Statistic
                title="Pending KYC Reviews"
                value={stats.pending_kyc}
                prefix={<SafetyCertificateOutlined />}
                valueStyle={{ color: stats.pending_kyc > 0 ? '#faad14' : '#52c41a' }}
                loading={loading}
              />
              <div className="flex justify-between items-center mt-2">
                <Text type="secondary">Requires attention</Text>
                <Button type="link" size="small" icon={<ArrowRightOutlined />}>
                  Review
                </Button>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card 
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => router.push('/admin/payments')}
            >
              <Statistic
                title="Pending Payments"
                value={stats.pending_payments}
                prefix={<WalletOutlined />}
                valueStyle={{ color: stats.pending_payments > 0 ? '#faad14' : '#52c41a' }}
                loading={loading}
              />
              <div className="flex justify-between items-center mt-2">
                <Text type="secondary">Awaiting approval</Text>
                <Button type="link" size="small" icon={<ArrowRightOutlined />}>
                  Process
                </Button>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card>
              <Statistic
                title="Points Distributed"
                value={formatNumber(stats.total_points_distributed)}
                prefix={<WalletOutlined />}
                loading={loading}
              />
              <div className="flex justify-between items-center mt-2">
                <Text type="secondary">Total earned by users</Text>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Recent Activity and Quick Actions */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card title="Recent Activity" className="h-full">
              <List
                dataSource={recentActivity}
                loading={loading}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          src={item.user_avatar} 
                          icon={<UserOutlined />}
                          size="default"
                        />
                      }
                      title={
                        <Space>
                          {getActivityIcon(item.type)}
                          <Text strong>{item.user_name}</Text>
                          <Text>{item.description}</Text>
                          {item.status && (
                            <Tag color={getStatusColor(item.status)}>
                              {item.status}
                            </Tag>
                          )}
                        </Space>
                      }
                      description={formatRelativeTime(item.created_at)}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="Quick Actions" className="h-full">
              <Space direction="vertical" size="middle" className="w-full">
                <Button 
                  type="primary" 
                  block 
                  icon={<UserOutlined />}
                  onClick={() => router.push('/admin/users')}
                >
                  Manage Users
                </Button>
                <Button 
                  block 
                  icon={<EnvironmentOutlined />}
                  onClick={() => router.push('/admin/cities')}
                >
                  Manage Cities
                </Button>
                <Button 
                  block 
                  icon={<FileTextOutlined />}
                  onClick={() => router.push('/admin/posts')}
                >
                  Manage Posts
                </Button>
                <Divider />
                <Button 
                  block 
                  icon={<SafetyCertificateOutlined />}
                  onClick={() => router.push('/admin/kyc')}
                  danger={stats.pending_kyc > 0}
                >
                  KYC Reviews {stats.pending_kyc > 0 && `(${stats.pending_kyc})`}
                </Button>
                <Button 
                  block 
                  icon={<WalletOutlined />}
                  onClick={() => router.push('/admin/payments')}
                  danger={stats.pending_payments > 0}
                >
                  Payment Requests {stats.pending_payments > 0 && `(${stats.pending_payments})`}
                </Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    </motion.div>
  )
}
