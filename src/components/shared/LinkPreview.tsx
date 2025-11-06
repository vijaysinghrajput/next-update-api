'use client'

import React, { useState } from 'react'
import { Card, Typography, Space } from 'antd'
import { 
  LinkOutlined, 
  PlayCircleOutlined,
  FacebookOutlined,
  TwitterOutlined,
  InstagramOutlined,
  GithubOutlined,
  GlobalOutlined
} from '@ant-design/icons'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { LinkPreviewData } from '@/utils/linkPreview'

const { Text } = Typography

interface LinkPreviewProps {
  preview: LinkPreviewData
  compact?: boolean
}

// Get platform-specific icon
const getPlatformIcon = (domain: string) => {
  if (domain.includes('facebook.com')) return <FacebookOutlined className="text-blue-600" />
  if (domain.includes('twitter.com') || domain.includes('x.com')) return <TwitterOutlined className="text-blue-400" />
  if (domain.includes('instagram.com')) return <InstagramOutlined className="text-pink-600" />
  if (domain.includes('github.com')) return <GithubOutlined className="text-gray-800" />
  if (domain.includes('youtube.com') || domain.includes('youtu.be')) return <PlayCircleOutlined className="text-red-600" />
  return <GlobalOutlined className="text-gray-500" />
}

// Get platform color
const getPlatformColor = (domain: string) => {
  if (domain.includes('facebook.com')) return 'bg-blue-50 border-blue-200'
  if (domain.includes('twitter.com') || domain.includes('x.com')) return 'bg-blue-50 border-blue-200'
  if (domain.includes('instagram.com')) return 'bg-pink-50 border-pink-200'
  if (domain.includes('github.com')) return 'bg-gray-50 border-gray-200'
  if (domain.includes('youtube.com') || domain.includes('youtu.be')) return 'bg-red-50 border-red-200'
  return 'bg-gray-50 border-gray-200'
}

export default function LinkPreview({ preview, compact = false }: LinkPreviewProps) {
  const [imageError, setImageError] = useState(false)

  const handleClick = () => {
    window.open(preview.url, '_blank', 'noopener,noreferrer')
  }

  // YouTube Video Preview
  if (preview.type === 'youtube' && preview.image && !imageError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3"
      >
        <Card
          hoverable
          onClick={handleClick}
          className="overflow-hidden rounded-xl border border-gray-200 cursor-pointer"
          styles={{ body: { padding: 0 } }}
        >
          <div className="relative aspect-video w-full bg-black">
            <Image
              src={preview.image}
              alt="YouTube Video"
              fill
              className="object-cover"
              onError={() => setImageError(true)}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors">
              <PlayCircleOutlined className="text-white text-6xl drop-shadow-lg" />
            </div>
          </div>
          <div className="p-3 bg-white">
            <Space direction="vertical" size={2} className="w-full">
              <div className="flex items-center gap-2">
                <LinkOutlined className="text-gray-400" />
                <Text type="secondary" className="text-xs">
                  {preview.domain}
                </Text>
              </div>
              <Text strong className="text-sm line-clamp-1">
                {preview.title || 'YouTube Video'}
              </Text>
            </Space>
          </div>
        </Card>
      </motion.div>
    )
  }

  // Image Preview
  if (preview.type === 'image' && preview.image && !imageError) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-3"
      >
        <Card
          hoverable
          onClick={handleClick}
          className="overflow-hidden rounded-xl border border-gray-200 cursor-pointer"
          styles={{ body: { padding: 0 } }}
        >
          <div className="relative aspect-video w-full bg-gray-100">
            <Image
              src={preview.image}
              alt="Link preview"
              fill
              className="object-contain"
              onError={() => setImageError(true)}
            />
          </div>
          <div className="p-2 bg-white">
            <div className="flex items-center gap-2">
              <LinkOutlined className="text-gray-400 text-xs" />
              <Text type="secondary" className="text-xs line-clamp-1">
                {preview.domain}
              </Text>
            </div>
          </div>
        </Card>
      </motion.div>
    )
  }

  // Generic Link Preview (compact)
  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        className="mt-2"
      >
        <div
          onClick={handleClick}
          className={`inline-flex items-center gap-2 px-3 py-2 ${getPlatformColor(preview.domain)} hover:shadow-md rounded-full cursor-pointer transition-all border`}
        >
          {getPlatformIcon(preview.domain)}
          <Text className="text-gray-700 text-sm font-medium">
            {preview.domain}
          </Text>
        </div>
      </motion.div>
    )
  }

  // Generic Link Preview (full)
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-3"
    >
      <Card
        hoverable
        onClick={handleClick}
        className={`rounded-xl border-2 cursor-pointer ${getPlatformColor(preview.domain)}`}
      >
        <Space direction="vertical" size={8} className="w-full">
          {preview.image && !imageError && (
            <div className="relative w-full overflow-hidden rounded-lg bg-gray-100">
              <img
                src={preview.image}
                alt={preview.title || 'Link preview image'}
                className="w-full h-auto object-cover"
                onError={() => setImageError(true)}
              />
            </div>
          )}
          <div className="flex items-center gap-3">
            {getPlatformIcon(preview.domain)}
            <div>
              <Text type="secondary" className="text-xs block">
                {preview.domain}
              </Text>
              <Text strong className="text-sm line-clamp-1">
                {preview.title}
              </Text>
            </div>
          </div>
          {preview.description && (
            <Text type="secondary" className="text-xs line-clamp-2">
              {preview.description}
            </Text>
          )}
          <div className="flex items-center gap-1 text-blue-600">
            <LinkOutlined className="text-xs" />
            <Text className="text-xs">Open in new tab</Text>
          </div>
        </Space>
      </Card>
    </motion.div>
  )
}
