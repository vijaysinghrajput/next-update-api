'use client'

import React, { useState } from 'react'
import { Input, Tabs, Card, Avatar, Button, Typography, Space, Empty, Spin, message } from 'antd'
import Link from 'next/link'
import { 
  SearchOutlined, 
  FireOutlined, 
  UserAddOutlined, 
  CompassOutlined,
  CheckCircleOutlined,
  CrownOutlined
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query'
import { useApp } from '../../lib/providers'
import { supabaseClient } from '../../lib/supabase-client'
import { formatNumber } from '../../lib/utils'
import PostCard from '../../components/posts/PostCard'
import { getProxiedImageUrl } from '../../lib/r2-storage'

const { Text } = Typography

interface TrendingPost {
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
  profiles: {
    id: string
    name: string
    avatar_url: string | null
    is_verified: boolean
    has_blue_tick: boolean
  }
  is_liked?: boolean
}

interface SuggestedUser {
  id: string
  name: string
  avatar_url: string | null
  is_verified: boolean
  has_blue_tick: boolean
  followers_count: number
  posts_count: number
  city_name?: string
  isFollowing?: boolean
}

export default function ExplorePage() {
  const { user, selectedCity, isLoading: isUserLoading } = useApp()
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('trending')

  // Fetch trending posts with React Query
  const { data: trendingPosts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ['trending-posts', selectedCity, user?.id],
    queryFn: async () => {
      if (!selectedCity || !user) return []

      const { data: cityData } = await supabaseClient
        .from('cities')
        .select('id')
        .eq('name', selectedCity)
        .single()

      if (!cityData) return []

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

      const { data: postsData } = await supabaseClient
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
        .eq('city_id', cityData.id)
        .eq('is_active', true)
        .gte('created_at', sevenDaysAgo.toISOString())
        .order('likes_count', { ascending: false })
        .limit(20)

      if (!postsData || postsData.length === 0) return []

      const postIds = postsData.map(p => p.id)
      const { data: likesData } = await supabaseClient
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', postIds)

      const likedPostIds = new Set(likesData?.map(l => l.post_id) || [])

      return postsData.map(post => ({
        ...post,
        is_liked: likedPostIds.has(post.id)
      }))
    },
    enabled: !!user && !!selectedCity && !isUserLoading,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  // Fetch suggested users with React Query
  const { data: suggestedUsers = [], isLoading: loadingUsers } = useQuery({
    queryKey: ['suggested-users', selectedCity, user?.id],
    queryFn: async () => {
      if (!selectedCity || !user) {
        console.log('❌ Missing requirements:', { selectedCity, userId: user?.id })
        return []
      }

      console.log('🔍 Fetching users for city:', selectedCity)

      const { data: cityData, error: cityError } = await supabaseClient
        .from('cities')
        .select('id, name')
        .eq('name', selectedCity)
        .single()

      if (cityError) {
        console.error('❌ City lookup error:', cityError)
        return []
      }

      if (!cityData) {
        console.log('❌ City not found:', selectedCity)
        return []
      }

      console.log('✅ City found:', cityData)

      // Fetch following IDs to mark them as "Following"
      const { data: followingData } = await supabaseClient
        .from('follows')
        .select('following_id')
        .eq('follower_id', user.id)

      const followingIds = followingData?.map(f => f.following_id) || []

      console.log('👥 Following IDs:', followingIds)

      // Fetch all users in city (except current user)
      const { data: usersData, error: usersError } = await supabaseClient
        .from('profiles')
        .select('id, name, avatar_url, is_verified, has_blue_tick, created_at')
        .eq('city_id', cityData.id)
        .neq('id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (usersError) {
        console.error('❌ Users fetch error:', usersError)
        return []
      }

      console.log('✅ Users found:', usersData?.length || 0)

      return usersData?.map(u => ({
        ...u,
        followers_count: 0,
        posts_count: 0,
        city_name: cityData.name,
        isFollowing: followingIds.includes(u.id)
      })) || []
    },
    enabled: !!user && !!selectedCity && !isUserLoading,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  })

  // Follow mutation with optimistic updates
  const followMutation = useMutation({
    mutationFn: async (followUserId: string) => {
      if (!user) throw new Error('Not authenticated')

      const { error } = await supabaseClient
        .from('follows')
        .insert({
          follower_id: user.id,
          following_id: followUserId
        })

      if (error) throw error
      return followUserId
    },
    onMutate: async (followUserId) => {
      // Cancel outgoing queries
      await queryClient.cancelQueries({ queryKey: ['suggested-users'] })
      
      // Remove user from suggested list optimistically
      const previousUsers = queryClient.getQueryData(['suggested-users', selectedCity, user?.id])
      queryClient.setQueryData(
        ['suggested-users', selectedCity, user?.id],
        (old: SuggestedUser[] = []) => old.filter(u => u.id !== followUserId)
      )
      
      return { previousUsers }
    },
    onSuccess: () => {
      // Silently update without toast for smooth UX
      queryClient.invalidateQueries({ queryKey: ['suggested-users'] })
    },
    onError: (error, _, context) => {
      // Revert optimistic update
      if (context?.previousUsers) {
        queryClient.setQueryData(
          ['suggested-users', selectedCity, user?.id],
          context.previousUsers
        )
      }
      message.error('Failed to follow user')
      console.error(error)
    }
  })

  const handleFollowUser = (userId: string) => {
    if (!user) {
      message.warning('Please login to follow users')
      return
    }
    followMutation.mutate(userId)
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-white sticky top-0 z-10 px-4 pt-4">
        <div className="mb-4">
          <Input.Search
            placeholder="Search posts, people, or tags..."
            size="large"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            prefix={<SearchOutlined className="text-gray-400" />}
            className="rounded-lg"
          />
        </div>

        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className="explore-tabs"
          items={[
            {
              key: 'trending',
              label: (
                <Space>
                  <FireOutlined />
                  <span>Trending</span>
                </Space>
              ),
            },
            {
              key: 'people',
              label: (
                <Space>
                  <CompassOutlined />
                  <span>People</span>
                </Space>
              ),
            },
          ]}
        />
      </div>

      <div className="px-4">
        {activeTab === 'trending' && (
          loadingPosts ? (
            <div className="flex justify-center py-8">
              <Spin size="large" />
            </div>
          ) : trendingPosts.length === 0 ? (
            <Empty description="No trending posts" />
          ) : (
            <motion.div className="space-y-4">
              {trendingPosts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <PostCard
                    post={post}
                    currentUserId={user?.id || ''}
                    onUpdate={() => queryClient.invalidateQueries({ queryKey: ['trending-posts'] })}
                    onDelete={() => {
                      queryClient.invalidateQueries({ queryKey: ['trending-posts'] })
                    }}
                  />
                </motion.div>
              ))}
            </motion.div>
          )
        )}

        {activeTab === 'people' && (
          loadingUsers ? (
            <div className="flex justify-center py-8">
              <Spin size="large" />
            </div>
          ) : suggestedUsers.length === 0 ? (
            <Empty description="No suggested users" />
          ) : (
            <motion.div className="space-y-3">
              {suggestedUsers.map((suggestedUser, index) => (
                <motion.div
                  key={suggestedUser.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="rounded-2xl">
                    <div className="flex items-center justify-between">
                      <Link href={`/user/${suggestedUser.id}`} className="flex items-center hover:opacity-80 transition-opacity">
                        <Space size={12}>
                          <Avatar
                            size={48}
                            src={getProxiedImageUrl(suggestedUser.avatar_url) || `https://ui-avatars.com/api/?name=${suggestedUser.name}&background=007AFF&color=fff`}
                            icon={<UserAddOutlined />}
                          />
                          <div>
                            <div className="flex items-center gap-1">
                              <Text strong>{suggestedUser.name}</Text>
                              {suggestedUser.is_verified && (
                                <CheckCircleOutlined className="text-blue-500" />
                              )}
                              {suggestedUser.has_blue_tick && (
                                <CrownOutlined className="text-yellow-500" />
                              )}
                            </div>
                            <Space size={12} className="text-xs text-gray-500">
                              <span>{formatNumber(suggestedUser.followers_count)} followers</span>
                            <span>•</span>
                            <span>{formatNumber(suggestedUser.posts_count)} posts</span>
                          </Space>
                          {suggestedUser.city_name && (
                            <div className="text-xs text-gray-500">
                              {suggestedUser.city_name}
                            </div>
                          )}
                        </div>
                        </Space>
                      </Link>
                      <Button
                        type={suggestedUser.isFollowing ? "default" : "primary"}
                        icon={<UserAddOutlined />}
                        onClick={() => handleFollowUser(suggestedUser.id)}
                        loading={followMutation.isPending}
                        disabled={suggestedUser.isFollowing}
                        className="rounded-full"
                      >
                        {suggestedUser.isFollowing ? 'Following' : 'Follow'}
                      </Button>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )
        )}
      </div>
    </div>
  )
}
