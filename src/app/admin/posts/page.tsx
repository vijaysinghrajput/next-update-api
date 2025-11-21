'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Table, 
  Card, 
  Button, 
  Space, 
  Typography, 
  Avatar, 
  Tag, 
  Modal, 
  Form, 
  Input, 
  Switch, 
  Select,
  message,
  Popconfirm,
  Image,
  Badge,
  Statistic,
  Tooltip
} from 'antd'
import { 
  EditOutlined, 
  DeleteOutlined, 
  EyeOutlined, 
  SearchOutlined,
  LikeOutlined,
  MessageOutlined,
  ShareAltOutlined,
  FileTextOutlined,
  UserOutlined,
  EnvironmentOutlined
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import AdminLayout from '../../../components/layout/AdminLayout'
import { supabaseClient } from '../../../lib/supabase-client'
import { isAdmin } from '../../../lib/utils'
import { getProxiedImageUrl } from '../../../lib/r2-storage'

const { Title, Text, Paragraph } = Typography
const { Option } = Select
const { TextArea } = Input

interface Post {
  id: string
  user_id: string
  city_id: string
  caption: string | null
  title: string | null
  media_urls: string[]
  media_type: string
  likes_count: number
  comments_count: number
  shares_count: number
  is_active: boolean
  created_at: string
  updated_at: string
  profiles?: {
    name: string
    email: string
    avatar_url: string | null
  }
  cities?: {
    name: string
    state: string | null
  }
}

interface City {
  id: string
  name: string
  state: string | null
}

interface PostStats {
  total_posts: number
  active_posts: number
  inactive_posts: number
  total_likes: number
  total_comments: number
  total_shares: number
}

export default function PostsManagementPage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [stats, setStats] = useState<PostStats>({
    total_posts: 0,
    active_posts: 0,
    inactive_posts: 0,
    total_likes: 0,
    total_comments: 0,
    total_shares: 0
  })
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [editingPost, setEditingPost] = useState<Post | null>(null)
  const [viewingPost, setViewingPost] = useState<Post | null>(null)
  const [searchText, setSearchText] = useState('')
  const [filterCity, setFilterCity] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [form] = Form.useForm()
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession()
      if (!session) {
        router.replace('/auth/login')
        return
      }

      const email = session.user.email || ''
      if (!isAdmin(email)) {
        router.replace('/auth/login')
        return
      }

      setIsAuthorized(true)
      fetchData()
    } catch (error) {
      router.replace('/auth/login')
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch posts with user and city information
      const { data: postsData, error: postsError } = await supabaseClient
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            name,
            email,
            avatar_url
          ),
          cities:city_id (
            name,
            state
          )
        `)
        .order('created_at', { ascending: false })

      if (postsError) throw postsError

      // Fetch all cities for filters
      const { data: citiesData, error: citiesError } = await supabaseClient
        .from('cities')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (citiesError) throw citiesError

      setPosts(postsData || [])
      setCities(citiesData || [])

      // Calculate stats
      if (postsData) {
        const totalPosts = postsData.length
        const activePosts = postsData.filter(p => p.is_active).length
        const inactivePosts = totalPosts - activePosts
        const totalLikes = postsData.reduce((sum, post) => sum + post.likes_count, 0)
        const totalComments = postsData.reduce((sum, post) => sum + post.comments_count, 0)
        const totalShares = postsData.reduce((sum, post) => sum + post.shares_count, 0)

        setStats({
          total_posts: totalPosts,
          active_posts: activePosts,
          inactive_posts: inactivePosts,
          total_likes: totalLikes,
          total_comments: totalComments,
          total_shares: totalShares
        })
      }

    } catch (error) {
      console.error('Error fetching posts:', error)
      message.error('Failed to fetch posts data')
    } finally {
      setLoading(false)
    }
  }

  const showModal = (post?: Post) => {
    setEditingPost(post || null)
    setModalVisible(true)
    if (post) {
      form.setFieldsValue({
        title: post.title,
        caption: post.caption,
        city_id: post.city_id,
        is_active: post.is_active
      })
    } else {
      form.resetFields()
    }
  }

  const showViewModal = (post: Post) => {
    setViewingPost(post)
    setViewModalVisible(true)
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingPost) {
        // Update existing post
        const { error } = await supabaseClient
          .from('posts')
          .update({
            title: values.title?.trim() || null,
            caption: values.caption?.trim() || null,
            city_id: values.city_id,
            is_active: values.is_active,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingPost.id)

        if (error) throw error
        message.success('Post updated successfully')
      }

      setModalVisible(false)
      fetchData()
    } catch (error) {
      console.error('Error saving post:', error)
      message.error('Failed to save post')
    }
  }

  const handleDelete = async (postId: string) => {
    try {
      const { error } = await supabaseClient
        .from('posts')
        .delete()
        .eq('id', postId)

      if (error) throw error
      message.success('Post deleted successfully')
      fetchData()
    } catch (error) {
      console.error('Error deleting post:', error)
      message.error('Failed to delete post')
    }
  }

  const togglePostStatus = async (postId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabaseClient
        .from('posts')
        .update({ 
          is_active: !currentStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', postId)

      if (error) throw error
      message.success(`Post ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
      fetchData()
    } catch (error) {
      console.error('Error toggling post status:', error)
      message.error('Failed to update post status')
    }
  }

  const filteredPosts = posts.filter(post => {
    const matchesSearch = 
      post.caption?.toLowerCase().includes(searchText.toLowerCase()) ||
      post.title?.toLowerCase().includes(searchText.toLowerCase()) ||
      post.profiles?.name?.toLowerCase().includes(searchText.toLowerCase())
    
    const matchesCity = !filterCity || post.city_id === filterCity
    const matchesStatus = !filterStatus || 
      (filterStatus === 'active' ? post.is_active : !post.is_active)

    return matchesSearch && matchesCity && matchesStatus
  })

  const columns = [
    {
      title: 'Media',
      dataIndex: 'media_urls',
      key: 'media',
      width: 80,
      render: (mediaUrls: string[], record: Post) => (
        mediaUrls && mediaUrls.length > 0 ? (
          <Image
            src={getProxiedImageUrl(mediaUrls[0]) || mediaUrls[0]}
            alt="Post media"
            width={60}
            height={60}
            style={{ objectFit: 'cover', borderRadius: '4px' }}
            fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnH8W+PgYzI4Q4..."
          />
        ) : (
          <div className="w-15 h-15 bg-gray-200 rounded flex items-center justify-center">
            <FileTextOutlined />
          </div>
        )
      )
    },
    {
      title: 'Post Details',
      key: 'details',
      render: (record: Post) => (
        <Space direction="vertical" size={0}>
          <Space>
            <Avatar 
              src={record.profiles?.avatar_url} 
              icon={<UserOutlined />} 
              size="small" 
            />
            <Text strong>{record.profiles?.name}</Text>
          </Space>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.cities?.name}
          </Text>
          {record.title && (
            <Text strong style={{ fontSize: '12px' }}>{record.title}</Text>
          )}
          {record.caption && (
            <Paragraph 
              ellipsis={{ rows: 2 }} 
              style={{ fontSize: '12px', margin: 0, maxWidth: '200px' }}
            >
              {record.caption}
            </Paragraph>
          )}
        </Space>
      )
    },
    {
      title: 'Engagement',
      key: 'engagement',
      render: (record: Post) => (
        <Space direction="vertical" size={0}>
          <Space size="small">
            <LikeOutlined />
            <Text style={{ fontSize: '12px' }}>{record.likes_count}</Text>
          </Space>
          <Space size="small">
            <MessageOutlined />
            <Text style={{ fontSize: '12px' }}>{record.comments_count}</Text>
          </Space>
          <Space size="small">
            <ShareAltOutlined />
            <Text style={{ fontSize: '12px' }}>{record.shares_count}</Text>
          </Space>
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean, record: Post) => (
        <Space direction="vertical" size={0}>
          <Tag color={isActive ? 'green' : 'red'}>
            {isActive ? 'Active' : 'Inactive'}
          </Tag>
          <Switch
            checked={isActive}
            onChange={() => togglePostStatus(record.id, isActive)}
            size="small"
          />
        </Space>
      )
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (createdAt: string) => (
        <Text style={{ fontSize: '12px' }}>
          {new Date(createdAt).toLocaleDateString()}
        </Text>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Post) => (
        <Space direction="vertical" size="small">
          <Button 
            type="link" 
            icon={<EyeOutlined />} 
            onClick={() => showViewModal(record)}
            size="small"
          >
            View
          </Button>
          <Button 
            type="link" 
            icon={<EditOutlined />} 
            onClick={() => showModal(record)}
            size="small"
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete post?"
            description="This action cannot be undone"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button 
              type="link" 
              danger 
              icon={<DeleteOutlined />} 
              size="small"
            >
              Delete
            </Button>
          </Popconfirm>
        </Space>
      )
    }
  ]

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Stats Cards */}
        <div className="grid grid-cols-6 gap-4 mb-6">
          <Card>
            <Statistic 
              title="Total Posts" 
              value={stats.total_posts} 
              prefix={<FileTextOutlined />}
            />
          </Card>
          <Card>
            <Statistic 
              title="Active Posts" 
              value={stats.active_posts} 
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
          <Card>
            <Statistic 
              title="Inactive Posts" 
              value={stats.inactive_posts} 
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
          <Card>
            <Statistic 
              title="Total Likes" 
              value={stats.total_likes} 
              prefix={<LikeOutlined />}
            />
          </Card>
          <Card>
            <Statistic 
              title="Total Comments" 
              value={stats.total_comments} 
              prefix={<MessageOutlined />}
            />
          </Card>
          <Card>
            <Statistic 
              title="Total Shares" 
              value={stats.total_shares} 
              prefix={<ShareAltOutlined />}
            />
          </Card>
        </div>

        <Card>
          <div className="flex justify-between items-center mb-6">
            <Title level={2}>Posts Management</Title>
          </div>

          <div className="flex gap-4 mb-4 flex-wrap">
            <Input
              placeholder="Search posts, users, or content"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ maxWidth: 300 }}
            />
            <Select
              placeholder="Filter by city"
              value={filterCity}
              onChange={setFilterCity}
              style={{ width: 200 }}
              allowClear
            >
              {cities.map(city => (
                <Option key={city.id} value={city.id}>
                  {city.name}
                </Option>
              ))}
            </Select>
            <Select
              placeholder="Filter by status"
              value={filterStatus}
              onChange={setFilterStatus}
              style={{ width: 150 }}
              allowClear
            >
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
            </Select>
          </div>

          <Table
            dataSource={filteredPosts}
            columns={columns}
            loading={loading}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Total ${total} posts`
            }}
          />
        </Card>

        {/* Edit Modal */}
        <Modal
          title="Edit Post"
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          onOk={form.submit}
          width={600}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item name="title" label="Title">
              <Input placeholder="Post title (optional)" />
            </Form.Item>

            <Form.Item name="caption" label="Caption">
              <TextArea 
                rows={4} 
                placeholder="Post caption" 
                maxLength={1000}
                showCount
              />
            </Form.Item>

            <Form.Item name="city_id" label="City" rules={[{ required: true }]}>
              <Select placeholder="Select city">
                {cities.map(city => (
                  <Option key={city.id} value={city.id}>
                    {city.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item
              name="is_active"
              label="Status"
              valuePropName="checked"
            >
              <Switch 
                checkedChildren="Active" 
                unCheckedChildren="Inactive"
              />
            </Form.Item>
          </Form>
        </Modal>

        {/* View Modal */}
        <Modal
          title="Post Details"
          open={viewModalVisible}
          onCancel={() => setViewModalVisible(false)}
          footer={null}
          width={700}
        >
          {viewingPost && (
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Space>
                <Avatar 
                  src={viewingPost.profiles?.avatar_url} 
                  icon={<UserOutlined />} 
                />
                <div>
                  <Text strong>{viewingPost.profiles?.name}</Text>
                  <br />
                  <Text type="secondary">{viewingPost.profiles?.email}</Text>
                </div>
              </Space>

              <div>
                <Text type="secondary">City: </Text>
                <Text>{viewingPost.cities?.name}</Text>
              </div>

              {viewingPost.title && (
                <div>
                  <Text type="secondary">Title: </Text>
                  <Text strong>{viewingPost.title}</Text>
                </div>
              )}

              {viewingPost.caption && (
                <div>
                  <Text type="secondary">Caption: </Text>
                  <Paragraph>{viewingPost.caption}</Paragraph>
                </div>
              )}

              {viewingPost.media_urls && viewingPost.media_urls.length > 0 && (
                <div>
                  <Text type="secondary">Media: </Text>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {viewingPost.media_urls.map((url, index) => (
                      <Image
                        key={index}
                        src={getProxiedImageUrl(url) || url}
                        alt={`Media ${index + 1}`}
                        width={150}
                        height={150}
                        style={{ objectFit: 'cover', borderRadius: '4px' }}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-3 gap-4">
                <Statistic title="Likes" value={viewingPost.likes_count} />
                <Statistic title="Comments" value={viewingPost.comments_count} />
                <Statistic title="Shares" value={viewingPost.shares_count} />
              </div>

              <div>
                <Text type="secondary">Created: </Text>
                <Text>{new Date(viewingPost.created_at).toLocaleString()}</Text>
              </div>
            </Space>
          )}
        </Modal>
      </motion.div>
    </AdminLayout>
  )
}