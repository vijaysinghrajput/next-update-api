# Next Update - Native Mobile App Complete Guide

## 📋 Project Overview

Building a full-featured React Native app that replicates all Next Update website features (excluding admin) with optimal performance, smooth UX, and offline-first architecture.

---

## 🎯 Core Features to Implement

### 1. **Authentication System**
- **Email/Password Authentication**
  - Email verification required
  - Password reset flow
  - Session management
  
- **Google OAuth**
  - Native implementation using `expo-web-browser` and `expo-auth-session`
  - Proper token handling
  - Seamless user experience

- **Profile Setup**
  - City selection during signup
  - Referral code input (optional)
  - Auto-generated unique referral codes

### 2. **Posts Feed**
- **Infinite Scroll Feed**
  - Load 10 posts per page
  - Optimized with FlashList
  - Pull-to-refresh
  - City-based filtering
  
- **Post Features**
  - Like/unlike posts
  - Comment on posts
  - Share posts (native share sheet)
  - View post details
  - Media carousel (images/videos)
  - Auto-play videos in viewport

### 3. **Trending Section**
- Posts from last 7 days
- Sorted by engagement (likes + comments + shares)
- City-filtered
- Separate tab/screen

### 4. **Create Post**
- **Text Content**
  - Title (optional, auto-generated from first 12 words)
  - Caption (max 2000 words)
  - Word count indicator
  
- **Media Upload**
  - Image/video selection using `expo-image-picker`
  - Max 5 media items
  - Max 10MB per file
  - Upload to Cloudflare R2
  - Preview before posting
  - Media type detection (image/video)
  
- **Validations**
  - Must have content OR media
  - City selection required
  - File size validation
  - File type validation

### 5. **User Profiles**
- **Profile Display**
  - Avatar (with fallback)
  - Name, bio, city
  - Verification badges (green checkmark, blue tick)
  - Stats: followers, following, posts, points
  - User's posts grid
  
- **Profile Editing**
  - Avatar upload
  - Name, phone, city editing
  - Bio editing
  
- **Follow System**
  - Follow/unfollow users
  - View followers/following lists

### 6. **Wallet & Referral System**
- **Wallet Display**
  - Current points balance
  - Transaction history
  - Points breakdown by category
  
- **Earning Activities**
  - Post creation: points reward
  - Post likes: points reward
  - Post comments: points reward
  - Post shares: points reward
  - App shares: points reward
  - Daily check-in: points reward
  - Referral bonuses: 100 points for both users
  
- **Referral Features**
  - Copy referral code
  - Share referral link (native share)
  - Track total referrals
  - View referral earnings

### 7. **Explore Page**
- **Tabs**
  - Trending posts
  - Suggested users to follow
  
- **Search**
  - Search posts, people, tags
  - Real-time search results
  
- **User Suggestions**
  - Users you don't follow
  - Sorted by followers/posts
  - Quick follow button

### 8. **Comments System**
- View all comments on a post
- Add new comments
- Delete own comments
- Comment count display
- Real-time comment updates

### 9. **Navigation**
- **Bottom Tab Navigation**
  - Home (feed)
  - Explore
  - Create Post (center button, styled)
  - Notifications (future)
  - Profile
  
- **Stack Navigation**
  - Post details
  - User profiles
  - Edit profile
  - Wallet details
  - Settings

### 10. **City Selection**
- Persistent city selection
- Filter all feeds by selected city
- City list from database
- Easy city switching

---

## 🛠 Recommended Tech Stack

### **Core Framework**
```json
{
  "expo": "~54.0.0",
  "react-native": "0.76.x",
  "expo-router": "~4.x"
}
```

### **State Management**
```json
{
  "@tanstack/react-query": "^5.62.11",
  "zustand": "^5.0.2",
  "@react-native-async-storage/async-storage": "^2.1.0"
}
```

**Why Zustand + React Query?**
- **Zustand**: Lightweight global state (auth, city, user preferences)
- **React Query**: Server state, caching, infinite scroll, optimistic updates
- **AsyncStorage**: Persist auth tokens, city selection, offline data

