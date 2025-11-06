'use client'

import React from 'react'
import { Typography, Card } from 'antd'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { ArrowLeftOutlined } from '@ant-design/icons'

const { Title, Paragraph } = Typography

export default function TermsPage() {
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
            <Title level={1} className="mb-6">Terms of Service</Title>
            <Paragraph className="text-gray-600 mb-8">
              Last updated: {new Date().toLocaleDateString()}
            </Paragraph>

            <div className="space-y-6">
              <section>
                <Title level={3}>1. Acceptance of Terms</Title>
                <Paragraph>
                  By accessing and using Next Update, you accept and agree to be bound by the terms and provision of this agreement.
                </Paragraph>
              </section>

              <section>
                <Title level={3}>2. Use License</Title>
                <Paragraph>
                  Permission is granted to temporarily use Next Update for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title, and under this license you may not:
                </Paragraph>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Modify or copy the materials</li>
                  <li>Use the materials for any commercial purpose</li>
                  <li>Attempt to decompile or reverse engineer any software</li>
                  <li>Remove any copyright or other proprietary notations</li>
                </ul>
              </section>

              <section>
                <Title level={3}>3. User Accounts</Title>
                <Paragraph>
                  You are responsible for maintaining the confidentiality of your account and password. You agree to:
                </Paragraph>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Provide accurate and complete information</li>
                  <li>Maintain and update your information</li>
                  <li>Keep your password secure</li>
                  <li>Notify us immediately of any unauthorized use</li>
                </ul>
              </section>

              <section>
                <Title level={3}>4. User Content</Title>
                <Paragraph>
                  You retain ownership of content you post. By posting content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, and distribute your content on our platform.
                </Paragraph>
                <Paragraph>
                  You agree not to post content that:
                </Paragraph>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Is illegal, harmful, or violates any laws</li>
                  <li>Infringes on intellectual property rights</li>
                  <li>Contains hate speech or harassment</li>
                  <li>Is spam or misleading</li>
                </ul>
              </section>

              <section>
                <Title level={3}>5. Referral Program</Title>
                <Paragraph>
                  Our referral program is subject to the following terms:
                </Paragraph>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>Referrals must be legitimate and not fraudulent</li>
                  <li>We reserve the right to verify referrals</li>
                  <li>Points and rewards are subject to our discretion</li>
                  <li>Abuse of the referral system may result in account termination</li>
                </ul>
              </section>

              <section>
                <Title level={3}>6. Prohibited Uses</Title>
                <Paragraph>
                  You may not use our service:
                </Paragraph>
                <ul className="list-disc list-inside ml-4 space-y-2">
                  <li>In any way that violates applicable laws</li>
                  <li>To transmit harmful code or malware</li>
                  <li>To impersonate others</li>
                  <li>To collect user information without consent</li>
                </ul>
              </section>

              <section>
                <Title level={3}>7. Termination</Title>
                <Paragraph>
                  We may terminate or suspend your account immediately, without prior notice, for conduct that we believe violates these Terms of Service or is harmful to other users, us, or third parties.
                </Paragraph>
              </section>

              <section>
                <Title level={3}>8. Disclaimer</Title>
                <Paragraph>
                  The materials on Next Update are provided on an 'as is' basis. We make no warranties, expressed or implied, and hereby disclaim all other warranties including implied warranties of merchantability or fitness for a particular purpose.
                </Paragraph>
              </section>

              <section>
                <Title level={3}>9. Limitation of Liability</Title>
                <Paragraph>
                  In no event shall Next Update or its suppliers be liable for any damages arising out of the use or inability to use the materials on our platform.
                </Paragraph>
              </section>

              <section>
                <Title level={3}>10. Contact Information</Title>
                <Paragraph>
                  If you have any questions about these Terms of Service, please contact us at:
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

