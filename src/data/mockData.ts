import type { Profile, City, Post, PostComment, PointsTransaction, PaymentRequest, KycSubmission } from '@/lib/supabase';
import { PostMediaType, KycStatus, PaymentStatus, PointsTransactionType } from '@/types/enums';

// Mock cities data
export const mockCities: City[] = [
  { id: '1', name: 'Mumbai', state: 'Maharashtra', is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: '2', name: 'Delhi', state: 'Delhi', is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: '3', name: 'Bangalore', state: 'Karnataka', is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: '4', name: 'Hyderabad', state: 'Telangana', is_active: true, created_at: '2024-01-01T00:00:00Z' },
  { id: '5', name: 'Chennai', state: 'Tamil Nadu', is_active: true, created_at: '2024-01-01T00:00:00Z' }
];

// ... existing code ...

// Mock current user profile
export const mockCurrentUser: Profile = {
  id: 'user-1',
  email: 'user@example.com',
  name: 'John Doe',
  phone: '+919876543210',
  city_id: '1',
  avatar_url: 'https://i.pravatar.cc/150?img=1',
  points_balance: 2500,
  is_verified: true,
  has_blue_tick: true,
  referral_code: 'JOHN2024',
  referred_by: null,
  created_at: '2024-01-15T00:00:00Z',
  updated_at: '2024-01-20T00:00:00Z'
};

// ... existing code ...

// Mock other users
export const mockUsers: Profile[] = [
  {
    id: 'user-2',
    email: 'jane@example.com',
    name: 'Jane Smith',
    phone: '+919876543211',
    city_id: '1',
    avatar_url: 'https://i.pravatar.cc/150?img=2',
    points_balance: 1800,
    is_verified: true,
    has_blue_tick: false,
    referral_code: 'JANE2024',
    referred_by: null,
    created_at: '2024-01-10T00:00:00Z',
    updated_at: '2024-01-18T00:00:00Z'
  },
  {
    id: 'user-3',
    email: 'mike@example.com',
    name: 'Mike Johnson',
    phone: '+919876543212',
    city_id: '2',
    avatar_url: 'https://i.pravatar.cc/150?img=3',
    points_balance: 3200,
    is_verified: true,
    has_blue_tick: true,
    referral_code: 'MIKE2024',
    referred_by: 'user-1',
    created_at: '2024-01-05T00:00:00Z',
    updated_at: '2024-01-19T00:00:00Z'
  },
  {
    id: 'user-4',
    email: 'sarah@example.com',
    name: 'Sarah Williams',
    phone: '+919876543213',
    city_id: '3',
    avatar_url: 'https://i.pravatar.cc/150?img=4',
    points_balance: 950,
    is_verified: false,
    has_blue_tick: false,
    referral_code: 'SARAH2024',
    referred_by: 'user-2',
    created_at: '2024-01-12T00:00:00Z',
    updated_at: '2024-01-17T00:00:00Z'
  }
];

// ... existing code ...