### **Backend & Database**
```json
{
  "@supabase/supabase-js": "^2.48.1",
  "react-native-url-polyfill": "^2.0.0"
}
```

### **UI & Performance**
```json
{
  "@shopify/flash-list": "^1.7.2",
  "react-native-reanimated": "~3.16.5",
  "react-native-gesture-handler": "~2.21.2",
  "expo-image": "~2.0.3",
  "expo-linear-gradient": "~14.0.1",
  "expo-blur": "~14.0.1"
}
```

**Why FlashList?**
- 10x better performance than FlatList
- Optimized memory usage
- Smooth scrolling with large datasets
- Built-in blank cell optimization

**Why Expo Image?**
- Better caching than React Native Image
- Blurhash support
- Priority loading
- Memory efficient

### **Forms & Validation**
```json
{
  "react-hook-form": "^7.54.2",
  "zod": "^3.24.1",
  "@hookform/resolvers": "^3.9.1"
}
```

**Why React Hook Form?**
- Minimal re-renders
- Easy validation with Zod
- Great TypeScript support
- Small bundle size

### **Media & File Handling**
```json
{
  "expo-image-picker": "~16.0.4",
  "expo-document-picker": "~12.0.2",
  "expo-video": "~2.1.2",
  "expo-media-library": "~17.0.3",
  "react-native-image-crop-picker": "^0.41.3"
}
```

### **Authentication**
```json
{
  "expo-web-browser": "~14.0.1",
  "expo-auth-session": "~6.0.2",
  "expo-linking": "~7.0.3"
}
```

### **Native Features**
```json
{
  "expo-sharing": "~13.0.2",
  "expo-haptics": "~14.0.0",
  "expo-notifications": "~0.29.13",
  "expo-status-bar": "~2.0.0",
  "expo-splash-screen": "~0.29.16"
}
```

### **Utilities**
```json
{
  "date-fns": "^4.1.0",
  "react-native-svg": "~15.9.0",
  "expo-constants": "~17.0.3"
}
```

---

## 📁 Folder Structure

