import type { ChangelogData } from '@/types/changelog'

/**
 * Changelog entries for VinylDeck releases.
 * Ordered newest to oldest. Each version contains user-facing changes only.
 *
 * To add a new version:
 * 1. Add translation keys to locales/{lang}/translation.json
 * 2. Add version entry here with references to those keys
 *
 * Translation key pattern: `changelog.{version_underscored}.{category}_{index}`
 */
// eslint-disable-next-line import-x/no-unused-modules -- Consumed by useChangelog hook in plan 01-02
export const changelog: ChangelogData = [
  {
    version: '0.3.0-beta',
    date: '2026-01-15',
    features: [
      { key: 'changelog.0_3_0_beta.feature_1' },
      { key: 'changelog.0_3_0_beta.feature_2' }
    ],
    improvements: [{ key: 'changelog.0_3_0_beta.improvement_1' }],
    fixes: [{ key: 'changelog.0_3_0_beta.fix_1' }]
  }
]
