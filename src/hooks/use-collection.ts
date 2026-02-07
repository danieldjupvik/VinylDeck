import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'

import { isVinylRecord } from '@/api/discogs'
import { useAuth } from '@/hooks/use-auth'
import { useHydrationGuard } from '@/hooks/use-hydration-guard'
import { useUserProfile } from '@/hooks/use-user-profile'
import { COLLECTION } from '@/lib/constants'
import { trpc } from '@/lib/trpc'
import {
  readParamList,
  readParamRange,
  readSearchParams,
  updateSearchParams
} from '@/lib/url-state'
import { useAuthStore } from '@/stores/auth-store'
import type {
  CollectionSortKey,
  CollectionSortOrder,
  NonVinylBreakdownItem
} from '@/types/collection'
import type { CollectionRelease, UserSort } from '@/types/discogs'

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base'
})

const sortValues = (values: Set<string>) =>
  Array.from(values).sort((a, b) => collator.compare(a, b))

const sortSizes = (values: string[]) =>
  values.sort((a, b) => {
    const aNumber = Number.parseFloat(a)
    const bNumber = Number.parseFloat(b)
    if (
      !Number.isNaN(aNumber) &&
      !Number.isNaN(bNumber) &&
      aNumber !== bNumber
    ) {
      return aNumber - bNumber
    }
    return collator.compare(a, b)
  })

const isSizeDescriptor = (value: string) =>
  value.includes('"') || /inch/i.test(value)

const incrementCount = (counts: Map<string, number>, value: string) => {
  counts.set(value, (counts.get(value) ?? 0) + 1)
}

const ensureCountEntries = (counts: Map<string, number>, values: string[]) => {
  for (const value of values) {
    if (!counts.has(value)) {
      counts.set(value, 0)
    }
  }
}

const matchesSelection = (
  selectedValues: string[],
  matcher: (value: string) => boolean
) =>
  selectedValues.length === 0 || selectedValues.some((value) => matcher(value))

const extractVinylDescriptors = (
  formats: { name: string; descriptions?: string[] }[]
) => {
  const types: string[] = []
  const sizes: string[] = []

  for (const format of formats) {
    if (format.name !== 'Vinyl') continue
    for (const description of format.descriptions ?? []) {
      if (isSizeDescriptor(description)) {
        sizes.push(description)
      } else {
        types.push(description)
      }
    }
  }

  return { types, sizes }
}

const FILTER_PARAM_KEYS = {
  genres: 'genre',
  styles: 'style',
  labels: 'label',
  types: 'type',
  sizes: 'size',
  yearRange: 'year'
} as const

interface UseCollectionOptions {
  page?: number
  sort?: CollectionSortKey
  sortOrder?: CollectionSortOrder
}

export interface FilterOption {
  value: string
  count: number
}

export interface CollectionFilterOptions {
  genres: FilterOption[]
  styles: FilterOption[]
  labels: FilterOption[]
  types: FilterOption[]
  sizes: FilterOption[]
  yearBounds: [number, number] | null
}

interface CollectionSelectedFilters {
  genres: string[]
  styles: string[]
  labels: string[]
  types: string[]
  sizes: string[]
  yearRange: [number, number] | null
}

const readFiltersFromUrl = (): CollectionSelectedFilters => {
  const params = readSearchParams()
  return {
    genres: readParamList(params, FILTER_PARAM_KEYS.genres),
    styles: readParamList(params, FILTER_PARAM_KEYS.styles),
    labels: readParamList(params, FILTER_PARAM_KEYS.labels),
    types: readParamList(params, FILTER_PARAM_KEYS.types),
    sizes: readParamList(params, FILTER_PARAM_KEYS.sizes),
    yearRange: readParamRange(params, FILTER_PARAM_KEYS.yearRange)
  }
}

