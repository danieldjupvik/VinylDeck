import { describe, expect, it, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useViewPreference } from '@/hooks/use-view-preference'

describe('useViewPreference', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('defaults to grid view', () => {
    const { result } = renderHook(() => useViewPreference())
    expect(result.current.viewMode).toBe('grid')
    expect(result.current.isGrid).toBe(true)
    expect(result.current.isTable).toBe(false)
  })

  it('toggles view and persists to storage', () => {
    const { result } = renderHook(() => useViewPreference())

    act(() => {
      result.current.toggleView()
    })

    expect(result.current.viewMode).toBe('table')
    expect(localStorage.getItem('vinyldeck_view_mode')).toBe('table')

    act(() => {
      result.current.toggleView()
    })

    expect(result.current.viewMode).toBe('grid')
    expect(localStorage.getItem('vinyldeck_view_mode')).toBe('grid')
  })
})
