'use client'

import React, { useState, useEffect } from 'react'
import { Card, Row, Col, Statistic, Progress, Typography, Space } from 'antd'
import { 
  UserOutlined, 
  FileTextOutlined, 
  WalletOutlined, 
  SafetyCertificateOutlined,
  TrophyOutlined,
  RiseOutlined,
  FallOutlined
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import { supabaseClient } from '../../lib/supabase-client'
import { formatNumber } from '../../lib/utils'

const { Title, Text } = Typography

interface StatsData {
  totalUsers: number
  totalPosts: number
  totalPoints: number
  pendingKyc: number
  pendingPayments: number
  verifiedUsers: number
  activeUsers: number
  monthlyGrowth: number
}

export default function AdminStats() {
  const [stats, setStats] = useState<StatsData>({
    totalUsers: 0,
    totalPosts: 0,
    totalPoints: 0,
    pendingKyc: 0,
    pendingPayments: 0,
    verifiedUsers: 0,
    activeUsers: 0,
    monthlyGrowth: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    try {
      // Get current month start
      const currentMonth = new Date()
      currentMonth.setDate(1)
      currentMonth.setHours(0, 0, 0, 0)

      // Fetch all statistics in parallel
      const [
        usersRes,
        postsRes,
        pointsRes,
        kycRes,
        paymentsRes,
        verifiedRes,
        activeRes,
        monthlyRes
      ] = await Promise.all([
        supabaseClient.from('profiles').select('*', { count: 'exact' }),
        supabaseClient.from('posts').select('*', { count: 'exact' }).eq('is_active', true),
        supabaseClient.from('points_transactions').select('amount'),
        supabaseClient.from('kyc_submissions').select('*', { count: 'exact' }).eq('status', 'pending'),
        supabaseClient.from('payment_requests').select('*', { count: 'exact' }).eq('status', 'pending'),
        supabaseClient.from('profiles').select('*', { count: 'exact' }).eq('is_verified', true),
        supabaseClient.from('profiles').select('*', { count: 'exact' }).gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()),
        supabaseClient.from('profiles').select('*', { count: 'exact' }).gte('created_at', currentMonth.toISOString())
      ])

      const totalPoints = pointsRes.data?.reduce((sum, t) => sum + (t.amount || 0), 0) || 0
      const monthlyGrowth = ((monthlyRes.count || 0) / Math.max((usersRes.count || 1), 1)) * 100

      setStats({
        totalUsers: usersRes.count || 0,
        totalPosts: postsRes.count || 0,
        totalPoints,
        pendingKyc: kycRes.count || 0,
        pendingPayments: paymentsRes.count || 0,
        verifiedUsers: verifiedRes.count || 0,
        activeUsers: activeRes.count || 0,
        monthlyGrowth
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: <UserOutlined className="text-blue-500" />,
      color: '#1890ff',
      suffix: stats.monthlyGrowth > 0 ? <RiseOutlined className="text-green-500" /> : <FallOutlined className="text-red-500" />,
      description: `${stats.monthlyGrowth.toFixed(1)}% this month`
    },
    {
      title: 'Active Posts',
      value: stats.totalPosts,
      icon: <FileTextOutlined className="text-green-500" />,
      color: '#52c41a',
      description: 'Published content'
    },
    {
      title: 'Total Points',
      value: formatNumber(stats.totalPoints),
      icon: <WalletOutlined className="text-purple-500" />,
      color: '#722ed1',
      description: 'In circulation'
    },
    {
      title: 'Verified Users',
      value: stats.verifiedUsers,
      icon: <SafetyCertificateOutlined className="text-orange-500" />,
      color: '#fa8c16',
      description: 'KYC completed'
    },
    {
      title: 'Pending KYC',
      value: stats.pendingKyc,
      icon: <SafetyCertificateOutlined className="text-yellow-500" />,
      color: '#faad14',
      description: 'Awaiting review'
    },
    {
      title: 'Pending Payments',
      value: stats.pendingPayments,
      icon: <WalletOutlined className="text-red-500" />,
      color: '#f5222d',
      description: 'Need approval'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <Title level={3} className="mb-2">Platform Overview</Title>
        <Text type="secondary">Real-time statistics for Next Update platform</Text>
      </div>

      {/* Stats Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Row gutter={[24, 24]}>
          {statCards.map((stat, index) => (
            <Col xs={24} sm={12} lg={8} xl={6} key={stat.title}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className="hover:shadow-lg transition-shadow duration-300"
                  loading={loading}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        {stat.icon}
                        <Text type="secondary" className="text-sm">{stat.title}</Text>
                      </div>
                      
                      <div className="flex items-baseline space-x-2">
                        <Statistic
                          value={stat.value}
                          valueStyle={{ 
                            color: stat.color,
                            fontSize: '24px',
                            fontWeight: 'bold'
                          }}
                          className="mb-0"
                        />
                        {stat.suffix}
                      </div>
                      
                      <Text type="secondary" className="text-xs mt-1">
                        {stat.description}
                      </Text>
                    </div>
                  </div>
                </Card>
              </motion.div>
            </Col>
          ))}
        </Row>
      </motion.div>

      {/* Progress Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
      >
        <Row gutter={[24, 24]}>
          <Col xs={24} md={12}>
            <Card title="User Verification Rate" loading={loading}>
              <div className="space-y-4">
                <Progress
                  percent={Math.round((stats.verifiedUsers / Math.max(stats.totalUsers, 1)) * 100)}
                  status="active"
                  strokeColor={{
                    from: '#108ee9',
                    to: '#87d068',
                  }}
                />
                <div className="flex justify-between text-sm">
                  <Text type="secondary">Verified: {stats.verifiedUsers}</Text>
                  <Text type="secondary">Total: {stats.totalUsers}</Text>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card title="Platform Activity" loading={loading}>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Text>Active Users (30 days)</Text>
                  <Text strong className="text-green-600">{stats.activeUsers}</Text>
                </div>
                <div className="flex items-center justify-between">
                  <Text>Monthly Growth</Text>
                  <Text strong className={stats.monthlyGrowth > 0 ? 'text-green-600' : 'text-red-600'}>
                    {stats.monthlyGrowth > 0 ? '+' : ''}{stats.monthlyGrowth.toFixed(1)}%
                  </Text>
                </div>
                <div className="flex items-center justify-between">
                  <Text>Posts per User</Text>
                  <Text strong className="text-blue-600">
                    {(stats.totalPosts / Math.max(stats.totalUsers, 1)).toFixed(1)}
                  </Text>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </motion.div>
    </div>
  )
}
