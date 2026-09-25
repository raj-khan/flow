import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

/** Where links point when the head is built; %SITE_URL% in index.html. */
const SITE_URL = (process.env.VITE_SITE_URL ?? 'https://isketch.online').replace(/\/+$/, '')

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
  ],

  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
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
