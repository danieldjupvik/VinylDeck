import { describe, expect, it } from 'vitest'
import { http, HttpResponse } from 'msw'
import {
  getCollection,
  getIdentity,
  isVinylRecord,
  validateCredentials
} from '@/api/discogs'
import { setToken } from '@/lib/storage'
import { server } from '@/__tests__/mocks/server'

describe('discogs api', () => {
  it('returns identity using stored token', async () => {
    setToken('valid-token')
    const identity = await getIdentity()

    expect(identity.username).toBe('testuser')
    expect(identity.id).toBe(123)
  })

  it('rejects invalid credentials', async () => {
    await expect(validateCredentials('bad-token')).rejects.toThrow()
  })

  it('passes collection params to the API', async () => {
    server.use(
      http.get(
        'https://api.discogs.com/users/:username/collection/folders/0/releases',
        ({ request }) => {
          const url = new URL(request.url)
          expect(url.searchParams.get('page')).toBe('2')
          expect(url.searchParams.get('per_page')).toBe('50')
          expect(url.searchParams.get('sort')).toBe('artist')
          expect(url.searchParams.get('sort_order')).toBe('asc')

          return HttpResponse.json({
            pagination: {
              page: 2,
              pages: 2,
              per_page: 50,
              items: 50
            },
            releases: []
          })
        }
      )
    )

    const response = await getCollection('testuser', {
      page: 2,
      perPage: 50,
      sort: 'artist',
      sortOrder: 'asc'
    })

    expect(response.pagination.page).toBe(2)
    expect(response.releases).toEqual([])
  })

  it('detects vinyl releases based on formats', () => {
    expect(isVinylRecord([{ name: 'Vinyl' }])).toBe(true)
    expect(isVinylRecord([{ name: 'CD' }])).toBe(false)
  })
})
