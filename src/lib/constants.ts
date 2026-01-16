export const APP_VERSION = '0.1.0'

export const DISCOGS_API_URL = 'https://api.discogs.com'

export const STORAGE_KEYS = {
  TOKEN: 'vinylview_token',
  USERNAME: 'vinylview_username',
  AVATAR_SOURCE: 'vinylview_avatar_source',
  GRAVATAR_EMAIL: 'vinylview_gravatar_email',
  IDENTITY: 'vinylview_identity',
  USER_PROFILE: 'vinylview_user_profile'
} as const

export const RATE_LIMIT = {
  MAX_REQUESTS: 60,
  BUFFER: 5, // Start throttling when remaining < BUFFER
  WINDOW_MS: 60 * 1000 // 1 minute
} as const

export const COLLECTION = {
  PER_PAGE: 100 // Discogs API max
} as const
