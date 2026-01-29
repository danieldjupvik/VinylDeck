import i18n from '@/providers/i18n-provider'

const localeMap: Record<string, string> = {
  en: 'en-US',
  no: 'nb-NO'
}

/**
 * Formats a date string for changelog display using the current i18n language.
 *
 * @param dateString - ISO date string (e.g., "2026-01-29")
 * @returns Localized date string (e.g., "January 29, 2026" or "29. januar 2026")
 */
export function formatChangelogDate(dateString: string): string {
  const date = new Date(dateString)
  const locale = localeMap[i18n.language] ?? 'en-US'

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date)
}