interface UseCollectionReturn {
  releases: CollectionRelease[]
  vinylOnly: CollectionRelease[]
  filteredReleases: CollectionRelease[]
  isLoading: boolean
  isFetching: boolean
  dataUpdatedAt: number
  refetch: () => Promise<unknown>
  shouldAnimateCards: boolean
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
  filterOptions: CollectionFilterOptions
  selectedFilters: CollectionSelectedFilters
  setSelectedGenres: (values: string[]) => void
  setSelectedStyles: (values: string[]) => void
  setSelectedLabels: (values: string[]) => void
  setSelectedTypes: (values: string[]) => void
  setSelectedSizes: (values: string[]) => void
  setYearRange: (range: [number, number] | null) => void
  clearFilters: () => void
  reshuffleRandom: () => void
  activeFilterCount: number
  nonVinylCount: number
  nonVinylBreakdown: NonVinylBreakdownItem[]
  hasCompleteCollection: boolean
}

/**
 * Fetches and manages the user's Discogs vinyl collection with
 * client-side search, filtering, sorting, and pagination.
 *
 * @param options - Page number, sort key, and sort order overrides
 * @returns Collection data, filter state, pagination, and control functions
 */
export function useCollection(
  options: UseCollectionOptions = {}
): UseCollectionReturn {
  const { oauthTokens } = useAuth()
  const { profile } = useUserProfile()
  const username = profile?.username
  const trpcUtils = trpc.useUtils()
  const urlFilters = useMemo(() => readFiltersFromUrl(), [])
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<CollectionSortKey>(options.sort ?? 'added')
  const [sortOrder, setSortOrder] = useState<CollectionSortOrder>(
    options.sortOrder ?? 'desc'
  )
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    urlFilters.genres
  )
  const [selectedStyles, setSelectedStyles] = useState<string[]>(
    urlFilters.styles
  )
  const [selectedLabels, setSelectedLabels] = useState<string[]>(
    urlFilters.labels
  )
  const [selectedTypes, setSelectedTypes] = useState<string[]>(urlFilters.types)
  const [selectedSizes, setSelectedSizes] = useState<string[]>(urlFilters.sizes)
  const [yearRangeSelection, setYearRangeSelection] = useState<
    [number, number] | null
  >(urlFilters.yearRange)
  const [randomSeed, setRandomSeed] = useState(() => Date.now())
  const page = options.page ?? 1
  const isClientSort = sort === 'genre' || sort === 'random'
  const hasSearch = search.trim().length > 0
  const hasActiveFilters =
    selectedGenres.length > 0 ||
    selectedStyles.length > 0 ||
    selectedLabels.length > 0 ||
    selectedTypes.length > 0 ||
    selectedSizes.length > 0 ||
    yearRangeSelection !== null
  const shouldFetchAllPages = isClientSort || hasSearch || hasActiveFilters
  const isQueryEnabled = useHydrationGuard(!!username && !!oauthTokens)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handlePopState = () => {
      const nextFilters = readFiltersFromUrl()
      setSelectedGenres(nextFilters.genres)
      setSelectedStyles(nextFilters.styles)
      setSelectedLabels(nextFilters.labels)
      setSelectedTypes(nextFilters.types)
      setSelectedSizes(nextFilters.sizes)
      setYearRangeSelection(nextFilters.yearRange)
    }

    window.addEventListener('popstate', handlePopState)
    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  const serverSort: UserSort = isClientSort
    ? 'added'
    : (() => {
        switch (sort) {
          case 'releaseYear':
            return 'year'
          case 'label':
            return 'label'
          case 'format':
            return 'format'
          case 'artist':
          case 'title':
          case 'added':
            return sort
          default:
            return 'added'
        }
      })()

  const serverSortOrder: CollectionSortOrder = isClientSort ? 'desc' : sortOrder

  const setSortWithRandom = (nextSort: CollectionSortKey) => {
    if (nextSort === 'random' && sort !== 'random') {
      setRandomSeed((seed) => seed + 1)
    }
    setSort(nextSort)
  }

  const setSortOrderWithRandom = (nextOrder: CollectionSortOrder) => {
    if (sort === 'random' && nextOrder !== sortOrder) {
      setRandomSeed((seed) => seed + 1)
    }
    setSortOrder(nextOrder)
  }

  const reshuffleRandom = () => {
    if (sort === 'random') {
      setRandomSeed((seed) => seed + 1)
    }
  }

  const {
    data,
    isLoading,
    isError,
    error,
    isFetchedAfterMount,
    isFetching,
    dataUpdatedAt,
    refetch
  } = useQuery({
    queryKey: [
      'collection',
      username,
      shouldFetchAllPages,
      shouldFetchAllPages ? null : page,
      serverSort,
      serverSortOrder
    ],
    placeholderData: (previousData) => previousData,
    queryFn: async () => {
      const currentTokens = useAuthStore.getState().tokens

      if (!username || !currentTokens) {
        throw new Error('Username and OAuth tokens are required')
      }

      const perPage = COLLECTION.PER_PAGE

      const fetchPage = async (pageNumber: number) => {
        return await trpcUtils.client.discogs.getCollection.query({
          accessToken: currentTokens.accessToken,
          accessTokenSecret: currentTokens.accessTokenSecret,
          username,
          page: pageNumber,
          perPage,
          sort: serverSort,
          sortOrder: serverSortOrder
        })
      }

      if (!shouldFetchAllPages) {
        return fetchPage(page)
      }

      const firstPage = await fetchPage(1)
      const totalPages = firstPage.pagination.pages

      if (totalPages <= 1) {
        return firstPage
      }

      const releases = [...firstPage.releases]
      const remainingPages = Array.from(
        { length: totalPages - 1 },
        (_, index) => index + 2
      )
      const BATCH_SIZE = 3

      for (let i = 0; i < remainingPages.length; i += BATCH_SIZE) {
        const batch = remainingPages.slice(i, i + BATCH_SIZE)
        const responses = await Promise.all(
          batch.map((pageNumber) => fetchPage(pageNumber))
        )
        for (const response of responses) {
          releases.push(...response.releases)
        }
      }

      return { ...firstPage, releases }
    },
    enabled: isQueryEnabled,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false
  })

  const [hasCachedDataAtMount] = useState(() => data !== undefined)

  const releases = data?.releases
  const shouldAnimateCards = !hasCachedDataAtMount && isFetchedAfterMount

  // Filter to vinyl only
  const vinylOnly = useMemo(() => {
    if (!releases) return []
    return releases.filter((release) =>
      isVinylRecord(release.basic_information.formats)
    )
  }, [releases])

  const nonVinylStats = useMemo(() => {
    if (!releases) {
      return { total: 0, breakdown: [] as NonVinylBreakdownItem[] }
    }

    const counts = new Map<string, number>()
    let total = 0

    for (const release of releases) {
      const formats = release.basic_information.formats
      if (isVinylRecord(formats)) continue
      total += 1
      const formatName =
        formats.find((format) => format.name && format.name !== 'Vinyl')
          ?.name ?? 'Unknown'
      counts.set(formatName, (counts.get(formatName) ?? 0) + 1)
    }

    const breakdown = Array.from(counts.entries())
      .map(([format, count]) => ({ format, count }))
      .sort((a, b) => b.count - a.count || a.format.localeCompare(b.format))

    return { total, breakdown }
  }, [releases])

  const filterOptions = useMemo<CollectionFilterOptions>(() => {
    const genreCounts = new Map<string, number>()
    const styleCounts = new Map<string, number>()
    const labelCounts = new Map<string, number>()
    const typeCounts = new Map<string, number>()
    const sizeCounts = new Map<string, number>()
    let minYear = Number.POSITIVE_INFINITY
    let maxYear = 0

    for (const release of vinylOnly) {
      const info = release.basic_information
      for (const genre of info.genres) {
        incrementCount(genreCounts, genre)
      }
      for (const style of info.styles) {
        incrementCount(styleCounts, style)
      }
      for (const label of info.labels) {
        incrementCount(labelCounts, label.name)
      }
      const { types: releaseTypes, sizes: releaseSizes } =
        extractVinylDescriptors(info.formats)
      for (const type of releaseTypes) {
        incrementCount(typeCounts, type)
      }
      for (const size of releaseSizes) {
        incrementCount(sizeCounts, size)
      }
      if (info.year && info.year > 0) {
        minYear = Math.min(minYear, info.year)
        maxYear = Math.max(maxYear, info.year)
      }
    }

    // Ensure selected filters are in the options even if they have 0 count
    ensureCountEntries(genreCounts, selectedGenres)
    ensureCountEntries(styleCounts, selectedStyles)
    ensureCountEntries(labelCounts, selectedLabels)
    ensureCountEntries(typeCounts, selectedTypes)
    ensureCountEntries(sizeCounts, selectedSizes)

    const createFilterOptions = (
      counts: Map<string, number>,
      sortFn: (values: string[]) => string[]
    ): FilterOption[] => {
      const values = sortFn(Array.from(counts.keys()))
      return values.map((value) => ({
        value,
        count: counts.get(value) ?? 0
      }))
    }

    const yearBounds: [number, number] | null =
      Number.isFinite(minYear) && maxYear > 0 ? [minYear, maxYear] : null

    return {
      genres: createFilterOptions(genreCounts, (vals) =>
        sortValues(new Set(vals))
      ),
      styles: createFilterOptions(styleCounts, (vals) =>
        sortValues(new Set(vals))
      ),
      labels: createFilterOptions(labelCounts, (vals) =>
        sortValues(new Set(vals))
      ),
      types: createFilterOptions(typeCounts, (vals) =>
        sortValues(new Set(vals))
      ),
      sizes: createFilterOptions(sizeCounts, sortSizes),
      yearBounds
    }
  }, [
    vinylOnly,
    selectedGenres,
    selectedStyles,
    selectedLabels,
    selectedTypes,
    selectedSizes
  ])
  const yearRange = useMemo<[number, number] | null>(() => {
    if (!filterOptions.yearBounds) return yearRangeSelection
    if (!yearRangeSelection) return filterOptions.yearBounds
    const [minYear, maxYear] = filterOptions.yearBounds
    const next: [number, number] = [
      Math.max(yearRangeSelection[0], minYear),
      Math.min(yearRangeSelection[1], maxYear)
    ]
    if (next[0] > next[1]) return filterOptions.yearBounds
    return next
  }, [filterOptions.yearBounds, yearRangeSelection])

  // Apply search filter
  const searchedReleases = useMemo(() => {
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

  const filteredReleases = useMemo(() => {
    return searchedReleases.filter((release) => {
      const info = release.basic_information
      const { types: releaseTypes, sizes: releaseSizes } =
        extractVinylDescriptors(info.formats)

      const matchesGenres = matchesSelection(selectedGenres, (genre) =>
        info.genres.includes(genre)
      )
      const matchesStyles = matchesSelection(selectedStyles, (style) =>
        info.styles.includes(style)
      )
      const matchesLabels = matchesSelection(selectedLabels, (label) =>
        info.labels.some((item) => item.name === label)
      )
      const matchesTypes = matchesSelection(selectedTypes, (type) =>
        releaseTypes.includes(type)
      )
      const matchesSizes = matchesSelection(selectedSizes, (size) =>
        releaseSizes.includes(size)
      )
      const matchesYear =
        !yearRange ||
        (Boolean(info.year) &&
          info.year > 0 &&
          info.year >= yearRange[0] &&
          info.year <= yearRange[1])

      return (
        matchesGenres &&
        matchesStyles &&
        matchesLabels &&
        matchesTypes &&
        matchesSizes &&
        matchesYear
      )
    })
  }, [
    searchedReleases,
    selectedGenres,
    selectedStyles,
    selectedLabels,
    selectedTypes,
    selectedSizes,
    yearRange
  ])

  const sortedReleases = useMemo(() => {
    if (sort === 'genre') {
      const order = sortOrder === 'asc' ? 1 : -1
      return [...filteredReleases].sort((a, b) => {
        const aGenre = a.basic_information.genres[0] ?? ''
        const bGenre = b.basic_information.genres[0] ?? ''
        const primaryCompare = aGenre.localeCompare(bGenre, undefined, {
          sensitivity: 'base'
        })
        if (primaryCompare !== 0) return primaryCompare * order
        return (
          a.basic_information.title.localeCompare(
            b.basic_information.title,
            undefined,
            { sensitivity: 'base' }
          ) * order
        )
      })
    }

    if (sort === 'random') {
      const random = (seed: number) => () => {
        let t = (seed += 0x6d2b79f5)
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
      }
      const next = random(randomSeed)
      const copy = [...filteredReleases]
      for (let i = copy.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1))
        const itemI = copy[i]
        const itemJ = copy[j]
        if (itemI !== undefined && itemJ !== undefined) {
          copy[i] = itemJ
          copy[j] = itemI
        }
      }
      return copy
    }

    return filteredReleases
  }, [filteredReleases, sort, sortOrder, randomSeed])

  const perPage = data?.pagination.per_page ?? COLLECTION.PER_PAGE
  const totalPages = shouldFetchAllPages
    ? Math.max(1, Math.ceil(sortedReleases.length / perPage))
    : (data?.pagination.pages ?? 1)
  const safePage = shouldFetchAllPages ? Math.min(page, totalPages) : page
  const pagedReleases = useMemo(() => {
    if (!shouldFetchAllPages) {
      return sortedReleases
    }

    const startIndex = (safePage - 1) * perPage
    return sortedReleases.slice(startIndex, startIndex + perPage)
  }, [shouldFetchAllPages, sortedReleases, safePage, perPage])

  const yearRangeActive =
    !!yearRange &&
    (!filterOptions.yearBounds ||
      yearRange[0] !== filterOptions.yearBounds[0] ||
      yearRange[1] !== filterOptions.yearBounds[1])

  useEffect(() => {
    updateSearchParams({
      [FILTER_PARAM_KEYS.genres]: selectedGenres,
      [FILTER_PARAM_KEYS.styles]: selectedStyles,
      [FILTER_PARAM_KEYS.labels]: selectedLabels,
      [FILTER_PARAM_KEYS.types]: selectedTypes,
      [FILTER_PARAM_KEYS.sizes]: selectedSizes,
      // yearRangeActive already implies yearRange is truthy (see its definition above)
      [FILTER_PARAM_KEYS.yearRange]: yearRangeActive
        ? `${yearRange[0]}-${yearRange[1]}`
        : null
    })
  }, [
    selectedGenres,
    selectedStyles,
    selectedLabels,
    selectedTypes,
    selectedSizes,
    yearRange,
    yearRangeActive
  ])

  const activeFilterCount =
    selectedGenres.length +
    selectedStyles.length +
    selectedLabels.length +
    selectedTypes.length +
    selectedSizes.length +
    (yearRangeActive ? 1 : 0)

  const clearFilters = () => {
    setSelectedGenres([])
    setSelectedStyles([])
    setSelectedLabels([])
    setSelectedTypes([])
    setSelectedSizes([])
    setYearRangeSelection(null)
  }

  const pagination = (() => {
    if (!data) return null

    if (shouldFetchAllPages) {
      return {
        page: safePage,
        pages: totalPages,
        total: sortedReleases.length,
        perPage
      }
    }

    return {
      page: data.pagination.page,
      pages: data.pagination.pages,
      total:
        data.pagination.pages <= 1 ? vinylOnly.length : data.pagination.items,
      perPage: data.pagination.per_page
    }
  })()

  const hasCompleteCollection =
    shouldFetchAllPages || (data?.pagination.pages ?? 0) <= 1

  return {
    releases: releases ?? [],
    vinylOnly,
    filteredReleases: pagedReleases,
    isLoading,
    isFetching,
    dataUpdatedAt,
    refetch,
    shouldAnimateCards,
    isError,
    error: error instanceof Error ? error : null,
    pagination,
    search,
    setSearch,
    sort,
    setSort: setSortWithRandom,
    sortOrder,
    setSortOrder: setSortOrderWithRandom,
    filterOptions,
    selectedFilters: {
      genres: selectedGenres,
      styles: selectedStyles,
      labels: selectedLabels,
      types: selectedTypes,
      sizes: selectedSizes,
      yearRange
    },
    setSelectedGenres,
    setSelectedStyles,
    setSelectedLabels,
    setSelectedTypes,
    setSelectedSizes,
    setYearRange: setYearRangeSelection,
    clearFilters,
    reshuffleRandom,
    activeFilterCount,
    nonVinylCount: nonVinylStats.total,
    nonVinylBreakdown: nonVinylStats.breakdown,
    hasCompleteCollection
  }
}
