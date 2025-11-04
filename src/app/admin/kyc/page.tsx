"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Table, Button, Space, Typography, Avatar, message, Tag } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { supabaseClient } from '../../../lib/supabase-client'
import { isAdmin } from '../../../lib/utils'
import AdminLayout from '../../../components/layout/AdminLayout'
import { getProxiedImageUrl } from '../../../lib/r2-storage'

const { Title, Text } = Typography

interface KycRow {
  id: string
  user_id: string
  aadhar_front_url: string
  aadhar_back_url: string
  status: 'pending' | 'verified' | 'rejected'
  rejection_reason: string | null
  created_at: string
  profiles?: { name?: string; avatar_url?: string | null }
}

function toViewUrl(url: string): string {
  if (!url) return url
  // Use getProxiedImageUrl to handle all URL conversions (old domain, relative paths, etc.)
  return getProxiedImageUrl(url) || url
}

export default function AdminKycPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<KycRow[]>([])

  const guard = async () => {
    const { data: { session } } = await supabaseClient.auth.getSession()
    const email = session?.user?.email || ''
    if (!session || !isAdmin(email)) {
      router.replace('/auth/login')
      return false
    }
    return true
  }

  const fetchRows = async () => {
    setLoading(true)
    try {
      const { data } = await supabaseClient
        .from('kyc_submissions')
        .select(`*, profiles:user_id (name, avatar_url)`) 
        .order('created_at', { ascending: false })
      setRows((data as KycRow[]) || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    (async () => {
      if (await guard()) {
        fetchRows()
      }
    })()
  }, [])

  const handleAction = async (id: string, status: 'verified' | 'rejected') => {
    try {
      const { error } = await supabaseClient
        .from('kyc_submissions')
        .update({ status, rejection_reason: status === 'rejected' ? 'Invalid documents' : null, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error

      if (status === 'verified') {
        const row = rows.find(r => r.id === id)
        if (row) {
          await supabaseClient.from('profiles').update({ is_verified: true, updated_at: new Date().toISOString() }).eq('id', row.user_id)
        }
      }

      // Update row in-place
      setRows(prev => prev.map(r => r.id === id ? { ...r, status, rejection_reason: status === 'rejected' ? 'Invalid documents' : null } : r))
      message.success(`KYC ${status}`)
    } catch {
      message.error('Failed to update KYC')
    }
  }

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (record: KycRow) => (
        <div className="flex items-center space-x-2">
          <Avatar src={getProxiedImageUrl(record.profiles?.avatar_url)} size="small">
            {record.profiles?.name?.[0]?.toUpperCase()}
          </Avatar>
          <Text strong>{record.profiles?.name}</Text>
        </div>
      )
    },
    {
      title: 'Front',
      key: 'front',
      render: (record: KycRow) => {
        const url = toViewUrl(record.aadhar_front_url)
        return (
          <a href={url} target="_blank" rel="noreferrer">
            <img src={url} alt="Front" className="w-16 h-16 object-cover rounded" />
          </a>
        )
      }
    },
    {
      title: 'Back',
      key: 'back',
      render: (record: KycRow) => {
        const url = toViewUrl(record.aadhar_back_url)
        return (
          <a href={url} target="_blank" rel="noreferrer">
            <img src={url} alt="Back" className="w-16 h-16 object-cover rounded" />
          </a>
        )
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (s: KycRow['status']) => <Tag color={s === 'pending' ? 'orange' : s === 'verified' ? 'green' : 'red'}>{s}</Tag>
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: KycRow) => (
        <Space>
          <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => handleAction(record.id, 'verified')} disabled={record.status !== 'pending'}>
            Approve
          </Button>
          <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => handleAction(record.id, 'rejected')} disabled={record.status !== 'pending'}>
            Reject
          </Button>
        </Space>
      )
    }
  ]

  return (
    <AdminLayout>
      <Card title={`KYC Verification`} className="shadow-sm">
        <Table
          rowKey="id"
          loading={loading}
          dataSource={rows}
          columns={columns as any}
          pagination={{ pageSize: 20 }}
        />
      </Card>
    </AdminLayout>
  )
}
