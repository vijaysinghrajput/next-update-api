'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Table, 
  Card, 
  Button, 
  Space, 
  Typography, 
  Tag, 
  Modal, 
  Form, 
  Input, 
  Switch, 
  message,
  Popconfirm,
  Badge,
  Statistic
} from 'antd'
import { 
  EditOutlined, 
  DeleteOutlined, 
  PlusOutlined, 
  SearchOutlined,
  EnvironmentOutlined,
  UserOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import AdminLayout from '../../../components/layout/AdminLayout'
import { supabaseClient } from '../../../lib/supabase-client'
import { isAdmin } from '../../../lib/utils'

const { Title, Text } = Typography

interface City {
  id: string
  name: string
  state: string | null
  is_active: boolean
  created_at: string
  user_count?: number
  post_count?: number
}

interface CityStats {
  total_cities: number
  active_cities: number
  inactive_cities: number
  total_users: number
  total_posts: number
}

export default function CitiesManagementPage() {
  const [cities, setCities] = useState<City[]>([])
  const [stats, setStats] = useState<CityStats>({
    total_cities: 0,
    active_cities: 0,
    inactive_cities: 0,
    total_users: 0,
    total_posts: 0
  })
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingCity, setEditingCity] = useState<City | null>(null)
  const [searchText, setSearchText] = useState('')
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
      // Fetch cities with user and post counts
      const { data: citiesData, error: citiesError } = await supabaseClient
        .from('cities')
        .select(`
          *,
          profiles:profiles!city_id(count),
          posts:posts!city_id(count)
        `)
        .order('created_at', { ascending: false })

      if (citiesError) throw citiesError

      // Transform data to include counts
      const citiesWithCounts = citiesData?.map(city => ({
        ...city,
        user_count: city.profiles?.[0]?.count || 0,
        post_count: city.posts?.[0]?.count || 0
      })) || []

      setCities(citiesWithCounts)

      // Calculate stats
      const totalCities = citiesWithCounts.length
      const activeCities = citiesWithCounts.filter(c => c.is_active).length
      const inactiveCities = totalCities - activeCities
      const totalUsers = citiesWithCounts.reduce((sum, city) => sum + (city.user_count || 0), 0)
      const totalPosts = citiesWithCounts.reduce((sum, city) => sum + (city.post_count || 0), 0)

      setStats({
        total_cities: totalCities,
        active_cities: activeCities,
        inactive_cities: inactiveCities,
        total_users: totalUsers,
        total_posts: totalPosts
      })

    } catch (error) {
      console.error('Error fetching cities:', error)
      message.error('Failed to fetch cities data')
    } finally {
      setLoading(false)
    }
  }

  const showModal = (city?: City) => {
    setEditingCity(city || null)
    setModalVisible(true)
    if (city) {
      form.setFieldsValue(city)
    } else {
      form.resetFields()
      form.setFieldsValue({ is_active: true })
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingCity) {
        // Update existing city
        const { error } = await supabaseClient
          .from('cities')
          .update({
            name: values.name.trim(),
            state: values.state?.trim() || null,
            is_active: values.is_active
          })
          .eq('id', editingCity.id)

        if (error) throw error
        message.success('City updated successfully')
      } else {
        // Create new city
        const { error } = await supabaseClient
          .from('cities')
          .insert({
            name: values.name.trim(),
            state: values.state?.trim() || null,
            is_active: values.is_active
          })

        if (error) throw error
        message.success('City created successfully')
      }

      setModalVisible(false)
      fetchData()
    } catch (error) {
      console.error('Error saving city:', error)
      message.error('Failed to save city')
    }
  }

  const handleDelete = async (cityId: string) => {
    try {
      // Check if city has users or posts
      const city = cities.find(c => c.id === cityId)
      if (city && (city.user_count! > 0 || city.post_count! > 0)) {
        message.warning('Cannot delete city with existing users or posts')
        return
      }

      const { error } = await supabaseClient
        .from('cities')
        .delete()
        .eq('id', cityId)

      if (error) throw error
      message.success('City deleted successfully')
      fetchData()
    } catch (error) {
      console.error('Error deleting city:', error)
      message.error('Failed to delete city')
    }
  }

  const toggleCityStatus = async (cityId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabaseClient
        .from('cities')
        .update({ is_active: !currentStatus })
        .eq('id', cityId)

      if (error) throw error
      message.success(`City ${!currentStatus ? 'activated' : 'deactivated'} successfully`)
      fetchData()
    } catch (error) {
      console.error('Error toggling city status:', error)
      message.error('Failed to update city status')
    }
  }

  const filteredCities = cities.filter(city =>
    city.name?.toLowerCase().includes(searchText.toLowerCase()) ||
    city.state?.toLowerCase().includes(searchText.toLowerCase())
  )

  const columns = [
    {
      title: 'City Name',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: City) => (
        <Space>
          <EnvironmentOutlined style={{ color: '#1890ff' }} />
          <Text strong>{name}</Text>
        </Space>
      )
    },
    {
      title: 'State',
      dataIndex: 'state',
      key: 'state',
      render: (state: string | null) => state || 'Not specified'
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (isActive: boolean, record: City) => (
        <Space>
          <Tag color={isActive ? 'green' : 'red'}>
            {isActive ? 'Active' : 'Inactive'}
          </Tag>
          <Switch
            checked={isActive}
            onChange={() => toggleCityStatus(record.id, isActive)}
            size="small"
          />
        </Space>
      )
    },
    {
      title: 'Users',
      dataIndex: 'user_count',
      key: 'user_count',
      render: (count: number) => (
        <Space>
          <UserOutlined />
          <Badge count={count} style={{ backgroundColor: '#52c41a' }} />
        </Space>
      )
    },
    {
      title: 'Posts',
      dataIndex: 'post_count',
      key: 'post_count',
      render: (count: number) => (
        <Space>
          <FileTextOutlined />
          <Badge count={count} style={{ backgroundColor: '#1890ff' }} />
        </Space>
      )
    },
    {
      title: 'Created',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (createdAt: string) => new Date(createdAt).toLocaleDateString()
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: City) => (
        <Space>
          <Button 
            type="primary" 
            icon={<EditOutlined />} 
            onClick={() => showModal(record)}
            size="small"
          >
            Edit
          </Button>
          <Popconfirm
            title="Delete city?"
            description="This action cannot be undone. Only cities with no users/posts can be deleted."
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
            disabled={record.user_count! > 0 || record.post_count! > 0}
          >
            <Button 
              danger 
              icon={<DeleteOutlined />} 
              size="small"
              disabled={record.user_count! > 0 || record.post_count! > 0}
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
        <div className="grid grid-cols-5 gap-4 mb-6">
          <Card>
            <Statistic 
              title="Total Cities" 
              value={stats.total_cities} 
              prefix={<EnvironmentOutlined />}
            />
          </Card>
          <Card>
            <Statistic 
              title="Active Cities" 
              value={stats.active_cities} 
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
          <Card>
            <Statistic 
              title="Inactive Cities" 
              value={stats.inactive_cities} 
              valueStyle={{ color: '#cf1322' }}
            />
          </Card>
          <Card>
            <Statistic 
              title="Total Users" 
              value={stats.total_users} 
              prefix={<UserOutlined />}
            />
          </Card>
          <Card>
            <Statistic 
              title="Total Posts" 
              value={stats.total_posts} 
              prefix={<FileTextOutlined />}
            />
          </Card>
        </div>

        <Card>
          <div className="flex justify-between items-center mb-6">
            <Title level={2}>Cities Management</Title>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => showModal()}
            >
              Add City
            </Button>
          </div>

          <div className="mb-4">
            <Input
              placeholder="Search cities by name or state"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ maxWidth: 300 }}
            />
          </div>

          <Table
            dataSource={filteredCities}
            columns={columns}
            loading={loading}
            rowKey="id"
            pagination={{
              pageSize: 15,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Total ${total} cities`
            }}
          />
        </Card>

        <Modal
          title={editingCity ? 'Edit City' : 'Add City'}
          open={modalVisible}
          onCancel={() => setModalVisible(false)}
          onOk={form.submit}
          width={500}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
          >
            <Form.Item
              name="name"
              label="City Name"
              rules={[
                { required: true, message: 'Please enter city name' },
                { min: 2, message: 'City name must be at least 2 characters' }
              ]}
            >
              <Input placeholder="e.g., Mumbai" />
            </Form.Item>

            <Form.Item
              name="state"
              label="State/Province"
              rules={[
                { min: 2, message: 'State name must be at least 2 characters' }
              ]}
            >
              <Input placeholder="e.g., Maharashtra" />
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
      </motion.div>
    </AdminLayout>
  )
}