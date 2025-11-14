# Email Verification System - Setup Guide

## ✅ Implementation Complete

Your email verification system has been successfully integrated with the following features:

### 📧 What's Been Implemented

1. **Email Verification Page** (`/auth/verify-email`)
   - ✅ Resend verification email with 60-second cooldown
   - ✅ Change email address functionality
   - ✅ Check verification status
   - ✅ Clear instructions and user-friendly UI
   - ✅ Auto-redirect once verified

2. **Callback Handler** (`/auth/callback`)
   - ✅ Handles email verification links
   - ✅ Exchanges verification code for session
   - ✅ Shows success/error states
   - ✅ Auto-redirects to home page

3. **Updated Signup Flow**
   - ✅ Sends verification email after registration
   - ✅ Redirects to verification page
   - ✅ Falls back to instant login if email confirmation is disabled

4. **Updated Login Flow**
   - ✅ Checks if email is verified
   - ✅ Redirects unverified users to verification page
   - ✅ Shows helpful error messages

---

## 🔧 Supabase Configuration Required

### Step 1: Enable Email Confirmations

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Settings**
3. Find **Email Auth** section
4. Enable **"Confirm email"** toggle
5. Click **Save**

### Step 2: Configure Email Templates

Go to **Authentication** → **Email Templates** and customize:

#### A. Confirm Signup Template
```html
<h2>Welcome to Next Update!</h2>
<p>Thanks for signing up! Click the link below to verify your email address:</p>
<p><a href="{{ .ConfirmationURL }}">Verify Email Address</a></p>
<p>Or copy and paste this URL into your browser:</p>
<p>{{ .ConfirmationURL }}</p>
<p>If you didn't create an account, you can safely ignore this email.</p>
<p>Thanks,<br>Next Update Team</p>
```

#### B. Magic Link Template (Optional)
```html
<h2>Your Magic Link</h2>
<p>Click the link below to sign in:</p>
<p><a href="{{ .ConfirmationURL }}">Sign In</a></p>
<p>This link expires in 1 hour.</p>
```

#### C. Change Email Address Template
```html
<h2>Confirm Your New Email</h2>
<p>Click the link below to confirm your new email address:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm Email Change</a></p>
<p>If you didn't request this change, please contact support immediately.</p>
```

### Step 3: Configure Custom SMTP (Recommended)

For production, use your own email service:

1. Go to **Authentication** → **Settings** → **SMTP Settings**
2. Enable **"Use Custom SMTP Server"**
3. Enter your email provider details:

#### Gmail Example:
- **Host**: `smtp.gmail.com`
- **Port**: `587`
- **Username**: `your-email@gmail.com`
- **Password**: `your-app-password`
- **Sender Email**: `noreply@nextupdate.com`
- **Sender Name**: `Next Update`

#### SendGrid Example:
- **Host**: `smtp.sendgrid.net`
- **Port**: `587`
- **Username**: `apikey`
- **Password**: `your-sendgrid-api-key`
- **Sender Email**: `noreply@yourdomain.com`
- **Sender Name**: `Next Update`

#### AWS SES Example:
- **Host**: `email-smtp.us-east-1.amazonaws.com`
- **Port**: `587`
- **Username**: `your-ses-smtp-username`
- **Password**: `your-ses-smtp-password`
- **Sender Email**: `noreply@yourdomain.com`
- **Sender Name**: `Next Update`

### Step 4: Configure Redirect URLs

1. Go to **Authentication** → **URL Configuration**
2. Add your site URL:
   - Production: `https://nextupdate.com`
   - Development: `http://localhost:3000`
3. Add redirect URLs:
   - `https://nextupdate.com/auth/callback`
   - `http://localhost:3000/auth/callback`
   - `https://nextupdate.com/**` (wildcard)
   - `http://localhost:3000/**` (wildcard)

### Step 5: Configure Rate Limiting (Security)

1. Go to **Authentication** → **Rate Limits**
2. Recommended settings:
   - Email per hour: **4** (prevents spam)
   - SMS per hour: **4**
   - Failed login attempts: **10**

---

## 📱 How It Works

### User Registration Flow:
```
1. User fills signup form
   ↓
2. System creates account
   ↓
3. Supabase sends verification email
   ↓
4. User redirected to /auth/verify-email
   ↓
5. User clicks link in email
   ↓
6. Redirected to /auth/callback
   ↓
7. Email verified → Redirected to home
```

