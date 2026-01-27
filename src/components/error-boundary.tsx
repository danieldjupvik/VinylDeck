import { QueryErrorResetBoundary } from '@tanstack/react-query'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

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
      return (
        <ErrorFallback error={this.state.error} onReset={this.handleReset} />
      )
    }
    return this.props.children
  }
}

interface ErrorFallbackProps {
  error: Error | null
  onReset: () => void
}

function ErrorFallback({
  error,
  onReset
}: ErrorFallbackProps): React.JSX.Element {
  const { t } = useTranslation()

  // Log the actual error for debugging (visible in DevTools console)
  if (error) {
    console.error('Application error:', error)
  }

  return (
    <GradientBackground>
      <div className="animate-in fade-in zoom-in-95 flex min-h-screen flex-col items-center justify-center p-6 text-center duration-300">
        <h1 className="text-8xl font-bold tracking-tighter opacity-20">!</h1>
        <h2 className="mt-4 text-2xl font-semibold">{t('errors.oopsTitle')}</h2>
        <p className="text-muted-foreground mt-3 text-base whitespace-pre-line">
          {t('errors.unexpectedErrorDescription')}
        </p>
        <Button variant="outline" className="mt-8" onClick={onReset}>
          {t('errors.tryAgain')}
        </Button>
      </div>
    </GradientBackground>
  )
}

/**
 * App-level error boundary with TanStack Query integration.
 * Catches unexpected React errors and provides a retry mechanism.
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
