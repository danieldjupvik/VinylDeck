import path from 'path'

import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

import packageJson from './package.json'

const ICON_LINK_PATTERN =
  /<link(?=[^>]*\brel=["']icon["'])(?=[^>]*\bhref=["'][^"']*logo\.svg["'])[^>]*>/gi

function replacePwaLogoFavicon(html: string): string {
  return html.replace(
    ICON_LINK_PATTERN,
    '<link rel="icon" href="/favicon.svg" type="image/svg+xml">'
  )
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version)
  },
  server: {
    // Proxy API requests to local tRPC dev server (run: bun run dev:server)
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      }
    }
  },
  plugins: [
    tanstackRouter({
      routesDirectory: './src/routes',
      generatedRouteTree: './src/routeTree.gen.ts'
    }),
    react({
      babel: {
        plugins: [['babel-plugin-react-compiler']]
      }
    }),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false
      },
      pwaAssets: {
        config: true,
        overrideManifestIcons: true
      },
      manifest: {
        name: 'VinylDeck',
        short_name: 'VinylDeck',
        description: 'Browse your Discogs vinyl collection',
        theme_color: '#09090b',
        background_color: '#09090b',
        display: 'standalone',
        orientation: 'any',
        id: '/',
        categories: ['entertainment', 'music'],
        shortcuts: [
          {
            name: 'My Collection',
            short_name: 'Collection',
            url: '/collection',
            icons: [
              { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' }
            ]
          }
        ]
        // TODO: Add screenshots for richer install UI
        // screenshots: [
        //   {
        //     src: 'screenshots/desktop.png',
        //     sizes: '1280x720',
        //     type: 'image/png',
        //     form_factor: 'wide',
        //     label: 'VinylDeck collection view on desktop'
        //   },
        //   {
        //     src: 'screenshots/mobile.png',
        //     sizes: '390x844',
        //     type: 'image/png',
        //     form_factor: 'narrow',
        //     label: 'VinylDeck collection view on mobile'
        //   }
        // ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        globIgnores: ['**/apple-splash-*', '**/og-image*'],
        // SPA: serve index.html for all navigation requests (enables offline refresh)
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        // IMPORTANT: Keep cache names in sync with src/lib/constants.ts CACHE_NAMES
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.discogs\.com\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'discogs-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 // 1 hour
              }
            }
          },
          {
            urlPattern: /^https:\/\/i\.discogs\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'discogs-images-cache',
              cacheableResponse: {
                statuses: [0, 200]
              },
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            urlPattern: /^https:\/\/(www|secure)\.gravatar\.com\/avatar\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gravatar-images-cache',
              cacheableResponse: {
                statuses: [0, 200]
              },
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            urlPattern: /^https:\/\/img\.discogs\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'discogs-images-cache',
              cacheableResponse: {
                statuses: [0, 200]
              },
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      }
    }),
    // pwa-assets injects <link rel="icon" href="/logo.svg"> (its source image).
    // Replace with our hand-made favicon.svg for the browser tab icon.
    // transformIndexHtml covers dev, generateBundle covers build.
    {
      name: 'pwa-favicon-override',
      enforce: 'post' as const,
      transformIndexHtml: {
        order: 'post' as const,
        handler: (html: string) => replacePwaLogoFavicon(html)
      },
      generateBundle(_, bundle) {
        const html = bundle['index.html']
        if (html?.type === 'asset' && typeof html.source === 'string') {
          html.source = replacePwaLogoFavicon(html.source)
        }
      }
    }
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('/react-dom/') || id.includes('/react/')) {
              return 'vendor-react'
            }
            if (id.includes('@tanstack/react-router')) {
              return 'vendor-router'
            }
            if (id.includes('@tanstack/react-query') || id.includes('@trpc/')) {
              return 'vendor-trpc'
            }
            if (id.includes('@radix-ui/') || id.includes('lucide-react')) {
              return 'vendor-ui'
            }
          }
          return undefined
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  }
})
