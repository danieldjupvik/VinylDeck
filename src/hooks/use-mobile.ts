import * as React from 'react'

const MOBILE_BREAKPOINT = 768

/**
 * Detects if the viewport is mobile-sized (< 768px).
 *
 * Initializes with actual window state to avoid layout flicker on first render.
 * Updates on viewport resize via matchMedia listener.
 *
 * @returns Whether viewport width is below mobile breakpoint
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches
  })

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(mql.matches)
    }
    mql.addEventListener('change', onChange)
    return () => {
      mql.removeEventListener('change', onChange)
    }
  }, [])

  return isMobile
}
