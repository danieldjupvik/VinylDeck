import { fetchRequestHandler } from '@trpc/server/adapters/fetch'

import { appRouter } from '../../src/server/trpc/index.ts'

import type { VercelRequest } from '@vercel/node'

export const config = {
  runtime: 'edge'
}

/**
 * Vercel Edge Function handler for tRPC requests.
 * All tRPC procedures are handled through this single endpoint.
 */
export default async function handler(request: VercelRequest) {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: request as unknown as Request,
    router: appRouter,
    createContext: () => ({})
  })
}