```
expo-native-app-v2/
├── app/                          # Expo Router screens
│   ├── (auth)/                   # Auth group (no tabs)
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   ├── forgot-password.tsx
│   │   └── verify-email.tsx
│   ├── (tabs)/                   # Main app tabs
│   │   ├── _layout.tsx           # Tab navigator
│   │   ├── index.tsx             # Home feed
│   │   ├── explore.tsx           # Explore page
│   │   ├── create.tsx            # Create post
│   │   ├── notifications.tsx     # Notifications (future)
│   │   └── profile.tsx           # User profile
│   ├── post/
│   │   └── [id].tsx              # Post details
│   ├── user/
│   │   └── [id].tsx              # User profile
│   ├── wallet/
│   │   ├── index.tsx             # Wallet overview
│   │   └── transactions.tsx      # Transaction history
│   ├── settings/
│   │   ├── index.tsx             # Settings menu
│   │   ├── edit-profile.tsx      # Edit profile
│   │   └── change-city.tsx       # Change city
│   ├── _layout.tsx               # Root layout
│   └── index.tsx                 # Entry point
├── src/
│   ├── components/
│   │   ├── post/
│   │   │   ├── PostCard.tsx      # Single post card
│   │   │   ├── PostMediaCarousel.tsx
│   │   │   ├── PostActions.tsx   # Like, comment, share buttons
│   │   │   ├── PostList.tsx      # FlashList wrapper
│   │   │   └── CreatePostForm.tsx
│   │   ├── profile/
│   │   │   ├── ProfileHeader.tsx
│   │   │   ├── ProfileStats.tsx
│   │   │   ├── EditProfileForm.tsx
│   │   │   └── UserPostsGrid.tsx
│   │   ├── wallet/
│   │   │   ├── PointsBalance.tsx
│   │   │   ├── TransactionList.tsx
│   │   │   └── ReferralCard.tsx
│   │   ├── common/
│   │   │   ├── Avatar.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Spinner.tsx
│   │   │   ├── EmptyState.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   ├── auth/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── GoogleAuthButton.tsx
│   │   └── navigation/
│   │       └── TabBar.tsx        # Custom tab bar
│   ├── hooks/
│   │   ├── auth/
│   │   │   ├── useAuth.ts        # Auth state & actions
│   │   │   └── useGoogleAuth.ts  # Google OAuth flow
│   │   ├── posts/
│   │   │   ├── useInfinitePosts.ts
│   │   │   ├── useInfiniteTrending.ts
│   │   │   ├── useCreatePost.ts
│   │   │   ├── useLikePost.ts
│   │   │   ├── useDeletePost.ts
│   │   │   └── usePostComments.ts
│   │   ├── profile/
│   │   │   ├── useProfile.ts
│   │   │   ├── useUpdateProfile.ts
│   │   │   └── useFollowUser.ts
│   │   ├── wallet/
│   │   │   ├── useWallet.ts
│   │   │   ├── useTransactions.ts
│   │   │   └── useReferralData.ts
│   │   ├── explore/
│   │   │   ├── useTrendingPosts.ts
│   │   │   └── useSuggestedUsers.ts
│   │   └── common/
│   │       ├── useImageUpload.ts
│   │       ├── useDebounce.ts
│   │       └── useOfflineStatus.ts
│   ├── stores/
│   │   ├── authStore.ts          # Zustand: auth state
│   │   ├── cityStore.ts          # Zustand: selected city
│   │   └── uiStore.ts            # Zustand: UI preferences
│   ├── lib/
│   │   ├── supabase.ts           # Supabase client config
│   │   ├── queryClient.ts        # React Query config
│   │   ├── r2-storage.ts         # Cloudflare R2 upload
│   │   └── validation.ts         # Zod schemas
│   ├── types/
│   │   ├── post.ts
│   │   ├── user.ts
│   │   ├── wallet.ts
│   │   └── database.ts           # Supabase types
│   ├── utils/
│   │   ├── formatters.ts         # Date, number formatting
│   │   ├── constants.ts          # App constants
│   │   └── helpers.ts            # Utility functions
│   └── theme/
│       ├── colors.ts
│       ├── spacing.ts
│       ├── typography.ts
│       └── index.ts
├── assets/
│   ├── images/
│   ├── icons/
│   └── fonts/
├── app.json
├── package.json
└── tsconfig.json
```

---

## 🏗 Architecture Patterns

### **1. Offline-First Architecture**

```typescript
// src/lib/queryClient.ts
import { QueryClient } from '@tanstack/react-query'
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { persistQueryClient } from '@tanstack/react-query-persist-client'
import AsyncStorage from '@react-native-async-storage/async-storage'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 hours
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
  },
})

const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'REACT_QUERY_OFFLINE_CACHE',
})

persistQueryClient({
  queryClient,
  persister: asyncStoragePersister,
  maxAge: 1000 * 60 * 60 * 24, // 24 hours
})
```

### **2. Optimistic Updates Pattern**

```typescript
// src/hooks/posts/useLikePost.ts
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export function useLikePost() {
  const queryClient = useQueryClient()
  const userId = useAuthStore((state) => state.user?.id)

  return useMutation({
    mutationFn: async ({ postId, isLiked }: { postId: string; isLiked: boolean }) => {
      if (isLiked) {
        // Unlike
        await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId)
      } else {
        // Like
        await supabase.from('post_likes').insert({ post_id: postId, user_id: userId })
      }
    },
    onMutate: async ({ postId, isLiked }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['posts'] })

      // Snapshot previous value
      const previousPosts = queryClient.getQueryData(['posts', 'infinite'])

      // Optimistically update
      queryClient.setQueriesData({ queryKey: ['posts'] }, (old: any) => {
        if (!old?.pages) return old
        return {
          ...old,
          pages: old.pages.map((page: any) => ({
            ...page,
            data: page.data.map((post: any) =>
              post.id === postId
                ? {
                    ...post,
                    is_liked: !isLiked,
                    likes_count: isLiked ? post.likes_count - 1 : post.likes_count + 1,
                  }
                : post
            ),
          })),
        }
      })

      return { previousPosts }
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousPosts) {
        queryClient.setQueryData(['posts', 'infinite'], context.previousPosts)
      }
    },
    onSettled: () => {
      // Refetch after mutation
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })
}
```

