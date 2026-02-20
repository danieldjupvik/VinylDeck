// src/stores/auth-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { STORAGE_KEYS } from '@/lib/storage-keys'
import { usePreferencesStore } from '@/stores/preferences-store'
import { useProfileCacheStore } from '@/stores/profile-cache-store'

const AUTH_PERSIST_VERSION = 1

interface AuthTokens {
  accessToken: string
  accessTokenSecret: string
}

interface AuthStore {
  // State
  tokens: AuthTokens | null
  sessionActive: boolean

  // Actions
  setTokens: (tokens: AuthTokens) => void
  setSessionActive: (active: boolean) => void
  signOut: () => void
  disconnect: () => void
}

type PersistedAuthState = Pick<AuthStore, 'tokens' | 'sessionActive'>

const sanitizeAuthTokens = (value: unknown): AuthTokens | null => {
  if (typeof value !== 'object' || value === null) return null

  const raw = value as Record<string, unknown>
  const accessToken = raw['accessToken']
  const accessTokenSecret = raw['accessTokenSecret']

  if (
    typeof accessToken !== 'string' ||
    typeof accessTokenSecret !== 'string'
  ) {
    return null
  }
  if (!accessToken || !accessTokenSecret) return null

  return { accessToken, accessTokenSecret }
}

const sanitizePersistedAuthState = (value: unknown): PersistedAuthState => {
  const raw = (value ?? {}) as Partial<PersistedAuthState>
  const tokens = sanitizeAuthTokens(raw.tokens)
  const sessionActive =
    typeof raw.sessionActive === 'boolean' ? raw.sessionActive : false

  return {
    tokens,
    sessionActive: tokens ? sessionActive : false
  }
}

const partializeAuthState = (state: AuthStore): PersistedAuthState => ({
  tokens: state.tokens,
  sessionActive: state.sessionActive
})

const migrateAuthState = (persistedState: unknown): PersistedAuthState =>
  sanitizePersistedAuthState(persistedState)

/**
 * Zustand store for authentication state.
 * Automatically persists to localStorage under 'vinyldeck-auth' key.
 *
 * Note: User profile is persisted separately in localStorage via useProfileCacheStore.
 * This store only manages auth credentials and session state.
 *
 * Two-tier auth system:
 * - signOut(): Ends session, keeps tokens for "welcome back"
 * - disconnect(): Clears everything, requires re-authorization
 *
 * @param selector - Zustand selector function to extract state
 * @returns Selected state from the auth store
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      tokens: null,
      sessionActive: false,

      setTokens: (tokens) => set({ tokens }),

      setSessionActive: (active) => set({ sessionActive: active }),

      // Sign out: clear session, keep tokens for "welcome back"
      signOut: () => set({ sessionActive: false }),

      // Disconnect: clear auth tokens, avatar preferences, and profile cache
      disconnect: () => {
        // Reset avatar preferences to prevent cross-account data leakage
        usePreferencesStore.getState().resetAvatarSettings()
        // Clear cached profile from localStorage
        useProfileCacheStore.getState().clearProfile()

        set({
          tokens: null,
          sessionActive: false
        })
      }
    }),
    {
      name: STORAGE_KEYS.AUTH,
      version: AUTH_PERSIST_VERSION,
      partialize: partializeAuthState,
      migrate: migrateAuthState
    }
  )
)
