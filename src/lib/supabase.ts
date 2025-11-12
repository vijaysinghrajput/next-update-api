import { createClient } from '@supabase/supabase-js'

// Environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Types for our database schema
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
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
          referred_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          name: string
          phone?: string | null
          city_id?: string | null
          avatar_url?: string | null
          points_balance?: number
          is_verified?: boolean
          has_blue_tick?: boolean
          referral_code: string
          referred_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          name?: string
          phone?: string | null
          city_id?: string | null
          avatar_url?: string | null
          points_balance?: number
          is_verified?: boolean
          has_blue_tick?: boolean
          referral_code?: string
          referred_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      cities: {
        Row: {
          id: string
          name: string
          state: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          state?: string | null
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          state?: string | null
          is_active?: boolean
          created_at?: string
        }
      }
      posts: {
        Row: {
          id: string
          user_id: string
          city_id: string
          title: string | null
          caption: string | null
          media_urls: string[]
          media_type: 'image' | 'video'
          likes_count: number
          comments_count: number
          shares_count: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          city_id: string
          title?: string | null
          caption?: string | null
          media_urls: string[]
          media_type: 'image' | 'video'
          likes_count?: number
          comments_count?: number
          shares_count?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          city_id?: string
          title?: string | null
          caption?: string | null
          media_urls?: string[]
          media_type?: 'image' | 'video'
          likes_count?: number
          comments_count?: number
          shares_count?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      post_likes: {
        Row: {
          id: string
          post_id: string
          user_id: string
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          created_at?: string
        }
      }
      post_comments: {
        Row: {
          id: string
          post_id: string
          user_id: string
          content: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          content: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          content?: string
          created_at?: string
          updated_at?: string
        }
      }
      follows: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          created_at?: string
        }
      }
      kyc_submissions: {
        Row: {
          id: string
          user_id: string
          aadhar_front_url: string
          aadhar_back_url: string
          status: 'pending' | 'verified' | 'rejected'
          rejection_reason: string | null
          verified_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          aadhar_front_url: string
          aadhar_back_url: string
          status?: 'pending' | 'verified' | 'rejected'
          rejection_reason?: string | null
          verified_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          aadhar_front_url?: string
          aadhar_back_url?: string
          status?: 'pending' | 'verified' | 'rejected'
          rejection_reason?: string | null
          verified_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      points_transactions: {
        Row: {
          id: string
          user_id: string
          type: 'earned' | 'spent' | 'admin_credit' | 'admin_debit'
          amount: number
          description: string
          reference_id: string | null
          activity: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: 'earned' | 'spent' | 'admin_credit' | 'admin_debit'
          amount: number
          description: string
          reference_id?: string | null
          activity?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: 'earned' | 'spent' | 'admin_credit' | 'admin_debit'
          amount?: number
          description?: string
          reference_id?: string | null
          activity?: string | null
          created_at?: string
        }
      }
      post_shares: {
        Row: {
          id: string
          post_id: string
          user_id: string
          share_channel: string | null
          metadata: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          post_id: string
          user_id: string
          share_channel?: string | null
          metadata?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          id?: string
          post_id?: string
          user_id?: string
          share_channel?: string | null
          metadata?: Record<string, unknown> | null
          created_at?: string
        }
      }
      app_share_events: {
        Row: {
          id: string
          user_id: string
          share_target: string | null
          share_channel: string | null
          metadata: Record<string, unknown> | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          share_target?: string | null
          share_channel?: string | null
          metadata?: Record<string, unknown> | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          share_target?: string | null
          share_channel?: string | null
          metadata?: Record<string, unknown> | null
          created_at?: string
        }
      }
      payment_requests: {
        Row: {
          id: string
          user_id: string
          amount: number
          screenshot_url: string
          status: 'pending' | 'approved' | 'rejected'
          admin_notes: string | null
          processed_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          amount: number
          screenshot_url: string
          status?: 'pending' | 'approved' | 'rejected'
          admin_notes?: string | null
          processed_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          amount?: number
          screenshot_url?: string
          status?: 'pending' | 'approved' | 'rejected'
          admin_notes?: string | null
          processed_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      wallet_settings: {
        Row: {
          id: string
          upi_id: string | null
          account_name: string | null
          bank_name: string | null
          account_number: string | null
          ifsc_code: string | null
          points_rate: number | null
          preset_amounts: number[] | null
          payment_instructions: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          upi_id?: string | null
          account_name?: string | null
          bank_name?: string | null
          account_number?: string | null
          ifsc_code?: string | null
          points_rate?: number | null
          preset_amounts?: number[] | null
          payment_instructions?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          upi_id?: string | null
          account_name?: string | null
          bank_name?: string | null
          account_number?: string | null
          ifsc_code?: string | null
          points_rate?: number | null
          preset_amounts?: number[] | null
          payment_instructions?: string | null
          created_at?: string
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      purchase_blue_tick: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type City = Database['public']['Tables']['cities']['Row']
export type Post = Database['public']['Tables']['posts']['Row']
export type PostLike = Database['public']['Tables']['post_likes']['Row']
export type PostComment = Database['public']['Tables']['post_comments']['Row']
export type Follow = Database['public']['Tables']['follows']['Row']
export type KycSubmission = Database['public']['Tables']['kyc_submissions']['Row']
export type PointsTransaction = Database['public']['Tables']['points_transactions']['Row']
export type PaymentRequest = Database['public']['Tables']['payment_requests']['Row']
export type WalletSettings = Database['public']['Tables']['wallet_settings']['Row']
