'use client'

import React from 'react'
import { Typography, Card } from 'antd'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeftOutlined } from '@ant-design/icons'

const { Title, Paragraph } = Typography

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link 
            href="/" 
            className="inline-flex items-center text-primary mb-6 hover:underline"
          >
            <ArrowLeftOutlined className="mr-2" />
            Back to Home
          </Link>

          <Card className="rounded-2xl shadow-xl">
            <Title level={1} className="mb-6">Privacy Policy</Title>
            <Paragraph className="text-gray-600 mb-8">
              Last updated: {new Date().toLocaleDateString()}
            </Paragraph>

            <div className="space-y-6">
              <section>
                <Title level={3}>1. Information We Collect</Title>
                <Paragraph>
                  We collect information that you provide directly to us, including:
                </Paragraph>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Account information (name, email, phone number)</li>
                  <li>Profile information and content you post</li>
                  <li>Location data (city selection)</li>
                  <li>Usage data and interactions with our platform</li>
                </ul>
              </section>

              <section>
                <Title level={3}>2. How We Use Your Information</Title>
                <Paragraph>
                  We use the information we collect to:
                </Paragraph>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Process transactions and send related information</li>
                  <li>Send you technical notices and support messages</li>
                  <li>Respond to your comments and questions</li>
                  <li>Monitor and analyze trends and usage</li>
                </ul>
              </section>

              <section>
                <Title level={3}>3. Information Sharing</Title>
                <Paragraph>
                  We do not sell your personal information. We may share your information only:
                </Paragraph>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>With your consent</li>
                  <li>To comply with legal obligations</li>
                  <li>To protect our rights and safety</li>
                  <li>With service providers who assist us in operating our platform</li>
                </ul>
              </section>

              <section>
                <Title level={3}>4. Data Security</Title>
                <Paragraph>
                  We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
                </Paragraph>
              </section>

              <section>
                <Title level={3}>5. Your Rights</Title>
                <Paragraph>
                  You have the right to:
                </Paragraph>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Access and update your personal information</li>
                  <li>Delete your account and data</li>
                  <li>Opt-out of certain communications</li>
                  <li>Request a copy of your data</li>
                </ul>
              </section>

              <section>
                <Title level={3}>6. Contact Us</Title>
                <Paragraph>
                  If you have questions about this Privacy Policy, please contact us at:
                </Paragraph>
                <Paragraph className="font-semibold">
                  Email: support@nextupdate.in
                </Paragraph>
              </section>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

