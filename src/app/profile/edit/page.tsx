'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Button, Form, InputNumber, Radio, Select, Upload, Avatar as AntAvatar, Card, Space, App } from 'antd'
import { LoadingOutlined, UploadOutlined } from '@ant-design/icons'
import { supabaseClient } from '@/lib/supabase-client'
import { generateFileKey, uploadToR2, validateFileSize, validateMediaFile, getProxiedImageUrl } from '@/lib/r2-storage'
import { useRouter } from 'next/navigation'
import { useApp } from '@/lib/providers'
import { mobileAwareFileUpload, isMobileApp } from '@/utils/mobileBridge'

type CityOption = { id: string; name: string }

export default function EditProfilePage() {
  const router = useRouter()
  const { user, selectedCity, setSelectedCity, refreshUser } = useApp()
  const { message } = App.useApp()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [cities, setCities] = useState<CityOption[]>([])
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [initialCityName, setInitialCityName] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      console.debug('[EditProfile] init start')
      const { data: auth, error: authErr } = await supabaseClient.auth.getUser()
      if (authErr) console.error('[EditProfile] auth.getUser error', authErr)
      if (!auth?.user) {
        console.warn('[EditProfile] No auth user, redirecting')
        router.push('/auth/login')
        return
      }

      const [citiesResp, profileResp] = await Promise.all([
        supabaseClient.from('cities').select('id, name').eq('is_active', true).order('name'),
        supabaseClient
          .from('profiles')
          .select('id, name, avatar_url, age, gender, city_id, cities(name)')
          .eq('id', auth.user.id)
          .single(),
      ])

      const { data: cityRows, error: cityErr } = citiesResp as any
      const { data: profile, error: profileErr } = profileResp as any

      if (cityErr) {
        console.error('[EditProfile] cities select error', cityErr)
      } else {
        console.debug('[EditProfile] cities loaded', { count: cityRows?.length || 0, sample: cityRows?.[0] })
      }
      if (profileErr) {
        console.error('[EditProfile] profile select error', profileErr)
      } else {
        console.debug('[EditProfile] profile loaded', { id: profile?.id, cityName: profile?.cities?.name })
      }

      if (cityRows) setCities(cityRows as any)

      if (profile) {
        setAvatarUrl(profile.avatar_url || null)
        setInitialCityName(profile.cities?.name || null)
        form.setFieldsValue({
          age: profile.age || undefined,
          gender: profile.gender || undefined,
          city: profile.cities?.name || undefined,
        })
      }
    }
    init()
  }, [form, router])

  const cityOptions = useMemo(
    () => cities.map((c) => ({ label: c.name, value: c.name })),
    [cities]
  )

  const handleUpload = async (file: File) => {
    const sizeCheck = validateFileSize(Buffer.from(await file.arrayBuffer()), 5)
    if (!sizeCheck.isValid) {
      message.error(sizeCheck.error)
      return null
    }
    const typeCheck = validateMediaFile(file.name, Buffer.alloc(1))
    if (!typeCheck.isValid || typeCheck.type !== 'image') {
      message.error('Please upload a valid image (jpg, jpeg, png, gif, webp)')
      return null
    }

    const key = generateFileKey(file.name, 'avatars')
    const res = await uploadToR2(file, key, typeCheck.contentType)
    if (!res.success || !res.url) {
      message.error(res.error || 'Upload failed')
      return null
    }
    setAvatarUrl(res.url)
    return res.url
  }

  const handleMobileUpload = async () => {
    if (!isMobileApp()) return
    try {
      const files = await mobileAwareFileUpload({ accept: 'image/*', multiple: false, maxCount: 1 })
      if (files.length > 0) {
        const url = await handleUpload(files[0])
        return url
      }
    } catch (error) {
      console.error('[ProfileEdit] Mobile upload error:', error)
      message.error('Mobile upload failed')
    }
  }

  const onFinish = async (values: any) => {
    try {
      setLoading(true)

      // Map city name to id
      let newCityId: string | null = null
      if (values.city) {
        const found = cities.find((c) => c.name === values.city)
        newCityId = found ? found.id : null
      }

      const updates: Record<string, any> = {}
      if (typeof values.age === 'number') updates.age = values.age
      if (values.gender) updates.gender = values.gender
      if (avatarUrl) updates.avatar_url = avatarUrl
      if (newCityId) updates.city_id = newCityId

      if (Object.keys(updates).length === 0) {
        message.info('Nothing to update')
        return
      }

      const { error } = await supabaseClient
        .from('profiles')
        .update(updates)
        .eq('id', user!.id)

      if (error) throw error

      // Update selectedCity in context if changed
      if (values.city && values.city !== selectedCity) {
        setSelectedCity(values.city)
      }

      await refreshUser()
      message.success('Profile updated')
      router.push('/profile')
    } catch (err: any) {
      message.error(err.message || 'Update failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 py-4">
      <Card title="Edit Profile">
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Space align="center">
            <AntAvatar size={64} src={getProxiedImageUrl(avatarUrl) || undefined}>
              {!avatarUrl && (user?.name?.[0] || 'U')}
            </AntAvatar>
            <div onClick={isMobileApp() ? handleMobileUpload : undefined}>
              <Upload
                accept="image/*"
                showUploadList={false}
                customRequest={async ({ file, onSuccess, onError }) => {
                  try {
                    const url = await handleUpload(file as File)
                    if (url && onSuccess) onSuccess({ url } as any)
                  } catch (e) {
                    if (onError) onError(e as any)
                  }
                }}
                disabled={isMobileApp()}
              >
                <Button icon={<UploadOutlined />}>Change Photo</Button>
              </Upload>
            </div>
          </Space>

          <Form layout="vertical" form={form} onFinish={onFinish}>
            <Form.Item label="City" name="city">
              <Select
                options={cityOptions}
                placeholder={initialCityName || 'Select city'}
                showSearch
                optionFilterProp="label"
              />
            </Form.Item>
            {cities.length === 0 && (
              <div style={{ color: '#999', fontSize: 12 }}>No cities loaded. Check RLS and is_active.</div>
            )}

            <Form.Item label="Age" name="age" rules={[{ type: 'number', min: 13, max: 120 }]}>
              <InputNumber style={{ width: '100%' }} placeholder="Age" />
            </Form.Item>

            <Form.Item label="Gender" name="gender">
              <Radio.Group>
                <Radio value="male">Male</Radio>
                <Radio value="female">Female</Radio>
                <Radio value="other">Other</Radio>
              </Radio.Group>
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading} block>
                Save Changes
              </Button>
            </Form.Item>
          </Form>
        </Space>
      </Card>
    </div>
  )
}


