import { expect, test } from '@playwright/test'

// Someone new: nothing saved in this browser yet.
test.use({ storageState: { cookies: [], origins: [] } })

test.beforeEach(async ({ page }) => {
  await page.route('https://www.youtube-nocookie.com/**', (route) =>
    route.fulfill({ contentType: 'text/html', body: '<p>video</p>' }),
  )
})

test('plays the tutorial once for someone new, and again from its button', async ({ page }) => {
  await page.goto('/new')
  const dialog = page.getByRole('dialog', { name: 'How isketch works' })
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('iframe')).toHaveAttribute(
    'src',
    /youtube-nocookie\.com\/embed\/aaaaaaaaaaa\?autoplay=1/,
  )

  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await page.reload()
  await expect(page.locator('.vue-flow')).toBeVisible()
  await expect(dialog).toBeHidden()

  await page.getByRole('button', { name: 'Tutorial', exact: true }).click()
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Close dialog' }).click()
  await expect(dialog).toBeHidden()
})

test('waits when someone came by a shared link', async ({ page }) => {
  await page.goto(`/new#flow=t${Buffer.from('a = process "A"').toString('base64url')}`)
  await expect(page.locator('.vue-flow__node')).toHaveCount(1)
  await expect(page.getByRole('dialog', { name: 'How isketch works' })).toBeHidden()
})
