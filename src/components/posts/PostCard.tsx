'use client'

import React, { useState, useEffect } from 'react'
import { App, Avatar as AntAvatar, Button, Typography, Space, Carousel, Modal, Input, Spin } from 'antd'
import { 
  HeartOutlined, 
  HeartFilled, 
  MessageOutlined, 
  ShareAltOutlined, 
  CheckCircleOutlined,
  CrownOutlined,
  SendOutlined,
  UserAddOutlined,
  UserDeleteOutlined
} from '@ant-design/icons'
import { motion, AnimatePresence } from 'framer-motion'
import { formatRelativeTime, formatNumber, APP_STORE_LINK } from '../../lib/utils'
import { socialActions, supabaseClient } from '../../lib/supabase-client'
import { shareContent } from '../../utils/mobileBridge'
import { extractUrls, LinkPreviewData } from '../../utils/linkPreview'
import { getBasePreviews, enhancePreviews } from '../../utils/linkPreviewCache'
import LinkPreview from '../shared/LinkPreview'
import LinkifiedText from '../shared/LinkifiedText'
import { getProxiedImageUrl } from '../../lib/r2-storage'
import { PostHeader } from './PostHeader'
import { PostEditModal } from './PostEditModal'

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

export interface PostAuthorProfile {
  id: string
  name: string
  avatar_url: string | null
  is_verified: boolean
  has_blue_tick: boolean
}

export interface PostWithAuthor {
  id: string
  user_id: string
  title?: string | null
  caption: string | null
  media_urls: string[]
  media_type: 'image' | 'video'
  likes_count: number
  comments_count: number
  shares_count: number
  created_at: string
  is_liked?: boolean
  is_following?: boolean
  profiles: PostAuthorProfile
}

interface PostCardProps {
  post: PostWithAuthor
  currentUserId?: string // Make optional for guest users
  isGuest?: boolean // Add guest mode indicator
  onUpdate?: (post: PostWithAuthor) => void
  onDelete?: (postId: string) => void
  onLoginRequired?: () => void // Callback when login is needed
}

