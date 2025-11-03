// Enums for the social media application

export enum PostMediaType {
  IMAGE = 'image',
  VIDEO = 'video'
}

export enum KycStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected'
}

export enum PaymentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export enum PointsTransactionType {
  EARNED = 'earned',
  SPENT = 'spent',
  ADMIN_CREDIT = 'admin_credit',
  ADMIN_DEBIT = 'admin_debit'
}

export enum NavigationTab {
  HOME = 'home',
  EXPLORE = 'explore',
  ADD_POST = 'add_post',
  WALLET = 'wallet',
  PROFILE = 'profile'
}

export enum ThemeMode {
  LIGHT = 'light',
  DARK = 'dark'
}