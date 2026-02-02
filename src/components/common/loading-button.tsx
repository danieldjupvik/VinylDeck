import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

type ButtonProps = React.ComponentProps<typeof Button>

interface LoadingButtonProps extends ButtonProps {
  /** Whether the button is in a loading state */
  isLoading: boolean
  /** Optional text to show during loading. If not provided, children stay visible */
  loadingText?: string
}

/**
 * Button with built-in loading state and spinner.
 *
 * Supports two patterns:
 * - With loadingText: Shows spinner + loadingText during loading (dynamic text)
 * - Without loadingText: Shows spinner + children during loading (shadcn default)
 *
 * @param isLoading - Whether the button is loading
 * @param loadingText - Optional text to show during loading
 * @param children - Button content
 * @param disabled - Additional disabled state (combined with isLoading)
 */
export function LoadingButton({
  isLoading,
  loadingText,
  children,
  disabled,
  ...props
}: LoadingButtonProps): React.ReactNode {
  return (
    <Button disabled={disabled || isLoading} {...props}>
      {isLoading ? (
        <>
          <Spinner />
          {loadingText ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
