import { useEffect } from 'react'

import type { AuthState } from '@/providers/auth-context'

interface CrossTabAuthSyncParams {
  authTokens: { accessToken: string; accessTokenSecret: string } | null
  sessionActive: boolean
  isRestoring: boolean
  state: AuthState
  setState: React.Dispatch<React.SetStateAction<AuthState>>
  onCrossTabDisconnect: () => void
}

/**
 * Syncs derived auth state when Zustand store changes from another tab.
 * Handles cross-tab sign out and disconnect scenarios.
 *
 * This effect runs AFTER initialization, reacting to external state changes
 * propagated via Zustand's localStorage sync.
 */
export function useCrossTabAuthSync({
  authTokens,
  sessionActive,
  isRestoring,
  state,
  setState,
  onCrossTabDisconnect
}: CrossTabAuthSyncParams): void {
  useEffect(() => {
    // Skip during restoration - initialization effect handles this
    if (isRestoring) {
      return
    }

    // Skip during initial loading - initialization effect handles this
    if (state.isLoading) {
      return
    }

    // Tokens cleared (disconnect from another tab)
    if (!authTokens) {
      // Clear caches to match the tab that initiated disconnect
      onCrossTabDisconnect()

      setState((prev) => {
        if (prev.isAuthenticated || prev.hasStoredTokens) {
          return {
            ...prev,
            isAuthenticated: false,
            hasStoredTokens: false,
            oauthTokens: null
          }
        }
        return prev
      })
      return
    }

    // Session ended but tokens kept (sign out from another tab)
    if (!sessionActive && state.isAuthenticated) {
      setState((prev) => ({
        ...prev,
        isAuthenticated: false,
        oauthTokens: null
      }))
    }
  }, [
    authTokens,
    sessionActive,
    isRestoring,
    state.isLoading,
    state.isAuthenticated,
    setState,
    onCrossTabDisconnect
  ])
}
