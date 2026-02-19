import type { ChangelogData } from '@/types/changelog'

/**
 * Changelog entries for VinylDeck releases.
 * Ordered newest to oldest. Each version contains user-facing changes only.
 *
 * Entries are added on the release-please branch before merging a release.
 * See CLAUDE.md "User-Facing Changelog" section for the full workflow.
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
