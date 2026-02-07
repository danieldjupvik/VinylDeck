import type { MouseEvent } from 'react'

interface SidebarNavClickOptions {
  isActivePath: (path: string) => boolean
  isMobile: boolean
  setOpenMobile: (open: boolean) => void
}

export const createSidebarNavClickHandler =
  ({
    isActivePath,
    isMobile,
    setOpenMobile
  }: SidebarNavClickOptions): ((
    path: string
  ) => (event: MouseEvent<HTMLAnchorElement>) => void) =>
  (path: string) =>
  (event: MouseEvent<HTMLAnchorElement>) => {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button === 1
    ) {
      return
    }

    if (isActivePath(path)) {
      event.preventDefault()
    }

    if (isMobile) {
      setOpenMobile(false)
    }
  }
