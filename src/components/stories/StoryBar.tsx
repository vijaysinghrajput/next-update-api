'use client'

import React from 'react'
import { Avatar, Button } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import { useApp } from '../../lib/providers'
import { getProxiedImageUrl } from '../../lib/r2-storage'

export default function StoryBar() {
  const { user } = useApp()

  const stories = [
    // Mock data - in real app this would come from API
    { id: '1', user: 'Alice', avatar: null, hasStory: true },
    { id: '2', user: 'Bob', avatar: null, hasStory: true },
    { id: '3', user: 'Charlie', avatar: null, hasStory: false },
  ]

  return (
    <div className="bg-white border-b border-gray-100 py-3">
      <div className="flex items-center space-x-3 px-4 overflow-x-auto">
        {/* Add Story */}
        <motion.div
          className="flex flex-col items-center space-y-1 min-w-[60px]"
          whileTap={{ scale: 0.95 }}
        >
          <div className="relative">
            <Avatar
              src={getProxiedImageUrl(user?.avatar_url) || undefined}
              size={56}
              className="border-2 border-gray-200"
            >
              {user?.name?.[0]?.toUpperCase()}
            </Avatar>
            <Button
              type="primary"
              shape="circle"
              size="small"
              icon={<PlusOutlined />}
              className="absolute -bottom-1 -right-1 w-6 h-6 flex items-center justify-center shadow-md"
            />
          </div>
          <span className="text-xs text-gray-600 text-center">Your story</span>
        </motion.div>

        {/* Stories */}
        {stories.map((story, index) => (
          <motion.div
            key={story.id}
            className="flex flex-col items-center space-y-1 min-w-[60px]"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <Avatar
              src={story.avatar}
              size={56}
              className={`border-2 ${
                story.hasStory
                  ? 'border-gradient-to-r from-pink-500 to-purple-500'
                  : 'border-gray-200'
              }`}
            >
              {story.user[0]}
            </Avatar>
            <span className="text-xs text-gray-600 text-center truncate w-full">
              {story.user}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
