// src/stores/preferences-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { STORAGE_KEYS } from '@/lib/storage-keys'
import type { AvatarSource } from '@/providers/preferences-context'
import type { ViewMode } from '@/types/preferences'

interface PreferencesStore {
  // State
  viewMode: ViewMode
  avatarSource: AvatarSource
  gravatarEmail: string
  lastSeenVersion: string | null
  gravatarUrl: string | null

  // Actions
  setViewMode: (mode: ViewMode) => void
  setAvatarSource: (source: AvatarSource) => void
  setGravatarEmail: (email: string) => void
  /**
   * Records the last changelog version the user has seen.
   *
   * @param version - Semver string (e.g., "0.3.0-beta.1")
   */
  setLastSeenVersion: (version: string) => void
  setGravatarUrl: (url: string | null) => void
  resetAvatarSettings: () => void
}

/**
 * Zustand store for user preferences.
 * Automatically persists to localStorage (via Zustand) under 'vinyldeck-prefs' key.
 *
 * Consolidates:
 * - viewMode
 * - avatarSource
 * - gravatarEmail
 * - lastSeenVersion
 */
export const usePreferencesStore = create<PreferencesStore>()(
  persist(
    (set) => ({
      viewMode: 'grid',
      avatarSource: 'discogs',
      gravatarEmail: '',
      lastSeenVersion: null,
      gravatarUrl: null,

      setViewMode: (mode) => set({ viewMode: mode }),
      setAvatarSource: (source) => set({ avatarSource: source }),
      setGravatarEmail: (email) => set({ gravatarEmail: email }),
      setLastSeenVersion: (version) => set({ lastSeenVersion: version }),
      setGravatarUrl: (url) => set({ gravatarUrl: url }),
      resetAvatarSettings: () =>
        set({
          avatarSource: 'discogs',
          gravatarEmail: '',
          gravatarUrl: null
        })
    }),
    { name: STORAGE_KEYS.PREFERENCES }
  )
)
