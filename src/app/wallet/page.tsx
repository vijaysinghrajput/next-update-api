'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, Typography, Button, Space, List, Tag, Modal, Upload, Form, InputNumber, Spin, Alert, App } from 'antd'
import { 
  WalletOutlined, 
  PlusOutlined, 
  GiftOutlined, 
  CrownOutlined,
  HistoryOutlined,
  ShoppingOutlined,
  TrophyOutlined,
  UploadOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import { usePathname, useRouter } from 'next/navigation'
import { useApp } from '../../lib/providers'
import { supabaseClient } from '../../lib/supabase-client'
import type { WalletSettings as WalletSettingsRow } from '../../lib/supabase'
import { formatNumber, formatRelativeTime, POINTS_CONFIG } from '../../lib/utils'
import { uploadToR2, generateFileKey } from '../../lib/r2-storage'

const { Title, Text } = Typography

interface Transaction {
  id: string
  type: 'earned' | 'spent' | 'admin_credit' | 'admin_debit'
  amount: number
  description: string
  activity: string | null
  reference_id: string | null
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

interface ResolvedWalletSettings {
  id: string
  upi_id: string | null
  account_name: string | null
  bank_name: string | null
  account_number: string | null
  ifsc_code: string | null
  points_rate: number
  preset_amounts: number[]
  payment_instructions: string | null
}

export default function WalletPage() {
  const { user, refreshUser, isLoading } = useApp()
  const { message: messageApi } = App.useApp()
  const pathname = usePathname()
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showBuyPoints, setShowBuyPoints] = useState(false)
  const [showBlueTick, setShowBlueTick] = useState(false)
  const [buyPointsLoading, setBuyPointsLoading] = useState(false)
  const [blueTickLoading, setBlueTickLoading] = useState(false)
  const [walletSettings, setWalletSettings] = useState<ResolvedWalletSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [transactionPage, setTransactionPage] = useState(1)
  const [transactionTotal, setTransactionTotal] = useState(0)
  const [form] = Form.useForm()

  const TRANSACTIONS_PAGE_SIZE = 10

  const fetchSettings = useCallback(async () => {
    setSettingsLoading(true)
    try {
      const { data, error } = await supabaseClient
        .from('wallet_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)

      if (error) throw error

      const latest = (data?.[0] ?? null) as WalletSettingsRow | null

      if (latest) {
        setWalletSettings({
          id: latest.id,
          upi_id: latest.upi_id,
          account_name: latest.account_name,
          bank_name: latest.bank_name,
          account_number: latest.account_number,
          ifsc_code: latest.ifsc_code,
          points_rate: Number(latest.points_rate ?? 1) || 1,
          preset_amounts: (latest.preset_amounts ?? [])
            .map((value) => Number(value))
            .filter((value) => !Number.isNaN(value) && value > 0)
            .sort((a, b) => a - b),
          payment_instructions: latest.payment_instructions
        })
      } else {
        setWalletSettings(null)
        messageApi.warning('Wallet configuration missing. Please contact support.')
      }
    } catch (error) {
      console.error('Error fetching wallet settings:', error)
      messageApi.error('Failed to load wallet settings')
      setWalletSettings(null)
    } finally {
      setSettingsLoading(false)
    }
  }, [messageApi])

  const fetchData = useCallback(async (page: number = 1) => {
    if (!user) return

    setLoading(true)
    try {
      // Fetch transactions with pagination and total count
      const from = (page - 1) * TRANSACTIONS_PAGE_SIZE
      const to = from + TRANSACTIONS_PAGE_SIZE - 1
      
      const { data: transactionsData, count } = await supabaseClient
        .from('points_transactions')
        .select('id, type, amount, description, created_at, activity, reference_id', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(from, to)

      // Fetch payment requests
      const { data: paymentsData } = await supabaseClient
        .from('payment_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      setTransactions(transactionsData || [])
      setTransactionTotal(count || 0)
      setPaymentRequests(paymentsData || [])
    } catch (error) {
      console.error('Error fetching wallet data:', error)
    } finally {
      setLoading(false)
    }
  }, [user, TRANSACTIONS_PAGE_SIZE])

  useEffect(() => {
    fetchSettings()
  }, [fetchSettings])

  useEffect(() => {
    if (!isLoading) {
      fetchData(transactionPage)
    }
  }, [fetchData, fetchSettings, isLoading, pathname, transactionPage])

  useEffect(() => {
    const onFocus = () => {
      fetchData(transactionPage)
      fetchSettings()
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchData(transactionPage)
        fetchSettings()
      }
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [fetchData, fetchSettings, transactionPage])

  const handleTransactionPageChange = (page: number) => {
    setTransactionPage(page)
  }

  const getNativeFileMeta = (file: any) => {
    if (typeof window === 'undefined') return null
    const store: WeakMap<File, any> | undefined = (window as any).__nativeFileMeta
    const origin = file?.originFileObj || file
    return origin && store ? store.get(origin) : null
  }

  const handleBuyPoints = async (values: { amount: number; screenshot: any }) => {
    setBuyPointsLoading(true)
    try {
      if (!walletSettings) {
        messageApi.error('Wallet configuration is missing. Please try again later.')
        return
      }

      const screenshotEntry = values.screenshot?.[0]
      const nativeMeta = screenshotEntry ? getNativeFileMeta(screenshotEntry) : null
      const nativeUrl = screenshotEntry?.r2Url || nativeMeta?.url
      const file = screenshotEntry?.originFileObj as File | undefined
      console.debug('[BuyPoints] Form values', { values, hasFile: !!file, hasNative: !!nativeUrl })
      
      if (!file && !nativeUrl) {
        messageApi.error('Please upload payment screenshot')
        return
      }

      let screenshotUrl = nativeUrl

      if (!screenshotUrl && file) {
        // Upload screenshot to R2
        const key = generateFileKey(file.name, 'payments')
        const result = await uploadToR2(file, key, file.type)
        console.debug('[BuyPoints] Upload result', result)

        if (!result.success) {
          messageApi.error('Failed to upload screenshot')
          return
        }

        screenshotUrl = result.url!
      }

      // Create payment request
      const { data: insertData, error } = await supabaseClient
        .from('payment_requests')
        .insert({
          user_id: user!.id,
          amount: values.amount,
          screenshot_url: screenshotUrl!,
          status: 'pending'
        })
        .select('*')

      console.debug('[BuyPoints] Insert response', { insertData, error })
      if (error) {
        messageApi.error('Failed to submit payment request')
        return
      }

      messageApi.success('Payment request submitted! We will verify shortly.')
      setShowBuyPoints(false)
      form.resetFields()
      // Refresh lists without full reload
      await fetchData(transactionPage)
    } catch (error) {
      console.error('[BuyPoints] Submit error', error)
      messageApi.error('Failed to submit payment request')
    } finally {
      setBuyPointsLoading(false)
    }
  }

  const handleBlueTick = async () => {
    setBlueTickLoading(true)
    try {
      const { error } = await supabaseClient.rpc('purchase_blue_tick')

      if (error) {
        switch (error.code) {
          case 'NTKYC':
            messageApi.warning('You need to complete KYC verification first')
            break
          case 'PTLOW':
            messageApi.warning('Insufficient points for blue tick purchase')
            break
          case 'BTOWN':
            messageApi.info('You already have a blue tick badge')
            break
          case '42501':
            messageApi.warning('You must be logged in to purchase a blue tick')
            break
          default:
            messageApi.error(error.message || 'Failed to purchase blue tick')
        }
        return
      }

      messageApi.success('Blue tick purchased successfully! 🎉')
      setShowBlueTick(false)
      await Promise.all([refreshUser(), fetchData(transactionPage)])
    } catch (error) {
      console.error('[BlueTick] purchase error', error)
      messageApi.error('Failed to purchase blue tick')
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

  const getActivityLabel = (activity: string | null) => {
    if (!activity) return null

    const map: Record<string, string> = {
      post_create: 'Post published',
      post_delete: 'Post removed',
      post_like: 'Post like',
      post_like_reversal: 'Like removed',
      post_comment: 'Post comment',
      post_comment_reversal: 'Comment removed',
      post_share: 'Post shared',
      post_share_reversal: 'Share removed',
      app_share: 'App shared',
      daily_check_in: 'Daily check-in',
      referral_bonus: 'Referral bonus'
    }

    return map[activity] ?? activity.replace(/_/g, ' ')
  }

  const categorizeTransaction = (transaction: Transaction) => {
    const activity = transaction.activity
    const description = transaction.description?.toLowerCase() ?? ''

    if (transaction.amount < 0) {
      if (transaction.description.toLowerCase().includes('blue tick')) {
        return { key: 'spent_blue_tick', label: 'Blue tick purchase' }
      }
      return { key: 'spent', label: 'Spent / Redeemed' }
    }

    switch (activity) {
      case 'post_create':
        return { key: 'post_create', label: 'Post creation rewards' }
      case 'post_like':
        return { key: 'post_like', label: 'Post likes' }
      case 'post_comment':
        return { key: 'post_comment', label: 'Post comments' }
      case 'post_share':
        return { key: 'post_share', label: 'Post shares' }
      case 'app_share':
        return { key: 'app_share', label: 'App shares' }
      case 'referral_bonus':
        return { key: 'referral_bonus', label: 'Referral bonuses' }
      case 'daily_check_in':
        return { key: 'daily_check_in', label: 'Daily check-ins' }
      default:
        break
    }

    if (description.includes('referral')) {
      return { key: 'referral_bonus', label: 'Referral bonuses' }
    }

    if (transaction.type === 'admin_credit') {
      if (description.includes('payment') || description.includes('buy points') || description.includes('purchase')) {
        return { key: 'purchased', label: 'Bought points' }
      }
      return { key: 'admin_credit', label: 'Manual credits' }
    }

    return { key: 'other', label: 'Other earnings' }
  }

  const pointsBreakdown = useMemo(() => {
    if (!transactions.length) return []

    const summary = transactions.reduce<Record<string, { label: string; total: number; count: number }>>((acc, transaction) => {
      const category = categorizeTransaction(transaction)
      const existing = acc[category.key] || { label: category.label, total: 0, count: 0 }

      existing.total += transaction.amount
      existing.count += 1
      acc[category.key] = existing

      return acc
    }, {})

    return Object.values(summary)
      .sort((a, b) => Math.abs(b.total) - Math.abs(a.total))
  }, [transactions])

  const earningActivities = [
    {
      key: 'post',
      label: 'Create a post',
      points: POINTS_CONFIG.POST_CREATE,
      hint: 'Share news or updates to earn instantly'
    },
    {
      key: 'app_share',
      label: 'Share the app',
      points: POINTS_CONFIG.APP_SHARE,
      hint: 'Invite friends to Next Update'
    },
    {
      key: 'post_share',
      label: 'Share a post',
      points: POINTS_CONFIG.POST_SHARE,
      hint: 'Spread trending posts with others'
    },
    {
      key: 'post_like',
      label: 'Like a post',
      points: POINTS_CONFIG.POST_LIKE,
      hint: 'Support posts you enjoy'
    },
    {
      key: 'post_comment',
      label: 'Comment on a post',
      points: POINTS_CONFIG.POST_COMMENT,
      hint: 'Join the conversation thoughtfully'
    },
    {
      key: 'daily',
      label: 'Daily check-in',
      points: POINTS_CONFIG.DAILY_CHECK_IN,
      hint: 'Open the app daily to collect a bonus'
    }
  ]

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
          <div className="text-center mb-6">
            <Title level={2} className="mb-2">
              <WalletOutlined className="mr-2" />
              My Wallet
            </Title>
            <Button
              type="link"
              icon={<InfoCircleOutlined />}
              onClick={() => router.push('/wallet-policy')}
              className="text-primary"
            >
              View Wallet & Monetization Policy
            </Button>
          </div>
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
              disabled={!walletSettings}
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

        {/* Points Breakdown */}
        {pointsBreakdown.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
          >
            <Card title="Points Breakdown" className="rounded-2xl">
              <List
                dataSource={pointsBreakdown}
                renderItem={(item) => (
                  <List.Item className="border-0 px-0">
                    <div className="flex justify-between items-center w-full">
                      <div>
                        <Text strong>{item.label}</Text>
                        <div className="text-xs text-gray-500">
                          {item.count} {item.count === 1 ? 'entry' : 'entries'}
                        </div>
                      </div>
                      <Tag color={item.total >= 0 ? 'blue' : 'red'}>
                        {item.total > 0 ? '+' : ''}{formatNumber(item.total)} pts
                      </Tag>
                    </div>
                  </List.Item>
                )}
              />
            </Card>
          </motion.div>
        )}

        {/* Earn Points Guide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card title="Earn Points" className="rounded-2xl">
            <List
              dataSource={earningActivities}
              renderItem={(activity) => (
                <List.Item className="border-0 px-0">
                  <div className="flex justify-between w-full items-center">
                    <div>
                      <Text strong>{activity.label}</Text>
                      {activity.hint && (
                        <div className="text-xs text-gray-500">
                          {activity.hint}
                        </div>
                      )}
                    </div>
                    <Tag color="green">
                      +{formatNumber(activity.points)} pts
                    </Tag>
                  </div>
                </List.Item>
              )}
            />
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
              <>
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
                        description={
                          <div className="flex items-center gap-2">
                            {getActivityLabel(transaction.activity) && (
                              <Tag color="blue" className="m-0">
                                {getActivityLabel(transaction.activity)}
                              </Tag>
                            )}
                            <span>{formatRelativeTime(transaction.created_at)}</span>
                          </div>
                        }
                      />
                    </List.Item>
                  )}
                />
                {transactionTotal > TRANSACTIONS_PAGE_SIZE && (
                  <div className="flex justify-center mt-4">
                    <Button.Group>
                      <Button
                        onClick={() => handleTransactionPageChange(transactionPage - 1)}
                        disabled={transactionPage === 1}
                      >
                        Previous
                      </Button>
                      <Button disabled>
                        Page {transactionPage} of {Math.ceil(transactionTotal / TRANSACTIONS_PAGE_SIZE)}
                      </Button>
                      <Button
                        onClick={() => handleTransactionPageChange(transactionPage + 1)}
                        disabled={transactionPage >= Math.ceil(transactionTotal / TRANSACTIONS_PAGE_SIZE)}
                      >
                        Next
                      </Button>
                    </Button.Group>
                  </div>
                )}
              </>
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
        {settingsLoading ? (
          <div className="py-8 flex justify-center">
            <Spin />
          </div>
        ) : !walletSettings ? (
          <Alert
            type="warning"
            showIcon
            message="Wallet configuration missing"
            description="Please contact support to configure payment details before buying points."
          />
        ) : (
          <Form
            form={form}
            onFinish={handleBuyPoints}
            layout="vertical"
          >
            <Alert
              type="info"
              showIcon
              message={`Rate: 1 INR = ${formatNumber(walletSettings.points_rate)} points`}
              description={
                <div className="mt-2 space-y-2">
                  <div className="space-y-1 text-sm">
                    <div><strong>UPI ID:</strong> 44078944317@sbi</div>
                    <div><strong>Account Name:</strong> Next Update News Agency</div>
                    <div><strong>Account No:</strong> 44078944317</div>
                    <div><strong>IFSC:</strong> SBIN0001687</div>
                    <div><strong>Branch:</strong> BANSGAON</div>
                  </div>
                  
                  <div className="flex justify-center my-4">
                    <img 
                      src="/payment-qr.png" 
                      alt="Payment QR Code" 
                      className="w-48 h-48 border-2 border-gray-300 rounded-lg"
                    />
                  </div>
                  
                  {walletSettings.payment_instructions && (
                    <div className="text-gray-600 text-sm">{walletSettings.payment_instructions}</div>
                  )}
                  
                  <div className="text-xs text-gray-500 mt-2">
                    Scan the QR code or use UPI ID to make payment, then upload screenshot below.
                  </div>
                </div>
              }
              className="mb-4"
            />

            {walletSettings.preset_amounts.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mb-3">
                {walletSettings.preset_amounts.map((value) => (
                  <Button key={value} onClick={() => form.setFieldsValue({ amount: value })}>
                    {formatNumber(value)}
                  </Button>
                ))}
              </div>
            )}

            <Form.Item
              name="amount"
              label="Points Amount"
              rules={[{ required: true, message: 'Please enter amount' }]}
            >
              <InputNumber
                min={walletSettings.preset_amounts[0] ?? walletSettings.points_rate ?? 1}
                step={walletSettings.points_rate ?? 1}
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
        )}
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
