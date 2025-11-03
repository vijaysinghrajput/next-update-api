"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, Table, Button, Space, Typography, Avatar, message, Tag } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { supabaseClient } from '../../../lib/supabase-client'
import { isAdmin, formatNumber } from '../../../lib/utils'
import AdminLayout from '../../../components/layout/AdminLayout'
import { getProxiedImageUrl } from '../../../lib/r2-storage'

const { Title, Text } = Typography

interface PaymentRow {
  id: string
  user_id: string
  amount: number
  status: 'pending' | 'approved' | 'rejected'
  admin_notes: string | null
  screenshot_url: string
  created_at: string
  profiles?: { name?: string; avatar_url?: string | null }
}

export default function AdminPaymentsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [rows, setRows] = useState<PaymentRow[]>([])
  const [adminEmail, setAdminEmail] = useState<string>('admin')
  const [adminUserId, setAdminUserId] = useState<string>('')

  const guard = async () => {
    const { data: { session } } = await supabaseClient.auth.getSession()
    const email = session?.user?.email || ''
    if (!session || !isAdmin(email)) {
      router.replace('/auth/login')
      return false
    }
    setAdminEmail(email)
    setAdminUserId(session.user.id)
    return true
  }

  const fetchRows = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabaseClient
        .from('payment_requests')
        .select(`*, profiles:user_id (name, avatar_url)`) 
        .order('created_at', { ascending: false })
      if (error) console.error('[Payments] fetch error', error)
      setRows((data as PaymentRow[]) || [])
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

  const approve = async (id: string) => {
    try {
      const row = rows.find(r => r.id === id)
      if (!row) return

      // 1) Update payment request
      const { error: updErr } = await supabaseClient
        .from('payment_requests')
        .update({ status: 'approved', admin_notes: 'Approved', processed_by: adminUserId, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (updErr) {
        console.error('[Payments] approve update error', updErr)
        message.error(updErr.message || 'Failed to approve payment')
        return
      }

      // 2) Insert points transaction (no reference_id)
      const { error: txErr } = await supabaseClient.from('points_transactions').insert({
        user_id: row.user_id,
        type: 'admin_credit',
        amount: row.amount,
        description: `Payment approved +${row.amount} points`
      })
      if (txErr) {
        console.error('[Payments] tx error', txErr)
        message.error(txErr.message || 'Failed to record transaction')
        return
      }

      // 3) Update profile balance
      const { data: profile, error: profErr } = await supabaseClient
        .from('profiles')
        .select('points_balance')
        .eq('id', row.user_id)
        .single()
      if (profErr) {
        console.error('[Payments] profile fetch error', profErr)
        message.error(profErr.message || 'Failed to fetch profile')
        return
      }
      const current = (profile?.points_balance as number | undefined) ?? 0
      const { error: balErr } = await supabaseClient
        .from('profiles')
        .update({ points_balance: current + row.amount, updated_at: new Date().toISOString() })
        .eq('id', row.user_id)
      if (balErr) {
        console.error('[Payments] balance update error', balErr)
        message.error(balErr.message || 'Failed to update balance')
        return
      }

      setRows(prev => prev.map(r => r.id === id ? { ...r, status: 'approved', admin_notes: 'Approved' } : r))
      message.success('Payment approved')
    } catch (e: any) {
      console.error('[Payments] approve exception', e)
      message.error(e?.message || 'Failed to approve payment')
    }
  }

  const reject = async (id: string) => {
    try {
      const { error } = await supabaseClient
        .from('payment_requests')
        .update({ status: 'rejected', admin_notes: 'Invalid proof', processed_by: adminUserId, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) {
        console.error('[Payments] reject error', error)
        message.error(error.message || 'Failed to reject payment')
        return
      }

      setRows(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected', admin_notes: 'Invalid proof' } : r))
      message.success('Payment rejected')
    } catch (e: any) {
      console.error('[Payments] reject exception', e)
      message.error(e?.message || 'Failed to reject payment')
    }
  }

  const columns = [
    {
      title: 'User',
      key: 'user',
      render: (record: PaymentRow) => (
        <div className="flex items-center space-x-2">
          <Avatar src={getProxiedImageUrl(record.profiles?.avatar_url)} size="small">
            {record.profiles?.name?.[0]?.toUpperCase()}
          </Avatar>
          <Text strong>{record.profiles?.name}</Text>
        </div>
      )
    },
    {
      title: 'Proof',
      key: 'proof',
      render: (record: PaymentRow) => (
        <a href={getProxiedImageUrl(record.screenshot_url) || record.screenshot_url} target="_blank" rel="noreferrer">
          <img src={getProxiedImageUrl(record.screenshot_url) || record.screenshot_url} alt="Proof" className="w-16 h-16 object-cover rounded" />
        </a>
      )
    },
    {
      title: 'Amount',
      dataIndex: 'amount',
      render: (v: number) => `${formatNumber(v)} points`
    },
    {
      title: 'Status',
      dataIndex: 'status',
      render: (s: PaymentRow['status']) => (
        <Tag color={s === 'approved' ? 'green' : s === 'rejected' ? 'red' : 'orange'}>{s}</Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: PaymentRow) => (
        <Space>
          <Button size="small" type="primary" icon={<CheckCircleOutlined />} onClick={() => approve(record.id)} disabled={record.status !== 'pending'}>
            Approve
          </Button>
          <Button size="small" danger icon={<CloseCircleOutlined />} onClick={() => reject(record.id)} disabled={record.status !== 'pending'}>
            Reject
          </Button>
        </Space>
      )
    }
  ]

  return (
    <AdminLayout>
      <Card title={`Payment Requests`} className="shadow-sm">
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
