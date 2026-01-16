import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { DISCOGS_API_URL } from '@/lib/constants'
import { getToken } from '@/lib/storage'
import { rateLimiter } from './rate-limiter'

export const apiClient = axios.create({
  baseURL: DISCOGS_API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor: Add auth header and handle rate limiting
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    // Wait if we're being rate limited
    await rateLimiter.waitIfNeeded()

    // Add auth header if token exists
    const token = getToken()
    if (token) {
      config.headers.Authorization = `Discogs token=${token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

// Helper to extract rate limit headers from Axios response
function extractRateLimitHeaders(
  axiosHeaders: Record<string, unknown>
): Record<string, string> {
  const headers: Record<string, string> = {}
  const rateLimitKeys = [
    'x-discogs-ratelimit',
    'x-discogs-ratelimit-used',
    'x-discogs-ratelimit-remaining'
  ]

  for (const key of rateLimitKeys) {
    const value = axiosHeaders[key]
    if (typeof value === 'string') {
      headers[key] = value
    }
  }

  return headers
}

// Response interceptor: Update rate limit state from headers
apiClient.interceptors.response.use(
  (response) => {
    // Update rate limiter from response headers
    const headers = extractRateLimitHeaders(response.headers)
    rateLimiter.updateFromHeaders(headers)

    return response
  },
  (error: AxiosError) => {
    // Update rate limiter even on error responses
    if (error.response?.headers) {
      const headers = extractRateLimitHeaders(
        error.response.headers as Record<string, unknown>
      )
      rateLimiter.updateFromHeaders(headers)
    }

    return Promise.reject(error)
  }
)

export interface ApiError {
  status: number
  message: string
}

export function isApiError(error: unknown): error is AxiosError {
  return axios.isAxiosError(error)
}

export function getApiError(error: unknown): ApiError {
  if (isApiError(error)) {
    return {
      status: error.response?.status ?? 0,
      message: error.message
    }
  }
  return {
    status: 0,
    message: 'Unknown error'
  }
}
