# Native Mobile App Integration - Complete Guide

## Overview
This document explains how the Next.js website and React Native mobile app work together seamlessly to provide a native mobile experience.

## Architecture

### Website Side (`src/utils/mobileBridge.ts`)
- **Detects** when running in mobile app
- **Communicates** with React Native via `postMessage`
- **Enhances** file uploads, phone calls, WhatsApp, and external links
- **Auto-initializes** when loaded in mobile app

### Mobile App Side (`App.js`)
- **Listens** for messages from website
- **Handles** native features (camera, gallery, phone, WhatsApp)
- **Sends** file data back to website
- **Opens** external links in system browser

## Features Implemented

### 1. **File Upload (Images & Videos)** 📸🎥
**How it works:**
1. User clicks file input on website
2. Website detects mobile app and intercepts click
3. Sends `file_upload_request` message to native app
4. Native app shows "Camera" or "Gallery" options
5. User selects media (supports multiple files)
6. Native app sends file URIs back to website
7. Website fetches files and converts to File objects
8. Files are uploaded to R2 storage normally

**Supported:**
- Single or multiple file selection
- Images (jpg, png, gif, webp)
- Videos (mp4, mov, avi, mkv, webm)
- Camera capture
- Gallery selection
- Up to 5 files at once

### 2. **Phone Calls** 📞
**How it works:**
1. User clicks phone link (`tel:` or phone number)
2. Website detects mobile app
3. Sends `phone_call` message with phone number
4. Native app opens phone dialer

**Usage:**
```html
<a href="tel:+919876543210">Call</a>
<!-- or -->
<button onclick="makePhoneCall('9876543210')">Call</button>
```

### 3. **WhatsApp** 💬
**How it works:**
1. User clicks WhatsApp link or button
2. Website detects mobile app
3. Sends `whatsapp` message with phone number
4. Native app opens WhatsApp (or WhatsApp Web if not installed)

**Usage:**
```html
<a href="https://wa.me/919876543210">WhatsApp</a>
<!-- or -->
<button onclick="openWhatsApp('9876543210', 'Hello!')">WhatsApp</button>
```

### 4. **External Links** 🔗
**How it works:**
1. User clicks external link (not same origin)
2. Website detects mobile app
3. Sends `external_link` message
4. Native app opens link in system browser

**Auto-detected:**
- Links with `target="_blank"`
- Links with `data-external` attribute
- Any link not from same origin

### 5. **Share Content** 📤
**How it works:**
1. Website calls `shareContent()` function
2. Sends `share` message to native app
3. Native app shows system share sheet

**Usage:**
```javascript
shareContent({
  title: 'Check this out!',
  text: 'Amazing content',
  url: 'https://example.com',
  image: 'https://example.com/image.jpg'
})
```

## Message Types

### Website → Mobile App

| Message Type | Data | Description |
|-------------|------|-------------|
| `file_upload_request` | `{ accept, multiple, maxFiles, requestId }` | Request file selection |
| `phone_call` | `{ phone }` | Make phone call |
| `whatsapp` | `{ phone, message? }` | Open WhatsApp |
| `external_link` | `{ url }` | Open in browser |
| `share` | `{ title?, text?, url?, image? }` | Share content |
| `app_ready` | `{ url, path }` | App loaded |
| `route_change` | `{ url, path }` | Route changed |

### Mobile App → Website

| Message Type | Data | Description |
|-------------|------|-------------|
| `file_selected` | `{ requestId, files[], canceled?, error? }` | File selection result |
| `alert` | `{ message }` | Show alert |

## Integration Points

### Website Initialization
The mobile bridge is automatically initialized when the website loads:
```typescript
// src/lib/providers.tsx
import '../utils/mobileBridge' // Auto-initializes
```

### Mobile App Configuration
The mobile app is configured to:
- Load `https://next-update.skyablyitsolution.com`
- Enable JavaScript and DOM storage
- Support cookies for authentication
- Handle all message types

## Testing Checklist

### File Upload
- [ ] Single image upload from camera
- [ ] Single image upload from gallery
- [ ] Multiple images upload (up to 5)
- [ ] Video upload from camera
- [ ] Video upload from gallery
- [ ] Mixed image/video upload
- [ ] Cancel file selection
- [ ] Permission denied handling

### Phone & WhatsApp
- [ ] Phone link opens dialer
- [ ] WhatsApp link opens WhatsApp app
- [ ] WhatsApp with message opens correctly
- [ ] Fallback to WhatsApp Web if app not installed

### External Links
- [ ] External links open in browser
- [ ] Internal links stay in WebView
- [ ] Links with target="_blank" work correctly

### Share
- [ ] Share button works
- [ ] Share with title, text, URL
- [ ] Share with image

## Troubleshooting

### File Upload Not Working
1. Check if `isMobileApp()` returns `true`
2. Check browser console for errors
3. Verify `ReactNativeWebView` is available
4. Check file permissions in mobile app

### Phone/WhatsApp Not Working
1. Verify phone number format
2. Check if app has permission to open URLs
3. Test with `tel:` and `whatsapp://` URLs directly

### External Links Not Opening
1. Verify link is external (not same origin)
2. Check if link has `target="_blank"` or `data-external`
3. Verify WebView allows external navigation

## Code Examples

### Detect Mobile App
```typescript
import { isMobileApp } from '@/utils/mobileBridge'

if (isMobileApp()) {
  // Running in mobile app
}
```

### Request File Upload
```typescript
import { requestNativeFileUpload } from '@/utils/mobileBridge'

const files = await requestNativeFileUpload('image/*', true, 5)
// files is an array of File objects
```

### Make Phone Call
```typescript
import { makePhoneCall } from '@/utils/mobileBridge'

makePhoneCall('9876543210')
```

### Open WhatsApp
```typescript
import { openWhatsApp } from '@/utils/mobileBridge'

openWhatsApp('9876543210', 'Hello!')
```

### Share Content
```typescript
import { shareContent } from '@/utils/mobileBridge'

shareContent({
  title: 'Check this out!',
  text: 'Amazing post',
  url: window.location.href
})
```

## Benefits

1. **Native Feel**: Uses native camera, gallery, phone, WhatsApp
2. **Better UX**: Seamless integration between web and native
3. **Performance**: Native file pickers are faster
4. **Accessibility**: Works with system permissions
5. **Cross-platform**: Works on both iOS and Android

## Future Enhancements

- [ ] Push notifications
- [ ] Biometric authentication
- [ ] Location services
- [ ] In-app purchases
- [ ] Offline support
- [ ] Background sync

