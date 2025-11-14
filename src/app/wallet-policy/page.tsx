'use client'

import React from 'react'
import { Card, Typography, Divider, Space, Button } from 'antd'
import { 
  WalletOutlined, 
  DollarOutlined, 
  TrophyOutlined,
  BankOutlined,
  ArrowLeftOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'

const { Title, Text, Paragraph } = Typography

export default function WalletPolicyPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => router.back()}
            className="mb-4"
          >
            Back
          </Button>
          
          <Title level={2} className="text-center mb-2">
            <WalletOutlined className="mr-2" />
            Wallet & Monetization Policy
          </Title>
          <Text type="secondary" className="block text-center mb-6">
            Learn how to earn and monetize your content
          </Text>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="rounded-2xl shadow-lg">
            <Space direction="vertical" size="large" className="w-full">
              {/* Introduction */}
              <div>
                <Title level={4}>
                  <DollarOutlined className="mr-2 text-green-500" />
                  How to Earn Money
                </Title>
                <Paragraph className="text-base">
                  Through this app, you can earn money by placing advertisements or providing services to customers.
                </Paragraph>
              </div>

              <Divider />

              {/* Advertisement Booking */}
              <div>
                <Title level={4}>
                  <BankOutlined className="mr-2 text-blue-500" />
                  Advertisement Booking Process
                </Title>
                <Paragraph className="text-base">
                  When booking advertisements, the payment structure is as follows:
                </Paragraph>
                <ul className="list-disc list-inside space-y-2 ml-4 text-base">
                  <li>
                    <strong>50%</strong> of the payment must be made using <strong>app points</strong>
                  </li>
                  <li>
                    <strong>50%</strong> through <strong>online transfer</strong>
                  </li>
                </ul>
                <Paragraph className="text-base mt-3">
                  Once your channel becomes eligible for Monetization, you can directly transfer your earned amount from the app to your bank account.
                </Paragraph>
              </div>

              <Divider />

              {/* Monetization Policy */}
              <div>
                <Title level={4}>
                  <TrophyOutlined className="mr-2 text-yellow-500" />
                  Monetization Eligibility
                </Title>
                <Paragraph className="text-base mb-3">
                  Your channel will be considered <strong>Monetized</strong> only when all of the following criteria are met:
                </Paragraph>
                
                <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
                  <Space direction="vertical" size="middle" className="w-full">
                    <div className="flex items-center justify-between">
                      <div>
                        <Text strong className="text-lg">100,000 Followers</Text>
                        <div className="text-sm text-gray-600">Build a strong community</div>
                      </div>
                      <div className="text-3xl">👥</div>
                    </div>
                    
                    <Divider className="my-2" />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Text strong className="text-lg">100,000 App Downloads</Text>
                        <div className="text-sm text-gray-600">Through your referrals</div>
                      </div>
                      <div className="text-3xl">📱</div>
                    </div>
                    
                    <Divider className="my-2" />
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <Text strong className="text-lg">1,000,000 Engagements</Text>
                        <div className="text-sm text-gray-600">Total likes, comments & shares</div>
                      </div>
                      <div className="text-3xl">❤️</div>
                    </div>
                  </Space>
                </Card>
              </div>

              <Divider />

              {/* Legal Notice */}
              <div>
                <Title level={4}>
                  <InfoCircleOutlined className="mr-2 text-red-500" />
                  Important Notice
                </Title>
                <Card className="bg-gray-50 border-gray-300">
                  <Paragraph className="text-base mb-0">
                    <strong>Jurisdiction:</strong> All disputes related to this app shall fall under the jurisdiction of <strong>Gorakhpur</strong>.
                  </Paragraph>
                </Card>
              </div>

              {/* Action Buttons */}
              <div className="pt-4">
                <Space className="w-full justify-center" size="large">
                  <Button
                    type="primary"
                    size="large"
                    onClick={() => router.push('/wallet')}
                    className="rounded-full px-8"
                  >
                    Go to Wallet
                  </Button>
                  <Button
                    size="large"
                    onClick={() => router.push('/profile')}
                    className="rounded-full px-8"
                  >
                    View Profile
                  </Button>
                </Space>
              </div>
            </Space>
          </Card>
        </motion.div>

        {/* Additional Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="rounded-2xl bg-blue-50 border-blue-200">
            <Space direction="vertical" className="w-full">
              <Text strong className="text-blue-700">💡 Pro Tips:</Text>
              <ul className="list-disc list-inside space-y-1 text-sm text-blue-600 ml-2">
                <li>Create engaging content to increase likes and comments</li>
                <li>Share your posts to boost visibility</li>
                <li>Invite friends using your referral code to grow downloads</li>
                <li>Stay active daily to build a loyal follower base</li>
              </ul>
            </Space>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
