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
export const changelog: ChangelogData = [
  {
    version: '0.3.1-beta.1',
    date: '2026-01-21',
    features: [
      { key: 'changelog.0_3_1_beta.feature_1' },
      { key: 'changelog.0_3_1_beta.feature_2' }
    ],
    improvements: [{ key: 'changelog.0_3_1_beta.improvement_1' }]
  },
  {
    version: '0.3.0-beta.1',
    date: '2026-01-20',
    features: [
      { key: 'changelog.0_3_0_beta.feature_1' },
      { key: 'changelog.0_3_0_beta.feature_2' }
    ]
  },
  {
    version: '0.2.0-beta.1',
    date: '2026-01-19',
    features: [
      { key: 'changelog.0_2_0_beta.feature_1' },
      { key: 'changelog.0_2_0_beta.feature_2' },
      { key: 'changelog.0_2_0_beta.feature_3' },
      { key: 'changelog.0_2_0_beta.feature_4' },
      { key: 'changelog.0_2_0_beta.feature_5' }
    ],
    fixes: [{ key: 'changelog.0_2_0_beta.fix_1' }]
  }
]
