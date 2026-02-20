import { useIsRestoring, useQueryClient } from '@tanstack/react-query'
import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction
} from 'react'

import { useCrossTabAuthSync } from '@/hooks/use-cross-tab-auth-sync'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { usePreferences } from '@/hooks/use-preferences'
import { useUserProfile } from '@/hooks/use-user-profile'
import { CACHE_NAMES } from '@/lib/constants'
import { isAuthError, OfflineNoCacheError } from '@/lib/errors'
import { queryPersister } from '@/lib/query-persister'
import { trpc } from '@/lib/trpc'
import { useAuthStore } from '@/stores/auth-store'
import { useProfileCacheStore } from '@/stores/profile-cache-store'
import { useSyncStateStore } from '@/stores/sync-state-store'

import { AuthContext, type AuthState } from './auth-context'

interface AuthProviderProps {
  children: ReactNode
}

type DiscogsIdentity = {
  username: string
  id: number
}

function createMinimalProfile(identity: DiscogsIdentity): {
  id: number
  username: string
} {
  return {
    id: identity.id,
    username: identity.username
  }
}

interface AuthFlowBase {
  tokens: { accessToken: string; accessTokenSecret: string }
  validateTokens: (tokens: {
    accessToken: string
    accessTokenSecret: string
  }) => Promise<DiscogsIdentity>
  fetchProfile: (
    username: string,
    tokens: { accessToken: string; accessTokenSecret: string }
  ) => Promise<{ email?: string | undefined }>
  getLatestGravatarEmail: () => string
  setLatestGravatarEmail: (email: string) => void
  setGravatarEmail: (email: string) => void
  disconnectAndClearState: () => void
  setState: Dispatch<SetStateAction<AuthState>>
  getIsOnline: () => boolean
}

type ValidateTokensInBackgroundParams = AuthFlowBase

interface PerformAuthValidationParams extends AuthFlowBase {
  options: { forceProfileRefresh: boolean; storeTokens: boolean }
  setTokens: (tokens: {
    accessToken: string
    accessTokenSecret: string
  }) => void
  setSessionActive: (active: boolean) => void
}

async function validateTokensInBackgroundFlow({
  tokens,
  validateTokens,
  fetchProfile,
  getLatestGravatarEmail,
  setLatestGravatarEmail,
  setGravatarEmail,
  disconnectAndClearState,
  setState,
  getIsOnline
}: ValidateTokensInBackgroundParams): Promise<void> {
  try {
    const identity = await validateTokens(tokens)
    if (!useProfileCacheStore.getState().profile) {
      try {
        const userProfile = await fetchProfile(identity.username, tokens)
        if (!getLatestGravatarEmail() && userProfile.email) {
          setLatestGravatarEmail(userProfile.email)
          setGravatarEmail(userProfile.email)
        }
      } catch {
        useProfileCacheStore
          .getState()
          .setProfile(createMinimalProfile(identity))
      }
    }
  } catch (error: unknown) {
    if (isAuthError(error)) {
      disconnectAndClearState()
      setState({
        isAuthenticated: false,
        isLoading: false,
        isOnline: getIsOnline(),
        hasStoredTokens: false,
        oauthTokens: null
      })
    } else {
      console.warn(
        'Background token validation failed due to transient error, will retry later:',
        error
      )
    }
  }
}

async function performAuthValidationFlow({
  tokens,
  options,
  validateTokens,
  disconnectAndClearState,
  setState,
  getIsOnline,
  setTokens,
  setSessionActive,
  fetchProfile,
  getLatestGravatarEmail,
  setLatestGravatarEmail,
  setGravatarEmail
}: PerformAuthValidationParams): Promise<void> {
  let identity: DiscogsIdentity
  try {
    identity = await validateTokens(tokens)
  } catch (error) {
    if (isAuthError(error)) {
      disconnectAndClearState()
      setState({
        isAuthenticated: false,
        isLoading: false,
        isOnline: getIsOnline(),
        hasStoredTokens: false,
        oauthTokens: null
      })
    } else {
      console.warn(
        'Token validation failed due to transient error, will retry later:',
        error
      )

      if (useProfileCacheStore.getState().profile) {
        if (options.storeTokens) {
          setTokens(tokens)
        }
        setSessionActive(true)
        setState((prev) => ({
          ...prev,
          isAuthenticated: true,
          isLoading: false,
          oauthTokens: tokens
        }))
        return
      }

      setState((prev) => ({
        ...prev,
        isLoading: false,
        hasStoredTokens: true
      }))
    }
    throw error
  }

  const cachedProfile = useProfileCacheStore.getState().profile
  if (options.forceProfileRefresh || !cachedProfile) {
    try {
      const userProfile = await fetchProfile(identity.username, tokens)
      if (!getLatestGravatarEmail() && userProfile.email) {
        setLatestGravatarEmail(userProfile.email)
        setGravatarEmail(userProfile.email)
      }
    } catch (profileError) {
      console.warn('Profile fetch failed, using identity data:', profileError)
      useProfileCacheStore.getState().setProfile(createMinimalProfile(identity))
    }
  }

  if (options.storeTokens) {
    setTokens(tokens)
  }
  setSessionActive(true)
  setState((prev) => ({
    ...prev,
    isAuthenticated: true,
    isLoading: false,
    oauthTokens: tokens
  }))
}

