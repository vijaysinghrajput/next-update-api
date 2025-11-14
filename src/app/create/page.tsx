'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button, Upload, Input, Select, Card, Typography, Form, App } from 'antd'
import { PlusOutlined, SendOutlined, EnvironmentOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useApp } from '../../lib/providers'
import { supabaseClient } from '../../lib/supabase-client'
import { uploadMultipleToR2, validateMediaFile, validateFileSize } from '../../lib/r2-storage'
import { extractUrls, LinkPreviewData } from '../../utils/linkPreview'
import { getBasePreviews, enhancePreviews } from '../../utils/linkPreviewCache'
import LinkPreview from '../../components/shared/LinkPreview'
import { isMobileApp, requestNativeFileUpload } from '../../utils/mobileBridge'

const { TextArea } = Input
const { Option } = Select
const { Title, Text } = Typography

interface City {
  id: string
  name: string
  is_active: boolean
}

export default function CreatePostPage() {
  const { user, selectedCity, isLoading } = useApp()
  const { message: messageApi } = App.useApp()
  const router = useRouter()
  const [form] = Form.useForm()
  const queryClient = useQueryClient()
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(false)
  const [fileList, setFileList] = useState<any[]>([])
  const [previewVisible, setPreviewVisible] = useState(false)
  const [previewImage, setPreviewImage] = useState('')
  const [contentWordCount, setContentWordCount] = useState(0)
  const [titleEdited, setTitleEdited] = useState(false)
  const [linkPreviews, setLinkPreviews] = useState<LinkPreviewData[]>([])
  const previewRequestRef = useRef(0)

  useEffect(() => {
    const fetchCities = async () => {
      const { data } = await supabaseClient
        .from('cities')
        .select('*')
        .eq('is_active', true)
        .order('name')
      if (data) setCities(data)
    }
    if (!isLoading && user) {
      fetchCities()
    }
  }, [isLoading, user])

  // Keep city field in sync once selectedCity is available
  useEffect(() => {
    if (selectedCity) {
      form.setFieldsValue({ city: selectedCity })
    }
  }, [selectedCity, form])

  const getNativeFileMeta = (file: any) => {
    if (typeof window === 'undefined') return null
    const store: WeakMap<File, any> | undefined = (window as any).__nativeFileMeta
    const origin = file?.originFileObj || file
    return origin && store ? store.get(origin) : null
  }

  const handleUploadChange = ({ fileList }: any) => {
    console.log('[CreatePost] ===== UPLOAD CHANGE =====')
    console.log('[CreatePost] Received fileList:', fileList)
    console.log('[CreatePost] Number of files:', fileList.length)
    
    const clean = (s?: string) => typeof s === 'string' ? s.trim().replace(/^[`'\"]+|[`'\"]+$/g, '') : s
    // Validate files
    const validFiles = fileList.filter((file: any, index: number) => {
      console.log(`[CreatePost] Validating file ${index + 1}:`, {
        name: file.name,
        status: file.status,
        r2Url: file.r2Url,
        url: file.url,
        uid: file.uid,
        type: file.type
      })
      
      const nativeMeta = getNativeFileMeta(file)
      console.log(`[CreatePost] Native metadata for file ${index + 1}:`, nativeMeta)
      
      if (nativeMeta?.url) {
        const u = clean(nativeMeta.url)
        console.log(`[CreatePost] File ${index + 1} has native URL:`, u)
        file.r2Url = u
        file.url = u
        file.thumbUrl = u
        file.status = file.status || 'done'
        file.type = file.type || nativeMeta.type || 'image/jpeg'
        file.size = file.size || nativeMeta.size
        console.log(`[CreatePost] File ${index + 1} updated with native URL`)
        return true
      }
      if (file.r2Url) {
        const u = clean(file.r2Url)
        console.log(`[CreatePost] File ${index + 1} already has r2Url:`, u)
        file.url = u
        file.thumbUrl = u
        file.status = file.status || 'done'
        return true
      }
      if (file.originFileObj) {
        console.log(`[CreatePost] File ${index + 1} has originFileObj, validating...`)
        const validation = validateMediaFile(file.name, Buffer.from([]))
        const sizeValidation = validateFileSize(Buffer.from([]), 10) // 10MB limit
        
        if (!validation.isValid) {
          console.error(`[CreatePost] File ${index + 1} validation failed:`, validation.error)
          messageApi.error(`${file.name}: ${validation.error}`)
          return false
        }
        
        console.log(`[CreatePost] File ${index + 1} validation passed`)
        return true
      }
      console.log(`[CreatePost] File ${index + 1} passed through (unknown type)`)
      return true
    })

    console.log('[CreatePost] Valid files after filtering:', validFiles.length)
    const finalFiles = validFiles.slice(0, 5)
    console.log('[CreatePost] Final files to set (max 5):', finalFiles.length)
    setFileList(finalFiles) // Max 5 files
    console.log('[CreatePost] FileList state updated')
  }

  const handleCustomRequest = async ({ file, onSuccess, onError }: any) => {
    try {
      console.log('[CreatePost] ===== CUSTOM REQUEST =====')
      console.log('[CreatePost] customRequest triggered for file:', {
        name: file.name,
        type: file.type,
        size: file.size,
        uid: file.uid
      })
      console.log('[CreatePost] Is mobile app:', isMobileApp())
      
      // For mobile app, trigger native file upload
      if (isMobileApp()) {
        // Native file upload is handled through the click event on Upload button
        // The file received here is already processed from native
        const nativeMeta = getNativeFileMeta(file)
        console.log('[CreatePost] Native metadata:', nativeMeta)
        
        if (nativeMeta?.url) {
          console.log('[CreatePost] Native file with R2 URL:', nativeMeta.url)
          onSuccess?.({ url: nativeMeta.url }, file)
          console.log('[CreatePost] onSuccess called with R2 URL')
          return
        }
      }
      
      // For web or files without native URL, just mark as ready for upload
      console.log('[CreatePost] Marking file as ready for upload')
      onSuccess?.('ok', file)
    } catch (error) {
      console.error('[CreatePost] ===== CUSTOM REQUEST ERROR =====')
      console.error('[CreatePost] Custom request error:', error)
      console.error('[CreatePost] Error stack:', (error as Error).stack)
      onError?.(error)
    }
  }

  const handlePreview = async (file: any) => {
    const nativeMeta = getNativeFileMeta(file)
    if (!file.r2Url && nativeMeta?.url) {
      file.r2Url = nativeMeta.url
    }

    if (file.r2Url) {
      setPreviewImage(file.r2Url)
      setPreviewVisible(true)
      return
    }

    if (!file.url && !file.preview && file.originFileObj) {
      file.preview = await getBase64(file.originFileObj)
    }

    setPreviewImage(file.url || file.thumbUrl || file.preview)
    setPreviewVisible(true)
  }

  const getBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = error => reject(error)
    })

  const handleContentChange = (value: string) => {
    const words = value
      .trim()
      .split(/\s+/)
      .filter(Boolean)
    setContentWordCount(value.trim().length === 0 ? 0 : words.length)

    if (!titleEdited) {
      const urlsInContent = extractUrls(value.trim())

      let textWithoutUrls = value.trim()
      urlsInContent.forEach(url => {
        textWithoutUrls = textWithoutUrls.replace(url, '').trim()
      })

      const autoTitle = textWithoutUrls
        .split(/\s+/)
        .filter(word => word.length > 0)
        .slice(0, 12)
        .join(' ')

      form.setFieldsValue({ title: autoTitle })
    }

    if (!value || value.trim().length === 0) {
      previewRequestRef.current++
      setLinkPreviews([])
      return
    }

    const urls = extractUrls(value)
    if (urls.length === 0) {
      previewRequestRef.current++
      setLinkPreviews([])
      return
    }

    const basePreviews = getBasePreviews(urls)
    setLinkPreviews(basePreviews)

    const requestId = ++previewRequestRef.current
    enhancePreviews(basePreviews)
      .then(enhanced => {
        if (previewRequestRef.current !== requestId) return

        setLinkPreviews(prev => {
          const hasChanges = enhanced.some((update, idx) => {
            const current = prev[idx]
            return !current ||
              update.title !== current.title ||
              update.description !== current.description ||
              update.image !== current.image
          })

          return hasChanges ? enhanced : prev
        })
      })
      .catch(err => {
        console.debug('Failed to enhance link previews in create form:', err)
      })
  }

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      console.debug('[CreatePost] Submit start', { values, files: fileList.length })
      const content: string | undefined = values.content
      const words = (content || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean)
      const wordCount = words.length
      if (wordCount > 2000) {
        messageApi.error('Content exceeds 2000 words limit')
        return
      }
      if ((!content || content.trim().length === 0) && fileList.length === 0) {
        messageApi.error('Write something or add at least one image/video')
        return
      }

      // Get city ID
      const selectedCityData = cities.find((city: any) => city.name === (values.city || selectedCity))
      if (!selectedCityData) {
        messageApi.error('Please select a valid city')
        return
      }
      console.debug('[CreatePost] City selected', selectedCityData)

      // Handle optional media upload
      let mediaUrls: string[] = []
      let mediaType: 'image' | 'video' = 'image'
      if (fileList.length > 0) {
        const nativeFiles = fileList.filter((file: any) => file.r2Url)
        const newFiles = fileList.filter((file: any) => !file.r2Url && file.originFileObj)

        if (newFiles.length > 0) {
          const uploadFiles = newFiles.map((file: any) => ({
            buffer: file.originFileObj,
            originalName: file.name,
            contentType: file.type,
            folder: 'posts'
          }))

          const uploadResults = await uploadMultipleToR2(uploadFiles)
          console.debug('[CreatePost] Upload results', uploadResults)
          const failedUploads = uploadResults.filter(result => !result.success)
          if (failedUploads.length > 0) {
            messageApi.error('Some files failed to upload. Please try again.')
            return
          }
          mediaUrls = uploadResults.map(result => result.url!).filter(Boolean)
        }

        if (nativeFiles.length > 0) {
          mediaUrls = [
            ...nativeFiles.map((file: any) => file.r2Url || getNativeFileMeta(file)?.url).filter(Boolean),
            ...mediaUrls,
          ]
        }

        const firstFile = fileList[0]
        const nativeMeta = getNativeFileMeta(firstFile)
        const typeSource = firstFile.type || nativeMeta?.type || (firstFile.r2Url ? 'image/jpeg' : '')
        mediaType = typeSource.startsWith('video/') ? 'video' : 'image'
      }

      // Create post
      const { data: inserted, error } = await supabaseClient
        .from('posts')
        .insert({
          user_id: user!.id,
          city_id: selectedCityData.id,
          title: values.title && values.title.trim().length > 0
            ? values.title.trim()
            : (content ? content.trim().split(/\s+/).slice(0, 12).join(' ') : null),
          caption: content && content.trim().length > 0 ? content : null,
          media_urls: mediaUrls,
          media_type: mediaType,
          is_active: true
        })
        .select('*')

      console.debug('[CreatePost] Insert response', { inserted, error })
      if (error) {
        messageApi.error('Failed to create post')
        return
      }

      messageApi.success('Post created successfully! 🎉')

      form.resetFields()
      setContentWordCount(0)
      setTitleEdited(false)
      previewRequestRef.current++
      setLinkPreviews([])

      // Ensure home feed refreshes with new post
      await queryClient.invalidateQueries({ queryKey: ['posts'] })
      router.push('/')
    } catch (error) {
      console.error('[CreatePost] Submit error', error)
      messageApi.error('Failed to create post')
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) {
    return null
  }

  if (!user) {
    return null
  }

  const uploadButton = (
    <div>
      <PlusOutlined />
      <div style={{ marginTop: 8 }}>Upload</div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-6"
        >
          <Title level={2} className="mb-2">Create Post</Title>
          <Text type="secondary">Share what&apos;s happening in your city</Text>
        </motion.div>

        {/* Create Post Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="rounded-2xl shadow-sm">
            <Form
              form={form}
              onFinish={handleSubmit}
              layout="vertical"
              initialValues={{ city: selectedCity }}
            >
              {/* Media Upload */}
              <Form.Item label="Photos & Videos (optional)" className="mb-4">
                <Upload
                  listType="picture-card"
                  fileList={fileList}
                  onChange={handleUploadChange}
                  onPreview={handlePreview}
                  customRequest={handleCustomRequest}
                  multiple
                  accept="image/*,video/*"
                  className="create-post-upload"
                >
                  {fileList.length >= 5 ? null : uploadButton}
                </Upload>
              </Form.Item>

              {/* Heading */}
              <Form.Item name="title" label="Heading (optional)">
                <Input
                  placeholder="Auto from content; you can edit"
                  className="rounded-xl"
                  onChange={() => setTitleEdited(true)}
                />
              </Form.Item>

              {/* Content (up to 2000 words) */}
              <Form.Item name="content" label="Content (optional, up to 2000 words)">
                <div>
                  <TextArea
                    rows={6}
                    placeholder="Write your post..."
                    className="rounded-xl"
                    onChange={(e) => {
                      const value = e.target.value
                      form.setFieldsValue({ content: value })
                      handleContentChange(value)
                    }}
                  />
                  <div className="text-right text-xs text-gray-500 mt-1">{contentWordCount}/2000 words</div>
                  {linkPreviews.length > 0 && (
                    <div className="space-y-3 mt-3">
                      {linkPreviews.map(preview => (
                        <LinkPreview key={preview.url} preview={preview} />
                      ))}
                    </div>
                  )}
                </div>
              </Form.Item>

              {/* City Selection */}
              <Form.Item
                name="city"
                label="City"
                rules={[{ required: true, message: 'Please select a city' }]}
              >
                <Select
                  placeholder="Select city"
                  className="rounded-xl"
                  size="large"
                  showSearch
                  filterOption={(input, option) =>
                    option?.children?.toString().toLowerCase().includes(input.toLowerCase()) ?? false
                  }
                >
                  {cities.map((city: any) => (
                    <Option key={city.id} value={city.name}>
                      <EnvironmentOutlined className="mr-2" />
                      {city.name}
                      {city.state && `, ${city.state}`}
                    </Option>
                  ))}
                </Select>
              </Form.Item>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <Button
                  onClick={() => router.back()}
                  className="flex-1 h-12 rounded-xl"
                  size="large"
                >
                  Cancel
                </Button>
                
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  icon={<SendOutlined />}
                  className="flex-1 h-12 rounded-xl bg-gradient-to-r from-primary to-purple-500 border-0"
                  size="large"
                  disabled={loading}
                >
                  Post
                </Button>
              </div>
            </Form>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}