### **3. Infinite Scroll with FlashList**

```typescript
// src/components/post/PostList.tsx
import { FlashList } from '@shopify/flash-list'
import { useInfinitePosts } from '@/hooks/posts/useInfinitePosts'
import PostCard from './PostCard'
import { RefreshControl, View, ActivityIndicator } from 'react-native'

export function PostList() {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
    isRefetching,
  } = useInfinitePosts()

  const posts = data?.pages.flatMap((page) => page.data) ?? []

  const renderItem = ({ item }) => <PostCard post={item} />

  const renderFooter = () => {
    if (!isFetchingNextPage) return null
    return (
      <View style={{ padding: 20 }}>
        <ActivityIndicator />
      </View>
    )
  }

  return (
    <FlashList
      data={posts}
      renderItem={renderItem}
      estimatedItemSize={500}
      keyExtractor={(item) => item.id}
      onEndReached={() => {
        if (hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      }}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
      ListFooterComponent={renderFooter}
    />
  )
}
```

### **4. Form Handling with React Hook Form + Zod**

```typescript
// src/lib/validation.ts
import { z } from 'zod'

export const createPostSchema = z
  .object({
    title: z.string().optional(),
    caption: z.string().max(2000, 'Caption must be under 2000 words').optional(),
    media: z
      .array(
        z.object({
          uri: z.string(),
          type: z.enum(['image', 'video']),
          size: z.number().max(10 * 1024 * 1024, 'File must be under 10MB'),
        })
      )
      .max(5, 'Maximum 5 media files allowed')
      .optional(),
    cityId: z.string().min(1, 'Please select a city'),
  })
  .refine(
    (data) => data.caption || (data.media && data.media.length > 0),
    'Post must have content or media'
  )

// src/components/post/CreatePostForm.tsx
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createPostSchema } from '@/lib/validation'

export function CreatePostForm() {
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createPostSchema),
  })

  const onSubmit = (data) => {
    // Handle post creation
  }

  return (
    <Controller
      control={control}
      name="caption"
      render={({ field: { onChange, value } }) => (
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder="What's happening?"
          multiline
          maxLength={2000}
        />
      )}
    />
  )
}
```

### **5. Image Upload to Cloudflare R2**

```typescript
// src/lib/r2-storage.ts
export async function uploadToR2(file: {
  uri: string
  type: string
  name: string
}): Promise<string> {
  const formData = new FormData()
  formData.append('file', {
    uri: file.uri,
    type: file.type,
    name: file.name,
  } as any)

  // Upload via Next.js API route
  const response = await fetch('https://app.nextupdate.in/api/upload', {
    method: 'POST',
    body: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  })

  const { url } = await response.json()
  return url
}

// src/hooks/common/useImageUpload.ts
import { useMutation } from '@tanstack/react-query'
import * as ImagePicker from 'expo-image-picker'
import { uploadToR2 } from '@/lib/r2-storage'

export function useImageUpload() {
  return useMutation({
    mutationFn: async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 5,
      })

      if (result.canceled) return []

      const uploads = await Promise.all(
        result.assets.map(async (asset) => {
          const url = await uploadToR2({
            uri: asset.uri,
            type: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
            name: `upload-${Date.now()}.${asset.type === 'video' ? 'mp4' : 'jpg'}`,
          })
          return { url, type: asset.type }
        })
      )

      return uploads
    },
  })
}
```

### **6. Zustand State Management**

```typescript
// src/stores/authStore.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { supabase } from '@/lib/supabase'

interface AuthState {
  user: User | null
  session: Session | null
  isAuthenticated: boolean
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  signUp: (email: string, password: string, data: any) => Promise<void>
  setUser: (user: User | null) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,

      signIn: async (email, password) => {
        set({ isLoading: true })
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (!error && data.user) {
          set({ user: data.user, session: data.session, isAuthenticated: true })
        }
        set({ isLoading: false })
      },

      signOut: async () => {
        await supabase.auth.signOut()
        set({ user: null, session: null, isAuthenticated: false })
      },

      signUp: async (email, password, userData) => {
        set({ isLoading: true })
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: userData },
        })
        set({ isLoading: false })
      },

      setUser: (user) => set({ user, isAuthenticated: !!user }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)

// src/stores/cityStore.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

interface CityState {
  selectedCity: string | null
  setCity: (city: string) => void
}

export const useCityStore = create<CityState>()(
  persist(
    (set) => ({
      selectedCity: null,
      setCity: (city) => set({ selectedCity: city }),
    }),
    {
      name: 'city-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
```

