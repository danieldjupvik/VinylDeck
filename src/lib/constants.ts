/**
 * Theme configuration.
 * IMPORTANT: Keep THEME.DEFAULT in sync with index.html inline script.
 * IMPORTANT: THEME.STORAGE_KEY must match the next-themes storage key.
 */
export const THEME = {
  /** Default theme for new users (must match index.html inline script) */
  DEFAULT: 'dark',
  /** localStorage key for theme preference */
  STORAGE_KEY: 'vinyldeck-theme'
} as const

/** Collection pagination settings; PER_PAGE is the number of items per page. */
export const COLLECTION = {
  PER_PAGE: 17
} as const

/**
 * Browser Cache API cache names.
 * Used by service worker (vite.config.ts) and auth-provider for cache management.
 * Keep in sync with runtimeCaching configuration in vite.config.ts.
 */
export const CACHE_NAMES = {
  /** Discogs API response cache */
  DISCOGS_API: 'discogs-api-cache',
  /** Discogs cover images cache */
  DISCOGS_IMAGES: 'discogs-images-cache',
  /** Gravatar images cache */
  GRAVATAR_IMAGES: 'gravatar-images-cache'
} as const
