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
  await expect(page.getByText('A blank canvas')).toBeVisible()
  // The samples wait behind a link; the canvas and its tools are there to use.
  await expect(page.getByRole('button', { name: /Web app architecture/ })).toHaveCount(0)
  await expect(page.locator('.vue-flow__pane')).toBeVisible()

  await history(page).getByRole('button', { name: 'Undo' }).click()
  await expect(shapes(page)).toHaveCount(5)
})

test('opens a sample from the blank canvas, fitted to the screen', async ({ page }) => {
  await fromMenu(page, 'New diagram')
  await page.getByRole('button', { name: 'Start from a sample' }).click()
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

test('draws on a blank canvas straight away, and the hint makes way', async ({ page }) => {
  await fromMenu(page, 'New diagram')
  await expect(page.getByTestId('blank-hint')).toBeVisible()

  await page.getByRole('button', { name: 'Pen', exact: true }).click()
  const layer = await page.getByTestId('pen-layer').boundingBox()
  // Across the middle, right over the hint.
  const y = layer.y + layer.height / 2
  await page.mouse.move(layer.x + layer.width / 2 - 120, y)
  await page.mouse.down()
  for (let step = 1; step <= 12; step += 1) {
    await page.mouse.move(layer.x + layer.width / 2 - 120 + step * 20, y + Math.sin(step) * 30)
  }
  await page.mouse.up()

  await expect(shapes(page)).toHaveCount(1)
  await expect(page.getByTestId('blank-hint')).toHaveCount(0)
})

test('a double click on the blank canvas adds the first shape', async ({ page }) => {
  await fromMenu(page, 'New diagram')
  const pane = await page.locator('.vue-flow__pane').boundingBox()
  await page.mouse.dblclick(pane.x + 200, pane.y + 200)
  await expect(shapes(page)).toHaveCount(1)
})

test('New from a sample lists the samples on a blank canvas', async ({ page }) => {
  await fromMenu(page, 'New from a sample')
  await expect(shapes(page)).toHaveCount(0)
  await page.getByRole('button', { name: /Web app architecture/ }).click()
  await expect(shapes(page)).toHaveCount(9)

  // Undo brings back the diagram from before, not an empty one.
  await history(page).getByRole('button', { name: 'Undo' }).click()
  await history(page).getByRole('button', { name: 'Undo' }).click()
  await expect(shapes(page)).toHaveCount(5)
})
