'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Modal, Form, Input, Upload, App } from 'antd'
import type { UploadFile, UploadProps } from 'antd/es/upload/interface'
import { PlusOutlined } from '@ant-design/icons'
import { uploadMultipleToR2, getProxiedImageUrl } from '../../lib/r2-storage'
import { mobileAwareFileUpload, isMobileApp } from '../../utils/mobileBridge'

interface PostEditModalProps {
  open: boolean
  loading: boolean
  initialTitle: string | null
  initialCaption: string | null
  initialMediaUrls: string[]
  initialMediaType: 'image' | 'video'
  onCancel: () => void
  onSubmit: (values: {
    title: string | null
    caption: string | null
    mediaUrls?: string[]
    mediaType?: 'image' | 'video'
    removedExistingUrls?: string[]
  }) => Promise<void>
}

type EditableUploadFile = UploadFile & {
  existingUrl?: string
  mediaType?: 'image' | 'video'
}

const MAX_MEDIA_ITEMS = 5

const getFileMediaType = (
  file: File | Blob | undefined | null,
  fallback?: string | null
): 'image' | 'video' => {
  if (!file) {
    return fallback === 'video' ? 'video' : 'image'
  }

  const fileType = (file as File).type || ''
  if (fileType.startsWith('video/')) return 'video'
  if (fileType.startsWith('image/')) return 'image'

  const name = (file as File).name || ''
  const extension = name.toLowerCase().split('.').pop() || ''
  if (['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(extension)) return 'video'
  return 'image'
}

export function PostEditModal({
  open,
  loading,
  initialTitle,
  initialCaption,
  initialMediaUrls,
  initialMediaType,
  onCancel,
  onSubmit,
}: PostEditModalProps) {
  const [form] = Form.useForm()
  const { message: messageApi } = App.useApp()
  const [fileList, setFileList] = useState<EditableUploadFile[]>([])
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [removedExistingUrls, setRemovedExistingUrls] = useState<string[]>([])

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        title: initialTitle ?? '',
        caption: initialCaption ?? '',
      })

      const existingFiles: EditableUploadFile[] = (initialMediaUrls || []).map((url, index) => {
        const proxied = getProxiedImageUrl(url) || url
        return {
          uid: `existing-${index}`,
          name: url.split('/').pop() || `media-${index + 1}`,
          status: 'done',
          url: proxied,
          thumbUrl: proxied,
          existingUrl: url,
          mediaType: initialMediaType,
        }
      })

      setFileList(existingFiles)
      setRemovedExistingUrls([])
    }
  }, [open, initialTitle, initialCaption, initialMediaUrls, initialMediaType, form])

  const currentMediaType = useMemo<'image' | 'video'>(() => {
    if (fileList.length === 0) {
      return 'image'
    }

    const firstWithType = fileList.find((file) => file.mediaType)
    return firstWithType?.mediaType || initialMediaType || 'image'
  }, [fileList, initialMediaType])

  // Mobile-aware upload handler
  const handleMobileUpload = async () => {
    try {
      const files = await mobileAwareFileUpload({
        accept: 'image/*,video/*',
        multiple: true,
        maxFiles: 5
      })
      
      if (files.length > 0) {
        const newUploadFiles: UploadFile[] = files.map((file, index) => {
          const rcFile = file as any
          rcFile.uid = `mobile-${Date.now()}-${index}`
          
          return {
            uid: `mobile-${Date.now()}-${index}`,
            name: file.name,
            status: 'done' as const,
            originFileObj: rcFile,
            mediaType: file.type.startsWith('video/') ? 'video' : 'image'
          } as UploadFile
        })
        
        setFileList(prevList => [...prevList, ...newUploadFiles])
      }
    } catch (error) {
      console.error('Error selecting files:', error)
      messageApi.error('Failed to select files')
    }
  }

  const handlePreview: UploadProps['onPreview'] = async (file) => {
    if (file.url) {
      setPreviewUrl(file.url)
      setIsPreviewOpen(true)
      return
    }

    if (!file.originFileObj) return

    const reader = new FileReader()
    reader.readAsDataURL(file.originFileObj as Blob)
    reader.onload = () => {
      setPreviewUrl(reader.result as string)
      setIsPreviewOpen(true)
    }
  }

  const getNativeFileMeta = (file: any) => {
    if (typeof window === 'undefined') return null
    const store: WeakMap<File, any> | undefined = (window as any).__nativeFileMeta
    const origin = file?.originFileObj || file
    return origin && store ? store.get(origin) : null
  }

  const handleUploadChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    const limitedList = newFileList.slice(0, MAX_MEDIA_ITEMS)

    const normalizedList: EditableUploadFile[] = limitedList.map((file) => {
      const sourceFile = file as EditableUploadFile

      if ((sourceFile as any).r2Url) {
        const nativeFile = { ...sourceFile } as EditableUploadFile
        const mediaType =
          (sourceFile as any).type?.startsWith('video/') || sourceFile.mediaType === 'video'
            ? 'video'
            : 'image'
        nativeFile.mediaType = mediaType
        nativeFile.existingUrl = (sourceFile as any).r2Url
        nativeFile.url = (sourceFile as any).r2Url
        nativeFile.thumbUrl = (sourceFile as any).r2Url
        nativeFile.originFileObj = undefined
        return nativeFile
      }

      const nativeMeta = getNativeFileMeta(sourceFile)
      if (nativeMeta?.url) {
        const nativeFile = { ...sourceFile } as EditableUploadFile
        nativeFile.mediaType =
          nativeMeta.type?.startsWith('video/') || sourceFile.mediaType === 'video' ? 'video' : 'image'
        nativeFile.existingUrl = nativeMeta.url
        nativeFile.url = nativeMeta.url
        nativeFile.thumbUrl = nativeMeta.url
        nativeFile.originFileObj = undefined
        return nativeFile
      }

      const nextFile = { ...file } as EditableUploadFile

      if (file.originFileObj) {
        nextFile.mediaType = getFileMediaType(file.originFileObj)
      } else if (sourceFile.mediaType) {
        nextFile.mediaType = sourceFile.mediaType
      } else if (sourceFile.existingUrl) {
        nextFile.mediaType = sourceFile.mediaType ?? currentMediaType
      }

      if (sourceFile.existingUrl) {
        nextFile.existingUrl = sourceFile.existingUrl
      }

      return nextFile
    })

    setFileList(normalizedList)
  }

  const handleRemove: UploadProps['onRemove'] = async (file) => {
    const editableFile = file as EditableUploadFile
    setFileList((prev) => prev.filter((item) => item.uid !== editableFile.uid))

    if (editableFile.existingUrl) {
      setRemovedExistingUrls((prev) =>
        prev.includes(editableFile.existingUrl!) ? prev : [...prev, editableFile.existingUrl!]
      )
    }

    return false
  }

  const handleBeforeUpload: UploadProps['beforeUpload'] = (file) => {
    const fileType = getFileMediaType(file)
    const existingType = fileList.find((item) => !!item)?.mediaType || currentMediaType

    if (fileList.length >= MAX_MEDIA_ITEMS) {
      messageApi.warning(`You can upload up to ${MAX_MEDIA_ITEMS} items per post.`)
      return Upload.LIST_IGNORE
    }

    if (existingType && existingType !== fileType && fileList.length > 0) {
      messageApi.error('Please upload either all images or all videos, not both.')
      return Upload.LIST_IGNORE
    }

    const sizeMB = file.size ? file.size / (1024 * 1024) : 0
    if (sizeMB > 10) {
      messageApi.error(`File size (${sizeMB.toFixed(2)}MB) exceeds the 10MB limit.`)
      return Upload.LIST_IGNORE
    }

    if (!(file.type?.startsWith('image/') || file.type?.startsWith('video/'))) {
      const name = file.name || 'This file'
      messageApi.error(`${name} is not a supported image or video.`)
      return Upload.LIST_IGNORE
    }

    return false
  }

  const determineFinalMediaType = (
    existing: EditableUploadFile[],
    uploaded: EditableUploadFile[],
    fallback: 'image' | 'video'
  ): 'image' | 'video' => {
    if (uploaded.some((file) => file.mediaType === 'video')) {
      return 'video'
    }

    if (existing.some((file) => file.mediaType === 'video')) {
      return 'video'
    }

    return fallback
  }

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      const trimmedTitle = values.title?.trim() ? values.title.trim() : null
      const trimmedCaption = values.caption?.trim() ? values.caption.trim() : null

      const existingFiles = fileList.filter((file) => {
        const nativeMeta = getNativeFileMeta(file)
        return (!file.originFileObj && file.existingUrl) || (file as any).r2Url || nativeMeta?.url
      }) as EditableUploadFile[]
      const newFiles = fileList.filter((file) => file.originFileObj && !(file as any).r2Url) as EditableUploadFile[]

      let uploadedUrls: string[] = []

      if (newFiles.length > 0) {
        const uploadPayload = newFiles.map((file) => {
          const origin = file.originFileObj as File
          return {
            buffer: origin,
            originalName: origin.name || file.name || `post-media-${Date.now()}`,
            contentType: origin.type || 'application/octet-stream',
            folder: 'posts',
          }
        })

        const uploadResults = await uploadMultipleToR2(uploadPayload)
        const failedUploads = uploadResults.filter((result) => !result.success)

        if (failedUploads.length > 0) {
          messageApi.error('Some files failed to upload. Please try again.')
          return
        }

        uploadedUrls = uploadResults
          .map((result) => result.url)
          .filter((url): url is string => !!url)
      }

      const finalMediaUrls = [
        ...existingFiles
          .map((file) => file.existingUrl || (file as any).r2Url || getNativeFileMeta(file)?.url)
          .filter((url): url is string => !!url),
        ...uploadedUrls,
      ]

      const mediaChanged =
        JSON.stringify(finalMediaUrls) !== JSON.stringify(initialMediaUrls || []) ||
        newFiles.length > 0 ||
        existingFiles.length !== (initialMediaUrls?.length || 0)

      const finalMediaType = determineFinalMediaType(existingFiles, newFiles, initialMediaType || 'image')

      await onSubmit({
        title: trimmedTitle,
        caption: trimmedCaption,
        ...(mediaChanged
          ? {
              mediaUrls: finalMediaUrls,
              mediaType: finalMediaUrls.length > 0 ? finalMediaType : 'image',
            }
          : {}),
        removedExistingUrls: removedExistingUrls.length > 0 ? removedExistingUrls : undefined,
      })
    } catch (error) {
      // Errors are handled by the caller (e.g., toast). Keep the modal open.
    }
  }

  return (
    <>
      <Modal
        open={open}
        onCancel={onCancel}
        onOk={handleOk}
        okText="Save changes"
        confirmLoading={loading}
        destroyOnHidden
        title="Edit Post"
        centered
      maskClosable={false}
      keyboard={false}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            title: initialTitle ?? '',
            caption: initialCaption ?? '',
          }}
        >
          <Form.Item
            name="title"
            label="Heading"
            rules={[
              { max: 120, message: 'Heading should be under 120 characters' },
            ]}
          >
            <Input placeholder="Add a heading" allowClear />
          </Form.Item>

          <Form.Item
            name="caption"
            label="Content"
            rules={[
              { max: 2000, message: 'Content cannot exceed 2000 characters' },
            ]}
          >
            <Input.TextArea
              rows={4}
              placeholder="Update your post content"
              allowClear
            />
          </Form.Item>

          <Form.Item label="Media">
            {isMobileApp() ? (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                {fileList.map((file) => (
                  <div key={file.uid} style={{ position: 'relative' }}>
                    {file.mediaType === 'video' ? (
                      <video
                        src={file.url}
                        style={{ width: 104, height: 104, objectFit: 'cover', borderRadius: 8 }}
                        controls
                      />
                    ) : (
                      <img
                        src={file.url}
                        alt={file.name}
                        style={{ width: 104, height: 104, objectFit: 'cover', borderRadius: 8 }}
                      />
                    )}
                    <button
                      onClick={() => handleRemove(file)}
                      style={{
                        position: 'absolute',
                        top: -8,
                        right: -8,
                        background: 'red',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: 20,
                        height: 20,
                        cursor: 'pointer'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
                {fileList.length < MAX_MEDIA_ITEMS && (
                  <div
                    onClick={handleMobileUpload}
                    style={{
                      width: 104,
                      height: 104,
                      border: '1px dashed #d9d9d9',
                      borderRadius: 8,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      background: '#fafafa'
                    }}
                  >
                    <PlusOutlined />
                    <div style={{ marginTop: 8 }}>Upload</div>
                  </div>
                )}
              </div>
            ) : (
              <Upload
                listType="picture-card"
                fileList={fileList}
                onChange={handleUploadChange}
                onPreview={handlePreview}
                beforeUpload={handleBeforeUpload}
                onRemove={handleRemove}
                multiple
                accept="image/*,video/*"
                showUploadList={{
                  showPreviewIcon: true,
                  showRemoveIcon: true,
                }}
              >
                {fileList.length >= MAX_MEDIA_ITEMS ? null : (
                  <div>
                    <PlusOutlined />
                    <div style={{ marginTop: 8 }}>Upload</div>
                  </div>
                )}
              </Upload>
            )}
            <div className="text-xs text-gray-500">
              You can upload up to {MAX_MEDIA_ITEMS} {currentMediaType === 'video' ? 'videos' : 'images'} (max 10MB each).
            </div>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={isPreviewOpen}
        footer={null}
        onCancel={() => {
          setIsPreviewOpen(false)
          setPreviewUrl(null)
        }}
        title="Preview"
        destroyOnHidden
        centered
      >
        {previewUrl && (
          previewUrl.startsWith('data:video') || previewUrl.match(/\.(mp4|mov|avi|mkv|webm)(\?|$)/i) ? (
            <video controls className="w-full rounded-lg" src={previewUrl} />
          ) : (
            <img alt="Preview" className="w-full rounded-lg" src={previewUrl} />
          )
        )}
      </Modal>
    </>
  )
}

