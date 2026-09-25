import { expect, test } from '@playwright/test'

import { fromMenu } from './helpers.js'

const shapes = (page) => page.locator('.vue-flow__node')
const transform = (page) =>
  page.locator('.vue-flow__transformationpane').evaluate((element) => element.style.transform)
const zoomOf = async (page) => Number((await transform(page)).match(/scale\(([\d.]+)\)/)[1])
const menuButton = (page) => page.getByRole('button', { name: 'Menu', exact: true })
const opacity = (locator) => locator.evaluate((element) => getComputedStyle(element).opacity)

test.beforeEach(async ({ page }) => {
  await page.goto('/new')
  await expect(shapes(page)).toHaveCount(5)
})

test('F enters full screen and leaves it; so does the menu', async ({ page }) => {
  const isFull = () => page.evaluate(() => Boolean(document.fullscreenElement))

  await page.keyboard.press('f')
  await expect.poll(isFull).toBe(true)
  await page.keyboard.press('f')
  await expect.poll(isFull).toBe(false)

  await fromMenu(page, 'Full screen')
  await expect.poll(isFull).toBe(true)
})

test('zen mode hides every tool until the pointer nears an edge', async ({ page }) => {
  const header = page.getByRole('banner')
  const history = page.getByRole('toolbar', { name: 'History' })

  await page.mouse.move(640, 360)
  await page.keyboard.press('Alt+z')
  await expect.poll(() => opacity(header)).toBe('0')
  await expect.poll(() => opacity(history.locator('..'))).toBe('0')
  await expect(page.locator('.vue-flow__minimap')).toHaveCount(0)

  await page.mouse.move(640, 20)
  await expect.poll(() => opacity(header)).toBe('1')
  await menuButton(page).click()
  await expect(page.getByRole('menu')).toBeVisible()
  await page.keyboard.press('Escape')

  await page.mouse.move(640, 360)
  await page.keyboard.press('Alt+z')
  await expect.poll(() => opacity(header)).toBe('1')
})

test('Shift+1 fits the diagram and Shift+2 zooms to the selection', async ({ page }) => {
  await page.getByRole('button', { name: 'Zoom out' }).click()
  await page.getByRole('button', { name: 'Zoom out' }).click()
  const zoomedOut = await zoomOf(page)

  await page.keyboard.press('Shift+Digit1')
  await expect.poll(() => zoomOf(page)).toBeGreaterThan(zoomedOut)
  const fitted = await zoomOf(page)

  await page.locator('.vue-flow__node[data-id="e879e4"]').click({ modifiers: ['Shift'] })
  await page.keyboard.press('Shift+Digit2')
  await expect.poll(() => zoomOf(page)).toBeGreaterThan(fitted)
})

test('the minimap shows the diagram, and can be hidden for good', async ({ page }) => {
  const minimap = page.locator('.vue-flow__minimap')
  await expect(minimap).toBeVisible()
  await expect(minimap.locator('.vue-flow__minimap-node')).toHaveCount(5)

  await page.getByRole('button', { name: 'Minimap' }).click()
  await expect(minimap).toHaveCount(0)
  await page.reload()
  await expect(shapes(page)).toHaveCount(5)
  await expect(minimap).toHaveCount(0)
})

test('the help dialog lists the view shortcuts', async ({ page }) => {
  await page.keyboard.press('?')
  const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' })
  for (const text of [
    'Full screen, and back',
    'Zen mode',
    'Zoom to fit the whole diagram',
    'Zoom to the selection',
  ]) {
    await expect(dialog.getByText(text, { exact: false })).toBeVisible()
  }
})
