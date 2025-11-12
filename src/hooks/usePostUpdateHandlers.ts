'use client'

import { useCallback } from 'react'
import { QueryClient } from '@tanstack/react-query'
import type { PostWithAuthor } from '@/components/posts/PostCard'

type ReactQueryMode = {
  mode: 'react-query'
  queryClient: QueryClient
  queryKey: unknown[]
}

type LocalListMode = {
  mode: 'local'
  setPosts: React.Dispatch<React.SetStateAction<PostWithAuthor[]>>
}

type UsePostUpdateHandlersOptions = ReactQueryMode | LocalListMode

export function usePostUpdateHandlers(options: UsePostUpdateHandlersOptions) {
  const handleUpdate = useCallback(
    (updatedPost: PostWithAuthor) => {
      if (options.mode === 'react-query') {
        options.queryClient.setQueryData(options.queryKey, (oldData: any) => {
          if (!oldData) return oldData

          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              data: page.data.map((post: PostWithAuthor) =>
                post.id === updatedPost.id ? { ...post, ...updatedPost } : post
              ),
            })),
          }
        })
        return
      }

      options.setPosts((prev) =>
        prev.map((post) => (post.id === updatedPost.id ? { ...post, ...updatedPost } : post))
      )
    },
    [options]
  )

  const handleDelete = useCallback(
    (postId: string) => {
      if (options.mode === 'react-query') {
        options.queryClient.setQueryData(options.queryKey, (oldData: any) => {
          if (!oldData) return oldData

          return {
            ...oldData,
            pages: oldData.pages.map((page: any) => ({
              ...page,
              data: page.data.filter((post: PostWithAuthor) => post.id !== postId),
            })),
          }
        })
        return
      }

      options.setPosts((prev) => prev.filter((post) => post.id !== postId))
    },
    [options]
  )

  return { handleUpdate, handleDelete }
}


