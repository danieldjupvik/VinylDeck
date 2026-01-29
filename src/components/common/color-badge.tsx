import { cva, type VariantProps } from 'class-variance-authority'

import { cn } from '@/lib/utils'

const colorBadgeVariants = cva(
  'inline-flex items-center justify-center rounded-full border border-transparent px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none transition-[color,box-shadow] overflow-hidden',
  {
    variants: {
      color: {
        green:
          'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
        amber:
          'bg-amber-500/15 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
        blue: 'bg-blue-500/15 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
        red: 'bg-red-500/15 text-red-700 dark:bg-red-500/20 dark:text-red-400',
        purple:
          'bg-purple-500/15 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
        gray: 'bg-gray-500/15 text-gray-700 dark:bg-gray-500/20 dark:text-gray-400'
      }
    },
    defaultVariants: {
      color: 'gray'
    }
  }
)

type ColorBadgeProps = React.ComponentProps<'span'> &
  VariantProps<typeof colorBadgeVariants>

/**
 * A badge component with semantic color variants.
 *
 * Use this for color-coded labels like changelog categories, status indicators, or tags.
 * For standard badge variants (default, secondary, destructive, outline), use the base Badge component.
 *
 * @param color - Color variant: green, amber, blue, red, purple, gray
 */
function ColorBadge({
  className,
  color,
  ...props
}: ColorBadgeProps): React.ReactNode {
  return (
    <span
      data-slot="color-badge"
      className={cn(colorBadgeVariants({ color }), className)}
      {...props}
    />
  )
}

export { ColorBadge }
