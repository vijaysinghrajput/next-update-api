import { AuthProvider } from '@refinedev/core'
import { supabase } from './supabase'
import { generateReferralCode } from './utils'

// Extended Supabase client for Refine
export const supabaseClient = supabase

// Auth provider for Refine
export const authProvider: AuthProvider = {
  login: async ({ email, password, referralCode }) => {
    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return {
          success: false,
          error: {
            message: error.message,
            name: 'LoginError',
          },
        }
      }

      return {
        success: true,
        redirectTo: '/',
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          message: error.message,
          name: 'LoginError',
        },
      }
    }
  },

  register: async ({ email, password, name, phone, cityId, referralCode }) => {
    try {
      // First create the auth user with email confirmation disabled
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: undefined, // Disable email verification for development
          data: {
            name,
            phone,
            city_id: cityId,
            referral_code: referralCode,
          },
        },
      })

      if (error) {
        return {
          success: false,
          error: {
            message: error.message,
            name: 'RegisterError',
          },
        }
      }

      if (data.user) {
        // Immediately confirm email for development
        await supabaseClient.rpc('confirm_user_email', {
          user_id: data.user.id
        }).catch(() => {
          // If RPC doesn't exist, continue anyway
          console.log('Email confirmation RPC not available, continuing...')
        })

        // Handle referral bonus if user provided referral code
        if (referralCode) {
          await supabaseClient.rpc('handle_referral_bonus', {
            user_id: data.user.id,
            referral_code: referralCode,
          }).catch(() => {
            console.log('Referral bonus RPC not available, continuing...')
          })
        }

        // Automatically sign in the user after registration
        const { data: signInData, error: signInError } = await supabaseClient.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) {
          console.log('Auto sign-in failed, but user created successfully')
        }
      }

      return {
        success: true,
        redirectTo: '/',
      }
    } catch (error: any) {
      return {
        success: false,
        error: {
          message: error.message,
          name: 'RegisterError',
        },
      }
    }
  },

  logout: async () => {
    const { error } = await supabaseClient.auth.signOut()

    if (error) {
      return {
        success: false,
        error: {
          message: error.message,
          name: 'LogoutError',
        },
      }
    }

    return {
      success: true,
      redirectTo: '/auth/login',
    }
  },

  check: async () => {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession()
      
      if (session) {
        return {
          authenticated: true,
        }
      }

      return {
        authenticated: false,
        redirectTo: '/auth/login',
      }
    } catch (error: any) {
      return {
        authenticated: false,
        redirectTo: '/auth/login',
      }
    }
  },

  getPermissions: async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser()
      
      if (user) {
        // Check if user is admin
        const adminEmails = ['admin@nextupdate.in', 'support@nextupdate.in', 'admin@ghar-khojo.com', 'support@ghar-khojo.com']
        const isAdmin = adminEmails.includes((user.email || '').toLowerCase())
        
        return {
          permissions: isAdmin ? ['admin'] : ['user'],
        }
      }

      return {
        permissions: [],
      }
    } catch (error) {
      return {
        permissions: [],
      }
    }
  },

  getIdentity: async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser()
      
      if (user) {
        const { data: profile } = await supabaseClient
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        return {
          id: user.id,
          name: profile?.name || user.email,
          email: user.email,
          avatar: profile?.avatar_url || `https://ui-avatars.com/api/?name=${profile?.name}&background=1890ff&color=fff`,
          ...profile,
        }
      }

      return null
    } catch (error) {
      return null
    }
  },

  onError: async (error) => {
    console.error('Auth error:', error)
    return { error }
  },
}

// Helper functions for social features
export const socialActions = {
  likePost: async (postId: string, userId: string) => {
    const { data, error } = await supabaseClient
      .from('post_likes')
      .insert({ post_id: postId, user_id: userId })

    return { data, error }
  },

  unlikePost: async (postId: string, userId: string) => {
    const { error } = await supabaseClient
      .from('post_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', userId)

    return { error }
  },

  followUser: async (followerId: string, followingId: string) => {
    const { data, error } = await supabaseClient
      .from('follows')
      .insert({ follower_id: followerId, following_id: followingId })

    return { data, error }
  },

  unfollowUser: async (followerId: string, followingId: string) => {
    const { error } = await supabaseClient
      .from('follows')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', followingId)

    return { error }
  },

  addComment: async (postId: string, userId: string, content: string) => {
    const { data, error } = await supabaseClient
      .from('post_comments')
      .insert({ post_id: postId, user_id: userId, content })

    return { data, error }
  },

  purchaseBlueTick: async (userId: string) => {
    // Start transaction
    const { data, error } = await supabaseClient.rpc('purchase_blue_tick', {
      user_id: userId
    })

    return { data, error }
  },
}
