// src/stores/auth-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthTokens {
  accessToken: string
  accessTokenSecret: string
}

interface AuthStore {
  // State
  tokens: AuthTokens | null
  sessionActive: boolean
  username: string | null
  userId: number | null

  // Actions
  setAuth: (tokens: AuthTokens, username: string, userId: number) => void
  setSessionActive: (active: boolean) => void
  signOut: () => void
  disconnect: () => void
}

/**
 * Zustand store for authentication state.
 * Automatically persists to localStorage under 'vinyldeck-auth' key.
 *
 * Consolidates:
 * - vinyldeck_oauth_token
 * - vinyldeck_oauth_token_secret
 * - vinyldeck_session_active
 * - vinyldeck_username
 *
 * Two-tier auth system:
 * - signOut(): Ends session, keeps tokens for "welcome back"
 * - disconnect(): Clears everything, requires re-authorization
 */
export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      tokens: null,
      sessionActive: false,
      username: null,
      userId: null,

      setAuth: (tokens, username, userId) =>
        set({ tokens, username, userId, sessionActive: true }),

      setSessionActive: (active) => set({ sessionActive: active }),

      // Sign out: clear session, keep tokens for "welcome back"
      signOut: () => set({ sessionActive: false }),

      // Disconnect: clear everything
      disconnect: () =>
        set({
          tokens: null,
          sessionActive: false,
          username: null,
          userId: null
        })
    }),
    { name: 'vinyldeck-auth' }
  )
)
