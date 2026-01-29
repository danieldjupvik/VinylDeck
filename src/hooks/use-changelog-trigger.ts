import { useLocation } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'

import { useAuth } from '@/hooks/use-auth'
import { useChangelog } from '@/hooks/use-changelog'
import { APP_VERSION } from '@/lib/constants'
import { useHydrationState } from '@/providers/hydration-context'
import { usePreferencesStore } from '@/stores/preferences-store'

const TRIGGER_DELAY_MS = 750

interface ChangelogTriggerState {
  isOpen: boolean
  setIsOpen: (open: boolean) => void
}

/**
 * Coordinates changelog modal auto-trigger with hydration, auth, route, and version gates.
 * Fires once per session after a 750ms delay when all conditions pass.
 *
 * @returns Modal open state and setter for controlled modal
 */
// eslint-disable-next-line import-x/no-unused-modules -- Consumed by ChangelogAutoTrigger
export function useChangelogTrigger(): ChangelogTriggerState {
  const [isOpen, setIsOpen] = useState(false)
  const hasTriggeredRef = useRef(false)

  const { hasHydrated } = useHydrationState()
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  const changelog = useChangelog()
  const setLastSeenVersion = usePreferencesStore(
    (state) => state.setLastSeenVersion
  )

  useEffect(() => {
    if (hasTriggeredRef.current) return

    const hydrationGate = hasHydrated
    const authGate = !isLoading && isAuthenticated
    const routeGate = location.pathname !== '/oauth-callback'
    const versionGate = changelog.hasEntries

    if (!hydrationGate || !authGate || !routeGate || !versionGate) return

    hasTriggeredRef.current = true

    const timerId = setTimeout(() => {
      setIsOpen(true)
      setLastSeenVersion(APP_VERSION)
      if ('vibrate' in navigator) {
        navigator.vibrate(10)
      }
    }, TRIGGER_DELAY_MS)

    return () => {
      clearTimeout(timerId)
    }
  }, [
    hasHydrated,
    isLoading,
    isAuthenticated,
    location.pathname,
    changelog.hasEntries,
    setLastSeenVersion
  ])

  return { isOpen, setIsOpen }
}
