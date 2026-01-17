import { describe, expect, it } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import type { ReactNode } from 'react'
import { AuthProvider } from '@/providers/auth-provider'
import { PreferencesProvider } from '@/providers/preferences-provider'
import { useAuth } from '@/hooks/use-auth'

const wrapper = ({ children }: { children: ReactNode }) => (
  <PreferencesProvider>
    <AuthProvider>{children}</AuthProvider>
  </PreferencesProvider>
)

describe('useAuth', () => {
  it('starts unauthenticated when no token is stored', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.username).toBeNull()
  })

  it('logs in and updates auth state', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.login('testuser', 'valid-token')
    })

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.username).toBe('testuser')
    expect(localStorage.getItem('vinylview_token')).toBe('valid-token')
  })

  it('logs out and clears auth state', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    await act(async () => {
      await result.current.login('testuser', 'valid-token')
    })

    act(() => {
      result.current.logout()
    })

    expect(result.current.isAuthenticated).toBe(false)
    expect(result.current.username).toBeNull()
    expect(localStorage.getItem('vinylview_token')).toBeNull()
  })
})
