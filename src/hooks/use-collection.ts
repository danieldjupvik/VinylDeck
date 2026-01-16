import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { getCollection, isVinylRecord } from '@/api/discogs'
import { useAuth } from '@/hooks/use-auth'
import type {
  CollectionSortKey,
  CollectionSortOrder,
  DiscogsCollectionRelease
} from '@/types/discogs'

interface UseCollectionOptions {
  page?: number
  sort?: CollectionSortKey
  sortOrder?: CollectionSortOrder
}

interface UseCollectionReturn {
  releases: DiscogsCollectionRelease[]
  vinylOnly: DiscogsCollectionRelease[]
  filteredReleases: DiscogsCollectionRelease[]
  isLoading: boolean
  isError: boolean
  error: Error | null
  pagination: {
    page: number
    pages: number
    total: number
    perPage: number
  } | null
  search: string
  setSearch: (search: string) => void
  sort: CollectionSortKey
  setSort: (sort: CollectionSortKey) => void
  sortOrder: CollectionSortOrder
  setSortOrder: (order: CollectionSortOrder) => void
}

export function useCollection(
  options: UseCollectionOptions = {}
): UseCollectionReturn {
  const { username } = useAuth()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<CollectionSortKey>(options.sort ?? 'added')
  const [sortOrder, setSortOrder] = useState<CollectionSortOrder>(
    options.sortOrder ?? 'desc'
  )

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['collection', username, options.page ?? 1, sort, sortOrder],
    queryFn: () =>
      getCollection(username!, {
        page: options.page ?? 1,
        sort,
        sortOrder
      }),
    enabled: !!username,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })

  const releases = data?.releases

  // Filter to vinyl only
  const vinylOnly = useMemo(() => {
    if (!releases) return []
    return releases.filter((release) =>
      isVinylRecord(release.basic_information.formats)
    )
  }, [releases])

  // Apply search filter
  const filteredReleases = useMemo(() => {
    if (!search.trim()) return vinylOnly

    const searchLower = search.toLowerCase()
    return vinylOnly.filter((release) => {
      const info = release.basic_information
      const artistMatch = info.artists.some((artist) =>
        artist.name.toLowerCase().includes(searchLower)
      )
      const titleMatch = info.title.toLowerCase().includes(searchLower)
      return artistMatch || titleMatch
    })
  }, [vinylOnly, search])

  const pagination = data?.pagination
    ? {
        page: data.pagination.page,
        pages: data.pagination.pages,
        total: data.pagination.items,
        perPage: data.pagination.per_page
      }
    : null

  return {
    releases: releases ?? [],
    vinylOnly,
    filteredReleases,
    isLoading,
    isError,
    error: error as Error | null,
    pagination,
    search,
    setSearch,
    sort,
    setSort,
    sortOrder,
    setSortOrder
  }
}