export default function PostCard({ post, currentUserId, isGuest = false, onUpdate, onDelete, onLoginRequired }: PostCardProps) {
  const [isLiked, setIsLiked] = useState(post.is_liked || false)
  const [likesCount, setLikesCount] = useState(post.likes_count)
  const [commentsCount, setCommentsCount] = useState(post.comments_count)
  const [sharesCount, setSharesCount] = useState(post.shares_count)
  const [isFollowing, setIsFollowing] = useState(post.is_following || false)
  const [followLoading, setFollowLoading] = useState(false)
  const [showComments, setShowComments] = useState(false)
  const [comments, setComments] = useState<Comment[]>([])
  const [comment, setComment] = useState('')
  const [loadingComment, setLoadingComment] = useState(false)
  const [loadingLike, setLoadingLike] = useState(false)
  const [loadingComments, setLoadingComments] = useState(false)
  const [linkPreviews, setLinkPreviews] = useState<LinkPreviewData[]>([])
  const [isExpanded, setIsExpanded] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const { message: messageApi, modal } = App.useApp()
  
  // Character limit for "Read More"
  const CAPTION_LIMIT = 150

  // Extract and generate link previews from caption
  useEffect(() => {
    let isMounted = true

    if (post.caption) {
      const urls = extractUrls(post.caption)

      if (urls.length === 0) {
        setLinkPreviews([])
      } else {
        const basePreviews = getBasePreviews(urls)
        setLinkPreviews(basePreviews)

        const enhance = async () => {
          try {
            const updates = await enhancePreviews(basePreviews)
            if (isMounted) {
              setLinkPreviews(updates)
            }
          } catch (err) {
            console.debug('Link preview enhancement failed:', err)
          }
        }

        enhance()
      }
    } else {
      setLinkPreviews([])
    }

    return () => {
      isMounted = false
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
      messageApi.error('Failed to load comments')
    } finally {
      setLoadingComments(false)
    }
  }

  const handleLike = async () => {
    // Check if guest user
    if (isGuest || !currentUserId) {
      onLoginRequired?.()
      return
    }
    
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
      messageApi.error('Failed to update like')
    } finally {
      setLoadingLike(false)
    }
  }

  const handleOpenEditModal = () => {
    setIsEditModalOpen(true)
  }

  const handleEditSubmit = async (values: {
    title: string | null
    caption: string | null
    mediaUrls?: string[]
    mediaType?: 'image' | 'video'
    removedExistingUrls?: string[]
  }) => {
    try {
      setIsSavingEdit(true)

      const updatePayload: {
        title?: string | null
        caption?: string | null
        mediaUrls?: string[]
        mediaType?: 'image' | 'video'
        removedExistingUrls?: string[]
      } = {
        title: values.title,
        caption: values.caption,
      }

      if (typeof values.mediaUrls !== 'undefined') {
        updatePayload.mediaUrls = values.mediaUrls
      }

      if (typeof values.mediaType !== 'undefined') {
        updatePayload.mediaType = values.mediaType
      }

      if (values.removedExistingUrls && values.removedExistingUrls.length > 0) {
        updatePayload.removedExistingUrls = values.removedExistingUrls
      }

      const { data, error } = await socialActions.updatePost(post.id, updatePayload)

      if (error) {
        throw error
      }

      const updatedPost = {
        ...post,
        ...data,
        profiles: post.profiles,
        is_liked: isLiked,
        likes_count: data?.likes_count ?? likesCount,
        comments_count: data?.comments_count ?? commentsCount,
        title: data?.title ?? values.title ?? post.title,
        caption: data?.caption ?? values.caption ?? post.caption,
        media_urls: values.mediaUrls ?? data?.media_urls ?? post.media_urls,
        media_type: values.mediaType ?? data?.media_type ?? post.media_type,
      }

      onUpdate?.(updatedPost)
      messageApi.success('Post updated')
      setIsEditModalOpen(false)
    } catch (error) {
      console.error('Failed to update post:', error)
      messageApi.error('Failed to update post')
      throw error
    } finally {
      setIsSavingEdit(false)
    }
  }

  const handleDeletePost = () => {
    modal.confirm({
      title: 'Delete this post?',
      content: 'This will remove the post from public view.',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      centered: true,
      onOk: async () => {
        try {
          const { error } = await socialActions.deletePost(post.id)
          if (error) {
            throw error
          }
          messageApi.success('Post deleted')
          onDelete?.(post.id)
        } catch (error) {
          console.error('Failed to delete post:', error)
          messageApi.error('Failed to delete post')
          throw error
        }
      },
    })
  }

  const isOwner = post.user_id === currentUserId

  const handleComment = async () => {
    // Check if guest user
    if (isGuest || !currentUserId) {
      onLoginRequired?.()
      return
    }
    
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
      messageApi.error('Failed to add comment')
    } finally {
      setLoadingComment(false)
    }
  }

  // Helper function to create short share content
  const createShareContent = (caption: string | null, title?: string | null): string => {
    const heading = title || `${post.profiles.name}'s post`
    
    if (!caption) {
      return `${heading}...`
    }

    // Remove URLs and clean text
    const cleanText = caption
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim()

    // Take first 10-15 words
    const words = cleanText.split(' ').slice(0, 12)
    const snippet = words.join(' ')
    
    return `${heading}: ${snippet}${cleanText.length > snippet.length ? '...' : ''}`
  }

  const handleShare = async () => {
    try {
      // Create short share content with heading and snippet
      const shortContent = createShareContent(post.caption, post.title)
      
      // Use mobile bridge for native sharing - we're always in WebView
      shareContent({
        title: `${post.profiles.name}'s post on Next Update`,
        text: `${shortContent}\n\n📰 Read full news & connect with your community!`,
        url: `https://app.nextupdate.in/post/${post.id}`, // Link to actual post
        image: post.media_urls[0] // First media as image
      })

      // Track share analytics only for authenticated users
      if (currentUserId) {
        const { error } = await socialActions.sharePost(post.id, currentUserId, {
          channel: 'native_share',
          metadata: {
            postOwner: post.profiles.id,
          },
        })

        if (error) {
          throw error
        }
      }

      setSharesCount(prev => {
        const next = prev + 1
        onUpdate?.({
          ...post,
          shares_count: next,
        })
        return next
      })
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        return
      }
      console.error('Post share failed', error)
      messageApi.error('Failed to share post')
    }
  }

  const handleFollowToggle = async () => {
    // Check if guest user
    if (isGuest || !currentUserId) {
      onLoginRequired?.()
      return
    }
    
    if (post.user_id === currentUserId) return // Can't follow yourself
    
    setFollowLoading(true)
    try {
      if (isFollowing) {
        // Unfollow
        const { error } = await socialActions.unfollowUser(currentUserId, post.user_id)
        if (error) throw error
        setIsFollowing(false)
        messageApi.success('Unfollowed successfully')
      } else {
        // Follow
        const { error } = await socialActions.followUser(currentUserId, post.user_id)
        if (error) throw error
        setIsFollowing(true)
        messageApi.success('Following successfully')
      }
    } catch (error: any) {
      console.error('Follow toggle failed', error)
      messageApi.error('Failed to update follow status')
    } finally {
      setFollowLoading(false)
    }
  }

  return (
    <>
      <motion.div
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
      >
        <PostHeader
          post={post}
          isOwner={isOwner}
          currentUserId={currentUserId}
          isFollowing={isFollowing}
          followLoading={followLoading}
          onFollowToggle={handleFollowToggle}
          onEdit={handleOpenEditModal}
          onDelete={handleDeletePost}
        />

        {post.title && (
          <div className="px-4 pb-1">
            <Text strong className="text-base text-gray-900">{post.title}</Text>
          </div>
        )}

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
                {formatNumber(sharesCount)}
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
          {isGuest || !currentUserId ? (
            <div className="flex items-center justify-center py-4">
              <Button 
                type="primary" 
                onClick={onLoginRequired}
                className="rounded-full"
              >
                Login to comment
              </Button>
            </div>
          ) : (
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
          )}
        </div>
      </Modal>
    </motion.div>

      <PostEditModal
        open={isEditModalOpen}
        loading={isSavingEdit}
        initialTitle={post.title || null}
        initialCaption={post.caption || null}
        initialMediaUrls={post.media_urls || []}
        initialMediaType={post.media_type || 'image'}
        onCancel={() => setIsEditModalOpen(false)}
        onSubmit={handleEditSubmit}
      />
    </>
  )
}
