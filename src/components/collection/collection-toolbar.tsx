import { Search, ArrowUpDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { CollectionSortKey, CollectionSortOrder } from '@/types/discogs'

interface CollectionToolbarProps {
  search: string
  onSearchChange: (search: string) => void
  sort: CollectionSortKey
  onSortChange: (sort: CollectionSortKey) => void
  sortOrder: CollectionSortOrder
  onSortOrderChange: (order: CollectionSortOrder) => void
  totalCount?: number
}

export function CollectionToolbar({
  search,
  onSearchChange,
  sort,
  onSortChange,
  sortOrder,
  onSortOrderChange,
  totalCount
}: CollectionToolbarProps) {
  const { t } = useTranslation()

  const toggleSortOrder = () => {
    onSortOrderChange(sortOrder === 'asc' ? 'desc' : 'asc')
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1 sm:max-w-xs">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('collection.search')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <div className="flex items-center gap-2">
        {totalCount !== undefined && (
          <span className="text-sm text-muted-foreground">
            {t('collection.records', { count: totalCount })}
          </span>
        )}
        <Select value={sort} onValueChange={onSortChange}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder={t('collection.sort.label')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="artist">
              {t('collection.sort.artist')}
            </SelectItem>
            <SelectItem value="title">{t('collection.sort.title')}</SelectItem>
            <SelectItem value="added">
              {t('collection.sort.dateAdded')}
            </SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="icon"
          onClick={toggleSortOrder}
          title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
        >
          <ArrowUpDown
            className={`h-4 w-4 transition-transform ${
              sortOrder === 'desc' ? 'rotate-180' : ''
            }`}
          />
        </Button>
      </div>
    </div>
  )
}
