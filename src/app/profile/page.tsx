'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Avatar, Button, Typography, Space, Tabs, Card, Tag, Modal, Upload, Form, Input, Select, App } from 'antd'
import { 
  UserOutlined, 
  EditOutlined, 
  SettingOutlined, 
  ShareAltOutlined,
  CheckCircleOutlined,
  CrownOutlined,
  CameraOutlined,
  UploadOutlined,
  SafetyCertificateOutlined
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import { useApp } from '../../lib/providers'
import { useRouter, usePathname } from 'next/navigation'
import { socialActions, supabaseClient } from '../../lib/supabase-client'
import { formatNumber } from '../../lib/utils'
import { uploadToR2, generateFileKey, getProxiedImageUrl } from '../../lib/r2-storage'
import { PostList } from '../../components/posts/PostList'
import type { PostWithAuthor } from '../../components/posts/PostCard'
import { usePostUpdateHandlers } from '../../hooks/usePostUpdateHandlers'

const { Title, Text } = Typography
// Removed deprecated TabPane import
const { Option } = Select

export default function ProfilePage() {
  const { user, refreshUser, isLoading } = useApp()
  const { message: messageApi } = App.useApp()
  const router = useRouter()
  const pathname = usePathname()
  const [posts, setPosts] = useState<PostWithAuthor[]>([])
  const [cities, setCities] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [showKyc, setShowKyc] = useState(false)
  const [kycStatus, setKycStatus] = useState<'none' | 'pending' | 'verified' | 'rejected'>('none')
  const [kycRejectionReason, setKycRejectionReason] = useState<string | null>(null)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isPostsLoading, setIsPostsLoading] = useState(true)
  const [form] = Form.useForm()
  const [kycForm] = Form.useForm()

  const fetchData = useCallback(async () => {
    if (!user) {
      setPosts([])
      setIsPostsLoading(false)
      return
    }

    setIsPostsLoading(true)

    try {
      const [
        postsResponse,
        citiesResponse,
        followersResponse,
        followingResponse,
        kycResponse,
      ] = await Promise.all([
        supabaseClient
          .from('posts')
          .select(`
            *,
            profiles:user_id (
              id,
              name,
              avatar_url,
              is_verified,
              has_blue_tick
            )
          `)
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false }),
        supabaseClient
          .from('cities')
          .select('*')
          .eq('is_active', true)
          .order('name'),
        supabaseClient
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', user.id),
        supabaseClient
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('follower_id', user.id),
        supabaseClient
          .from('kyc_submissions')
          .select('status, rejection_reason')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ])

      if (postsResponse.error) throw postsResponse.error
      if (citiesResponse.error) throw citiesResponse.error
      if (followersResponse.error) throw followersResponse.error
      if (followingResponse.error) throw followingResponse.error
      if (kycResponse.error) throw kycResponse.error

      const postsData: PostWithAuthor[] = (postsResponse.data || []).map((post) => ({
        ...post,
        profiles: post.profiles || {
          id: user.id,
          name: user.name,
          avatar_url: (user as any).avatar_url ?? null,
          is_verified: (user as any).is_verified ?? false,
          has_blue_tick: (user as any).has_blue_tick ?? false,
        },
      }))

      setPosts(postsData)
      setCities(citiesResponse.data || [])
      setFollowersCount(followersResponse.count || 0)
      setFollowingCount(followingResponse.count || 0)

      if (kycResponse.data?.status) {
        setKycStatus(kycResponse.data.status as any)
        setKycRejectionReason(kycResponse.data.rejection_reason || null)
      } else {
        setKycStatus('none')
        setKycRejectionReason(null)
      }
    } catch (error) {
      console.error('Failed to load profile data:', error)
      messageApi.error('Failed to load profile data')
    } finally {
      setIsPostsLoading(false)
    }
  }, [user, messageApi])

  const { handleUpdate: handlePostUpdate, handleDelete: handlePostDelete } = usePostUpdateHandlers({
    mode: 'local',
    setPosts,
  })

  useEffect(() => {
    if (!isLoading && user) {
      fetchData()
    }

    if (!isLoading && !user) {
      setPosts([])
      setIsPostsLoading(false)
    }
  }, [fetchData, isLoading, pathname, user])

  useEffect(() => {
    if (!user) {
      return
    }

    const onFocus = () => fetchData()
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        fetchData()
      }
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [fetchData, user])

  const getNativeFileMeta = (file: any) => {
    if (typeof window === 'undefined') return null
    const store: WeakMap<File, any> | undefined = (window as any).__nativeFileMeta
    const origin = file?.originFileObj || file
    return origin && store ? store.get(origin) : null
  }

  const handleUpdateProfile = async (values: any) => {
    setLoading(true)
    try {
      let avatarUrl = user?.avatar_url

      // Handle avatar upload
      if (values.avatar?.file || values.avatar?.fileList?.[0]) {
        const avatarEntry = values.avatar?.file || values.avatar?.fileList?.[0]
        const nativeMeta = avatarEntry ? getNativeFileMeta(avatarEntry) : null
        const nativeUrl = avatarEntry?.r2Url || nativeMeta?.url
        const file = avatarEntry?.originFileObj as File | undefined

        if (nativeUrl) {
          avatarUrl = nativeUrl
        } else if (file) {
          const key = generateFileKey(file.name, 'avatars')
          const result = await uploadToR2(file, key, file.type)

          if (result.success) {
            avatarUrl = result.url
          }
        }
      }

      // Update profile
      const { error } = await supabaseClient
        .from('profiles')
        .update({
          name: values.name,
          phone: values.phone,
          city_id: values.cityId,
          avatar_url: avatarUrl
        })
        .eq('id', user!.id)

      if (error) throw error

      messageApi.success('Profile updated successfully!')
      setShowEditProfile(false)
      await refreshUser()
    } catch (error) {
      messageApi.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleKycSubmission = async (values: any) => {
    setLoading(true)
    try {
      const frontEntry = values.aadharFront?.[0]
      const backEntry = values.aadharBack?.[0]
      const frontNativeMeta = frontEntry ? getNativeFileMeta(frontEntry) : null
      const backNativeMeta = backEntry ? getNativeFileMeta(backEntry) : null
      const frontNativeUrl = frontEntry?.r2Url || frontNativeMeta?.url
      const backNativeUrl = backEntry?.r2Url || backNativeMeta?.url
      const frontFile = frontEntry?.originFileObj as File | undefined
      const backFile = backEntry?.originFileObj as File | undefined
      console.debug('[KYC] Selected files', { frontNative: !!frontNativeUrl, backNative: !!backNativeUrl, front: !!frontFile, back: !!backFile, values })

      if ((!frontFile && !frontNativeUrl) || (!backFile && !backNativeUrl)) {
        messageApi.error('Please upload both front and back of Aadhar card')
        return
      }

      // Upload files
      let frontUrl = frontNativeUrl
      let backUrl = backNativeUrl

      if (!frontUrl && frontFile) {
        const frontKey = generateFileKey(frontFile.name, 'kyc')
        const frontResult = await uploadToR2(frontFile, frontKey, frontFile.type)
        console.debug('[KYC] Front upload result', frontResult)
        if (!frontResult.success) {
          messageApi.error('Failed to upload documents')
          return
        }
        frontUrl = frontResult.url!
      }

      if (!backUrl && backFile) {
        const backKey = generateFileKey(backFile.name, 'kyc')
        const backResult = await uploadToR2(backFile, backKey, backFile.type)
        console.debug('[KYC] Back upload result', backResult)
        if (!backResult.success) {
          messageApi.error('Failed to upload documents')
          return
        }
        backUrl = backResult.url!
      }

      // Submit KYC
      const { data: insertData, error } = await supabaseClient
        .from('kyc_submissions')
        .insert({
          user_id: user!.id,
          aadhar_front_url: frontUrl!,
          aadhar_back_url: backUrl!,
          status: 'pending'
        })
        .select('*')

      console.debug('[KYC] Insert response', { insertData, error })
      if (error) throw error

      messageApi.success('KYC submitted successfully! We will review it shortly.')
      setShowKyc(false)
      kycForm.resetFields()
      setKycStatus('pending')
    } catch (error) {
      console.error('[KYC] Submit error', error)
      messageApi.error('Failed to submit KYC')
    } finally {
      setLoading(false)
    }
  }

  const shareProfile = async () => {
    const referralLink = `${window.location.origin}/auth/register?ref=${user?.referral_code}`
    let channel: string | null = null
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Join ${user?.name} on Ghar Khojo!`,
          text: `Use my referral code ${user?.referral_code} and get 100 points!`,
          url: referralLink,
        })
        channel = 'native_share'
      } else {
        await navigator.clipboard.writeText(referralLink)
        messageApi.success('Referral link copied to clipboard!')
        channel = 'clipboard'
      }

      if (user) {
        await socialActions.logAppShare(user.id, {
          target: 'profile_share',
          channel,
          metadata: {
            referralCode: user.referral_code,
          },
        })
      }
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return
      }
      console.error('Failed to share profile', error)
      messageApi.error('Unable to share your profile right now.')
    }
  }

  if (isLoading) return null
  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-md mx-auto bg-white">
        {/* Profile Header */}
        <motion.div
          className="relative bg-gradient-to-r from-primary to-purple-500 px-6 py-8 text-white"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center">
            <div className="relative inline-block mb-4">
              <Avatar
                src={getProxiedImageUrl(user.avatar_url)}
                size={100}
                className="border-4 border-white shadow-lg"
              >
                {user.name?.[0]?.toUpperCase()}
              </Avatar>
              
              {user.has_blue_tick && (
                <CrownOutlined className="absolute -top-2 -right-2 text-2xl text-yellow-400 bg-white rounded-full p-1" />
              )}
              
              {user.is_verified && (
                <CheckCircleOutlined className="absolute bottom-0 right-0 text-2xl text-green-500 bg-white rounded-full" />
              )}
            </div>

            <Title level={2} className="text-white mb-1">
              {user.name}
            </Title>
            {(user as any).cities?.name && (
              <div className="mb-3">
                <span className="text-xs bg-white/20 text-white px-2 py-1 rounded-full">{(user as any).cities.name}</span>
              </div>
            )}
            
            <Text className="text-white opacity-80 block mb-4">
              @{user.referral_code}
            </Text>

            <div className="flex justify-center space-x-6 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{formatNumber(posts.length)}</div>
                <div className="text-sm opacity-80">Posts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatNumber(followersCount)}</div>
                <div className="text-sm opacity-80">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatNumber(followingCount)}</div>
                <div className="text-sm opacity-80">Following</div>
              </div>
            </div>

            <Space>
              <Button
                type="default"
                icon={<EditOutlined />}
                onClick={() => router.push('/profile/edit')}
                className="rounded-full bg-white text-primary border-white hover:bg-white hover:text-primary"
              >
                Edit Profile
              </Button>
              
              <Button
                type="default"
                icon={<ShareAltOutlined />}
                onClick={shareProfile}
                className="rounded-full bg-white text-primary border-white hover:bg-white hover:text-primary"
              >
                Share
              </Button>
            </Space>
          </div>
        </motion.div>

        {/* Status Cards */}
        <div className="p-4 space-y-3">
          {/* KYC Status */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <SafetyCertificateOutlined className="text-2xl text-blue-500" />
                  <div>
                    <Text strong>KYC Verification</Text>
                    <div>
                      {kycStatus === 'verified' && <Tag color="green">Verified</Tag>}
                      {kycStatus === 'pending' && <Tag color="orange">Pending</Tag>}
                      {kycStatus === 'rejected' && <Tag color="red">Rejected</Tag>}
                      {kycStatus === 'none' && <Tag>Not Submitted</Tag>}
                    </div>
                    {kycStatus === 'rejected' && kycRejectionReason && (
                      <div className="text-xs text-red-500 mt-1">{kycRejectionReason}</div>
                    )}
                  </div>
                </div>
                
                {kycStatus !== 'verified' && (
                  <Button
                    type="primary"
                    size="small"
                    onClick={() => setShowKyc(true)}
                    className="rounded-full"
                    disabled={kycStatus === 'pending'}
                  >
                    {kycStatus === 'rejected' ? 'Re-upload' : kycStatus === 'pending' ? 'Pending' : 'Verify Now'}
                  </Button>
                )}
              </div>
            </Card>
          </motion.div>

          {/* Blue Tick Status */}
          {user.is_verified && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CrownOutlined className="text-2xl text-yellow-500" />
                    <div>
                      <Text strong>Blue Tick Badge</Text>
                      <div>
                        <Tag color={user.has_blue_tick ? 'gold' : 'default'}>
                          {user.has_blue_tick ? 'Active' : 'Available'}
                        </Tag>
                      </div>
                    </div>
                  </div>
                  
                  {!user.has_blue_tick && (
                    <Button
                      size="small"
                      onClick={() => window.location.href = '/wallet'}
                      className="rounded-full border-yellow-400 text-yellow-600"
                    >
                      Get Badge
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          )}
        </div>

        {/* Content Tabs */}
        <div className="px-4">
          <Tabs 
            defaultActiveKey="posts" 
            className="profile-tabs"
            items={[
              {
                key: 'posts',
                label: 'Posts',
                children: (
                  <PostList
                    posts={posts}
                    currentUserId={user.id}
                    isLoading={isPostsLoading}
                    onUpdate={handlePostUpdate}
                    onDelete={handlePostDelete}
                    emptyState={
                      <div className="text-center py-12 text-gray-500">
                        <img
                          src="/empty-feed.svg"
                          alt="No posts"
                          className="w-24 h-24 mx-auto mb-4 opacity-50"
                        />
                        <Text>No posts yet. Start sharing!</Text>
                      </div>
                    }
                  />
                )
              },
              {
                key: 'referrals',
                label: 'Referrals',
                children: (
                  <div className="text-center py-8">
                    <Title level={4}>Your Referral Code</Title>
                    <div className="bg-gradient-to-r from-primary to-purple-500 text-white p-4 rounded-xl mb-4">
                      <div className="text-3xl font-bold">{user.referral_code}</div>
                    </div>
                    <Text type="secondary">
                      Share this code with friends to earn 100 points each!
                    </Text>
                  </div>
                )
              }
            ]}
          />
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        title="Edit Profile"
        open={showEditProfile}
        onCancel={() => setShowEditProfile(false)}
        footer={null}
        className="rounded-2xl"
      >
        <Form
          form={form}
          onFinish={handleUpdateProfile}
          layout="vertical"
          initialValues={{
            name: user.name,
            phone: user.phone,
            cityId: user.city_id
          }}
        >
          <Form.Item name="avatar" label="Profile Picture">
            <Upload
              listType="picture-circle"
              maxCount={1}
              beforeUpload={() => false}
              accept="image/*"
              showUploadList={{ showPreviewIcon: false }}
            >
              <div>
                <CameraOutlined />
                <div style={{ marginTop: 8 }}>Upload</div>
              </div>
            </Upload>
          </Form.Item>

          <Form.Item
            name="name"
            label="Full Name"
            rules={[{ required: true, message: 'Please enter your name' }]}
          >
            <Input size="large" />
          </Form.Item>

          <Form.Item name="phone" label="Phone Number">
            <Input size="large" />
          </Form.Item>

          <Form.Item name="cityId" label="City">
            <Select size="large" placeholder="Select your city">
              {cities.map((city: any) => (
                <Option key={city.id} value={city.id}>
                  {city.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              className="w-full h-12 rounded-xl"
              size="large"
            >
              Update Profile
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* KYC Modal */}
      <Modal
        title="KYC Verification"
        open={showKyc}
        onCancel={() => setShowKyc(false)}
        footer={null}
        className="rounded-2xl"
      >
        <Form
          form={kycForm}
          onFinish={handleKycSubmission}
          layout="vertical"
        >
          <Form.Item
            name="aadharFront"
            label="Aadhar Front"
            rules={[{ required: true, message: 'Please upload Aadhar front' }]}
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
                <div style={{ marginTop: 8 }}>Front</div>
              </div>
            </Upload>
          </Form.Item>

          <Form.Item
            name="aadharBack"
            label="Aadhar Back"
            rules={[{ required: true, message: 'Please upload Aadhar back' }]}
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
                <div style={{ marginTop: 8 }}>Back</div>
              </div>
            </Upload>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              className="w-full h-12 rounded-xl"
              size="large"
            >
              Submit for Verification
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
