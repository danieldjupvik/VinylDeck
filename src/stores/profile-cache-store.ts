import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { STORAGE_KEYS } from '@/lib/storage-keys'
import type { User } from '@/types/discogs'

const PROFILE_PERSIST_VERSION = 1

export type UserProfile = Pick<User, 'id' | 'username'> & {
  avatar_url?: User['avatar_url'] | undefined
  email?: User['email'] | undefined
}

export interface ProfileCacheStore {
  profile: UserProfile | null

  /**
   * Stores the user profile in localStorage for instant display on page load.
   *
   * @param profile - The full user profile to cache
   */
  setProfile: (profile: UserProfile) => void

  /**
   * Clears the cached profile. Called on disconnect.
   */
  clearProfile: () => void
}

type PersistedProfileCacheState = Pick<ProfileCacheStore, 'profile'>

const toNonNegativeInteger = (value: unknown): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  const normalized = Math.trunc(value)
  return normalized >= 0 ? normalized : null
}

const sanitizeProfile = (value: unknown): UserProfile | null => {
  if (typeof value !== 'object' || value === null) return null

  const raw = value as Record<string, unknown>
  const id = toNonNegativeInteger(raw['id'])
  const usernameRaw = raw['username']

  if (id === null || typeof usernameRaw !== 'string') return null
  const username = usernameRaw.trim()
  if (!username) return null

  const profile: UserProfile = { id, username }
  if (typeof raw['avatar_url'] === 'string') {
    profile.avatar_url = raw['avatar_url']
  }
  if (typeof raw['email'] === 'string') {
    profile.email = raw['email']
  }

  return profile
}

const sanitizePersistedProfileCacheState = (
  value: unknown
): PersistedProfileCacheState => {
  const raw = (value ?? {}) as Partial<PersistedProfileCacheState>
  return { profile: sanitizeProfile(raw.profile) }
}

const partializeProfileCacheState = (
  state: ProfileCacheStore
): PersistedProfileCacheState => ({
  profile: state.profile
})

const migrateProfileCacheState = (
  persistedState: unknown
): PersistedProfileCacheState =>
  sanitizePersistedProfileCacheState(persistedState)

/**
 * localStorage-backed user profile store.
 * Replaces IndexedDB (TanStack Query) persistence for profile data.
 * Provides synchronous access on first render — no hydration wait.
 * State includes profile plus the actions setProfile(profile) and clearProfile().
 * Persists under STORAGE_KEYS.PROFILE.
 *
 * @returns ProfileCacheStore state and actions for profile cache management
 *
 * @example
 * ```ts
 * const { profile, setProfile, clearProfile } = useProfileCacheStore()
 * ```
 */
export const useProfileCacheStore = create<ProfileCacheStore>()(
  persist(
    (set) => ({
      profile: null,

      setProfile: (profile) => set({ profile }),

      clearProfile: () => set({ profile: null })
    }),
    {
      name: STORAGE_KEYS.PROFILE,
      version: PROFILE_PERSIST_VERSION,
      partialize: partializeProfileCacheState,
      migrate: migrateProfileCacheState
    }
  )
)
