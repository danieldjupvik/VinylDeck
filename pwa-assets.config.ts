import {
  createAppleSplashScreens,
  defineConfig,
  minimal2023Preset
} from '@vite-pwa/assets-generator/config'

import type { Preset } from '@vite-pwa/assets-generator/config'

export default defineConfig({
  preset: {
    ...minimal2023Preset,
    transparent: {
      sizes: [64, 192, 512],
      favicons: []
    },
    maskable: {
      sizes: [512],
      resizeOptions: {
        background: '#18181b'
      }
    },
    apple: {
      sizes: [180],
      resizeOptions: {
        background: '#18181b'
      }
    },
    // Library types don't account for exactOptionalPropertyTypes
    appleSplashScreens: createAppleSplashScreens({
      padding: 0.3,
      resizeOptions: { fit: 'contain', background: 'white' },
      darkResizeOptions: { fit: 'contain', background: '#18181b' },
      linkMediaOptions: {
        log: true,
        addMediaScreen: true,
        basePath: '/',
        xhtml: false
      },
      png: {
        compressionLevel: 9,
        quality: 60
      },
      name: (landscape, size, dark) => {
        const orientation = landscape ? 'landscape' : 'portrait'
        let theme = ''
        if (dark === true) theme = 'dark-'
        else if (dark === false) theme = 'light-'
        return `apple-splash-${orientation}-${theme}${size.width}x${size.height}.png`
      }
    }) as NonNullable<Preset['appleSplashScreens']>
  },
  images: ['public/logo.svg']
})
