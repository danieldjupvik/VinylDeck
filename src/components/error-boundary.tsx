import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/common/empty-state'
import { GradientBackground } from '@/components/layout/gradient-background'
import { Button } from '@/components/ui/button'

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

interface ErrorBoundaryProps {
  children: ReactNode
  onReset?: () => void
}

/**
 * Error boundary that catches React rendering errors.
 * Integrates with TanStack Query's QueryErrorResetBoundary for retry support.
 */
class ErrorBoundaryInner extends Component<
  ErrorBoundaryProps & { resetErrorBoundary: () => void },
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps & { resetErrorBoundary: () => void }) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error for debugging (in production, send to error tracking service)
    console.error('React Error Boundary caught an error:', error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
    this.props.resetErrorBoundary()
    this.props.onReset?.()
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return <ErrorFallback onReset={this.handleReset} />
    }
    return this.props.children
  }
}

interface ErrorFallbackProps {
  onReset: () => void
}

function ErrorFallback({ onReset }: ErrorFallbackProps): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <GradientBackground>
      <EmptyState
        iconText="!"
        title={t('errors.oopsTitle')}
        description={t('errors.unexpectedErrorDescription')}
        size="fullScreen"
        action={
          <Button variant="outline" onClick={onReset}>
            {t('errors.tryAgain')}
          </Button>
        }
      />
    </GradientBackground>
  )
}

/**
 * App-level error boundary with TanStack Query integration.
 * Catches unexpected React errors and provides a retry mechanism.
 *
 * @param props - Component props
 * @param props.children - The component tree to wrap with error boundary
 * @returns The wrapped children or error fallback UI
 *
 * @example
 * ```tsx
 * <AppErrorBoundary>
 *   <App />
 * </AppErrorBoundary>
 * ```
 */
export function AppErrorBoundary({
  children
}: {
  children: ReactNode
}): React.JSX.Element {
  return (
    <QueryErrorResetBoundary>
      {({ reset }) => (
        <ErrorBoundaryInner resetErrorBoundary={reset}>
          {children}
        </ErrorBoundaryInner>
      )}
    </QueryErrorResetBoundary>
  )
}
