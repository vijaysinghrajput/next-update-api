'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Spin, Result } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { supabaseClient } from '../../../lib/supabase-client'
import { isMobileApp, sendToNativeApp } from '../../../utils/mobileBridge'

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the code from URL (email verification or OAuth)
        const code = searchParams.get('code')
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')
        const isSignup = searchParams.get('signup') === 'true'
        const isMobileRequest = searchParams.get('mobile') === 'true'

        if (error) {
          console.error('[Auth Callback] Error:', errorDescription)
          setStatus('error')
          setMessage(errorDescription || 'Authentication failed')
          setTimeout(() => router.push('/auth/login'), 3000)
          return
        }

        if (code) {
          console.log('[Auth Callback] Processing auth code...', { isMobileRequest })
          
          // Exchange the code for a session (works for both email and OAuth)
          const { data, error: exchangeError } = await supabaseClient.auth.exchangeCodeForSession(code)

          if (exchangeError) {
            console.error('[Auth Callback] Exchange error:', exchangeError)
            setStatus('error')
            setMessage(exchangeError.message)
            setTimeout(() => router.push('/auth/login'), 3000)
            return
          }

          if (data?.user) {
            console.log('[Auth Callback] User authenticated:', data.user.email)
            
            // Check if profile exists - use maybeSingle to avoid errors
            const { data: existingProfile, error: profileCheckError } = await supabaseClient
              .from('profiles')
              .select('id, name, email, city_id, referral_code')
              .eq('id', data.user.id)
              .maybeSingle()

            const isNewUser = !existingProfile

            if (isNewUser) {
              console.log('[Auth Callback] New user detected, creating profile...')
              
              try {
                // Generate referral code
                const generateReferralCode = () => {
                  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
                  let code = ''
                  for (let i = 0; i < 6; i++) {
                    code += chars.charAt(Math.floor(Math.random() * chars.length))
                  }
                  return code
                }
                
                // Get user data from OAuth metadata
                const userName = data.user.user_metadata?.full_name || 
                                data.user.user_metadata?.name || 
                                data.user.email?.split('@')[0] || 
                                'User'
                
                const cityId = data.user.user_metadata?.city_id || null
                const referralCodeUsed = data.user.user_metadata?.referral_code || null
                const referralCode = generateReferralCode()
                
                console.log('[Auth Callback] Creating profile with data:', { userName, cityId, referralCodeUsed })
                
                // Direct insert into profiles table
                const { error: insertError } = await supabaseClient
                  .from('profiles')
                  .insert({
                    id: data.user.id,
                    email: data.user.email!,
                    name: userName,
                    referral_code: referralCode,
                    referred_by: null, // Will be set by referral handler
                    city_id: cityId,
                    points_balance: 0,
                    is_verified: true, // OAuth users are auto-verified
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                  })
                
                if (insertError) {
                  console.error('[Auth Callback] Profile creation error:', insertError)
                  // If it's a duplicate, that's fine - profile exists
                  if (!insertError.message.includes('duplicate') && !insertError.message.includes('already exists')) {
                    throw insertError
                  }
                }
                
                // Handle referral if code was provided
                if (referralCodeUsed) {
                  try {
                    console.log('[Auth Callback] Processing referral code:', referralCodeUsed)
                    const { data: referralResult, error: referralError } = await supabaseClient
                      .rpc('handle_referral_signup', {
                        new_user_id: data.user.id,
                        referral_code_used: referralCodeUsed.toUpperCase()
                      })
                    
                    if (referralResult?.success) {
                      console.log('[Auth Callback] ✅ Referral bonus applied:', referralResult.message)
                    } else if (referralError) {
                      console.error('[Auth Callback] ❌ Referral error:', referralError)
                    }
                  } catch (refErr) {
                    console.error('[Auth Callback] Referral processing failed:', refErr)
                  }
                }
                
                console.log('[Auth Callback] ✅ Profile created successfully for:', userName)
              } catch (profileError: any) {
                console.error('[Auth Callback] Error creating profile:', profileError)
                // Continue anyway if it's a duplicate
                if (!profileError.message?.includes('duplicate')) {
                  setStatus('error')
                  setMessage('Failed to create user profile. Please try again.')
                  setTimeout(() => router.push('/auth/login'), 3000)
                  return
                }
              }
            } else {
              console.log('[Auth Callback] Existing user profile found:', existingProfile.name)
            }

            setStatus('success')
            
            // For mobile app, send session data and show instructions
            if (isMobileApp() || isMobileRequest) {
              console.log('[Auth Callback] Mobile detected - sending auth complete message')
              
              // Get the full session
              const { data: { session } } = await supabaseClient.auth.getSession()
              
              if (session) {
                // Send complete session to mobile app
                sendToNativeApp('auth_complete', {
                  success: true,
                  session: {
                    access_token: session.access_token,
                    refresh_token: session.refresh_token,
                    expires_at: session.expires_at,
                  },
                  user: {
                    id: data.user.id,
                    email: data.user.email,
                    name: data.user.user_metadata?.full_name || data.user.user_metadata?.name
                  }
                })
                
                // Show mobile-friendly message
                setMessage('Authentication successful! You can now close this browser and return to the app.')
                
                // Don't auto-redirect for mobile - let user close browser manually
                return
              }
            }
            
            // Check if user is admin
            const email = data.user.email?.toLowerCase()
            const isAdmin = email === 'admin@nextupdate.in' || email === 'support@nextupdate.in'
            
            if (isAdmin) {
              setMessage('Login successful! Redirecting to admin panel...')
              setTimeout(() => router.push('/admin'), 2000)
            } else {
              setMessage(isNewUser ? 'Welcome! Setting up your account...' : 'Login successful! Redirecting...')
              setTimeout(() => router.push('/'), 2000)
            }
          }
        } else {
          // No code, might be already logged in
          const { data: { user } } = await supabaseClient.auth.getUser()
          
          if (user) {
            console.log('[Auth Callback] Already authenticated:', user.email)
            
            // Check if profile exists for already authenticated user
            const { data: existingProfile } = await supabaseClient
              .from('profiles')
              .select('id, name')
              .eq('id', user.id)
              .maybeSingle()
            
            // If no profile, create one (might happen if OAuth was interrupted)
            if (!existingProfile) {
              console.log('[Auth Callback] Creating missing profile for authenticated user...')
              
              const generateReferralCode = () => {
                const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
                let code = ''
                for (let i = 0; i < 6; i++) {
                  code += chars.charAt(Math.floor(Math.random() * chars.length))
                }
                return code
              }
              
              const userName = user.user_metadata?.full_name || 
                              user.user_metadata?.name || 
                              user.email?.split('@')[0] || 
                              'User'
              
              await supabaseClient
                .from('profiles')
                .insert({
                  id: user.id,
                  email: user.email!,
                  name: userName,
                  referral_code: generateReferralCode(),
                  points_balance: 0,
                  is_verified: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                })
                .select()
                .single()
              
              console.log('[Auth Callback] ✅ Profile created for already authenticated user')
            }
            
            setStatus('success')
            setMessage('Already authenticated!')
            const email = user.email?.toLowerCase()
            const isAdmin = email === 'admin@nextupdate.in' || email === 'support@nextupdate.in'
            setTimeout(() => router.push(isAdmin ? '/admin' : '/'), 1000)
          } else {
            setStatus('error')
            setMessage('Invalid authentication link')
            setTimeout(() => router.push('/auth/login'), 3000)
          }
        }
      } catch (err: any) {
        setStatus('error')
        setMessage(err.message || 'An error occurred during authentication')
        setTimeout(() => router.push('/auth/login'), 3000)
      }
    }

    handleCallback()
  }, [searchParams, router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
        <div className="text-center">
          <Spin size="large" />
          <p className="mt-4 text-gray-600">Authenticating...</p>
        </div>
      </div>
    )
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <Result
          status="success"
          icon={<CheckCircleOutlined className="text-green-500" />}
          title="Authentication Successful!"
          subTitle={message || 'Redirecting...'}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50">
      <Result
        status="error"
        icon={<CloseCircleOutlined className="text-red-500" />}
        title="Verification Failed"
        subTitle={message}
        extra={
          <a href="/auth/verify-email" className="text-primary hover:underline">
            Back to Verification Page
          </a>
        }
      />
    </div>
  )
}
