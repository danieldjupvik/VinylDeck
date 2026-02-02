import { Link, Outlet, createRootRoute } from '@tanstack/react-router'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/common/empty-state'
import { AppErrorBoundary } from '@/components/error-boundary'
import { GradientBackground } from '@/components/layout/gradient-background'
import { Button } from '@/components/ui/button'
import { Toaster } from '@/components/ui/sonner'

export const Route = createRootRoute({
  component: RootComponent,
  notFoundComponent: NotFoundComponent
})

function RootComponent() {
  return (
    <div className="bg-background text-foreground min-h-screen">
      <AppErrorBoundary>
        <Outlet />
      </AppErrorBoundary>
      <Toaster />
      <SpeedInsights />
    </div>
  )
}

function NotFoundComponent() {
  const { t } = useTranslation()

  return (
    <GradientBackground>
      <EmptyState
        iconText="404"
        title={t('errors.notFoundTitle')}
        description={t('errors.notFoundDescription')}
        size="fullScreen"
        action={
          <Button asChild variant="outline">
            <Link to="/" viewTransition>
              {t('errors.backHome')}
            </Link>
          </Button>
        }
      />
    </GradientBackground>
  )
}