/**
 * Provides authentication state and methods to the app.
 * Handles OAuth token validation, session management, and cross-tab sync.
 *
 * @param props - Component props
 * @param props.children - The app component tree
 * @returns Provider wrapper with auth context
 *
 * @example
 * ```tsx
 * <AuthProvider>
 *   <App />
 * </AuthProvider>
 * ```
 */
export function AuthProvider({
  children
}: AuthProviderProps): React.JSX.Element {
  const { gravatarEmail, setGravatarEmail } = usePreferences()
  const latestGravatarEmailRef = useRef(gravatarEmail)

  // Subscribe to Zustand auth store
  const authTokens = useAuthStore((state) => state.tokens)
  const sessionActive = useAuthStore((state) => state.sessionActive)
  const setTokens = useAuthStore((state) => state.setTokens)
  const setSessionActive = useAuthStore((state) => state.setSessionActive)
  const signOutStore = useAuthStore((state) => state.signOut)
  const disconnectStore = useAuthStore((state) => state.disconnect)

  // Online status
  const isOnline = useOnlineStatus()

  // Track if IndexedDB cache is still being restored (needed for collection, cross-tab sync)
  const isRestoring = useIsRestoring()

  // localStorage profile cache (synchronous — available before IndexedDB hydrates)
  const hasProfileCache = useProfileCacheStore(
    (state) => state.profile !== null
  )

  // User profile hook (reads/writes localStorage-backed Zustand store)
  const { fetchProfile, clearProfile } = useUserProfile()

  // Query client for cache management (collection, not profile)
  const queryClient = useQueryClient()

  // Track previous tokens to detect changes (for cross-account leakage prevention)
  const prevTokensRef = useRef(authTokens)

  // Track if we've completed initialization to avoid repeated network validation
  const hasInitializedRef = useRef(false)

  // Track previous online state to detect offline→online transitions
  const wasOnlineRef = useRef(isOnline)

  // Track current online status for use in async callbacks (avoids stale closure)
  const isOnlineRef = useRef(isOnline)
  useEffect(() => {
    isOnlineRef.current = isOnline
  }, [isOnline])

  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    isOnline: true,
    hasStoredTokens: false,
    oauthTokens: null
  })

  // Get tRPC utils for direct client access
  const trpcUtils = trpc.useUtils()

  useEffect(() => {
    latestGravatarEmailRef.current = gravatarEmail
  }, [gravatarEmail])

  // Clear stale profile if tokens change without disconnect (prevents cross-account leakage)
  useEffect(() => {
    if (
      prevTokensRef.current &&
      authTokens &&
      (prevTokensRef.current.accessToken !== authTokens.accessToken ||
        prevTokensRef.current.accessTokenSecret !==
          authTokens.accessTokenSecret)
    ) {
      // Tokens changed without disconnect - clear stale profile and require re-validation
      clearProfile()
      hasInitializedRef.current = false
    }
    prevTokensRef.current = authTokens
  }, [authTokens, clearProfile])

  /**
   * Validates OAuth tokens by fetching identity from the server.
   * Does NOT fetch profile - use establishSession for that.
   */
  const validateTokens = async (tokens: {
    accessToken: string
    accessTokenSecret: string
  }): Promise<DiscogsIdentity> => {
    const identity = await trpcUtils.client.discogs.getIdentity.query({
      accessToken: tokens.accessToken,
      accessTokenSecret: tokens.accessTokenSecret
    })

    return identity
  }

  /**
   * Clears all cached data: TanStack Query, IndexedDB, and browser caches.
   * Used during disconnect, auth errors, and cross-tab sync.
   *
   * Cache clearing is deferred to the next microtask to prevent React warnings
   * about updating components (e.g., SyncToastManager) while rendering
   * another component (AuthProvider). This happens because queryClient.clear()
   * synchronously notifies cache subscribers via useSyncExternalStore.
   */
  const clearAllCaches = (): void => {
    queueMicrotask(() => {
      // Clear TanStack Query in-memory cache (collection data)
      queryClient.clear()

      // Clear IndexedDB via the persister (errors handled internally)
      void queryPersister.removeClient()

      // Clear browser caches for sensitive data
      if ('caches' in window) {
        Object.values(CACHE_NAMES).forEach((name) => {
          caches.delete(name).catch(() => {
            // Ignore errors if cache doesn't exist
          })
        })
      }
    })
  }

  const clearSyncState = (): void => {
    useSyncStateStore.getState().clearAll()
  }

  const disconnectAndClearState = (): void => {
    disconnectStore()
    clearSyncState()
    clearAllCaches()
  }

  /**
   * Stores the latest background token validation function for effects that
   * intentionally avoid depending on unstable callback identities.
   */
  const validateTokensInBackgroundRef = useRef<
    (tokens: { accessToken: string; accessTokenSecret: string }) => void
  >(() => {})
  useEffect(() => {
    validateTokensInBackgroundRef.current = (tokens: {
      accessToken: string
      accessTokenSecret: string
    }): void => {
      void validateTokensInBackgroundFlow({
        tokens,
        validateTokens,
        fetchProfile,
        getLatestGravatarEmail: () => latestGravatarEmailRef.current,
        setLatestGravatarEmail: (email) => {
          latestGravatarEmailRef.current = email
        },
        setGravatarEmail,
        disconnectAndClearState,
        setState,
        getIsOnline: () => isOnlineRef.current
      })
    }
  })

  /**
   * Core auth validation flow shared by validateOAuthTokens and establishSession.
   * Validates tokens, handles errors, fetches profile, and updates session state.
   *
   * @param tokens - OAuth tokens to validate
   * @param options.forceProfileRefresh - Always fetch profile even if cached
   * @param options.storeTokens - Whether to persist tokens to store
   */
  const performAuthValidation = async (
    tokens: { accessToken: string; accessTokenSecret: string },
    options: { forceProfileRefresh: boolean; storeTokens: boolean }
  ): Promise<void> => {
    await performAuthValidationFlow({
      tokens,
      options,
      validateTokens,
      disconnectAndClearState,
      setState,
      getIsOnline: () => isOnlineRef.current,
      setTokens,
      setSessionActive,
      fetchProfile,
      getLatestGravatarEmail: () => latestGravatarEmailRef.current,
      setLatestGravatarEmail: (email) => {
        latestGravatarEmailRef.current = email
      },
      setGravatarEmail
    })
  }

  /**
   * Validates OAuth tokens in the background.
   * Called on page load when online to verify tokens are still valid.
   * Only fetches profile if not already cached.
   */
  const validateOAuthTokens = async (tokens?: {
    accessToken: string
    accessTokenSecret: string
  }): Promise<void> => {
    const tokensToValidate = tokens ?? authTokens
    if (!tokensToValidate) {
      throw new Error('No OAuth tokens found')
    }

    setState((prev) => ({ ...prev, isLoading: true }))
    await performAuthValidation(tokensToValidate, {
      forceProfileRefresh: false,
      storeTokens: Boolean(tokens)
    })
  }

  /**
   * Establishes a full session: validates tokens and fetches fresh profile.
   * Called on login, "Continue" click, and reconnect.
   *
   * OFFLINE BEHAVIOR: If offline and cached profile exists, trusts cached
   * state without network validation. If offline with no cached profile,
   * throws OfflineNoCacheError.
   */
  const establishSession = async (tokens?: {
    accessToken: string
    accessTokenSecret: string
  }): Promise<void> => {
    const tokensToUse = tokens ?? authTokens
    if (!tokensToUse) {
      throw new Error('No OAuth tokens found')
    }

    setState((prev) => ({ ...prev, isLoading: true }))

    // OFFLINE PATH: trust cached state if available
    if (!isOnline && !tokens) {
      const hasCachedProfile = useProfileCacheStore.getState().profile !== null

      if (!hasCachedProfile) {
        setState((prev) => ({ ...prev, isLoading: false }))
        throw new OfflineNoCacheError()
      }

      setSessionActive(true)
      setState((prev) => ({
        ...prev,
        isAuthenticated: true,
        isLoading: false,
        oauthTokens: tokensToUse
      }))
      return
    }

    // ONLINE PATH: validate and fetch fresh profile
    await performAuthValidation(tokensToUse, {
      forceProfileRefresh: true,
      storeTokens: Boolean(tokens)
    })
  }

  // Initialize auth - Zustand hydrates synchronously from localStorage,
  // so we can be optimistic immediately if tokens + sessionActive exist
  useEffect(() => {
    // Skip re-initialization if already initialized
    if (hasInitializedRef.current && state.isAuthenticated) {
      return
    }

    let nextState: AuthState

    if (!authTokens) {
      hasInitializedRef.current = false
      nextState = {
        isAuthenticated: false,
        isLoading: false,
        isOnline,
        hasStoredTokens: false,
        oauthTokens: null
      }
    } else if (!sessionActive || (!isOnline && !hasProfileCache)) {
      hasInitializedRef.current = false
      nextState = {
        isAuthenticated: false,
        isLoading: false,
        isOnline,
        hasStoredTokens: true,
        oauthTokens: null
      }
    } else {
      // OPTIMISTIC AUTH: tokens + sessionActive = authenticate immediately
      // Profile is available from localStorage, no async wait required
      hasInitializedRef.current = true
      nextState = {
        isAuthenticated: true,
        isLoading: false,
        isOnline,
        hasStoredTokens: true,
        oauthTokens: authTokens
      }

      const shouldValidateInBackground = isOnline

      queueMicrotask(() => {
        setState(nextState)

        // If online, validate tokens in background (user won't see a loader)
        // If validation fails (401/403), user will be disconnected
        if (shouldValidateInBackground) {
          validateTokensInBackgroundRef.current(authTokens)
        }
      })

      return
    }

    queueMicrotask(() => {
      setState(nextState)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Network validation guarded by hasInitializedRef
  }, [authTokens, sessionActive, isOnline, hasProfileCache])

  const effectiveState: AuthState = {
    ...state,
    isOnline,
    hasStoredTokens: authTokens !== null
  }

  // Sync derived auth state when Zustand store changes (cross-tab sync)
  useCrossTabAuthSync({
    authTokens,
    sessionActive,
    isRestoring,
    state: effectiveState,
    setState,
    onCrossTabDisconnect: () => {
      clearSyncState()
      clearAllCaches()
    }
  })

  // Revalidate tokens when coming back online (background validation, no loader)
  useEffect(() => {
    const wasOffline = !wasOnlineRef.current
    wasOnlineRef.current = isOnline

    // Only trigger on offline→online transition with active authenticated session
    if (
      wasOffline &&
      isOnline &&
      sessionActive &&
      state.isAuthenticated &&
      authTokens
    ) {
      validateTokensInBackgroundRef.current(authTokens)
    }
  }, [isOnline, sessionActive, state.isAuthenticated, authTokens])

  /**
   * Sign out - ends session but preserves OAuth tokens.
   * User will see "Welcome back" flow on next login.
   */
  const signOut = (): void => {
    signOutStore()

    setState((prev) => ({
      ...prev,
      isAuthenticated: false,
      isLoading: false,
      oauthTokens: null
    }))
  }

  /**
   * Disconnect - fully removes Discogs authorization.
   * Clears all tokens, profile cache, and IndexedDB data.
   */
  const disconnect = (): void => {
    // Store's disconnect() handles token, preference, and profile cleanup
    disconnectAndClearState()

    setState({
      isAuthenticated: false,
      isLoading: false,
      isOnline: isOnlineRef.current,
      hasStoredTokens: false,
      oauthTokens: null
    })
  }

  // eslint-disable-next-line react/jsx-no-constructed-context-values -- React Compiler handles memoization; manual useMemo is disallowed in this project
  const contextValue = {
    ...effectiveState,
    validateOAuthTokens,
    establishSession,
    signOut,
    disconnect
  }

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  )
}
