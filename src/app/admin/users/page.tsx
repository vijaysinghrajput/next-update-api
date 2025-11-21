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
  Select, 
  InputNumber, 
  message,
  Popconfirm,
  Divider,
  Badge
} from 'antd'
import { 
  EditOutlined, 
  DeleteOutlined, 
  PlusOutlined, 
  SearchOutlined,
  UserOutlined,
  CrownOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import AdminLayout from '../../../components/layout/AdminLayout'
import { supabaseClient } from '../../../lib/supabase-client'
import { isAdmin } from '../../../lib/utils'

const { Title, Text } = Typography
const { Option } = Select

interface User {
  id: string
  email: string
  name: string
  phone: string | null
  city_id: string | null
  avatar_url: string | null
  points_balance: number
  is_verified: boolean
  has_blue_tick: boolean
  referral_code: string
  age: number | null
  gender: string | null
  created_at: string
  cities?: { id: string; name: string }
}

interface City {
  id: string
  name: string
  state: string | null
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<User[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
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
      // Fetch users with city information
      const { data: usersData, error: usersError } = await supabaseClient
        .from('profiles')
        .select(`
          *,
          cities:city_id (
            id,
            name
          )
        `)
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      // Fetch all cities for the form
      const { data: citiesData, error: citiesError } = await supabaseClient
        .from('cities')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (citiesError) throw citiesError

      setUsers(usersData || [])
      setCities(citiesData || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      message.error('Failed to fetch data')
    } finally {
      setLoading(false)
    }
  }

  const showModal = (user?: User) => {
    setEditingUser(user || null)
    setModalVisible(true)
    if (user) {
      form.setFieldsValue({
        ...user,
        city_id: user.cities?.id || null
      })
    } else {
      form.resetFields()
    }
  }

  const handleSubmit = async (values: any) => {
    try {
      if (editingUser) {
        // Update existing user
        const { error } = await supabaseClient
          .from('profiles')
          .update({
            name: values.name,
            email: values.email,
            phone: values.phone,
            city_id: values.city_id,
            points_balance: values.points_balance,
            is_verified: values.is_verified,
            has_blue_tick: values.has_blue_tick,
            age: values.age,
            gender: values.gender,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingUser.id)

        if (error) throw error
        message.success('User updated successfully')
      } else {
        // Create new user functionality would require auth.admin access
        message.info('User creation requires additional setup')
      }

      setModalVisible(false)
      fetchData()
    } catch (error) {
      console.error('Error saving user:', error)
      message.error('Failed to save user')
    }
  }

  const handleDelete = async (userId: string) => {
    try {
      // Note: Deleting users requires careful consideration of related data
      const { error } = await supabaseClient
        .from('profiles')
        .delete()
        .eq('id', userId)

      if (error) throw error
      message.success('User deleted successfully')
      fetchData()
    } catch (error) {
      console.error('Error deleting user:', error)
      message.error('Failed to delete user')
    }
  }

  const filteredUsers = users.filter(user =>
    user.name?.toLowerCase().includes(searchText.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchText.toLowerCase())
  )

  const columns = [
    {
      title: 'Avatar',
      dataIndex: 'avatar_url',
      key: 'avatar',
      render: (avatarUrl: string | null, record: User) => (
        <Avatar 
          src={avatarUrl} 
          icon={<UserOutlined />}
          size={40}
        />
      )
    },
    {
      title: 'User Info',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: User) => (
        <Space direction="vertical" size={0}>
          <Space>
            <Text strong>{name}</Text>
            {record.has_blue_tick && <CrownOutlined style={{ color: '#1890ff' }} />}
            {record.is_verified && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
          </Space>
          <Text type="secondary" style={{ fontSize: '12px' }}>{record.email}</Text>
        </Space>
      )
    },
    {
      title: 'City',
      dataIndex: 'cities',
      key: 'city',
      render: (city: any) => city?.name || 'No City'
    },
    {
      title: 'Phone',
      dataIndex: 'phone',
      key: 'phone',
      render: (phone: string | null) => phone || 'Not provided'
    },
    {
      title: 'Points',
      dataIndex: 'points_balance',
      key: 'points',
      render: (points: number) => (
        <Badge count={Math.round(points)} style={{ backgroundColor: '#52c41a' }} />
      )
    },
    {
      title: 'Status',
      key: 'status',
      render: (record: User) => (
        <Space direction="vertical" size={0}>
          {record.is_verified && <Tag color="green">Verified</Tag>}
          {record.has_blue_tick && <Tag color="blue">Blue Tick</Tag>}
          {!record.is_verified && !record.has_blue_tick && <Tag>Regular</Tag>}
        </Space>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: User) => (
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
            title="Delete user?"
            description="This action cannot be undone"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button 
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
        <Card>
          <div className="flex justify-between items-center mb-6">
            <Title level={2}>Users Management</Title>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => showModal()}
            >
              Add User
            </Button>
          </div>

          <div className="mb-4">
            <Input
              placeholder="Search users by name or email"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ maxWidth: 300 }}
            />
          </div>

          <Table
            dataSource={filteredUsers}
            columns={columns}
            loading={loading}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `Total ${total} users`
            }}
          />
        </Card>

        <Modal
          title={editingUser ? 'Edit User' : 'Add User'}
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
            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true, message: 'Please enter name' }]}
            >
              <Input />
            </Form.Item>

            <Form.Item
              name="email"
              label="Email"
              rules={[
                { required: true, message: 'Please enter email' },
                { type: 'email', message: 'Please enter valid email' }
              ]}
            >
              <Input />
            </Form.Item>

            <Form.Item name="phone" label="Phone">
              <Input />
            </Form.Item>

            <Form.Item name="city_id" label="City">
              <Select placeholder="Select city" allowClear>
                {cities.map(city => (
                  <Option key={city.id} value={city.id}>
                    {city.name}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item name="age" label="Age">
              <InputNumber min={1} max={120} />
            </Form.Item>

            <Form.Item name="gender" label="Gender">
              <Select placeholder="Select gender">
                <Option value="male">Male</Option>
                <Option value="female">Female</Option>
                <Option value="other">Other</Option>
              </Select>
            </Form.Item>

            <Divider />

            <Form.Item name="points_balance" label="Points Balance">
              <InputNumber min={0} />
            </Form.Item>

            <Form.Item name="is_verified" label="Verified" valuePropName="checked">
              <Select>
                <Option value={true}>Yes</Option>
                <Option value={false}>No</Option>
              </Select>
            </Form.Item>

            <Form.Item name="has_blue_tick" label="Blue Tick" valuePropName="checked">
              <Select>
                <Option value={true}>Yes</Option>
                <Option value={false}>No</Option>
              </Select>
            </Form.Item>
          </Form>
        </Modal>
      </motion.div>
    </AdminLayout>
  )
}