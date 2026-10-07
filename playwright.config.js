import { defineConfig, devices } from '@playwright/test'

/**
 * Covers what the unit tests deliberately cannot: real Vue Flow rendering, real
 * drag, and the URL surviving a reload. A handful of specs, not a second suite.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    // The offline spec turns it on; elsewhere a cached build would outlive a rebuild.
    serviceWorkers: 'block',
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
    // Everyone here has seen the tutorial and folded the side panel, so each
    // control has one name on screen; their own specs start as someone new.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: 'http://localhost:4173',
          localStorage: [
            { name: 'flow:tutorial-seen', value: 'yes' },
            { name: 'flow:dock', value: 'off' },
          ],
        },
      ],
    },
  },

  // Desktop runs everything but the touch specs; a phone and a tablet run those.
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, testIgnore: /mobile\// },
    { name: 'phone', use: { ...devices['Pixel 7'] }, testMatch: /mobile\/.*\.spec\.js/ },
    {
      name: 'tablet',
      use: { ...devices['Galaxy Tab S4 landscape'] },
      testMatch: /mobile\/.*\.spec\.js/,
    },
  ],

  // Against the production build, so E2E exercises what actually ships.
  webServer: {
    command:
      'VITE_ISKETCH_API=https://api.isketch.test VITE_TUTORIAL_VIDEO=https://youtu.be/aaaaaaaaaaa npm run build && npm run preview -- --port 4173',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
