import { useLocation } from '@tanstack/react-router'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useAuth } from '@/hooks/use-auth'
import { useChangelog } from '@/hooks/use-changelog'
import { APP_VERSION } from '@/lib/constants'
import { useHydrationState } from '@/providers/hydration-context'
import { usePreferencesStore } from '@/stores/preferences-store'
import type { ChangelogVersion } from '@/types/changelog'

const TRIGGER_DELAY_MS = 750

interface ChangelogTriggerState {
  isOpen: boolean
  onDismiss: () => void
  triggeredVersions: ChangelogVersion[]
}

/**
 * Coordinates changelog modal auto-trigger with hydration, auth, route, and version gates.
 * Fires once per session after a 750ms delay when all conditions pass.
 * Updates lastSeenVersion only when the modal is dismissed.
 *
 * @returns Modal open state, dismiss handler, and all versions that triggered the modal
 */
export function useChangelogTrigger(): ChangelogTriggerState {
  const [isOpen, setIsOpen] = useState(false)
  const [triggeredVersions, setTriggeredVersions] = useState<
    ChangelogVersion[]
  >([])
  const hasTriggeredRef = useRef(false)

  const { hasHydrated } = useHydrationState()
  const { isAuthenticated, isLoading } = useAuth()
  const location = useLocation()
  const changelog = useChangelog()
  const setLastSeenVersion = usePreferencesStore(
    (state) => state.setLastSeenVersion
  )

  const onDismiss = useCallback(() => {
    setIsOpen(false)
    setLastSeenVersion(APP_VERSION)
  }, [setLastSeenVersion])

  // Initialize lastSeenVersion for first-time users (sets baseline without showing modal)
  useEffect(() => {
    if (!hasHydrated) return
    if (!changelog.hasEntries && changelog.reason === 'first-install') {
      setLastSeenVersion(APP_VERSION)
    }
  }, [hasHydrated, changelog, setLastSeenVersion])

  useEffect(() => {
    if (hasTriggeredRef.current) return

    const hydrationGate = hasHydrated
    const authGate = !isLoading && isAuthenticated
    const routeGate = location.pathname !== '/oauth-callback'
    const versionGate = changelog.hasEntries

    if (!hydrationGate || !authGate || !routeGate || !versionGate) return

    const timerId = setTimeout(() => {
      hasTriggeredRef.current = true
      setTriggeredVersions(changelog.versions)
      setIsOpen(true)
    }, TRIGGER_DELAY_MS)

    return () => {
      clearTimeout(timerId)
    }
  }, [hasHydrated, isLoading, isAuthenticated, location.pathname, changelog])

  return { isOpen, onDismiss, triggeredVersions }
}
