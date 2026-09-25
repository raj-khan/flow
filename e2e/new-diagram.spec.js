import { expect, test } from '@playwright/test'

import { fromMenu, history, openLibrary } from './helpers.js'

const shapes = (page) => page.locator('.vue-flow__node')

test.beforeEach(async ({ page }) => {
  await page.goto('/new')
  await expect(shapes(page)).toHaveCount(5)
})

test('starts an empty diagram, and undo brings the last one back', async ({ page }) => {
  await fromMenu(page, 'New diagram')

  await expect(shapes(page)).toHaveCount(0)
  await expect(page.getByText('An empty diagram')).toBeVisible()

  await history(page).getByRole('button', { name: 'Undo' }).click()
  await expect(shapes(page)).toHaveCount(5)
})

test('opens a sample from the empty canvas, fitted to the screen', async ({ page }) => {
  await fromMenu(page, 'New diagram')
  await page.getByRole('button', { name: /Web app architecture/ }).click()

  await expect(shapes(page)).toHaveCount(9)
  await expect(page.getByTestId('edge-label').filter({ hasText: 'HTTPS' })).toBeVisible()

  const viewport = page.viewportSize()
  await expect
    .poll(async () => {
      const boxes = await Promise.all(
        (await shapes(page).all()).map((shape) => shape.boundingBox()),
      )
      return boxes.every((box) => box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width)
    })
    .toBe(true)

  await page.reload()
  await expect(shapes(page)).toHaveCount(9)
})

test('adds the first shape to an empty diagram', async ({ page }) => {
  await fromMenu(page, 'New diagram')
  await expect(shapes(page)).toHaveCount(0)

  await (await openLibrary(page)).getByRole('button', { name: 'Process', exact: true }).click()

  await expect(shapes(page)).toHaveCount(1)
  await expect(page.getByLabel('Title')).toHaveValue('Process')
})
