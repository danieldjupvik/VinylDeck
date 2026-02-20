// src/stores/preferences-store.ts
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { STORAGE_KEYS } from '@/lib/storage-keys'
import type { AvatarSource } from '@/providers/preferences-context'
import type { ViewMode } from '@/types/preferences'

const PREFERENCES_PERSIST_VERSION = 1

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
  /**
   * Stores the resolved Gravatar URL for avatar rendering.
   *
   * @param url - Resolved Gravatar URL or null when not available
   * @returns void
   */
  setGravatarUrl: (url: string | null) => void
  resetAvatarSettings: () => void
}

type PersistedPreferencesState = Pick<
  PreferencesStore,
  | 'viewMode'
  | 'avatarSource'
  | 'gravatarEmail'
  | 'lastSeenVersion'
  | 'gravatarUrl'
>

const sanitizeViewMode = (value: unknown): ViewMode =>
  value === 'table' ? 'table' : 'grid'

const sanitizeAvatarSource = (value: unknown): AvatarSource =>
  value === 'gravatar' ? 'gravatar' : 'discogs'

const sanitizePersistedPreferencesState = (
  value: unknown
): PersistedPreferencesState => {
  const raw = (value ?? {}) as Partial<PersistedPreferencesState>

  return {
    viewMode: sanitizeViewMode(raw.viewMode),
    avatarSource: sanitizeAvatarSource(raw.avatarSource),
    gravatarEmail:
      typeof raw.gravatarEmail === 'string' ? raw.gravatarEmail : '',
    lastSeenVersion:
      typeof raw.lastSeenVersion === 'string' ? raw.lastSeenVersion : null,
    gravatarUrl: typeof raw.gravatarUrl === 'string' ? raw.gravatarUrl : null
  }
}

const partializePreferencesState = (
  state: PreferencesStore
): PersistedPreferencesState => ({
  viewMode: state.viewMode,
  avatarSource: state.avatarSource,
  gravatarEmail: state.gravatarEmail,
  lastSeenVersion: state.lastSeenVersion,
  gravatarUrl: state.gravatarUrl
})

const migratePreferencesState = (
  persistedState: unknown
): PersistedPreferencesState =>
  sanitizePersistedPreferencesState(persistedState)

/**
 * Zustand store for user preferences.
 * Automatically persists to localStorage (via Zustand) under 'vinyldeck-prefs' key.
 *
 * Consolidates:
 * - viewMode
 * - avatarSource
 * - gravatarEmail
 * - lastSeenVersion
 * - gravatarUrl
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
    {
      name: STORAGE_KEYS.PREFERENCES,
      version: PREFERENCES_PERSIST_VERSION,
      partialize: partializePreferencesState,
      migrate: migratePreferencesState
    }
  )
)
