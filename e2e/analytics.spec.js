import { expect, test } from '@playwright/test'

test('analytics is off in tests: every page loads the no-op, and nothing reaches Google', async ({
  page,
}) => {
  const google = []
  page.on('request', (request) => {
    if (/google-analytics|googletagmanager/.test(request.url())) google.push(request.url())
  })

  for (const path of ['/', '/templates/url-shortener', '/docs/format/', '/new']) {
    await page.goto(path)
    await expect.poll(() => page.evaluate(() => typeof window.isketchTrack)).toBe('function')
  }

  // An event the app counts: with analytics off, it goes nowhere.
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: 'Copy for AI' }).click()
  await expect(page.getByText(/Brief copied/)).toBeVisible()
  expect(google).toEqual([])
})
