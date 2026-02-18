import { cn } from '@/lib/utils'

interface EmptyStateProps {
  /** Icon component to display */
  icon?: React.ReactNode
  /** Large text to display instead of icon (e.g., "404", "!") */
  iconText?: string
  /** Title text */
  title?: string
  /** Description text */
  description: string
  /** Action element (typically a Button or Link) */
  action?: React.ReactNode
  /** Height variant */
  size?: 'default' | 'fullScreen' | 'fullHeight'
  /** Additional classes for the container */
  className?: string
}

const sizeClasses = {
  default: 'py-20',
  fullScreen: 'min-h-screen',
  fullHeight: 'h-full'
} as const

/**
 * Empty state component for displaying placeholder content.
 *
 * Used for empty lists, 404 pages, error states, and similar scenarios.
 * Supports either an icon or large text as the visual element.
 *
 * @param icon - Icon component to display
 * @param iconText - Large text alternative to icon (e.g., "404")
 * @param title - Optional title
 * @param description - Description text
 * @param action - Optional action element (Button, Link, etc.)
 * @param size - Height variant: 'default' (py-20), 'fullScreen', or 'fullHeight'
 * @param className - Additional container classes
 * @returns The rendered empty state component
 */
export function EmptyState({
  icon,
  iconText,
  title,
  description,
  action,
  size = 'default',
  className
}: EmptyStateProps): React.ReactNode {
  return (
    <div
      className={cn(
        'animate-in fade-in zoom-in-95 flex flex-col items-center justify-center p-6 text-center duration-300',
        sizeClasses[size],
        className
      )}
    >
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      {!icon && iconText ? (
        <span
          className="text-8xl font-bold tracking-tighter opacity-20"
          aria-hidden="true"
        >
          {iconText}
        </span>
      ) : null}

      {title ? <h1 className="mt-4 text-2xl font-semibold">{title}</h1> : null}

      <p
        className={cn(
          'text-muted-foreground whitespace-pre-line',
          title ? 'mt-3 text-base' : 'mt-6 text-lg font-medium'
        )}
      >
        {description}
      </p>

      {action ? <div className="mt-8">{action}</div> : null}
    </div>
  )
}