// Mock posts
export const mockPosts: Post[] = [
  {
    id: 'post-1',
    user_id: 'user-2',
    city_id: '1',
    title: null,
    caption: 'Beautiful sunset at Marine Drive! 🌅 #Mumbai #Sunset',
    media_urls: ['https://images.unsplash.com/photo-1494548162494-384bba4ab999?w=800'],
    media_type: PostMediaType.IMAGE as 'image',
    likes_count: 245,
    comments_count: 18,
    shares_count: 12,
    is_active: true,
    created_at: '2024-01-20T18:30:00Z',
    updated_at: '2024-01-20T18:30:00Z'
  },
  {
    id: 'post-2',
    user_id: 'user-3',
    city_id: '2',
    title: null,
    caption: 'Street food heaven! Best chaat in Delhi 🍲',
    media_urls: ['https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800', 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=800'],
    media_type: PostMediaType.IMAGE as 'image',
    likes_count: 189,
    comments_count: 24,
    shares_count: 8,
    is_active: true,
    created_at: '2024-01-20T16:15:00Z',
    updated_at: '2024-01-20T16:15:00Z'
  },
  {
    id: 'post-3',
    user_id: 'user-1',
    city_id: '1',
    title: null,
    caption: 'Morning vibes at Gateway of India ☀️',
    media_urls: ['https://images.unsplash.com/photo-1566552881560-0be862a7c445?w=800'],
    media_type: PostMediaType.IMAGE as 'image',
    likes_count: 312,
    comments_count: 31,
    shares_count: 15,
    is_active: true,
    created_at: '2024-01-20T08:45:00Z',
    updated_at: '2024-01-20T08:45:00Z'
  },
  {
    id: 'post-4',
    user_id: 'user-4',
    city_id: '3',
    title: null,
    caption: 'Tech park life in Bangalore 💻 #WorkLife',
    media_urls: ['https://images.unsplash.com/photo-1497366216548-37526070297c?w=800'],
    media_type: PostMediaType.IMAGE as 'image',
    likes_count: 156,
    comments_count: 12,
    shares_count: 5,
    is_active: true,
    created_at: '2024-01-19T14:20:00Z',
    updated_at: '2024-01-19T14:20:00Z'
  }
];

// ... existing code ...

// Mock comments
export const mockComments: PostComment[] = [
  {
    id: 'comment-1',
    post_id: 'post-1',
    user_id: 'user-1',
    content: 'Stunning view! 😍',
    created_at: '2024-01-20T19:00:00Z',
    updated_at: '2024-01-20T19:00:00Z'
  },
  {
    id: 'comment-2',
    post_id: 'post-1',
    user_id: 'user-3',
    content: 'Marine Drive never disappoints!',
    created_at: '2024-01-20T19:15:00Z',
    updated_at: '2024-01-20T19:15:00Z'
  }
];

// ... existing code ...

// Mock points transactions
export const mockTransactions: PointsTransaction[] = [
  {
    id: 'txn-1',
    user_id: 'user-1',
    type: PointsTransactionType.EARNED as 'earned',
    amount: 100,
    description: 'Signup bonus',
    reference_id: null,
    activity: 'Signup Bonus',
    created_at: '2024-01-15T00:00:00Z'
  },
  {
    id: 'txn-2',
    user_id: 'user-1',
    type: PointsTransactionType.EARNED as 'earned',
    amount: 50,
    description: 'Post liked by 50 users',
    reference_id: 'post-3',
    activity: 'Engagement Reward',
    created_at: '2024-01-20T09:00:00Z'
  },
  {
    id: 'txn-3',
    user_id: 'user-1',
    type: PointsTransactionType.SPENT as 'spent',
    amount: -2000,
    description: 'Blue tick purchase',
    reference_id: null,
    activity: 'Blue Tick Purchase',
    created_at: '2024-01-18T12:00:00Z'
  },
  {
    id: 'txn-4',
    user_id: 'user-1',
    type: PointsTransactionType.ADMIN_CREDIT as 'admin_credit',
    amount: 500,
    description: 'Bonus points from admin',
    reference_id: null,
    activity: 'Admin Bonus',
    created_at: '2024-01-17T10:00:00Z'
  }
];

// ... existing code ...

// Mock payment requests
export const mockPaymentRequests: PaymentRequest[] = [
  {
    id: 'payment-1',
    user_id: 'user-1',
    amount: 1000,
    screenshot_url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400',
    status: PaymentStatus.PENDING as 'pending',
    admin_notes: null,
    processed_by: null,
    created_at: '2024-01-20T10:00:00Z',
    updated_at: '2024-01-20T10:00:00Z'
  },
  {
    id: 'payment-2',
    user_id: 'user-1',
    amount: 500,
    screenshot_url: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400',
    status: PaymentStatus.APPROVED as 'approved',
    admin_notes: 'Verified and approved',
    processed_by: 'admin-1',
    created_at: '2024-01-15T14:00:00Z',
    updated_at: '2024-01-15T16:00:00Z'
  }
];

// ... existing code ...

// Mock KYC submission
export const mockKycSubmission: KycSubmission = {
  id: 'kyc-1',
  user_id: 'user-1',
  aadhar_front_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400',
  aadhar_back_url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400',
  status: KycStatus.VERIFIED as 'verified',
  rejection_reason: null,
  verified_by: 'admin-1',
  created_at: '2024-01-16T10:00:00Z',
  updated_at: '2024-01-16T15:00:00Z'
};

// Mock root props for components
export const mockRootProps = {
  currentUser: mockCurrentUser,
  selectedCity: mockCities[0],
  posts: mockPosts,
  users: mockUsers,
  cities: mockCities
};