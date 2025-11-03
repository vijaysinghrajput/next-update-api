import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

// Initialize dayjs plugins
dayjs.extend(relativeTime)

/**
 * Merge tailwind classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generate random referral code
 */
export function generateReferralCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * Format number with commas (for points display)
 */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) {
    return '0'
  }
  return new Intl.NumberFormat('en-IN').format(num)
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date: string | Date): string {
  return dayjs(date).fromNow()
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date, format: string = 'MMM DD, YYYY'): string {
  return dayjs(date).format(format)
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Validate Indian phone number
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Indian phone number format: +91XXXXXXXXXX or 10 digits
  const phoneRegex = /^(\+91|91)?[6789]\d{9}$/
  return phoneRegex.test(phone.replace(/\s+/g, ''))
}

/**
 * Format phone number for display
 */
export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`
  }
  return phone
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

/**
 * Get file size in readable format
 */
export function getReadableFileSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  let size = bytes
  let unitIndex = 0
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024
    unitIndex++
  }
  
  return `${size.toFixed(1)} ${units[unitIndex]}`
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Check if user is admin
 */
export function isAdmin(email: string): boolean {
  const adminEmails = [
    'admin@nextupdate.in',
    'support@nextupdate.in'
  ]
  return adminEmails.includes(email.toLowerCase())
}

/**
 * Generate avatar URL from name initials
 */
export function generateAvatarUrl(name: string): string {
  const initials = name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
  
  return `https://ui-avatars.com/api/?name=${initials}&background=1890ff&color=fff&size=128`
}

/**
 * Points system constants
 */
export const POINTS_CONFIG = {
  SIGNUP_BONUS: 100,
  REFERRAL_BONUS: 100,
  BLUE_TICK_COST: 2000,
  POST_LIKE: 1,
  POST_COMMENT: 2,
  DAILY_CHECK_IN: 10
} as const

/**
 * Validation schemas using Zod (to be extended)
 */
export const VALIDATION_RULES = {
  MIN_NAME_LENGTH: 2,
  MAX_NAME_LENGTH: 50,
  MIN_PASSWORD_LENGTH: 6,
  MAX_CAPTION_LENGTH: 500,
  MAX_FILE_SIZE_MB: 10,
  MAX_FILES_PER_POST: 5
} as const

/**
 * App configuration constants
 */
export const APP_CONFIG = {
  APP_NAME: 'Next Update',
  APP_DESCRIPTION: 'Social + Referral Platform',
  DEFAULT_CITY: 'Lucknow',
  SUPPORTED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  SUPPORTED_VIDEO_TYPES: ['video/mp4', 'video/webm', 'video/mov'],
  API_BASE_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api'
} as const
