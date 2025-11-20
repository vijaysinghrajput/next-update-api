'use client'

import React, { useState, useEffect } from 'react'
import { Modal, Button, Select, Typography, Space, Card } from 'antd'
import { EnvironmentOutlined } from '@ant-design/icons'
import { motion } from 'framer-motion'
import { supabaseClient } from '../../lib/supabase-client'

const { Title, Text } = Typography

interface CitySelectionModalProps {
  open: boolean
  onCitySelect: (city: string) => void
  onClose?: () => void
  showSkip?: boolean
  title?: string
  description?: string
}

interface City {
  id: string
  name: string
  state?: string
}

export default function CitySelectionModal({
  open,
  onCitySelect,
  onClose,
  showSkip = false,
  title = "Select Your City",
  description = "Choose your city to see local news and connect with your community"
}: CitySelectionModalProps) {
  const [cities, setCities] = useState<City[]>([])
  const [selectedCity, setSelectedCity] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [fetchingCities, setFetchingCities] = useState(true)

  // Fetch cities from database
  useEffect(() => {
    const fetchCities = async () => {
      try {
        setFetchingCities(true)
        const { data, error } = await supabaseClient
          .from('cities')
          .select('id, name, state')
          .eq('is_active', true)
          .order('name')

        if (error) throw error
        setCities(data || [])
      } catch (error) {
        console.error('Error fetching cities:', error)
        // Fallback to some default cities if database fails
        setCities([
          { id: '1', name: 'Lucknow', state: 'Uttar Pradesh' },
          { id: '2', name: 'Kanpur', state: 'Uttar Pradesh' },
          { id: '3', name: 'Varanasi', state: 'Uttar Pradesh' },
          { id: '4', name: 'Agra', state: 'Uttar Pradesh' },
          { id: '5', name: 'Meerut', state: 'Uttar Pradesh' },
        ])
      } finally {
        setFetchingCities(false)
      }
    }

    if (open) {
      fetchCities()
    }
  }, [open])

  const handleConfirm = async () => {
    if (!selectedCity) return
    
    setLoading(true)
    try {
      // Save to localStorage for persistence
      localStorage.setItem('selectedCity', selectedCity)
      localStorage.setItem('citySelectionTime', Date.now().toString())
      
      onCitySelect(selectedCity)
      onClose?.()
    } catch (error) {
      console.error('Error saving city selection:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = () => {
    // Set a default city if skipped
    const defaultCity = 'Lucknow'
    localStorage.setItem('selectedCity', defaultCity)
    localStorage.setItem('citySelectionTime', Date.now().toString())
    localStorage.setItem('citySkipped', 'true')
    
    onCitySelect(defaultCity)
    onClose?.()
  }

  const cityOptions = cities.map(city => ({
    value: city.name,
    label: (
      <div className="flex flex-col">
        <span className="font-medium">{city.name}</span>
        {city.state && (
          <span className="text-xs text-gray-500">{city.state}</span>
        )}
      </div>
    )
  }))

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      closable={false}
      width="90%"
      style={{ maxWidth: '400px' }}
      className="city-selection-modal"
      maskClosable={false}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="border-0 shadow-none">
          <div className="text-center mb-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full mb-4"
            >
              <EnvironmentOutlined className="text-2xl text-white" />
            </motion.div>
            
            <Title level={3} className="mb-2 text-gray-800">
              {title}
            </Title>
            
            <Text className="text-gray-600 text-base">
              {description}
            </Text>
          </div>

          <Space direction="vertical" size="large" className="w-full">
            <div>
              <Text strong className="block mb-2 text-gray-700">
                Choose Your City
              </Text>
              <Select
                placeholder="Search and select your city"
                size="large"
                className="w-full"
                options={cityOptions}
                value={selectedCity}
                onChange={setSelectedCity}
                showSearch
                loading={fetchingCities}
                filterOption={(input, option) =>
                  (option?.value as string)?.toLowerCase().includes(input.toLowerCase())
                }
                notFoundContent={fetchingCities ? "Loading cities..." : "No cities found"}
              />
            </div>

            <div className="space-y-3">
              <Button
                type="primary"
                size="large"
                block
                onClick={handleConfirm}
                disabled={!selectedCity}
                loading={loading}
                className="h-12 text-base font-medium"
              >
                Continue with {selectedCity || 'Selected City'}
              </Button>

              {showSkip && (
                <Button
                  type="text"
                  size="large"
                  block
                  onClick={handleSkip}
                  className="h-10 text-gray-500 hover:text-gray-700"
                >
                  Skip for now (Lucknow will be selected)
                </Button>
              )}
            </div>
          </Space>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <Text className="text-xs text-gray-500 text-center block">
              You can change your city anytime from the top menu
            </Text>
          </div>
        </Card>
      </motion.div>
    </Modal>
  )
}