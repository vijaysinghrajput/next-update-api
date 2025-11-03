# Auto-Title Generation Fix 🔧

## Issue
When users posted content with URLs, the auto-generated title was including the full URLs, making titles messy and unreadable.

## Example Problem

**User Input:**
```
Check out this amazing video! https://www.youtube.com/watch?v=dQw4w9WgXcQ
It's really helpful for learning.
```

**Before Fix:**
```
Title: "Check out this amazing video! https://www.youtube.com/watch?v=dQw4w9WgXcQ It's really"
```
❌ Title includes the long URL

## Solution

**After Fix:**
```
Title: "Check out this amazing video! It's really helpful for learning."
```
✅ URLs are automatically removed from auto-generated title

## How It Works

### 1. **URL Detection**
```javascript
const urls = extractUrls(content)
```
Extracts all URLs (http/https) from the post content

### 2. **URL Removal**
```javascript
let textWithoutUrls = content
urls.forEach(url => {
  textWithoutUrls = textWithoutUrls.replace(url, '').trim()
})
```
Removes all detected URLs from the text

### 3. **Clean Title Generation**
```javascript
const autoTitle = textWithoutUrls
  .split(/\s+/)
  .filter(word => word.length > 0)
  .slice(0, 12)
  .join(' ')
```
Generates title from first 12 words (excluding URLs)

## Test Cases

### ✅ Test 1: YouTube Link
**Input:**
```
Amazing tutorial https://youtu.be/abc123 for beginners
```
**Auto Title:**
```
Amazing tutorial for beginners
```

### ✅ Test 2: Multiple Links
**Input:**
```
Resources: https://google.com and https://github.com are useful
```
**Auto Title:**
```
Resources: and are useful
```

### ✅ Test 3: Link at Start
**Input:**
```
https://example.com - Check this out!
```
**Auto Title:**
```
- Check this out!
```

### ✅ Test 4: Link in Middle
**Input:**
```
Hey check https://twitter.com/example this is cool
```
**Auto Title:**
```
Hey check this is cool
```

### ✅ Test 5: No Links
**Input:**
```
This is a normal post without any links
```
**Auto Title:**
```
This is a normal post without any links
```

### ✅ Test 6: Only Link
**Input:**
```
https://example.com
```
**Auto Title:**
```
(empty - no text to generate title from)
```

## User Experience

### Before Typing Title
1. User starts typing in content field
2. Auto-title generates from first 12 words (excluding URLs)
3. Title field shows generated text in real-time

### After Manual Edit
1. User clicks on title field and edits it
2. `titleEdited` flag is set to `true`
3. Auto-generation stops - user's custom title is preserved

### Title Field Placeholder
```
"Auto from content; you can edit"
```
Clearly indicates the auto-generation behavior

## Benefits

✅ **Cleaner Titles** - No messy URLs in post titles  
✅ **Better UX** - Titles are readable and make sense  
✅ **SEO Friendly** - Meaningful titles instead of random URLs  
✅ **Professional** - Posts look more polished  
✅ **Flexible** - Users can still manually edit if needed

## Technical Details

### Dependencies
- `extractUrls()` utility from `/utils/linkPreview.ts`
- Regex: `/(https?:\/\/[^\s]+)/g`

### Edge Cases Handled
- ✅ Multiple URLs in one post
- ✅ URLs at different positions (start/middle/end)
- ✅ Posts with only URLs (no text)
- ✅ Mixed URLs and text
- ✅ Special characters around URLs

### Performance
- O(n) complexity for URL extraction
- O(m) for URL removal (m = number of URLs)
- Minimal performance impact on typing

## Code Location
```
File: /src/app/create/page.tsx
Lines: 241-270 (onChange handler for TextArea)
```

## Related Features
- Link Preview (shows rich previews for URLs in posts)
- Linkified Text (makes URLs clickable in captions)
- URL Extraction utility (shared across features)
