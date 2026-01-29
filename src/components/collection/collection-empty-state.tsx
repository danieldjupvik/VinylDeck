import { Disc3 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/common/empty-state'

export function CollectionEmptyState(): React.JSX.Element {
  const { t } = useTranslation()

  return (
    <EmptyState
      icon={<Disc3 className="h-20 w-20 opacity-50" />}
      description={t('collection.empty')}
    />
  )
}
