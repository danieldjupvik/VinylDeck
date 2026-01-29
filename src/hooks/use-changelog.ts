import { compare } from 'compare-versions'
import { useMemo } from 'react'

import { changelog } from '@/data/changelog'
import { usePreferencesStore } from '@/stores/preferences-store'
import type { ChangelogVersion } from '@/types/changelog'

export type ChangelogResult =
  | { hasEntries: true; versions: ChangelogVersion[] }
  | {
      hasEntries: false
      reason: 'first-install' | 'up-to-date' | 'no-user-entries'
    }

/**
 * Returns changelog entries for versions newer than the user's last-seen version.
 *
 * @returns ChangelogResult - either versions to display or a reason why there are none
 */
// eslint-disable-next-line import-x/no-unused-modules -- Consumed by ChangelogModal in Phase 2
export function useChangelog(): ChangelogResult {
  const lastSeenVersion = usePreferencesStore((state) => state.lastSeenVersion)

  return useMemo(() => {
    if (lastSeenVersion === null) {
      return { hasEntries: false, reason: 'first-install' }
    }

    const newerVersions = changelog.filter((entry) =>
      compare(entry.version, lastSeenVersion, '>')
    )

    if (newerVersions.length === 0) {
      return { hasEntries: false, reason: 'up-to-date' }
    }

    const hasUserEntries = newerVersions.some(
      (v) =>
        (v.features && v.features.length > 0) ||
        (v.improvements && v.improvements.length > 0) ||
        (v.fixes && v.fixes.length > 0)
    )

    if (!hasUserEntries) {
      return { hasEntries: false, reason: 'no-user-entries' }
    }

    return { hasEntries: true, versions: newerVersions }
  }, [lastSeenVersion])
}
