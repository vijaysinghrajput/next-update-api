'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, Typography, Button, Space, List, Tag, Modal, Upload, Form, InputNumber, Input, message, Spin, Alert } from 'antd'
import { 
  WalletOutlined, 
  PlusOutlined, 
  GiftOutlined, 
  CrownOutlined,
  HistoryOutlined,
  ShoppingOutlined,
  TrophyOutlined,
  UploadOutlined
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { useApp } from '../../lib/providers'
import { supabaseClient } from '../../lib/supabase-client'
import { formatNumber, formatRelativeTime, POINTS_CONFIG } from '../../lib/utils'
import { uploadToR2, generateFileKey } from '../../lib/r2-storage'

const { Title, Text } = Typography

interface Transaction {
  id: string
  type: 'earned' | 'spent' | 'admin_credit' | 'admin_debit'
  amount: number
  description: string
  created_at: string
}

interface PaymentRequest {
  id: string
  amount: number
  status: 'pending' | 'approved' | 'rejected'
  screenshot_url: string
  admin_notes: string | null
  created_at: string
}

export default function WalletPage() {
  const { user, refreshUser, isLoading } = useApp()
  const pathname = usePathname()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showBuyPoints, setShowBuyPoints] = useState(false)
  const [showBlueTick, setShowBlueTick] = useState(false)
  const [buyPointsLoading, setBuyPointsLoading] = useState(false)
  const [blueTickLoading, setBlueTickLoading] = useState(false)
  const [form] = Form.useForm()

  const UPI_ID = process.env.NEXT_PUBLIC_UPI_ID || 'upi@example@okaxis'
  const BANK_NAME = process.env.NEXT_PUBLIC_BANK_NAME || 'Example Bank'
  const BANK_ACCOUNT = process.env.NEXT_PUBLIC_BANK_ACCOUNT || '0000000000'
  const BANK_IFSC = process.env.NEXT_PUBLIC_BANK_IFSC || 'EXAMPL000000'
  const ACCOUNT_NAME = process.env.NEXT_PUBLIC_ACCOUNT_NAME || 'Next Update'

  const fetchData = useCallback(async () => {
    if (!user) return

    setLoading(true)
    try {
      // Fetch transactions
      const { data: transactionsData } = await supabaseClient
        .from('points_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      // Fetch payment requests
      const { data: paymentsData } = await supabaseClient
        .from('payment_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      setTransactions(transactionsData || [])
      setPaymentRequests(paymentsData || [])
    } catch (error) {
      console.error('Error fetching wallet data:', error)
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!isLoading) {
      fetchData()
    }
  }, [fetchData, isLoading, pathname])

  useEffect(() => {
    const onFocus = () => fetchData()
    const onVisible = () => { if (document.visibilityState === 'visible') fetchData() }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [fetchData])

  const handleBuyPoints = async (values: { amount: number; screenshot: any }) => {
    setBuyPointsLoading(true)
    try {
      const file = values.screenshot?.[0]?.originFileObj as File | undefined
      console.debug('[BuyPoints] Form values', { values, hasFile: !!file })
      
      if (!file) {
        message.error('Please upload payment screenshot')
        return
      }

      // Upload screenshot to R2
      const key = generateFileKey(file.name, 'payments')
      const result = await uploadToR2(file, key, file.type)
      console.debug('[BuyPoints] Upload result', result)

      if (!result.success) {
        message.error('Failed to upload screenshot')
        return
      }

      // Create payment request
      const { data: insertData, error } = await supabaseClient
        .from('payment_requests')
        .insert({
          user_id: user!.id,
          amount: values.amount,
          screenshot_url: result.url!,
          status: 'pending'
        })
        .select('*')

      console.debug('[BuyPoints] Insert response', { insertData, error })
      if (error) {
        message.error('Failed to submit payment request')
        return
      }

      message.success('Payment request submitted! We will verify shortly.')
      setShowBuyPoints(false)
      form.resetFields()
      // Refresh lists without full reload
      const [{ data: transactionsData }, { data: paymentsData }] = await Promise.all([
        supabaseClient
          .from('points_transactions')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(20),
        supabaseClient
          .from('payment_requests')
          .select('*')
          .eq('user_id', user!.id)
          .order('created_at', { ascending: false })
          .limit(10)
      ])
      setTransactions(transactionsData || [])
      setPaymentRequests(paymentsData || [])
    } catch (error) {
      console.error('[BuyPoints] Submit error', error)
      message.error('Failed to submit payment request')
    } finally {
      setBuyPointsLoading(false)
    }
  }

  const handleBlueTick = async () => {
    if (!user?.is_verified) {
      message.warning('You need to complete KYC verification first')
      return
    }

    if (user.points_balance < POINTS_CONFIG.BLUE_TICK_COST) {
      message.warning('Insufficient points. You need 2000 points for blue tick.')
      return
    }

    setBlueTickLoading(true)
    try {
      // Deduct points and add blue tick
      const { error: transactionError } = await supabaseClient
        .from('points_transactions')
        .insert({
          user_id: user.id,
          type: 'spent',
          amount: -POINTS_CONFIG.BLUE_TICK_COST,
          description: 'Blue tick purchase'
        })

      if (transactionError) throw transactionError

      // Update profile
      const { error: profileError } = await supabaseClient
        .from('profiles')
        .update({
          has_blue_tick: true,
          points_balance: user.points_balance - POINTS_CONFIG.BLUE_TICK_COST
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      message.success('Blue tick purchased successfully! 🎉')
      setShowBlueTick(false)
      await refreshUser()
    } catch (error) {
      message.error('Failed to purchase blue tick')
    } finally {
      setBlueTickLoading(false)
    }
  }

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'earned': return <GiftOutlined className="text-green-500" />
      case 'spent': return <ShoppingOutlined className="text-red-500" />
      case 'admin_credit': return <TrophyOutlined className="text-blue-500" />
      case 'admin_debit': return <HistoryOutlined className="text-orange-500" />
      default: return <WalletOutlined />
    }
  }

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'earned': return 'green'
      case 'spent': return 'red'
      case 'admin_credit': return 'blue'
      case 'admin_debit': return 'orange'
      default: return 'default'
    }
  }

  if (isLoading) return null
  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Title level={2} className="text-center mb-6">
            <WalletOutlined className="mr-2" />
            My Wallet
          </Title>
        </motion.div>

        {/* Points Balance Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <Card className="bg-gradient-to-r from-primary to-purple-500 text-white border-0 rounded-2xl">
            <div className="text-center">
              <WalletOutlined className="text-4xl mb-2" />
              <Title level={1} className="text-white mb-0">
                {formatNumber(user.points_balance)}
              </Title>
              <Text className="text-white opacity-80">Available Points</Text>
            </div>
          </Card>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Space size="large" className="w-full justify-center">
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setShowBuyPoints(true)}
              className="rounded-full h-12 px-6"
              size="large"
            >
              Buy Points
            </Button>

            {user.is_verified && !user.has_blue_tick && (
              <Button
                icon={<CrownOutlined />}
                onClick={() => setShowBlueTick(true)}
                className="rounded-full h-12 px-6 border-yellow-400 text-yellow-600 hover:bg-yellow-50"
                size="large"
              >
                Blue Tick
              </Button>
            )}
          </Space>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card title="Quick Stats" className="rounded-2xl">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-500">
                  +{formatNumber(transactions.filter(t => t.type === 'earned').reduce((sum, t) => sum + t.amount, 0))}
                </div>
                <Text type="secondary">Total Earned</Text>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-500">
                  -{formatNumber(Math.abs(transactions.filter(t => t.type === 'spent').reduce((sum, t) => sum + t.amount, 0)))}
                </div>
                <Text type="secondary">Total Spent</Text>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Recent Transactions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card
            title="Recent Transactions"
            extra={<HistoryOutlined />}
            className="rounded-2xl"
          >
            {loading ? (
              <div className="text-center py-8">
                <Spin size="large" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No transactions yet
              </div>
            ) : (
              <List
                dataSource={transactions}
                renderItem={(transaction) => (
                  <List.Item className="border-0 px-0">
                    <List.Item.Meta
                      avatar={getTransactionIcon(transaction.type)}
                      title={
                        <div className="flex justify-between items-center">
                          <span>{transaction.description}</span>
                          <Tag color={getTransactionColor(transaction.type)}>
                            {transaction.amount > 0 ? '+' : ''}{formatNumber(transaction.amount)}
                          </Tag>
                        </div>
                      }
                      description={formatRelativeTime(transaction.created_at)}
                    />
                  </List.Item>
                )}
              />
            )}
          </Card>
        </motion.div>

        {/* Payment Requests */}
        {paymentRequests.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card title="Payment Requests" className="rounded-2xl">
              <List
                dataSource={paymentRequests}
                renderItem={(request) => (
                  <List.Item className="border-0 px-0">
                    <List.Item.Meta
                      title={
                        <div className="flex justify-between items-center">
                          <span>{formatNumber(request.amount)} points</span>
                          <Tag color={
                            request.status === 'approved' ? 'green' :
                            request.status === 'rejected' ? 'red' : 'orange'
                          }>
                            {request.status}
                          </Tag>
                        </div>
                      }
                      description={
                        <div>
                          <div>{formatRelativeTime(request.created_at)}</div>
                          {request.admin_notes && (
                            <div className="text-red-500 mt-1">{request.admin_notes}</div>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>
          </motion.div>
        )}
      </div>

      {/* Buy Points Modal */}
      <Modal
        title="Buy Points"
        open={showBuyPoints}
        onCancel={() => setShowBuyPoints(false)}
        footer={null}
        className="rounded-2xl"
      >
        <Form
          form={form}
          onFinish={handleBuyPoints}
          layout="vertical"
        >
          <Alert
            type="info"
            showIcon
            message="Rate: 1 INR = 1 point"
            description={
              <div className="mt-2">
                <div className="mb-1"><strong>UPI ID:</strong> {UPI_ID}</div>
                <div className="mb-1"><strong>Account Name:</strong> {ACCOUNT_NAME}</div>
                <div className="mb-1"><strong>Bank:</strong> {BANK_NAME}</div>
                <div className="mb-1"><strong>Account No:</strong> {BANK_ACCOUNT}</div>
                <div><strong>IFSC:</strong> {BANK_IFSC}</div>
              </div>
            }
            className="mb-4"
          />

          <div className="grid grid-cols-4 gap-2 mb-3">
            {[100,500,1000,1500].map(v => (
              <Button key={v} onClick={() => form.setFieldsValue({ amount: v })}>{v}</Button>
            ))}
          </div>

          <Form.Item
            name="amount"
            label="Points Amount"
            rules={[{ required: true, message: 'Please enter amount' }]}
          >
            <InputNumber
              min={100}
              max={10000}
              step={100}
              className="w-full"
              placeholder="Enter points amount"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="screenshot"
            label="Payment Screenshot"
            rules={[{ required: true, message: 'Please upload payment screenshot' }]}
            valuePropName="fileList"
            getValueFromEvent={(e) => (Array.isArray(e) ? e : e?.fileList)}
          >
            <Upload
              listType="picture-card"
              maxCount={1}
              beforeUpload={() => false}
              accept="image/*"
            >
              <div>
                <UploadOutlined />
                <div style={{ marginTop: 8 }}>Upload</div>
              </div>
            </Upload>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={buyPointsLoading}
              className="w-full h-12 rounded-xl"
              size="large"
            >
              Submit Request
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Blue Tick Modal */}
      <Modal
        title="Purchase Blue Tick"
        open={showBlueTick}
        onCancel={() => setShowBlueTick(false)}
        footer={null}
        className="rounded-2xl"
      >
        <div className="text-center py-6">
          <CrownOutlined className="text-6xl text-yellow-500 mb-4" />
          <Title level={3}>Get Verified Badge</Title>
          <Text type="secondary" className="block mb-6">
            Stand out with a verified blue tick badge for only {formatNumber(POINTS_CONFIG.BLUE_TICK_COST)} points
          </Text>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <Text>
              Your balance: <strong>{formatNumber(user.points_balance)} points</strong>
            </Text>
          </div>

          <Button
            type="primary"
            onClick={handleBlueTick}
            loading={blueTickLoading}
            disabled={user.points_balance < POINTS_CONFIG.BLUE_TICK_COST}
            className="w-full h-12 rounded-xl bg-gradient-to-r from-yellow-400 to-orange-500 border-0"
            size="large"
          >
            Purchase for {formatNumber(POINTS_CONFIG.BLUE_TICK_COST)} points
          </Button>
        </div>
      </Modal>
    </div>
  )
}
