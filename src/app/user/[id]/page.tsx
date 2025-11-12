'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Avatar, Button, Tabs, Spin, Empty, message, Statistic, Space } from 'antd'
import { 
  UserOutlined, 
  CheckCircleOutlined, 
  CrownOutlined,
  ArrowLeftOutlined,
  UserAddOutlined,
  UserDeleteOutlined
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useApp } from '@/lib/providers'
import { supabaseClient } from '@/lib/supabase-client'
import { formatNumber } from '@/lib/utils'
import PostCard from '@/components/posts/PostCard'
import { getProxiedImageUrl } from '@/lib/r2-storage'

interface UserProfile {
  id: string
  name: string
  avatar_url: string | null
  bio: string | null
  is_verified: boolean
  has_blue_tick: boolean
  followers_count: number
  following_count: number
  posts_count: number
  points_balance: number
  cities: {
    name: string
  }
}

interface Post {
  id: string
  user_id: string
  title: string | null
  caption: string | null
  media_urls: string[]
  media_type: 'image' | 'video'
  likes_count: number
  comments_count: number
  shares_count: number
  created_at: string
  is_liked?: boolean
}

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const { user: currentUser } = useApp()
  const queryClient = useQueryClient()
  const userId = params.id as string
  
  const [activeTab, setActiveTab] = useState('posts')
  const [isFollowing, setIsFollowing] = useState(false)

  // Fetch user profile
  const { data: profile, isLoading: loadingProfile } = useQuery({
    queryKey: ['user-profile', userId],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from('profiles')
        .select(`
          *,
          cities (name)
        `)
        .eq('id', userId)
        .single()

      if (error) throw error
      
      // Manually count followers, following, and posts
      const [followersResult, followingResult, postsResult] = await Promise.all([
        supabaseClient
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('following_id', userId),
        supabaseClient
          .from('follows')
          .select('id', { count: 'exact', head: true })
          .eq('follower_id', userId),
        supabaseClient
          .from('posts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('is_active', true)
      ])

      return {
        ...data,
        followers_count: followersResult.count || 0,
        following_count: followingResult.count || 0,
        posts_count: postsResult.count || 0,
        points_balance: data.points_balance || 0
      } as UserProfile
    },
    enabled: !!userId,
  })

  // Check if current user is following this user
  const { data: followStatus } = useQuery({
    queryKey: ['follow-status', currentUser?.id, userId],
    queryFn: async () => {
      if (!currentUser) return false

      const { data } = await supabaseClient
        .from('follows')
        .select('id')
        .eq('follower_id', currentUser.id)
        .eq('following_id', userId)
        .single()

      return !!data
    },
    enabled: !!currentUser && !!userId && currentUser.id !== userId,
  })

  // Update local state when follow status changes
  useEffect(() => {
    if (followStatus !== undefined) {
      setIsFollowing(followStatus)
    }
  }, [followStatus])

  // Fetch user's posts
  const { data: posts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ['user-posts', userId],
    queryFn: async () => {
      const { data, error } = await supabaseClient
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
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Check which posts are liked by current user
      if (currentUser && data && data.length > 0) {
        const postIds = data.map(p => p.id)
        const { data: likesData } = await supabaseClient
          .from('post_likes')
          .select('post_id')
          .eq('user_id', currentUser.id)
          .in('post_id', postIds)

        const likedPostIds = new Set(likesData?.map(l => l.post_id) || [])
        return data.map(post => ({
          ...post,
          is_liked: likedPostIds.has(post.id)
        }))
      }

      return data || []
    },
    enabled: !!userId,
  })

  const handlePostUpdate = (updatedPost: any) => {
    queryClient.setQueryData(['user-posts', userId], (oldData: any) => {
      if (!oldData) return oldData
      return (oldData as any[]).map((post) =>
        post.id === updatedPost.id ? { ...post, ...updatedPost } : post
      )
    })
  }

  const handlePostDelete = (postId: string) => {
    queryClient.setQueryData(['user-posts', userId], (oldData: any) => {
      if (!oldData) return oldData
      return (oldData as any[]).filter((post) => post.id !== postId)
    })
    queryClient.invalidateQueries({ queryKey: ['user-profile', userId] })
  }

  // Follow/Unfollow mutation
  const followMutation = useMutation({
    mutationFn: async (action: 'follow' | 'unfollow') => {
      if (!currentUser) throw new Error('Not authenticated')

      if (action === 'follow') {
        const { error } = await supabaseClient
          .from('follows')
          .insert({
            follower_id: currentUser.id,
            following_id: userId
          })
        if (error) throw error
      } else {
        const { error } = await supabaseClient
          .from('follows')
          .delete()
          .eq('follower_id', currentUser.id)
          .eq('following_id', userId)
        if (error) throw error
      }
    },
    onMutate: async (action) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['user-profile', userId] })
      
      // Optimistically update follow status
      setIsFollowing(action === 'follow')
      
      // Optimistically update follower count in profile
      const previousProfile = queryClient.getQueryData(['user-profile', userId])
      queryClient.setQueryData(['user-profile', userId], (old: UserProfile | undefined) => {
        if (!old) return old
        return {
          ...old,
          followers_count: action === 'follow' 
            ? (old.followers_count || 0) + 1 
            : Math.max((old.followers_count || 0) - 1, 0)
        }
      })
      
      return { previousProfile }
    },
    onSuccess: (_, action) => {
      // Don't show message for better UX
      // message.success(action === 'follow' ? 'Following user!' : 'Unfollowed user')
      
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['follow-status', currentUser?.id, userId] })
      queryClient.invalidateQueries({ queryKey: ['user-profile', userId] })
      queryClient.invalidateQueries({ queryKey: ['suggested-users'] })
    },
    onError: (error, action, context) => {
      // Revert optimistic updates
      setIsFollowing(action === 'unfollow')
      if (context?.previousProfile) {
        queryClient.setQueryData(['user-profile', userId], context.previousProfile)
      }
      message.error('Failed to update follow status')
      console.error(error)
    }
  })

  const handleFollowToggle = () => {
    if (!currentUser) {
      message.warning('Please login to follow users')
      router.push('/auth/login')
      return
    }

    followMutation.mutate(isFollowing ? 'unfollow' : 'follow')
  }

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spin size="large" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <UserOutlined className="text-6xl text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">User not found</h3>
        <Button onClick={() => router.back()}>Go Back</Button>
      </div>
    )
  }

  const isOwnProfile = currentUser?.id === userId

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center justify-between p-4">
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => router.back()}
            className="text-gray-600"
          />
          <h1 className="text-lg font-semibold">{profile.name}</h1>
          <div className="w-8" /> {/* Spacer */}
        </div>
      </div>

      {/* Profile Section */}
      <div className="bg-white p-6 border-b">
        <div className="flex items-start space-x-4 mb-4">
          {/* Avatar */}
          <Avatar
            src={getProxiedImageUrl(profile.avatar_url)}
            size={80}
            className="flex-shrink-0 border-2 border-gray-200"
          >
            {profile.name[0]?.toUpperCase()}
          </Avatar>

          {/* Stats */}
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-2">
              <h2 className="text-xl font-bold">{profile.name}</h2>
              {profile.is_verified && (
                <CheckCircleOutlined className="text-green-500 text-lg" />
              )}
              {profile.has_blue_tick && (
                <CrownOutlined className="text-yellow-500 text-lg" />
              )}
            </div>

            <div className="flex space-x-6 mb-3">
              <Statistic
                title="Posts"
                value={formatNumber(profile.posts_count)}
                valueStyle={{ fontSize: '16px', fontWeight: 'bold' }}
              />
              <Statistic
                title="Followers"
                value={formatNumber(profile.followers_count)}
                valueStyle={{ fontSize: '16px', fontWeight: 'bold' }}
              />
              <Statistic
                title="Following"
                value={formatNumber(profile.following_count)}
                valueStyle={{ fontSize: '16px', fontWeight: 'bold' }}
              />
            </div>
          </div>
        </div>

        {/* Bio */}
        {profile.bio && (
          <p className="text-gray-700 mb-3">{profile.bio}</p>
        )}

        {/* Location */}
        <p className="text-gray-500 text-sm mb-4">
          📍 {profile.cities?.name}
        </p>

        {/* Follow/Edit Button */}
        {!isOwnProfile ? (
          <Button
            type={isFollowing ? 'default' : 'primary'}
            icon={isFollowing ? <UserDeleteOutlined /> : <UserAddOutlined />}
            block
            size="large"
            onClick={handleFollowToggle}
            loading={followMutation.isPending}
            className={isFollowing ? 'border-gray-300' : ''}
          >
            {isFollowing ? 'Unfollow' : 'Follow'}
          </Button>
        ) : (
          <Button
            type="default"
            block
            size="large"
            onClick={() => router.push('/profile/edit')}
          >
            Edit Profile
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        className="bg-white"
        items={[
          {
            key: 'posts',
            label: 'Posts',
          },
          {
            key: 'about',
            label: 'About',
          },
        ]}
      />

      {/* Content */}
      <div className="p-4">
        {activeTab === 'posts' && (
          <>
            {loadingPosts ? (
              <div className="flex justify-center py-12">
                <Spin size="large" />
              </div>
            ) : posts.length === 0 ? (
              <Empty
                description="No posts yet"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-4"
              >
                {posts.map((post, index) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <PostCard 
                      post={post} 
                      currentUserId={currentUser?.id || ''}
                      onUpdate={handlePostUpdate}
                      onDelete={handlePostDelete}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </>
        )}

        {activeTab === 'about' && (
          <div className="bg-white rounded-2xl p-6 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-1">Name</h3>
              <p className="text-gray-900">{profile.name}</p>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-1">Location</h3>
              <p className="text-gray-900">📍 {profile.cities?.name}</p>
            </div>

            {profile.bio && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 mb-1">Bio</h3>
                <p className="text-gray-900">{profile.bio}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold text-gray-500 mb-1">Points</h3>
              <p className="text-gray-900 font-bold text-lg">
                {formatNumber(profile.points_balance)} pts
              </p>
            </div>

            {profile.is_verified && (
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircleOutlined />
                <span className="font-semibold">Verified User</span>
              </div>
            )}

            {profile.has_blue_tick && (
              <div className="flex items-center space-x-2 text-yellow-600">
                <CrownOutlined />
                <span className="font-semibold">Premium Member</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
