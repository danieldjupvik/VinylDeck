import {
  Link,
  useLocation,
  useNavigate,
  useRouterState
} from '@tanstack/react-router'
import { LogOut, Settings } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { UserAvatar } from '@/components/common/user-avatar'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { useAuth } from '@/hooks/use-auth'
import { useOnlineStatus } from '@/hooks/use-online-status'
import { usePreferences } from '@/hooks/use-preferences'
import { useUserProfile } from '@/hooks/use-user-profile'
import { storeRedirectUrl } from '@/lib/redirect-utils'

import type { MouseEvent } from 'react'

export function SidebarUser(): React.JSX.Element {
  const { t } = useTranslation()
  const { signOut } = useAuth()
  const { profile } = useUserProfile()
  const isOnline = useOnlineStatus()
  const { avatarSource, gravatarUrl } = usePreferences()
  const navigate = useNavigate()
  const location = useRouterState({ select: (s) => s.location })
  const routeLocation = useLocation()
  const { isMobile, setOpenMobile, state } = useSidebar()

  const username = profile?.username
  const avatarUrl = profile?.avatar_url

  const isActive = (path: string) =>
    routeLocation.pathname === path ||
    routeLocation.pathname.startsWith(`${path}/`)

  const handleNavClick =
    (path: string) => (event: MouseEvent<HTMLAnchorElement>) => {
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button === 1
      ) {
        return
      }

      if (isActive(path)) {
        event.preventDefault()
      }

      if (isMobile) {
        setOpenMobile(false)
      }
    }

  const handleSignOut = () => {
    const currentUrl = location.pathname + location.searchStr + location.hash
    storeRedirectUrl(currentUrl)

    signOut()
    toast.success(t('auth.signOutSuccess'))
    void navigate({ to: '/login' })

    if (isMobile) {
      setOpenMobile(false)
    }
  }

  const preferredAvatar = avatarSource === 'gravatar' ? gravatarUrl : avatarUrl
  const fallbackAvatar = avatarSource === 'gravatar' ? avatarUrl : gravatarUrl
  const resolvedAvatar = preferredAvatar ?? fallbackAvatar ?? undefined

  return (
    <SidebarMenu>
      {/* Settings */}
      <SidebarMenuItem>
        <SidebarMenuButton
          asChild
          isActive={isActive('/settings')}
          tooltip={t('nav.settings')}
        >
          <Link
            to="/settings"
            viewTransition
            onClick={handleNavClick('/settings')}
          >
            <Settings />
            <span>{t('nav.settings')}</span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>

      {/* Sign Out */}
      <SidebarMenuItem>
        <SidebarMenuButton onClick={handleSignOut} tooltip={t('auth.signOut')}>
          <LogOut />
          <span>{t('auth.signOut')}</span>
        </SidebarMenuButton>
      </SidebarMenuItem>

      {/* User info row */}
      <SidebarMenuItem>
        <div className="flex h-12 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0! [&>span:last-child]:truncate">
          <Tooltip>
            <TooltipTrigger asChild>
              <span
                role="button"
                tabIndex={0}
                className="cursor-default"
                aria-label={`${username ?? t('user.fallback')} - ${t(isOnline ? 'user.status.online' : 'user.status.offline')}`}
              >
                <UserAvatar
                  username={username}
                  avatarUrl={resolvedAvatar}
                  isOnline={isOnline}
                  size="sm"
                  className="group-data-[collapsible=icon]:size-5"
                  badgeClassName="group-data-[collapsible=icon]:!size-1.5"
                />
              </span>
            </TooltipTrigger>
            <TooltipContent
              side={state === 'collapsed' && !isMobile ? 'right' : 'top'}
              align="center"
            >
              {t(isOnline ? 'user.status.online' : 'user.status.offline')}
            </TooltipContent>
          </Tooltip>
          <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-medium">{username}</span>
          </div>
        </div>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
