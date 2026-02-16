import { useState } from 'react'

import { trpc } from '@/lib/trpc'
import {
  type UserProfile,
  useProfileCacheStore
} from '@/stores/profile-cache-store'

/**
 * Manages user profile data via localStorage-backed Zustand store.
 * Profile is available synchronously on first render — no IndexedDB wait.
 *
 * - Data is set manually via fetchProfile(), not automatically
 * - Call fetchProfile() on login/continue/reconnect (forceProfileRefresh)
 * - Normal page refreshes use the cached profile without network requests
 * - Profile is cleared when disconnect() is called
 */
export function useUserProfile(): {
  profile: UserProfile | undefined
  isFetching: boolean
  error: Error | null
  fetchProfile: (
    username: string,
    tokens: { accessToken: string; accessTokenSecret: string }
  ) => Promise<UserProfile>
  clearProfile: () => void
} {
  const trpcUtils = trpc.useUtils()
  const [isFetching, setIsFetching] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const profile = useProfileCacheStore((state) => state.profile)

  /**
   * Fetches profile from API and stores it in localStorage.
   * Call after successful token validation.
   *
   * @param username - The username to fetch profile for
   * @param tokens - OAuth tokens for the request (passed directly to avoid store timing issues)
   * @returns The fetched user profile
   */
  const fetchProfile = async (
    username: string,
    tokens: { accessToken: string; accessTokenSecret: string }
  ): Promise<UserProfile> => {
    setIsFetching(true)
    setError(null)
    try {
      const result = await trpcUtils.client.discogs.getUserProfile.query({
        accessToken: tokens.accessToken,
        accessTokenSecret: tokens.accessTokenSecret,
        username
      })

      const userProfile: UserProfile = {
        id: result.id,
        username: result.username,
        avatar_url: result.avatar_url,
        // Only include email if defined (exactOptionalPropertyTypes compliance)
        ...(result.email !== undefined && { email: result.email })
      }

      useProfileCacheStore.getState().setProfile(userProfile)
      return userProfile
    } catch (err) {
      const fetchError =
        err instanceof Error ? err : new Error('Failed to fetch profile')
      setError(fetchError)
      throw fetchError
    } finally {
      setIsFetching(false)
    }
  }

  /**
   * Clears profile from localStorage and resets error state.
   * Called during disconnect flow.
   */
  const clearProfile = () => {
    useProfileCacheStore.getState().clearProfile()
    setError(null)
  }

  return {
    profile: profile ?? undefined,
    isFetching,
    error,
    fetchProfile,
    clearProfile
  }
}
