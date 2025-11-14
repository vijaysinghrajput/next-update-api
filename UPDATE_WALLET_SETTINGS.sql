-- Update wallet settings with new payment details
-- This script updates the wallet_settings table with the correct UPI and bank details

-- First, delete any existing wallet settings (optional, only if you want to start fresh)
-- DELETE FROM public.wallet_settings;

-- Insert or update wallet settings
INSERT INTO public.wallet_settings (
  id,
  upi_id,
  account_name,
  bank_name,
  account_number,
  ifsc_code,
  points_rate,
  preset_amounts,
  payment_instructions,
  created_at,
  updated_at
)
VALUES (
  gen_random_uuid(),
  '44078944317@sbi',
  'Next Update News Agency',
  'State Bank of India',
  '44078944317',
  'SBIN0001687',
  1, -- 1 INR = 1 point
  ARRAY[100, 500, 1000, 1500, 2000, 5000], -- Preset amounts
  'Please make payment using UPI or bank transfer. Upload payment screenshot after completing the transaction. Branch: BANSGAON',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  upi_id = EXCLUDED.upi_id,
  account_name = EXCLUDED.account_name,
  bank_name = EXCLUDED.bank_name,
  account_number = EXCLUDED.account_number,
  ifsc_code = EXCLUDED.ifsc_code,
  points_rate = EXCLUDED.points_rate,
  preset_amounts = EXCLUDED.preset_amounts,
  payment_instructions = EXCLUDED.payment_instructions,
  updated_at = NOW();

-- OR if you want to update existing record (run this if a record already exists):
UPDATE public.wallet_settings
SET
  upi_id = '44078944317@sbi',
  account_name = 'Next Update News Agency',
  bank_name = 'State Bank of India',
  account_number = '44078944317',
  ifsc_code = 'SBIN0001687',
  points_rate = 1,
  preset_amounts = ARRAY[100, 500, 1000, 1500, 2000, 5000],
  payment_instructions = 'Please make payment using UPI or bank transfer. Upload payment screenshot after completing the transaction. Branch: BANSGAON',
  updated_at = NOW()
WHERE id = (SELECT id FROM public.wallet_settings ORDER BY updated_at DESC LIMIT 1);
