import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'

interface PaginationControlsProps {
  page: number
  totalPages: number
  onPageChange: (page: number) => void
  isLoading?: boolean
}

export function PaginationControls({
  page,
  totalPages,
  onPageChange,
  isLoading
}: PaginationControlsProps) {
  const { t } = useTranslation()

  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="flex items-center justify-center gap-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page - 1)}
        disabled={page <= 1 || isLoading}
      >
        <ChevronLeft className="mr-1 h-4 w-4" />
        {t('collection.pagination.previous')}
      </Button>
      <span className="text-sm text-muted-foreground">
        {t('collection.pagination.page', { current: page, total: totalPages })}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(page + 1)}
        disabled={page >= totalPages || isLoading}
      >
        {t('collection.pagination.next')}
        <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  )
}
