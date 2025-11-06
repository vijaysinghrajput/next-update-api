'use client'

import React, { useState, useEffect } from 'react'
import { Avatar as AntAvatar, Button, Typography, Space, Badge, Carousel, Modal, Input, message, Spin } from 'antd'
import { 
  HeartOutlined, 
  HeartFilled, 
  MessageOutlined, 
  ShareAltOutlined, 
  MoreOutlined,
  CheckCircleOutlined,
  CrownOutlined,
  SendOutlined
} from '@ant-design/icons'
import { motion, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { formatRelativeTime, formatNumber } from '../../lib/utils'
import { socialActions, supabaseClient } from '../../lib/supabase-client'
import { extractUrls, getLinkPreview, LinkPreviewData } from '../../utils/linkPreview'
import LinkPreview from '../shared/LinkPreview'
import LinkifiedText from '../shared/LinkifiedText'
import { getProxiedImageUrl } from '../../lib/r2-storage'
import { Avatar } from '../shared/Avatar'

const { Text, Paragraph } = Typography

interface Comment {
  id: string
  post_id: string
  user_id: string
  content: string
  created_at: string
  profiles: {
    id: string
    name: string
    avatar_url: string | null
    is_verified: boolean
    has_blue_tick: boolean
  }
}

interface PostCardProps {
  post: {
    id: string
    user_id: string
    caption: string | null
    media_urls: string[]
    media_type: 'image' | 'video'
    likes_count: number
    comments_count: number
    shares_count: number
    created_at: string
    is_liked?: boolean
    profiles: {
      id: string
      name: string
      avatar_url: string | null
      is_verified: boolean
      has_blue_tick: boolean
    }
  }
  currentUserId: string
  onUpdate?: (post: any) => void
}

export default function PostCard({ post, currentUserId, onUpdate }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.is_liked || false)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [commentsCount, setCommentsCount] = useState(post.comments_count)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [comment, setComment] = useState('')
  const [loadingComment, setLoadingComment] = useState(false)
  const [loadingLike, setLoadingLike] = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)
  const [linkPreviews, setLinkPreviews] = useState<LinkPreviewData[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  
  // Character limit for "Read More"
  const CAPTION_LIMIT = 150

  // Extract and generate link previews from caption
  useEffect(() => {
    if (post.caption) {
      const urls = extractUrls(post.caption)
      const previews = urls.map(url => getLinkPreview(url))
      setLinkPreviews(previews)

      // Enhance generic links with server-fetched Open Graph metadata
      const enhance = async () => {
        try {
          const updates = await Promise.all(previews.map(async (p) => {
            // Skip if already has good data (YouTube, images) or if it's not a generic link
            if (p.type !== 'link') return p
            
            // Retry logic with exponential backoff
            let lastError: Error | null = null
            for (let attempt = 0; attempt < 2; attempt++) {
              let timeout: NodeJS.Timeout | null = null
              try {
                const controller = new AbortController()
                timeout = setTimeout(() => controller.abort(), 8000)
                
                const res = await fetch('/api/link-preview', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ url: p.url }),
                  signal: controller.signal
                })
                
                if (timeout) clearTimeout(timeout)
                
                if (!res.ok) {
                  // If API returns error but has basic data, use it
                  const errorData = await res.json().catch(() => null)
                  if (errorData && !errorData.error) {
                    return {
                      ...p,
                      title: errorData.title || p.title,
                      description: errorData.description || p.description,
                      image: errorData.image || p.image,
                      domain: errorData.domain || p.domain
                    } as LinkPreviewData
                  }
                  throw new Error(`HTTP ${res.status}`)
                }
                
                const data = await res.json()
                
                // If API returned error in response body, use basic preview
                if (data.error) {
                  return p
                }
                
                return {
                  ...p,
                  title: data.title || p.title,
                  description: data.description || p.description,
                  image: data.image || p.image,
                  domain: data.domain || p.domain
                } as LinkPreviewData
              } catch (err: any) {
                if (timeout) clearTimeout(timeout)
                lastError = err
                // Wait before retry (exponential backoff)
                if (attempt < 1) {
                  await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
                }
              }
            }
            
            // If all retries failed, return original preview
            return p
          }))
          
          // Only update if we got new data
          setLinkPreviews(prev => {
            // Check if updates are different
            const hasChanges = updates.some((update, i) => {
              const prevItem = prev[i]
              return !prevItem || 
                     update.title !== prevItem.title ||
                     update.description !== prevItem.description ||
                     update.image !== prevItem.image
            })
            return hasChanges ? updates : prev
          })
        } catch (err) {
          // Silently fail - keep basic previews
          console.debug('Link preview enhancement failed:', err)
        }
      }

      enhance()
    } else {
      setLinkPreviews([])
    }
  }, [post.caption])

  // Fetch comments when modal opens
  useEffect(() => {
    if (showComments) {
      fetchComments()
    }
  }, [showComments])

  const fetchComments = async () => {
    setLoadingComments(true)
    try {
      const { data, error } = await supabaseClient
        .from('post_comments')
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
        .eq('post_id', post.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setComments(data || [])
    } catch (error) {
      console.error('Error fetching comments:', error)
      message.error('Failed to load comments')
    } finally {
      setLoadingComments(false)
    }
  }

  const handleLike = async () => {
    if (loadingLike) return

    setLoadingLike(true)
    const newIsLiked = !isLiked

    // Optimistic update
    setIsLiked(newIsLiked)
    setLikesCount(prev => newIsLiked ? prev + 1 : prev - 1)

    try {
      if (newIsLiked) {
        await socialActions.likePost(post.id, currentUserId)
      } else {
        await socialActions.unlikePost(post.id, currentUserId)
      }

      // Update parent component
      onUpdate?.({
        ...post,
        is_liked: newIsLiked,
        likes_count: newIsLiked ? post.likes_count + 1 : post.likes_count - 1
      })
    } catch (error) {
      // Revert optimistic update on error
      setIsLiked(!newIsLiked)
      setLikesCount(prev => newIsLiked ? prev - 1 : prev + 1)
      message.error('Failed to update like')
    } finally {
      setLoadingLike(false)
    }
  }

  const handleComment = async () => {
    if (!comment.trim() || loadingComment) return

    setLoadingComment(true)
    try {
      const { error } = await socialActions.addComment(post.id, currentUserId, comment.trim())
      
      if (error) throw error

      // Add comment optimistically to the list
      const newComment: Comment = {
        id: Date.now().toString(),
        post_id: post.id,
        user_id: currentUserId,
        content: comment.trim(),
        created_at: new Date().toISOString(),
        profiles: {
          id: currentUserId,
          name: 'You',
          avatar_url: null,
          is_verified: false,
          has_blue_tick: false
        }
      }
      
      setComments(prev => [newComment, ...prev])
      setComment('')
      setCommentsCount(prev => prev + 1)
      
      // Update parent component
      onUpdate?.({
        ...post,
        comments_count: commentsCount + 1
      })
      
      // Refresh comments to get real data
      await fetchComments()
    } catch (error) {
      message.error('Failed to add comment')
    } finally {
      setLoadingComment(false)
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `${post.profiles.name}'s post`,
        text: post.caption || 'Check out this post!',
        url: window.location.href,
      })
    } else {
      // Fallback to copy link
      navigator.clipboard.writeText(window.location.href)
      message.success('Link copied to clipboard!')
    }
  }

  return (
    <motion.div
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <Link href={`/user/${post.user_id}`} className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
          <AntAvatar
            src={getProxiedImageUrl(post.profiles.avatar_url)}
            size={40}
            className="border-2 border-gray-100"
          >
            {post.profiles.name[0]?.toUpperCase()}
          </AntAvatar>
          
          <div>
            <div className="flex items-center space-x-1">
              <Text strong className="text-gray-800">
                {post.profiles.name}
              </Text>
              
              {post.profiles.is_verified && (
                <CheckCircleOutlined className="text-green-500 text-sm" />
              )}
              
              {post.profiles.has_blue_tick && (
                <Badge
                  count={<CrownOutlined className="text-yellow-500" />}
                  offset={[0, 0]}
                />
              )}
            </div>
            
            <Text type="secondary" className="text-xs">
              {formatRelativeTime(post.created_at)}
            </Text>
          </div>
        </Link>
        
        <Button
          type="text"
          icon={<MoreOutlined />}
          className="text-gray-400 hover:text-gray-600"
        />
      </div>

      {/* Caption */}
      {post.caption && (
        <div className="px-4 pb-2">
          <div className="text-gray-800 leading-relaxed">
            <AnimatePresence mode="wait">
              {isExpanded ? (
                <motion.div
                  key="expanded"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <LinkifiedText text={post.caption} />
                </motion.div>
              ) : (
                <motion.div
                  key="collapsed"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <LinkifiedText 
                    text={
                      post.caption.length > CAPTION_LIMIT
                        ? post.caption.slice(0, CAPTION_LIMIT) + '...'
                        : post.caption
                    } 
                  />
                </motion.div>
              )}
            </AnimatePresence>
            
            {post.caption.length > CAPTION_LIMIT && (
              <motion.button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-gray-500 hover:text-gray-700 font-medium text-sm mt-1 transition-colors active:scale-95"
                whileTap={{ scale: 0.95 }}
              >
                {isExpanded ? 'See less' : 'See more'}
              </motion.button>
            )}
          </div>
        </div>
      )}

      {/* Link Previews */}
      {linkPreviews.length > 0 && (
        <div className="px-4 pb-2 space-y-2">
          {linkPreviews.map((preview, index) => (
            <LinkPreview key={index} preview={preview} />
          ))}
        </div>
      )}

      {/* Media */}
      {post.media_urls.length > 0 && (
        <div className="relative">
          {post.media_urls.length === 1 ? (
            <div className="relative aspect-square">
              {post.media_type === 'image' ? (
                <img
                  src={getProxiedImageUrl(post.media_urls[0]) || post.media_urls[0]}
                  alt="Post media"
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  src={getProxiedImageUrl(post.media_urls[0]) || post.media_urls[0]}
                  controls
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          ) : (
            <Carousel
              dots={{ className: 'carousel-dots' }}
              arrows
              infinite={false}
            >
              {post.media_urls.map((url, index) => (
                <div key={index} className="relative aspect-square">
                  {post.media_type === 'image' ? (
                    <img
                      src={getProxiedImageUrl(url) || url}
                      alt={`Post media ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={getProxiedImageUrl(url) || url}
                      controls
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>
              ))}
            </Carousel>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Space size="large">
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button
                type="text"
                icon={isLiked ? <HeartFilled className="text-red-500" /> : <HeartOutlined />}
                onClick={handleLike}
                loading={loadingLike}
                className={`flex items-center ${isLiked ? 'text-red-500' : 'text-gray-600'} hover:bg-red-50`}
              >
                {formatNumber(likesCount)}
              </Button>
            </motion.div>

            <motion.div whileTap={{ scale: 0.9 }}>
              <Button
                type="text"
                icon={<MessageOutlined />}
                onClick={() => setShowComments(true)}
                className="flex items-center text-gray-600 hover:bg-blue-50"
              >
                {formatNumber(commentsCount)}
              </Button>
            </motion.div>

            <motion.div whileTap={{ scale: 0.9 }}>
              <Button
                type="text"
                icon={<ShareAltOutlined />}
                onClick={handleShare}
                className="flex items-center text-gray-600 hover:bg-green-50"
              >
                {formatNumber(post.shares_count)}
              </Button>
            </motion.div>
          </Space>
        </div>

        {/* View Comments Link - Instagram style */}
        {commentsCount > 0 && (
          <div className="mb-3">
            <Button
              type="link"
              onClick={() => setShowComments(true)}
              className="px-0 h-auto text-gray-500 hover:text-gray-700 text-sm"
            >
              View all {formatNumber(commentsCount)} comments
            </Button>
          </div>
        )}

        {/* Quick Comment */}
        <div className="flex items-center space-x-2">
          <AntAvatar size={24} src={getProxiedImageUrl(post.profiles.avatar_url)}>
            {post.profiles.name[0]?.toUpperCase()}
          </AntAvatar>
          <div className="flex-1 flex items-center space-x-2">
            <Input
              placeholder="Add a comment..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onPressEnter={handleComment}
              className="rounded-full border-gray-200"
              size="small"
            />
            <Button
              type="primary"
              icon={<SendOutlined />}
              onClick={handleComment}
              loading={loadingComment}
              disabled={!comment.trim()}
              size="small"
              className="rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Comments Modal - Instagram Style */}
      <Modal
        title={
          <div className="flex items-center justify-between pb-2 border-b">
            <Text strong className="text-base">Comments</Text>
            <Text type="secondary" className="text-sm">{formatNumber(commentsCount)}</Text>
          </div>
        }
        open={showComments}
        onCancel={() => setShowComments(false)}
        footer={null}
        className="comments-modal"
        styles={{
          body: { padding: 0, maxHeight: '60vh' }
        }}
        width={500}
      >
        {/* Comments List - Scrollable */}
        <div className="max-h-[50vh] overflow-y-auto">
          {loadingComments ? (
            <div className="flex items-center justify-center py-12">
              <Spin size="large" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12">
              <MessageOutlined className="text-4xl text-gray-300 mb-3" />
              <Text type="secondary" className="block mb-1">No comments yet</Text>
              <Text type="secondary" className="text-xs">Be the first to comment!</Text>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              <AnimatePresence>
                {comments.map((commentItem, index) => (
                  <motion.div
                    key={commentItem.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex space-x-3">
                      {/* Avatar */}
                      <AntAvatar
                        src={getProxiedImageUrl(commentItem.profiles?.avatar_url)}
                        size={36}
                        className="flex-shrink-0 border border-gray-200"
                      >
                        {commentItem.profiles?.name?.[0]?.toUpperCase()}
                      </AntAvatar>

                      {/* Comment Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <Text strong className="text-sm">
                            {commentItem.profiles?.name}
                          </Text>
                          
                          {commentItem.profiles?.is_verified && (
                            <CheckCircleOutlined className="text-green-500 text-xs" />
                          )}
                          
                          {commentItem.profiles?.has_blue_tick && (
                            <CrownOutlined className="text-yellow-500 text-xs" />
                          )}
                          
                          <Text type="secondary" className="text-xs">
                            {formatRelativeTime(commentItem.created_at)}
                          </Text>
                        </div>
                        
                        <Paragraph className="mb-0 text-sm text-gray-800 leading-relaxed break-words">
                          {commentItem.content}
                        </Paragraph>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Comment Input - Fixed at bottom */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-3">
          <div className="flex items-center space-x-2">
            <AntAvatar size={32} src={getProxiedImageUrl(post.profiles.avatar_url)}>
              {post.profiles.name[0]?.toUpperCase()}
            </AntAvatar>
            <div className="flex-1 flex items-center space-x-2">
              <Input
                placeholder="Add a comment..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                onPressEnter={handleComment}
                className="rounded-full border-gray-300 text-sm"
                size="middle"
                maxLength={500}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleComment}
                loading={loadingComment}
                disabled={!comment.trim()}
                size="middle"
                className="rounded-full"
              />
            </div>
          </div>
        </div>
      </Modal>
    </motion.div>
  )
}
