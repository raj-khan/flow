import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

import { analyticsScript } from './src/api/analytics.js'

/** Where links point when the head is built; %SITE_URL% in index.html. */
const SITE_URL = (process.env.VITE_SITE_URL ?? 'https://isketch.online').replace(/\/+$/, '')

/** Serve the landing at / and content pages at their clean URL, as production does. */
function serveLanding(server) {
  server.middlewares.use((req, res, next) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    if (url.pathname === '/' || url.pathname.startsWith('/?')) {
      req.url = '/landing.html' + url.search
      return next()
    }
    // A directory with an index, such as /docs/format: its page, not the SPA.
    const hasIndex =
      !url.pathname.endsWith('/') &&
      !url.pathname.split('/').pop()?.includes('.') &&
      server.config.publicDir &&
      existsSync(join(server.config.publicDir, `.${url.pathname}`, 'index.html'))
    if (hasIndex) {
      res.statusCode = 301
      res.setHeader('location', `${url.pathname}/${url.search}`)
      return res.end()
    }
    next()
  })
}

/** The GA4 measurement id this build carries, read once the config resolves. */
let gaId

// One config file, not two: Vitest resolves the same `@` alias the app does.
export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    {
      name: 'site-url',
      transformIndexHtml(html) {
        return html.replaceAll('%SITE_URL%', SITE_URL)
      },
    },
    {
      // The landing is a static page in public/, not an app route; this puts it
      // at / in `vite dev` and `vite preview`, as nginx and vercel.json do in
      // production.
      name: 'landing-at-root',
      configureServer: serveLanding,
      configurePreviewServer: serveLanding,
    },
    {
      // One /analytics.js for the app and the static pages: GA4 when the build
      // has VITE_GA_ID, a no-op otherwise, and always a no-op in `vite dev`.
      name: 'analytics',
      configResolved(config) {
        gaId = config.env.VITE_GA_ID
      },
      configureServer(server) {
        server.middlewares.use('/analytics.js', (_req, res) => {
          res.setHeader('content-type', 'text/javascript')
          res.end(analyticsScript(undefined))
        })
      },
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'analytics.js',
          source: analyticsScript(gaId),
        })
      },
    },
  ],

  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },

  build: {
    rollupOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        convert: fileURLToPath(new URL('./convert.html', import.meta.url)),
      },
    },
  },

  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/tests/setup.js'],
    include: ['src/**/*.spec.js'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{js,vue}'],
      exclude: ['src/tests/**', 'src/main.js'],
    },
  },
})
