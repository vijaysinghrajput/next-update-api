# Link Preview Feature 🔗

## Overview
Instagram/Twitter-style link preview system that automatically detects URLs in post captions and shows rich previews.

## Features

### ✅ URL Detection
- Automatically extracts URLs from post captions using regex
- Supports `http://` and `https://` protocols

### ✅ Preview Types

#### 1. **YouTube Videos** 🎥
- Detects YouTube URLs (`youtube.com/watch?v=` or `youtu.be/`)
- Shows video thumbnail with play button overlay
- Clickable to open in new tab
- Displays channel name

#### 2. **Image URLs** 🖼️
- Detects direct image URLs (`.jpg`, `.png`, `.gif`, `.webp`, etc.)
- Shows image preview
- Clickable to open full size in new tab

#### 3. **Generic Links** 🌐
- Any other URL
- Shows domain name and formatted URL
- Clickable badge or card preview

### ✅ Clickable Links in Text
- All URLs in caption are automatically converted to clickable links
- Blue color with hover effect
- Opens in new tab with `noopener noreferrer` for security

## Usage

### Post with YouTube Link
```
Caption: "Check out this amazing video! https://www.youtube.com/watch?v=dQw4w9WgXcQ"

Result:
- Caption shows with clickable blue link
- Rich preview card with video thumbnail and play button
- Click anywhere on card to open YouTube in new tab
```

### Post with Website Link
```
Caption: "Visit our website https://example.com for more info"

Result:
- Clickable link in caption
- Compact badge or card preview showing domain
- Opens in new tab when clicked
```

### Post with Multiple Links
```
Caption: "Resources: https://example.com https://youtube.com/watch?v=xyz"

Result:
- Both links clickable in caption
- Both link previews shown below caption
- Each opens in separate new tab
```

## Components

### 1. **LinkPreview.tsx**
Main component for rendering link previews
- Props: `preview: LinkPreviewData`, `compact?: boolean`
- Handles YouTube, images, and generic links
- Smooth animations with Framer Motion

### 2. **LinkifiedText.tsx**
Converts plain text URLs into clickable links
- Props: `text: string`, `className?: string`
- Preserves text around URLs
- Security: uses `noopener noreferrer`

### 3. **linkPreview.ts** (Utils)
Utility functions for URL parsing
- `extractUrls()` - Extract all URLs from text
- `isYouTubeUrl()` - Check if URL is YouTube
- `getYouTubeId()` - Extract video ID
- `getLinkPreview()` - Generate preview data
- `formatUrl()` - Format URL for display

## Technical Details

### URL Regex
```javascript
const urlRegex = /(https?:\/\/[^\s]+)/g
```

### YouTube Detection
```javascript
/(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/
```

### Security
- All external links use `target="_blank"`
- `rel="noopener noreferrer"` prevents security issues
- `e.stopPropagation()` prevents event bubbling

### Performance
- Previews generated on client-side (no API calls)
- Lazy loading for images
- Error handling for failed image loads

## Styling

### CSS Classes
- `.link-preview-card` - Main card with hover effects
- `.link-preview-image` - Image with scale animation on hover
- `.line-clamp-1/2/3` - Text truncation utilities

### Hover Effects
- Card lifts up slightly (`translateY(-2px)`)
- Shadow intensifies
- Images scale to 105%
- Smooth transitions (0.2-0.3s)

## Future Enhancements

### 🚀 Planned Features
1. **Open Graph API** - Fetch real metadata (title, description, image)
2. **Twitter Card Support** - Detect and show Twitter embeds
3. **Instagram Post Embeds** - Show Instagram post previews
4. **Spotify Links** - Audio player preview
5. **Link Preview Cache** - Store fetched metadata in database
6. **Admin Controls** - Enable/disable link previews per city

### 🔧 Technical Improvements
1. Server-side metadata fetching with caching
2. Rate limiting for external API calls
3. Fallback images for failed loads
4. Video preview for uploaded videos (not just YouTube)

## Testing

### Test URLs

**YouTube:**
- `https://www.youtube.com/watch?v=dQw4w9WgXcQ`
- `https://youtu.be/dQw4w9WgXcQ`

**Images:**
- `https://via.placeholder.com/600/400`

**Generic:**
- `https://google.com`
- `https://github.com/microsoft/vscode`

### Test Cases
1. ✅ Single YouTube link in caption
2. ✅ Multiple links in one caption
3. ✅ Mixed YouTube + website links
4. ✅ Link at start/middle/end of text
5. ✅ Long URLs (should truncate in compact mode)
6. ✅ Invalid/broken image URLs (should fallback gracefully)

## Browser Support
- ✅ Chrome/Edge (latest)
- ✅ Safari (latest)
- ✅ Firefox (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

## Accessibility
- Clickable links have proper hover states
- Color contrast meets WCAG standards
- Keyboard navigation supported
- Screen reader friendly (proper aria labels can be added)
