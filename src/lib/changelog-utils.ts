import type { ChangelogEntry, ChangelogVersion } from '@/types/changelog'

/**
 * Translated changelog entries for display.
 * Uses optional properties for exactOptionalPropertyTypes compliance.
 */
export interface TranslatedEntries {
  features?: string[]
  improvements?: string[]
  fixes?: string[]
}

/**
 * Version data with translated entries for accordion/content display.
 */
export interface TranslatedVersionData {
  version: string
  date: string
  entries: TranslatedEntries
}

/**
 * Transforms changelog entries from i18n keys to translated strings.
 * Only includes categories that have entries (for exactOptionalPropertyTypes).
 *
 * @param version - Version object with optional entry arrays
 * @param t - Translation function (typically from useTranslation)
 * @returns Object with translated string arrays for each category
 */
export function buildTranslatedEntries(
  version: {
    features?: ChangelogEntry[]
    improvements?: ChangelogEntry[]
    fixes?: ChangelogEntry[]
  },
  t: (key: string) => string
): TranslatedEntries {
  const entries: TranslatedEntries = {}

  if (version.features && version.features.length > 0) {
    entries.features = version.features.map((e) => t(e.key))
  }
  if (version.improvements && version.improvements.length > 0) {
    entries.improvements = version.improvements.map((e) => t(e.key))
  }
  if (version.fixes && version.fixes.length > 0) {
    entries.fixes = version.fixes.map((e) => t(e.key))
  }

  return entries
}

/**
 * Transforms an array of changelog versions to translated version data.
 *
 * @param versions - Array of changelog versions with i18n entry keys
 * @param t - Translation function (typically from useTranslation)
 * @returns Array of version data with translated entry strings
 */
export function buildTranslatedVersions(
  versions: ChangelogVersion[],
  t: (key: string) => string
): TranslatedVersionData[] {
  return versions.map((v) => ({
    version: v.version,
    date: v.date,
    entries: buildTranslatedEntries(v, t)
  }))
}