### User Login Flow:
```
1. User enters credentials
   ↓
2. System checks if email is verified
   ↓
3a. If verified → Login success → Home
   ↓
3b. If not verified → Redirect to /auth/verify-email
```

### Email Verification Page Features:
- ✅ **Resend Email**: Send verification email again (60s cooldown)
- ✅ **Change Email**: Update email address if wrong
- ✅ **Check Status**: Verify if email has been confirmed
- ✅ **Instructions**: Clear step-by-step guide

---

## 🧪 Testing

### Test Email Verification:

1. **Register a new account**
   - Use a real email address you can access
   - Fill in all required fields
   - Click "Create Account"

2. **Check verification page**
   - Should redirect to `/auth/verify-email`
   - Should display your email address
   - Should show instructions

3. **Check your email**
   - Look for email from Supabase/your domain
   - Check spam folder if needed
   - Click verification link

4. **Verify callback works**
   - Should redirect to `/auth/callback`
   - Should show success message
   - Should auto-redirect to home

5. **Test resend feature**
   - Click "Resend Verification Email"
   - Should show success message
   - Should have 60-second cooldown

6. **Test change email**
   - Click "Change Email Address"
   - Enter new email
   - Should send new verification link

### Test with Different Email States:

1. **New user** - Should require verification
2. **Verified user** - Should login directly
3. **Unverified user trying to login** - Should redirect to verify page
4. **User with invalid token** - Should show error

---

## 🎨 Customization

### Email Template Variables:
- `{{ .ConfirmationURL }}` - Verification link
- `{{ .Token }}` - Verification token
- `{{ .TokenHash }}` - Hashed token
- `{{ .SiteURL }}` - Your site URL
- `{{ .Email }}` - User's email

### Styling Email Templates:
Add custom CSS to make emails match your brand:

```html
<style>
  body { font-family: Arial, sans-serif; }
  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
  .button { 
    background: #007AFF; 
    color: white; 
    padding: 12px 24px; 
    text-decoration: none;
    border-radius: 8px;
    display: inline-block;
  }
  .logo { width: 150px; margin-bottom: 20px; }
</style>
```

---

## 🚀 Production Checklist

Before going live:

- [ ] Enable email confirmation in Supabase
- [ ] Configure custom SMTP server
- [ ] Customize email templates with your branding
- [ ] Add all production redirect URLs
- [ ] Set appropriate rate limits
- [ ] Test complete signup/verification flow
- [ ] Test resend email functionality
- [ ] Test change email functionality
- [ ] Verify emails not going to spam
- [ ] Test on mobile devices
- [ ] Monitor email delivery rates

---

## 🔐 Security Features

✅ **Email Verification Required** - Prevents fake accounts
✅ **Rate Limiting** - Prevents email spam
✅ **Secure Tokens** - One-time use verification links
✅ **Expiring Links** - Tokens expire after 1 hour
✅ **Change Email Protection** - Requires verification
✅ **Cooldown Period** - 60s between resend attempts

---

## 📊 Monitoring

Track email verification in Supabase:

1. Go to **Authentication** → **Users**
2. Check "Email Confirmed" column
3. Filter by unconfirmed users
4. Monitor verification rates

---

## 🆘 Troubleshooting

### Emails not being received?
- Check spam folder
- Verify SMTP settings are correct
- Test SMTP connection in Supabase
- Check rate limits haven't been hit
- Verify sender email is authorized

### Verification link not working?
- Check redirect URLs are configured
- Verify callback route exists
- Check browser console for errors
- Ensure token hasn't expired (1 hour limit)

### Users stuck on verification page?
- Verify email templates have `{{ .ConfirmationURL }}`
- Check email is actually being sent
- Verify callback handler is working
- Check for JavaScript errors

### "Email not confirmed" error on login?
- User hasn't verified email yet
- Token may have expired
- User needs to request new verification email

---

## 📞 Support

For issues:
1. Check Supabase logs (Authentication → Logs)
2. Check browser console for errors
3. Verify all settings in this guide
4. Contact Supabase support if needed

---

## 🎯 Next Steps

1. **Configure Supabase** following Step 1-5 above
2. **Test the flow** with a real email
3. **Customize email templates** with your branding
4. **Set up production SMTP** for reliable delivery
5. **Monitor** email verification rates

Your email verification system is ready to use! 🚀
