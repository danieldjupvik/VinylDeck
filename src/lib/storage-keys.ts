// src/lib/storage-keys.ts
/**
 * Consolidated storage key constants for VinylDeck.
 * Reduces 11 fragmented keys to 3 main keys.
 */
export const STORAGE_KEYS = {
  /** Zustand: OAuth tokens, session state, username, userId */
  AUTH: 'vinyldeck-auth',
  /** Zustand: viewMode, avatarSource, gravatarEmail */
  PREFERENCES: 'vinyldeck-prefs',
  /** next-themes: theme preference (light/dark/system) */
  THEME: 'vinyldeck-theme'
} as const

/**
 * Session storage keys for temporary OAuth flow state.
 */
export const SESSION_KEYS = {
  /** Temporary OAuth request token during authorization */
  OAUTH_REQUEST: 'vinyldeck-oauth-request',
  /** Post-login redirect URL preservation */
  REDIRECT_URL: 'vinyldeck-redirect'
} as const
