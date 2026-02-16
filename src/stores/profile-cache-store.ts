import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { STORAGE_KEYS } from '@/lib/storage-keys'

export interface UserProfile {
  id: number
  username: string
  avatar_url?: string
  email?: string
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
