import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { STORAGE_KEYS } from '@/lib/storage-keys'
import type { User } from '@/types/discogs'

export type UserProfile = Pick<User, 'id' | 'username'> & {
  avatar_url?: User['avatar_url'] | undefined
  email?: User['email'] | undefined
}

interface ProfileCacheStore {
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
    { name: STORAGE_KEYS.PROFILE }
  )
)
