# Admin User Setup for Next Update

## Create Admin User

To create the admin user, you need to:

### 1. Go to Supabase Dashboard
- Visit your Supabase project at: https://iuiyvteuleqknwkdeqde.supabase.co
- Go to Authentication → Users
- Click "Add User"

### 2. Create Admin User
- **Email**: admin@nextupdate.in
- **Password**: 123456
- **Email Confirmed**: Yes

### 3. Get User ID
After creating the user, copy the User ID (UUID) from the Users table.

### 4. Insert Admin Profile
Go to SQL Editor and run:

```sql
INSERT INTO profiles (
    id, 
    email, 
    name, 
    city_id, 
    points_balance, 
    is_verified, 
    has_blue_tick, 
    referral_code,
    created_at
) VALUES (
    'USER_ID_FROM_STEP_3_HERE',  -- Replace with actual UUID
    'admin@nextupdate.in',
    'Next Update Admin',
    (SELECT id FROM cities WHERE name = 'Lucknow' LIMIT 1),
    10000,
    true,
    true,
    'ADMIN001',
    NOW()
);
```

## Admin Access

Once created, the admin can login at:
- **URL**: http://localhost:3000/admin
- **Email**: admin@nextupdate.in  
- **Password**: 123456

## Admin Features

The admin dashboard includes:
- User management with points control
- KYC verification approval/rejection
- Payment request processing
- Platform statistics
- Content moderation

## Security Note

In production:
1. Use a strong password
2. Enable 2FA
3. Restrict admin access by IP if needed
4. Regular security audits
