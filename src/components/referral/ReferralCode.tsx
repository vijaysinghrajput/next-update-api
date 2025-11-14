'use client'

import React, { useState, useEffect } from 'react'
import { Card, Typography, Button, message, Space, Avatar, Statistic, Tag } from 'antd'
import { GiftOutlined, CopyOutlined, ShareAltOutlined, UserAddOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import { socialActions, supabaseClient } from '../../lib/supabase-client'
import { useApp } from '../../lib/providers'
import { APP_STORE_LINK } from '../../lib/utils'

const { Title, Text, Paragraph } = Typography

interface ReferralData {
  referralCode: string
  pointsBalance: number
  totalReferrals: number
  referralEarnings: number
}

export default function ReferralCode() {
  const { user } = useApp()
  const [referralData, setReferralData] = useState<ReferralData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (user) {
      fetchReferralData()
    }
  }, [user])

  const fetchReferralData = async () => {
    try {
      // Get user profile with referral info
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('referral_code, points_balance')
        .eq('id', user?.id)
        .single()

      if (profileError) {
        console.error('Error fetching profile:', profileError)
        return
      }

      // Count total referrals
      const { count: totalReferrals } = await supabaseClient
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('referred_by', user?.id)

      // Calculate referral earnings
      const { data: earnings } = await supabaseClient
        .from('points_transactions')
        .select('amount')
        .eq('user_id', user?.id)
        .eq('description', 'Referral bonus (referrer)')

      const referralEarnings = earnings?.reduce((sum, transaction) => sum + transaction.amount, 0) || 0

      setReferralData({
        referralCode: profile.referral_code,
        pointsBalance: profile.points_balance,
        totalReferrals: totalReferrals || 0,
        referralEarnings
      })
    } catch (error) {
      console.error('Error fetching referral data:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyReferralCode = () => {
    if (referralData?.referralCode) {
      navigator.clipboard.writeText(referralData.referralCode)
      message.success('Referral code copied to clipboard!')
    }
  }

  const shareReferralLink = async () => {
    const referralCode = referralData?.referralCode
    let channel: string | null = null
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join Next Update',
          text: `Join me on Next Update and we both get 100 bonus points! Use referral code: ${referralCode}\n\nDownload the app: ${APP_STORE_LINK}`,
          url: APP_STORE_LINK
        })
        channel = 'native_share'
      } else {
        await navigator.clipboard.writeText(`Join me on Next Update! Use referral code: ${referralCode}\n\nDownload the app: ${APP_STORE_LINK}`)
        message.success('Referral link copied to clipboard!')
        channel = 'clipboard'
      }

      if (user) {
        await socialActions.logAppShare(user.id, {
          target: 'referral_link',
          channel,
          metadata: {
            referralCode: referralData?.referralCode,
          },
        })
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return
      }
      console.error('Failed to share referral link', error)
      message.error('Unable to share referral link right now.')
    }
  }

  if (loading) {
    return <Card loading />
  }

  if (!referralData) {
    return <Card>Error loading referral data</Card>
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <Card
        className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 shadow-lg"
        title={
          <div className="flex items-center gap-2">
            <Avatar className="bg-blue-500" icon={<GiftOutlined />} />
            <Title level={4} className="mb-0">Your Referral Code</Title>
          </div>
        }
      >
        <Space direction="vertical" size="large" className="w-full">
          {/* Referral Code Display */}
          <div className="text-center bg-white rounded-lg p-6 border-2 border-dashed border-blue-300">
            <Title level={2} className="text-blue-600 font-mono tracking-wider mb-2">
              {referralData.referralCode}
            </Title>
            <Paragraph className="text-gray-600 mb-4">
              Share this code with friends to earn 100 points each!
            </Paragraph>
            <Space>
              <Button 
                type="primary" 
                icon={<CopyOutlined />}
                onClick={copyReferralCode}
              >
                Copy Code
              </Button>
              <Button 
                icon={<ShareAltOutlined />}
                onClick={shareReferralLink}
              >
                Share Link
              </Button>
            </Space>
          </div>

          {/* Referral Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="text-center">
              <Statistic
                title="Total Referrals"
                value={referralData.totalReferrals}
                prefix={<UserAddOutlined className="text-green-500" />}
              />
            </Card>
            <Card className="text-center">
              <Statistic
                title="Referral Earnings"
                value={referralData.referralEarnings}
                suffix="pts"
                valueStyle={{ color: '#3f8600' }}
                prefix={<GiftOutlined className="text-blue-500" />}
              />
            </Card>
            <Card className="text-center">
              <Statistic
                title="Current Balance"
                value={referralData.pointsBalance}
                suffix="pts"
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </div>

          {/* How it Works */}
          <Card className="bg-yellow-50 border-yellow-200">
            <Title level={5} className="text-yellow-800">
              🎯 How Referrals Work:
            </Title>
            <ul className="text-yellow-700 space-y-1">
              <li>• Share your referral code with friends</li>
              <li>• When they sign up with your code, you both get <Tag color="green">100 points</Tag></li>
              <li>• No limit on referrals - keep earning!</li>
              <li>• Points can be used for rewards and features</li>
            </ul>
          </Card>
        </Space>
      </Card>
    </motion.div>
  )
}
