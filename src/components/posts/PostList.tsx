'use client'

import React from 'react'
import { Spin } from 'antd'
import PostCard, { PostWithAuthor } from './PostCard'

interface PostListProps {
  posts: PostWithAuthor[]
  currentUserId?: string // Made optional for guest users
  isGuest?: boolean
  isLoading?: boolean
  onUpdate?: (post: PostWithAuthor) => void
  onDelete?: (postId: string) => void
  onLoginRequired?: () => void
  emptyState?: React.ReactNode
  className?: string
}

export function PostList({
  posts,
  currentUserId,
  isGuest = false,
  isLoading = false,
  onUpdate,
  onDelete,
  onLoginRequired,
  emptyState,
  className,
}: PostListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spin size="large" />
      </div>
    )
  }

  if (!posts || posts.length === 0) {
    return (
      <div className="py-8">
        {emptyState || (
          <div className="text-center text-gray-500">
            <p>No posts yet.</p>
          </div>
        )}
      </div>
    )
  }

  const containerClassName = ['space-y-4', className].filter(Boolean).join(' ')

  return (
    <div className={containerClassName}>
      {posts.map((post) => (
        <PostCard
          key={post.id}
          post={post}
          currentUserId={currentUserId}
          isGuest={isGuest}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onLoginRequired={onLoginRequired}
        />
      ))}
    </div>
  )
}

