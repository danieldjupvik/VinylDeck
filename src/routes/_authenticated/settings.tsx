import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { NO, US } from 'country-flag-icons/react/3x2'
import {
  FileText,
  LogOut,
  Monitor,
  Moon,
  Scale,
  Shield,
  Sun
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { VersionAccordion } from '@/components/changelog/version-accordion'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { ResponsiveDialog } from '@/components/common/responsive-dialog'
import { UserAvatar } from '@/components/common/user-avatar'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { changelog } from '@/data/changelog'
import { useAuth } from '@/hooks/use-auth'
import { usePreferences } from '@/hooks/use-preferences'
import { useUserProfile } from '@/hooks/use-user-profile'
import { buildTranslatedEntries } from '@/lib/changelog-utils'
import { APP_VERSION } from '@/lib/constants'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_authenticated/settings')({
  component: SettingsPage
})

const normalizeLanguage = (value: string) => {
  const normalized = value.toLowerCase()
  if (
    normalized.startsWith('no') ||
    normalized.startsWith('nb') ||
    normalized.startsWith('nn')
  ) {
    return 'no'
  }
  return 'en'
}

interface SelectionCardProps {
  selected: boolean
  onClick: () => void
  icon: React.ReactNode
  title: string
  hint: string
}

function SelectionCard({
  selected,
  onClick,
  icon,
  title,
  hint
}: SelectionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'hover:bg-accent/50 flex w-full items-center gap-3 rounded-md border p-3 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-md',
        selected ? 'border-primary/60 bg-primary/10 shadow-sm' : 'border-border'
      )}
    >
      <div className="bg-muted flex size-10 shrink-0 items-center justify-center rounded-md">
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{title}</div>
        <div className="text-muted-foreground truncate text-xs">{hint}</div>
      </div>
    </button>
  )
}

function LanguageFlag({ lang }: { lang: 'en' | 'no' }) {
  const FlagComponent = lang === 'no' ? NO : US

  return (
    <span
      className="flex size-5 items-center justify-center overflow-hidden rounded-full"
      aria-hidden="true"
    >
      <FlagComponent className="max-w-none scale-[1.8]" />
    </span>
  )
}

