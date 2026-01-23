// src/lib/cross-tab-sync.ts
import { useAuthStore } from '@/stores/auth-store'

/**
 * Sets up cross-tab synchronization for auth state.
 * When auth changes in one tab, all other tabs receive the event and sync immediately.
 *
 * Handles:
 * - Sign out: sessionActive becomes false → redirect to login
 * - Disconnect: tokens cleared → redirect to login
 *
 * Security: Prevents logged-out tabs from remaining authenticated.
 *
 * Call this once during app initialization.
 */
export function setupCrossTabSync(): void {
  if (typeof window === 'undefined') return

  window.addEventListener('storage', (event) => {
    // Storage events fire when localStorage changes in OTHER tabs (not same tab)
    if (event.key === 'vinyldeck-auth') {
      if (event.newValue === null) {
        // Auth was fully cleared (disconnect)
        useAuthStore.getState().disconnect()
      } else {
        // Auth was updated (e.g., sign out where sessionActive changed)
        // Parse the new state and update the store to trigger React re-renders
        try {
          const newState = JSON.parse(event.newValue) as {
            state?: {
              tokens?: unknown
              sessionActive?: boolean
            }
          }
          const store = useAuthStore.getState()

          // Update store with new values from other tab
          if (newState.state) {
            const { tokens, sessionActive } = newState.state

            // If session became inactive or tokens were cleared, update immediately
            if (!sessionActive || !tokens) {
              if (!tokens) {
                store.disconnect()
              } else {
                store.signOut()
              }
            }
          }
        } catch (error) {
          // Invalid JSON or unexpected structure - ignore
          console.warn('Failed to parse auth state from storage event:', error)
        }
      }
    }
  })
}
