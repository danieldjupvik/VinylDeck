/**
 * Local development server for tRPC API endpoints.
 * This mimics the Vercel Serverless Functions environment for local development.
 *
 * Run with: bun run scripts/dev-server.ts
 */
import { serve } from '@hono/node-server'
import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { Hono } from 'hono'
import { cors } from 'hono/cors'

import { appRouter } from '../src/server/trpc/index.ts'

const app = new Hono()
const debugApiRequests = process.env['DEBUG_API'] === '1'

// Enable CORS for local development
app.use(
  '/api/*',
  cors({
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    credentials: true
  })
)

app.use('/api/*', async (c, next) => {
  await next()

  if (!debugApiRequests) {
    return
  }

  const requestUrl = new URL(c.req.url)
  console.log(
    `[api] ${c.req.method} ${requestUrl.pathname}${requestUrl.search} -> ${c.res.status}`
  )
})

// Handle all tRPC requests
app.all('/api/trpc/*', async (c) => {
  try {
    const response = await fetchRequestHandler({
      endpoint: '/api/trpc',
      req: c.req.raw,
      router: appRouter,
      createContext: () => ({}),
      allowMethodOverride: true // Allow POST for queries (secure OAuth tokens)
    })
    return response
  } catch (error) {
    console.error('[api] Unhandled tRPC handler error:', error)
    throw error
  }
})

// Health check endpoint
app.get('/api/health', (c) => c.json({ status: 'ok' }))

const port = 3001
console.log(`🚀 API dev server running at http://localhost:${port}`)
console.log(`   tRPC endpoint: http://localhost:${port}/api/trpc`)

serve({
  fetch: app.fetch,
  port
})