---

## 🎨 UI/UX Best Practices

### **1. Smooth Animations**
```typescript
import Animated, { FadeIn, SlideInRight } from 'react-native-reanimated'

<Animated.View entering={FadeIn} exiting={SlideInRight}>
  <PostCard post={post} />
</Animated.View>
```

### **2. Haptic Feedback**
```typescript
import * as Haptics from 'expo-haptics'

const handleLike = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  likeMutation.mutate()
}
```

### **3. Loading States**
```typescript
if (isLoading) return <Spinner />
if (error) return <ErrorState error={error} retry={refetch} />
if (!data) return <EmptyState />
```

### **4. Image Optimization**
```typescript
import { Image } from 'expo-image'

<Image
  source={{ uri: post.media_urls[0] }}
  contentFit="cover"
  transition={200}
  placeholder={blurhash}
  cachePolicy="memory-disk"
/>
```

---

## 🚀 Performance Optimizations

1. **Use FlashList** instead of FlatList for all lists
2. **Memoize expensive components** with `React.memo`
3. **Use Expo Image** for better caching
4. **Implement pagination** (10 items per page)
5. **Lazy load images** with blurhash placeholders
6. **Optimize bundle size** with Hermes engine
7. **Enable New Architecture** for better performance
8. **Use native navigation** (expo-router)
9. **Implement code splitting** for large screens
10. **Use production builds** for testing

---

## 📦 Installation Commands

```bash
# Navigate to project
cd expo-native-app-v2

# Install all dependencies
npx expo install @supabase/supabase-js react-native-url-polyfill
npx expo install @tanstack/react-query zustand
npx expo install @react-native-async-storage/async-storage
npx expo install @shopify/flash-list
npx expo install react-native-reanimated react-native-gesture-handler
npx expo install expo-image expo-linear-gradient expo-blur
npx expo install react-hook-form zod @hookform/resolvers
npx expo install expo-image-picker expo-document-picker expo-video
npx expo install expo-web-browser expo-auth-session expo-linking
npx expo install expo-sharing expo-haptics expo-notifications
npx expo install date-fns react-native-svg
npx expo install @tanstack/query-async-storage-persister
npx expo install @tanstack/react-query-persist-client
```

---

## 🔐 Environment Variables

Create `.env` file:

