# Vercel Deployment Guide 🚀

## Prerequisites
- ✅ GitHub repository created: `vijaysinghrajput/nextupdate-supabase`
- ✅ Code pushed to GitHub
- ✅ Vercel account (sign up at https://vercel.com)

---

## Quick Deploy (Recommended)

### Option 1: Deploy via Vercel Dashboard

1. **Go to Vercel Dashboard**
   ```
   https://vercel.com/new
   ```

2. **Import Git Repository**
   - Click "Import Project"
   - Select "Import Git Repository"
   - Choose `vijaysinghrajput/nextupdate-supabase`

3. **Configure Project**
   ```
   Framework Preset: Next.js
   Root Directory: ./
   Build Command: npm run build (auto-detected)
   Output Directory: .next (auto-detected)
   Install Command: npm install (auto-detected)
   ```

4. **Add Environment Variables**
   Click "Environment Variables" and add:
   
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://iuiyvteuleqknwkdeqde.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1aXl2dGV1bGVxa253a2RlcWRlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIxNTM3ODIsImV4cCI6MjA3NzcyOTc4Mn0.5HWVOhOPPdQ_eJQ6lP2BPzQjd_X-BzpVH52zXtS3TeQ
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1aXl2dGV1bGVxa253a2RlcWRlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjE1Mzc4MiwiZXhwIjoyMDc3NzI5NzgyfQ.RXEzI0KZNQSV4y3wXJRnqtP1JYYrZjKEJZd8QaLJRrM
   R2_ACCESS_KEY_ID=your_r2_access_key
   R2_SECRET_ACCESS_KEY=your_r2_secret_key
   R2_BUCKET_NAME=your_bucket_name
   R2_ENDPOINT=your_r2_endpoint
   R2_PUBLIC_URL=your_r2_public_url
   ```

5. **Deploy**
   - Click "Deploy"
   - Wait for build to complete (2-3 minutes)
   - Your app will be live at `https://your-project.vercel.app`

---

## Option 2: Deploy via Vercel CLI

### 1. Install Vercel CLI
```bash
npm i -g vercel
```

### 2. Login to Vercel
```bash
vercel login
```

### 3. Deploy
```bash
cd /Users/mac/Documents/2025/next-update
vercel
```

Follow the prompts:
```
? Set up and deploy "~/Documents/2025/next-update"? [Y/n] y
? Which scope do you want to deploy to? Your Account
? Link to existing project? [y/N] n
? What's your project's name? nextupdate-supabase
? In which directory is your code located? ./
```

### 4. Add Environment Variables
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add R2_ACCESS_KEY_ID
vercel env add R2_SECRET_ACCESS_KEY
vercel env add R2_BUCKET_NAME
vercel env add R2_ENDPOINT
vercel env add R2_PUBLIC_URL
```

### 5. Deploy to Production
```bash
vercel --prod
```

---

## Post-Deployment Setup

### 1. Configure Custom Domain (Optional)
```bash
vercel domains add yourdomain.com
```

### 2. Update Supabase Auth Redirect URLs
Go to Supabase Dashboard → Authentication → URL Configuration:
```
Site URL: https://your-project.vercel.app
Redirect URLs: 
  - https://your-project.vercel.app/auth/callback
  - https://your-project.vercel.app/**
```

### 3. Enable CORS in Supabase
Go to Supabase Dashboard → Settings → API:
```
Allowed Origins:
  - https://your-project.vercel.app
  - https://*.vercel.app (for preview deployments)
```

### 4. Update R2 CORS Policy
Add Vercel domain to R2 CORS configuration.

---

## Continuous Deployment

✅ **Automatic Deployments**
- Every push to `main` branch → Production deployment
- Every push to other branches → Preview deployment
- Every pull request → Preview deployment

✅ **Preview URLs**
Each deployment gets a unique URL:
```
Production: https://nextupdate-supabase.vercel.app
Preview: https://nextupdate-supabase-git-feature-vijaysinghrajput.vercel.app
```

---

## Environment Variables Checklist

### Required Variables:
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`

### Optional (for R2 storage):
- [ ] `R2_ACCESS_KEY_ID`
- [ ] `R2_SECRET_ACCESS_KEY`
- [ ] `R2_BUCKET_NAME`
- [ ] `R2_ENDPOINT`
- [ ] `R2_PUBLIC_URL`

---

## Troubleshooting

### Build Fails
```bash
# Check build locally first
npm run build

# If it works locally but fails on Vercel:
# 1. Check environment variables
# 2. Check Node.js version (should be 18.x or higher)
# 3. Check build logs on Vercel dashboard
```

### Environment Variables Not Working
```bash
# Redeploy after adding env vars
vercel --prod --force
```

### Images Not Loading
```bash
# Check next.config.js has correct image domains
# Check R2 CORS policy allows Vercel domain
```

---

## Monitoring

### Performance
- Vercel Analytics: Auto-enabled
- Web Vitals: Check in Vercel dashboard
- Build times: Typically 2-3 minutes

### Logs
```bash
# View real-time logs
vercel logs

# View production logs
vercel logs --prod
```

---

## Cost Estimate

### Vercel (Hobby Plan - FREE)
- ✅ Unlimited deployments
- ✅ 100GB bandwidth/month
- ✅ Automatic HTTPS
- ✅ Global CDN

### Upgrade to Pro ($20/month) for:
- 1TB bandwidth/month
- Team collaboration
- Advanced analytics
- Priority support

---

## Quick Commands

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod

# View deployment logs
vercel logs

# List deployments
vercel ls

# Remove deployment
vercel rm [deployment-url]

# Open project in browser
vercel open
```

---

## Project URLs

After deployment, you'll have:

### Production:
```
https://nextupdate-supabase.vercel.app
```

### GitHub Repository:
```
https://github.com/vijaysinghrajput/nextupdate-supabase
```

### Vercel Dashboard:
```
https://vercel.com/vijaysinghrajput/nextupdate-supabase
```

---

## 🎉 You're Done!

Your app is now:
- ✅ Deployed on Vercel
- ✅ Auto-deploys on every push
- ✅ Has preview deployments for PRs
- ✅ Globally distributed via CDN
- ✅ Automatic HTTPS enabled

**Share your live URL with the world!** 🚀
