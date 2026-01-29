import { useTranslation } from 'react-i18next'

import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarImage
} from '@/components/ui/avatar'
import { cn } from '@/lib/utils'

type UserAvatarSize = 'sm' | 'md' | 'lg'

interface UserAvatarProps {
  username?: string | undefined
  avatarUrl?: string | undefined
  isOnline?: boolean
  size?: UserAvatarSize
  className?: string
  badgeClassName?: string
}

const sizeClasses: Record<UserAvatarSize, string> = {
  sm: 'size-8',
  md: 'size-12',
  lg: 'size-16'
}

const fallbackTextClasses: Record<UserAvatarSize, string> = {
  sm: 'text-sm',
  md: 'text-lg',
  lg: 'text-xl'
}

/**
 * Generates initials from a username (first 2 characters uppercase).
 *
 * @param username - The username to extract initials from
 * @returns Two-character uppercase initials, or '?' if username is empty
 */
function getInitials(username?: string): string {
  if (!username) return '?'
  return username.slice(0, 2).toUpperCase()
}

/**
 * Reusable user avatar component with optional online status badge.
 *
 * Displays an avatar image with fallback initials and optional online/offline
 * status indicator. Consolidates the repeated avatar pattern used across
 * login, settings, and sidebar components.
 *
 * @param props - Component props
 * @param props.username - User's display name (used for alt text and initials)
 * @param props.avatarUrl - URL of the avatar image
 * @param props.isOnline - Online status; if undefined, badge is not shown
 * @param props.size - Avatar size: 'sm' (32px), 'md' (48px), or 'lg' (64px)
 * @param props.className - Additional classes for the Avatar root
 * @param props.badgeClassName - Additional classes for the AvatarBadge
 * @returns The UserAvatar component
 *
 * @example
 * // Basic usage with online status
 * <UserAvatar username="john" avatarUrl="/avatar.jpg" isOnline={true} />
 *
 * @example
 * // Without status badge
 * <UserAvatar username="john" avatarUrl="/avatar.jpg" />
 *
 * @example
 * // Small size for compact layouts
 * <UserAvatar username="john" size="sm" isOnline={false} />
 */
export function UserAvatar({
  username,
  avatarUrl,
  isOnline,
  size = 'md',
  className,
  badgeClassName
}: UserAvatarProps): React.JSX.Element {
  const { t } = useTranslation()

  const initials = getInitials(username)
  const showBadge = isOnline !== undefined

  return (
    <Avatar
      className={cn(
        'ring-border overflow-visible ring-2',
        sizeClasses[size],
        className
      )}
    >
      {avatarUrl?.trim() ? (
        <AvatarImage src={avatarUrl} alt={username ?? t('user.fallback')} />
      ) : null}
      <AvatarFallback className={cn('font-medium', fallbackTextClasses[size])}>
        {initials}
      </AvatarFallback>
      {showBadge ? (
        <AvatarBadge
          className={cn(
            isOnline ? 'bg-green-500 dark:bg-green-600' : 'bg-red-600',
            badgeClassName
          )}
          aria-label={t(
            isOnline ? 'user.status.online' : 'user.status.offline'
          )}
        />
      ) : null}
    </Avatar>
  )
}
