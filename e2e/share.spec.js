import { expect, test } from '@playwright/test'

const shapes = (page) => page.locator('.vue-flow__node')

test('a copied link opens the same diagram in another browser, as an undoable change', async ({
  page,
  context,
  browser,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/new')
  await page.getByRole('button', { name: 'New diagram' }).click()
  await page.getByRole('button', { name: /Web app architecture/ }).click()
  await expect(shapes(page)).toHaveCount(9)

  await page.getByRole('banner').getByRole('button', { name: 'Share' }).click()
  await page.getByRole('button', { name: 'Copy private link' }).click()
  await expect(page.getByText(/Link copied/)).toBeVisible()
  const link = await page.evaluate(() => navigator.clipboard.readText())
  expect(link).toMatch(/\/new#flow=z[\w-]+$/)

  // A different browser profile: nothing in common but the link.
  const other = await browser.newContext()
  const visitor = await other.newPage()
  await visitor.goto(link)

  await expect(shapes(visitor)).toHaveCount(9)
  await expect(visitor.getByTestId('edge-label').filter({ hasText: 'HTTPS' })).toBeVisible()
  await expect(visitor).toHaveURL(/\/new$/)

  await visitor.getByRole('banner').getByRole('button', { name: 'Undo' }).click()
  await expect(shapes(visitor)).toHaveCount(5)
  await other.close()
})

test('a damaged link says so and leaves the diagram alone', async ({ page }) => {
  await page.goto('/new#flow=zthis-is-not-a-diagram')

  await expect(page.getByText('This link does not hold a diagram isketch can read.')).toBeVisible()
  await expect(shapes(page)).toHaveCount(5)
  await expect(page).toHaveURL(/\/new$/)
})
