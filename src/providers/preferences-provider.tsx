// src/providers/preferences-provider.tsx
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'

import { buildGravatarUrl, normalizeGravatarEmail } from '@/lib/gravatar'
import { usePreferencesStore } from '@/stores/preferences-store'

import { PreferencesContext, type AvatarSource } from './preferences-context'

interface PreferencesProviderProps {
  children: ReactNode
}

/**
 * Preferences provider using Zustand store.
 * Provides React Context wrapper for Zustand store + Gravatar URL loading logic.
 */
export function PreferencesProvider({
  children
}: PreferencesProviderProps): React.JSX.Element {
  // Subscribe to Zustand store
  const avatarSource = usePreferencesStore((state) => state.avatarSource)
  const gravatarEmail = usePreferencesStore((state) => state.gravatarEmail)
  const setAvatarSourceStore = usePreferencesStore(
    (state) => state.setAvatarSource
  )
  const setGravatarEmailStore = usePreferencesStore(
    (state) => state.setGravatarEmail
  )

  const storedGravatarUrl = usePreferencesStore((state) => state.gravatarUrl)
  const setStoredGravatarUrl = usePreferencesStore(
    (state) => state.setGravatarUrl
  )

  // Use stored URL as initial value to prevent flash on load.
  // Validate it matches the current email to avoid stale data.
  const expectedUrl = buildGravatarUrl(gravatarEmail, 128)
  const [gravatarUrl, setGravatarUrl] = useState<string | null>(
    storedGravatarUrl === expectedUrl ? storedGravatarUrl : null
  )

  // Load Gravatar URL when email changes
  useEffect(() => {
    const url = buildGravatarUrl(gravatarEmail, 128)
    if (!url) {
      return
    }

    let isActive = true
    const image = new Image()
    image.onload = () => {
      if (isActive) {
        setGravatarUrl(url)
        setStoredGravatarUrl(url)
      }
    }
    image.onerror = () => {
      if (isActive) {
        setGravatarUrl(null)
        setStoredGravatarUrl(null)
      }
    }
    image.src = url

    return () => {
      isActive = false
    }
  }, [gravatarEmail, setStoredGravatarUrl])

  const setAvatarSource = useCallback(
    (source: AvatarSource): void => {
      setAvatarSourceStore(source)
    },
    [setAvatarSourceStore]
  )

  const setGravatarEmail = useCallback(
    (email: string): void => {
      const normalized = normalizeGravatarEmail(email)
      setGravatarEmailStore(normalized)
      setGravatarUrl(null)
      setStoredGravatarUrl(null)
    },
    [setGravatarEmailStore, setStoredGravatarUrl]
  )

  // Derive effective gravatarUrl - null if email is empty (prevents stale URL after reset)
  const effectiveGravatarUrl = gravatarEmail ? gravatarUrl : null

  const value = useMemo(
    () => ({
      avatarSource,
      gravatarEmail,
      gravatarUrl: effectiveGravatarUrl,
      setAvatarSource,
      setGravatarEmail
    }),
    [
      avatarSource,
      gravatarEmail,
      effectiveGravatarUrl,
      setAvatarSource,
      setGravatarEmail
    ]
  )

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  )
}
