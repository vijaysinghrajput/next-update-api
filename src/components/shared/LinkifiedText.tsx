'use client'

import React from 'react'
import { Typography } from 'antd'
import { extractUrls } from '@/utils/linkPreview'

const { Text } = Typography

interface LinkifiedTextProps {
  text: string
  className?: string
}

export default function LinkifiedText({ text, className = '' }: LinkifiedTextProps) {
  const urls = extractUrls(text)
  
  if (urls.length === 0) {
    return <span className={className}>{text}</span>
  }

  // Split text by URLs and create clickable links
  let lastIndex = 0
  const parts: React.ReactNode[] = []

  urls.forEach((url, index) => {
    const urlIndex = text.indexOf(url, lastIndex)
    
    // Add text before URL
    if (urlIndex > lastIndex) {
      parts.push(
        <span key={`text-${index}`}>
          {text.substring(lastIndex, urlIndex)}
        </span>
      )
    }
    
    // Add clickable URL
    parts.push(
      <a
        key={`link-${index}`}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-blue-500 hover:text-blue-600 hover:underline font-medium"
        onClick={(e) => e.stopPropagation()}
      >
        {url}
      </a>
    )
    
    lastIndex = urlIndex + url.length
  })

  // Add remaining text after last URL
  if (lastIndex < text.length) {
    parts.push(
      <span key="text-end">
        {text.substring(lastIndex)}
      </span>
    )
  }

  return <span className={className}>{parts}</span>
}
