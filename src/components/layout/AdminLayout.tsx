'use client'

import React, { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Layout, Menu, Avatar, Dropdown, Button, Typography, Space, Badge, message } from 'antd'
import { 
  DashboardOutlined,
  UserOutlined,
  FileTextOutlined,
  SafetyCertificateOutlined,
  WalletOutlined,
  SettingOutlined,
  LogoutOutlined,
  BellOutlined,
  MenuOutlined
} from '@ant-design/icons'
import { motion } from 'framer-motion'
import { useApp } from '../../lib/providers'
import { supabaseClient } from '../../lib/supabase-client'

const { Header, Sider, Content } = Layout
const { Title, Text } = Typography

interface AdminLayoutProps {
  children: React.ReactNode
}

const menuItems = [
  {
    key: '/admin',
    icon: <DashboardOutlined />,
    label: 'Dashboard',
  },
  {
    key: '/admin/users',
    icon: <UserOutlined />,
    label: 'Users',
  },
  {
    key: '/admin/posts',
    icon: <FileTextOutlined />,
    label: 'Posts',
  },
  {
    key: '/admin/kyc',
    icon: <SafetyCertificateOutlined />,
    label: 'KYC Verification',
  },
  {
    key: '/admin/payments',
    icon: <WalletOutlined />,
    label: 'Payments',
  },
  {
    key: '/admin/settings',
    icon: <SettingOutlined />,
    label: 'Settings',
  },
]

export default function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, refreshUser } = useApp()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    try {
      await supabaseClient.auth.signOut()
    } catch {}
    try { localStorage.removeItem('selectedCity') } catch {}
    await refreshUser().catch(() => {})
    message.success('Logged out')
    router.replace('/auth/login')
    router.refresh()
  }

  const profileItems = [
    {
      key: 'profile',
      label: 'Profile Settings',
      icon: <UserOutlined />,
    },
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ]

  return (
    <Layout className="min-h-screen">
      {/* Sidebar */}
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        className="bg-white shadow-lg"
        width={250}
      >
        {/* Logo */}
        <motion.div 
          className="p-4 border-b border-gray-100"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-primary to-purple-500 rounded-lg flex items-center justify-center">
              <Text className="text-white font-bold text-sm">NU</Text>
            </div>
            {!collapsed && (
              <div>
                <Title level={4} className="mb-0 text-gray-800">Next Update</Title>
                <Text type="secondary" className="text-xs">Admin Panel</Text>
              </div>
            )}
          </div>
        </motion.div>

        {/* Navigation Menu */}
        <Menu
          mode="inline"
          selectedKeys={[pathname]}
          className="border-r-0 pt-4"
          items={menuItems}
          onClick={({ key }) => router.push(key)}
        />
      </Sider>

      <Layout className="site-layout">
        {/* Header */}
        <Header className="bg-white shadow-sm px-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="text-gray-600"
            />
            
            <div className="hidden md:block">
              <Title level={4} className="mb-0 text-gray-800">
                Admin Dashboard
              </Title>
              <Text type="secondary" className="text-sm">
                Manage your Next Update platform
              </Text>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <Badge count={3} size="small">
              <Button
                type="text"
                icon={<BellOutlined />}
                className="text-gray-600 hover:text-primary"
              />
            </Badge>

            {/* Admin Profile */}
            <Dropdown menu={{ items: profileItems }} trigger={['click']}>
              <div className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 rounded-lg p-2">
                <Avatar 
                  src={user?.avatar_url} 
                  icon={<UserOutlined />}
                  className="border-2 border-primary"
                />
                <div className="hidden md:block">
                  <Text strong className="text-gray-800 block leading-none">
                    {user?.name || 'Admin'}
                  </Text>
                  <Text type="secondary" className="text-xs">
                    Administrator
                  </Text>
                </div>
              </div>
            </Dropdown>
          </div>
        </Header>

        {/* Main Content */}
        <Content className="bg-gray-50 p-6 overflow-auto">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </Content>
      </Layout>
    </Layout>
  )
}
