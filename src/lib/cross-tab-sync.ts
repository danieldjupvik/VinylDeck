// src/lib/cross-tab-sync.ts
import { useAuthStore } from '@/stores/auth-store'

/**
 * Sets up cross-tab synchronization for auth state.
 * When auth is cleared in one tab, all other tabs receive the event and sync.
 *
 * Security: Prevents logged-out tabs from remaining authenticated.
 *
 * Call this once during app initialization.
 */
export function setupCrossTabSync() {
  if (typeof window === 'undefined') return

  window.addEventListener('storage', (event) => {
    // Zustand's persist middleware triggers storage events
    // when localStorage changes in OTHER tabs (not same tab)
    if (event.key === 'vinyldeck-auth') {
      // If auth was cleared in another tab
      if (event.newValue === null) {
        useAuthStore.getState().disconnect()
      }
      // If auth was updated in another tab, Zustand automatically syncs
      // the state via the persist middleware
    }
  })
}
