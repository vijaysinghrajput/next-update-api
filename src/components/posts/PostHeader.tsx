'use client'

import React from 'react'
import { Avatar as AntAvatar, Badge, Button, Typography } from 'antd'
import Link from 'next/link'
import {
  MoreOutlined,
  CheckCircleOutlined,
  CrownOutlined,
} from '@ant-design/icons'
import { getProxiedImageUrl } from '../../lib/r2-storage'
import { formatRelativeTime } from '../../lib/utils'
import { PostOwnerActionMenu } from './PostOwnerActionMenu'

const { Text } = Typography

interface PostHeaderProps {
  post: {
    id: string
    user_id: string
    created_at: string
    profiles: {
      id: string
      name: string
      avatar_url: string | null
      is_verified: boolean
      has_blue_tick: boolean
    }
  }
  isOwner: boolean
  onEdit: () => void
  onDelete: () => void
}

export function PostHeader({ post, isOwner, onEdit, onDelete }: PostHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4 pb-2">
      <Link
        href={`/user/${post.user_id}`}
        className="flex items-center space-x-3 hover:opacity-80 transition-opacity"
      >
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

      {isOwner ? (
        <PostOwnerActionMenu onEdit={onEdit} onDelete={onDelete} />
      ) : (
        <Button
          type="text"
          icon={<MoreOutlined />}
          className="text-gray-400 hover:text-gray-600"
        />
      )}
    </div>
  )
}

