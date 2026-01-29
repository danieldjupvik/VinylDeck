import { useLayoutEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/utils'

interface ChangelogEntryProps {
  text: string
}

/**
 * Displays a single changelog entry with text truncation support.
 *
 * Detects if text exceeds 2 lines and shows a "Show more" toggle button.
 * Uses line-clamp-2 for truncation and measures scrollHeight vs clientHeight
 * to determine if truncation is actually needed.
 *
 * @param text - The entry text to display
 * @returns The entry component with optional expand/collapse toggle
 */
// eslint-disable-next-line import-x/no-unused-modules -- Will be used by ChangelogContent
export function ChangelogEntry({ text }: ChangelogEntryProps): React.ReactNode {
  const { t } = useTranslation()
  const [isExpanded, setIsExpanded] = useState(false)
  const [isTruncated, setIsTruncated] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)

  useLayoutEffect(() => {
    const element = textRef.current
    if (element) {
      setIsTruncated(element.scrollHeight > element.clientHeight)
    }
  }, [text])

  return (
    <li className="ml-4">
      <p
        ref={textRef}
        className={cn(
          'text-muted-foreground text-sm',
          !isExpanded && 'line-clamp-2'
        )}
      >
        {text}
      </p>
      {isTruncated ? (
        <button
          onClick={() => {
            setIsExpanded(!isExpanded)
          }}
          className="text-primary mt-1 text-xs hover:underline"
        >
          {isExpanded
            ? t('changelog.entry.showLess')
            : t('changelog.entry.showMore')}
        </button>
      ) : null}
    </li>
  )
}