```bash
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_API_URL=https://app.nextupdate.in
EXPO_PUBLIC_R2_UPLOAD_URL=https://app.nextupdate.in/api/upload
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

---

## 📝 Key Database Tables

### **profiles**
```sql
- id (uuid, PK)
- name (text)
- email (text)
- avatar_url (text)
- bio (text)
- city_id (uuid, FK)
- is_verified (boolean)
- has_blue_tick (boolean)
- points_balance (integer)
- referral_code (text, unique)
- referred_by (uuid, FK)
- followers_count (integer)
- following_count (integer)
- posts_count (integer)
```

### **posts**
```sql
- id (uuid, PK)
- user_id (uuid, FK)
- title (text)
- caption (text)
- media_urls (text[])
- media_type (enum: image|video)
- city_id (uuid, FK)
- likes_count (integer)
- comments_count (integer)
- shares_count (integer)
- is_active (boolean)
- created_at (timestamp)
```

### **post_likes**
```sql
- id (uuid, PK)
- post_id (uuid, FK)
- user_id (uuid, FK)
- created_at (timestamp)
- UNIQUE(post_id, user_id)
```

### **comments**
```sql
- id (uuid, PK)
- post_id (uuid, FK)
- user_id (uuid, FK)
- content (text)
- created_at (timestamp)
```

### **follows**
```sql
- id (uuid, PK)
- follower_id (uuid, FK)
- following_id (uuid, FK)
- created_at (timestamp)
- UNIQUE(follower_id, following_id)
```

### **points_transactions**
```sql
- id (uuid, PK)
- user_id (uuid, FK)
- amount (integer)
- type (enum: earned|spent)
- activity (text)
- description (text)
- created_at (timestamp)
```

### **cities**
```sql
- id (uuid, PK)
- name (text, unique)
- state (text)
- country (text)
```

---

## 🎯 Development Workflow

### **Phase 1: Core Setup** (Week 1)
- [ ] Set up Expo project with TypeScript
- [ ] Configure Supabase client
- [ ] Set up React Query with persistence
- [ ] Create Zustand stores (auth, city)
- [ ] Set up expo-router navigation
- [ ] Create theme system

### **Phase 2: Authentication** (Week 1-2)
- [ ] Email/password login & signup
- [ ] Google OAuth integration
- [ ] Email verification flow
- [ ] Password reset
- [ ] Auth persistence with AsyncStorage
- [ ] Protected routes

### **Phase 3: Posts Feed** (Week 2-3)
- [ ] Infinite scroll posts feed with FlashList
- [ ] PostCard component with media carousel
- [ ] Like/unlike functionality (optimistic updates)
- [ ] Pull-to-refresh
- [ ] City filtering
- [ ] Empty states & loading skeletons

### **Phase 4: Create Post** (Week 3)
- [ ] Create post form with validation
- [ ] Image/video picker (max 5 files)
- [ ] Upload to Cloudflare R2
- [ ] Media preview
- [ ] Title auto-generation
- [ ] Word count validation

### **Phase 5: User Profiles** (Week 4)
- [ ] User profile screen
- [ ] Profile editing
- [ ] Avatar upload
- [ ] User posts grid
- [ ] Follow/unfollow
- [ ] Followers/following lists

### **Phase 6: Comments & Engagement** (Week 4-5)
- [ ] Comments list
- [ ] Add comment
- [ ] Delete comment
- [ ] Share functionality (native share)
- [ ] Real-time updates

### **Phase 7: Trending & Explore** (Week 5)
- [ ] Trending posts (7-day window)
- [ ] Suggested users
- [ ] Search functionality
- [ ] Follow quick action

### **Phase 8: Wallet & Referrals** (Week 5-6)
- [ ] Wallet balance display
- [ ] Transaction history
- [ ] Points breakdown
- [ ] Referral code display
- [ ] Share referral link
- [ ] Referral tracking

### **Phase 9: Polish & Optimization** (Week 6-7)
- [ ] Add animations (react-native-reanimated)
- [ ] Haptic feedback
- [ ] Error handling
- [ ] Offline support
- [ ] Image optimization
- [ ] Performance testing
- [ ] Bug fixes

### **Phase 10: Testing & Deployment** (Week 7-8)
- [ ] End-to-end testing
- [ ] Performance profiling
- [ ] Build production APK/IPA
- [ ] Submit to app stores
- [ ] Monitor analytics

---

## 🔥 Quick Start Commands

```bash
# Start development server
npx expo start

# Run on iOS simulator
npx expo start --ios

# Run on Android emulator
npx expo start --android

# Clear cache and start
npx expo start --clear

# Build for production
eas build --platform android
eas build --platform ios

# Preview build
eas build --platform android --profile preview
```

---

## 📚 Additional Resources

- **Expo Docs**: https://docs.expo.dev
- **React Query**: https://tanstack.com/query/latest
- **Zustand**: https://github.com/pmndrs/zustand
- **FlashList**: https://shopify.github.io/flash-list
- **React Hook Form**: https://react-hook-form.com
- **Supabase**: https://supabase.com/docs

---

## ✅ Success Criteria

- [ ] All features from website working natively
- [ ] Smooth 60 FPS scrolling
- [ ] Fast app launch (< 2 seconds)
- [ ] Offline-first with data persistence
- [ ] Native feel (haptics, animations)
- [ ] < 50 MB app size
- [ ] Works on iOS & Android
- [ ] Production-ready code quality

---

**Built with ❤️ for Next Update Mobile**
