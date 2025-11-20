'use client'

import React, { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Spin } from 'antd'
import { useQueryClient } from '@tanstack/react-query'
import { useApp } from '../lib/providers'
import { useInfinitePosts } from '../hooks/useInfinitePosts'
import { usePostUpdateHandlers } from '../hooks/usePostUpdateHandlers'
import PostCard from '../components/posts/PostCard'
import InfiniteScrollList from '../components/shared/InfiniteScrollList'
import PullToRefresh from '../components/shared/PullToRefresh'

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
  profiles: {
    id: string
    name: string
    avatar_url: string | null
    is_verified: boolean
    has_blue_tick: boolean
  }
  is_liked?: boolean
}

export default function HomePage() {
  const { 
    user, 
    selectedCity, 
    isLoading: isUserLoading,
    isCityReady,
    isGuest
  } = useApp()
  const router = useRouter()
  const queryClient = useQueryClient()

  // No longer redirect to auth - allow public access
  // Users can browse content and will be prompted to login only when needed

  // Use infinite query for posts - only enabled when city is ready
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    error,
    refetch,
  } = useInfinitePosts(selectedCity, user?.id || null)

  // Flatten paginated data
  const posts = useMemo(() => {
    return data?.pages.flatMap(page => page.data) || []
  }, [data])

  // Handle pull to refresh
  const handleRefresh = async () => {
    console.log('🔄 Refreshing posts...')
    await queryClient.invalidateQueries({ queryKey: ['posts', 'infinite'] })
    await refetch()
  }

  const { handleUpdate: handleUpdatePost, handleDelete: handleDeletePost } = usePostUpdateHandlers({
    mode: 'react-query',
    queryClient,
    queryKey: ['posts', 'infinite', selectedCity, user?.id],
  })

  // Loading state - show spinner while user authentication is loading
  // For guests, we only need city to be ready
  if (isUserLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <Spin size="large" />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    )
  }

  // If city is not ready, the CitySelectionModal will show (handled in layout)
  // But we can still show the page structure

  // No city selected (should not happen but handle gracefully)
  if (!selectedCity) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <p className="text-gray-600">Please select a city to continue</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-4 pt-4">
        <PullToRefresh onRefresh={handleRefresh}>
          <InfiniteScrollList
            data={posts}
            isLoading={isLoading}
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={hasNextPage || false}
            fetchNextPage={fetchNextPage}
            error={error}
            retry={refetch}
            renderItem={(post) => (
              <div className="mb-4">
                <PostCard
                  post={post}
                  currentUserId={user?.id}
                  isGuest={isGuest}
                  onUpdate={handleUpdatePost}
                  onDelete={handleDeletePost}
                  onLoginRequired={() => router.push('/auth/login')}
                />
              </div>
            )}
            emptyMessage={`No posts in ${selectedCity || 'your city'} yet. Be the first to share!`}
            loadingMessage="Loading your feed..."
            className="space-y-0"
          />
        </PullToRefresh>
      </div>
    </div>
  )
}