function SettingsPage() {
  const { t, i18n } = useTranslation()
  const { disconnect } = useAuth()
  const { profile } = useUserProfile()
  const username = profile?.username
  const avatarUrl = profile?.avatar_url
  const { avatarSource, gravatarUrl, setAvatarSource } = usePreferences()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [changelogOpen, setChangelogOpen] = useState(false)
  // i18n.language is always defined as string, normalizeLanguage defaults unknown languages to 'en'
  const currentLanguage = normalizeLanguage(i18n.language)

  const handleDisconnect = (): void => {
    disconnect()
    toast.success(t('settings.account.disconnectSuccess'))
    void navigate({ to: '/login' })
  }

  const allVersions = changelog.map((v) => ({
    version: v.version,
    date: v.date,
    entries: buildTranslatedEntries(v, t)
  }))

  return (
    <>
      <div className="mx-auto w-full max-w-4xl p-4 sm:p-6">
        <div className="animate-in fade-in slide-in-from-bottom-2 space-y-1 duration-500">
          <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
          <p className="text-muted-foreground text-sm">
            {t('settings.subtitle')}
          </p>
        </div>

        <div className="mt-6 space-y-6">
          <Card className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards delay-100 duration-500">
            <CardHeader>
              <CardTitle>{t('settings.profile.title')}</CardTitle>
              <CardDescription>
                {t('settings.profile.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium">
                    {t('settings.profile.avatar.title')}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {t('settings.profile.avatar.description')}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarSource('discogs')
                    }}
                    aria-pressed={avatarSource === 'discogs'}
                    className={cn(
                      'hover:bg-accent/50 flex w-full items-center gap-3 rounded-md border p-3 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-md',
                      avatarSource === 'discogs'
                        ? 'border-primary/60 bg-primary/10 shadow-sm'
                        : 'border-border'
                    )}
                  >
                    <UserAvatar
                      username={username}
                      avatarUrl={avatarUrl}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {t('settings.profile.avatar.discogs')}
                      </div>
                      <div className="text-muted-foreground truncate text-xs">
                        {t('settings.profile.avatar.discogsHint')}
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAvatarSource('gravatar')
                    }}
                    aria-pressed={avatarSource === 'gravatar'}
                    className={cn(
                      'hover:bg-accent/50 flex w-full items-center gap-3 rounded-md border p-3 text-left transition-all duration-200 hover:scale-[1.02] hover:shadow-md',
                      avatarSource === 'gravatar'
                        ? 'border-primary/60 bg-primary/10 shadow-sm'
                        : 'border-border'
                    )}
                  >
                    <UserAvatar
                      username={username}
                      avatarUrl={gravatarUrl ?? undefined}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">
                        {t('settings.profile.avatar.gravatar')}
                      </div>
                      <div className="text-muted-foreground truncate text-xs">
                        {t('settings.profile.avatar.gravatarHint')}
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <Separator />

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-medium">
                    {t('settings.account.disconnect.title')}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {t('settings.account.disconnect.description')}
                  </p>
                </div>
                <ConfirmDialog
                  trigger={
                    <Button variant="destructive" className="w-full sm:w-auto">
                      <LogOut className="mr-2 size-4" />
                      {t('settings.account.disconnect.button')}
                    </Button>
                  }
                  title={t('settings.account.disconnect.confirmTitle')}
                  description={t(
                    'settings.account.disconnect.confirmDescription'
                  )}
                  confirmText={t('settings.account.disconnect.button')}
                  onConfirm={handleDisconnect}
                  variant="destructive"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards delay-150 duration-500">
            <CardHeader>
              <CardTitle>{t('settings.appearance.title')}</CardTitle>
              <CardDescription>
                {t('settings.appearance.description')}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-sm font-medium">
                    {t('settings.appearance.language.title')}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {t('settings.appearance.language.description')}
                  </p>
                </div>
                <Select
                  value={currentLanguage}
                  onValueChange={(value) => {
                    void i18n.changeLanguage(value)
                  }}
                >
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue>
                      <span className="flex items-center gap-2">
                        <LanguageFlag lang={currentLanguage} />
                        <span>
                          {currentLanguage === 'en'
                            ? t('settings.appearance.language.english')
                            : t('settings.appearance.language.norwegian')}
                        </span>
                      </span>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">
                      <span className="flex items-center gap-2">
                        <LanguageFlag lang="en" />
                        <span>{t('settings.appearance.language.english')}</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="no">
                      <span className="flex items-center gap-2">
                        <LanguageFlag lang="no" />
                        <span>
                          {t('settings.appearance.language.norwegian')}
                        </span>
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium">
                    {t('settings.appearance.theme.title')}
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    {t('settings.appearance.theme.description')}
                  </p>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <SelectionCard
                    selected={theme === 'light'}
                    onClick={() => {
                      setTheme('light')
                    }}
                    icon={<Sun className="text-foreground/70 size-5" />}
                    title={t('settings.appearance.theme.light')}
                    hint={t('settings.appearance.theme.lightHint')}
                  />
                  <SelectionCard
                    selected={theme === 'dark'}
                    onClick={() => {
                      setTheme('dark')
                    }}
                    icon={<Moon className="text-foreground/70 size-5" />}
                    title={t('settings.appearance.theme.dark')}
                    hint={t('settings.appearance.theme.darkHint')}
                  />
                  <SelectionCard
                    selected={theme === 'system'}
                    onClick={() => {
                      setTheme('system')
                    }}
                    icon={<Monitor className="text-foreground/70 size-5" />}
                    title={t('settings.appearance.theme.system')}
                    hint={t('settings.appearance.theme.systemHint')}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="animate-in fade-in slide-in-from-bottom-3 fill-mode-backwards delay-200 duration-500">
            <CardHeader>
              <CardTitle>{t('settings.about.title')}</CardTitle>
              <CardDescription>
                {t('settings.about.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setChangelogOpen(true)
                  }}
                  className="hover:bg-accent/50 flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors"
                >
                  <FileText className="text-muted-foreground size-4" />
                  <span className="text-sm">
                    {t('settings.about.whatsNew')}
                  </span>
                </button>
                <button
                  type="button"
                  disabled
                  className="hover:bg-accent/50 flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors disabled:pointer-events-none disabled:opacity-50"
                >
                  <Shield className="text-muted-foreground size-4" />
                  <span className="text-sm">{t('settings.about.privacy')}</span>
                  <span className="text-muted-foreground ml-auto text-xs">
                    {t('common.comingSoon')}
                  </span>
                </button>
                <button
                  type="button"
                  disabled
                  className="hover:bg-accent/50 flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors disabled:pointer-events-none disabled:opacity-50"
                >
                  <Scale className="text-muted-foreground size-4" />
                  <span className="text-sm">{t('settings.about.terms')}</span>
                  <span className="text-muted-foreground ml-auto text-xs">
                    {t('common.comingSoon')}
                  </span>
                </button>
                <Separator className="my-3" />
                <div className="flex items-center justify-between px-2">
                  <span className="text-muted-foreground text-sm">
                    {t('settings.version')}
                  </span>
                  <span className="font-mono text-sm">{APP_VERSION}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {allVersions.length > 0 ? (
        <ResponsiveDialog
          open={changelogOpen}
          onOpenChange={setChangelogOpen}
          title={t('changelog.modal.title')}
          description={t('changelog.modal.description')}
          maxHeight="85vh"
        >
          <VersionAccordion
            versions={allVersions}
            onDismiss={() => {
              setChangelogOpen(false)
            }}
          />
        </ResponsiveDialog>
      ) : null}
    </>
  )
}
