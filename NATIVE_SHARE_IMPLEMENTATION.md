# Native Share Implementation - Next Update

## Overview
The entire Next Update website runs inside a React Native WebView. All sharing functionality now uses the native mobile share sheet instead of just copying to clipboard.

## Architecture

### WebView Setup
- Website runs in `nextupdate-mobile-app/App.js`
- JavaScript variables injected: `window.isMobileApp=true; window.isNextUpdateApp=true;`
- Native share handler listens for `share` message type

### Share Flow
1. **Website** → User clicks share button
2. **mobileBridge.ts** → `shareContent()` function called
3. **Native Bridge** → `sendToNativeApp('share', data)` sends message
4. **React Native** → `handleMessage()` receives share message
5. **Native Share** → `Share.share()` opens native share sheet

## Updated Components

### 1. PostCard.tsx
```tsx
const handleShare = async () => {
  shareContent({
    title: `${post.profiles.name}'s post on Next Update`,
    text: post.caption || 'Check out this post!',
    url: `https://app.nextupdate.in/post/${post.id}`,
    image: post.media_urls[0]
  })
  // Always logs as 'native_share' channel
}
```

### 2. Profile Page
```tsx
const shareProfile = async () => {
  shareContent({
    title: `Join ${user?.name} on Next Update!`,
    text: `Use my referral code ${user?.referral_code} and get 100 points!`,
    url: `https://app.nextupdate.in/profile/${user?.id}`
  })
}
```

### 3. Referral Component
```tsx
const shareReferralLink = async () => {
  shareContent({
    title: 'Join Next Update',
    text: `Join me on Next Update! Use referral code: ${referralCode}`,
    url: APP_STORE_LINK
  })
}
```

## Native Share Handler (App.js)

```javascript
const handleShare = async (data) => {
  try {
    const shareOptions = {
      title: data.title || 'Share Content',
      message: data.text || data.url || 'Check this out!'
    };
    
    // Add URL if available
    if (data.url && data.text) {
      shareOptions.url = data.url;
    }
    
    const result = await Share.share(shareOptions);
    
    if (result.action === Share.sharedAction) {
      console.log('Content shared successfully');
    } else if (result.action === Share.dismissedAction) {
      console.log('Share dialog dismissed');
    }
  } catch (error) {
    console.error('Error sharing:', error);
    Alert.alert('Error', 'Failed to share content');
  }
};
```

## Benefits

### ✅ Native Feel
- Opens device's native share sheet
- Shares to installed apps (WhatsApp, Instagram, etc.)
- Follows platform UI guidelines

### ✅ Better UX
- No more copying to clipboard only
- Users can directly share to their favorite apps
- Consistent with other mobile apps

### ✅ Analytics
- All shares tracked as `native_share` channel
- Better insights into sharing behavior

## Testing

1. **Mobile App**: Share should open native share sheet
2. **Fallback**: If bridge fails, falls back to Web Share API
3. **Legacy**: Final fallback copies to clipboard

## Future Enhancements

- Add share analytics with success/dismiss tracking
- Support for sharing images/media files
- Custom share targets for specific apps
- Deep link handling for shared content