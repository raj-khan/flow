import { expect, test } from '@playwright/test'

import { openLibrary } from './helpers.js'

const palette = (page) => page.getByRole('complementary', { name: 'Shapes' })
const shapeButton = (page, label) => palette(page).getByRole('button', { name: label, exact: true })
const shapes = (page) => page.locator('.vue-flow__node')
const titleField = (page) => page.getByRole('textbox', { name: 'Shape title' })
/** The shape just added: selected, with its title field open. */
const added = (page) => page.locator('.vue-flow__node.selected')
const transform = (page) =>
  page.locator('.vue-flow__transformationpane').evaluate((element) => element.style.transform)

test.beforeEach(async ({ page }) => {
  await page.goto('/new')
  await expect(shapes(page)).toHaveCount(5)
  await openLibrary(page)
})

test('adds a shape on click, selected, with its title ready to type over', async ({ page }) => {
  await shapeButton(page, 'Decision').click()

  await expect(shapes(page)).toHaveCount(6)
  await expect(titleField(page)).toBeFocused()
  await expect(titleField(page)).toHaveValue('Decision')
  // No drawer: the shape is named where it sits.
  await expect(page).toHaveURL(/\/new$/)

  await page.keyboard.type('In stock?')
  await page.keyboard.press('Enter')
  await expect(added(page)).toContainText('In stock?')
})

test('drops a dragged shape where it was let go', async ({ page }) => {
  const pane = await page.locator('.vue-flow__pane').boundingBox()
  const drop = { x: Math.round(pane.width * 0.45), y: Math.round(pane.height * 0.6) }

  // Where that point is in the diagram, from the viewport transform before the drop.
  const [x, y, zoom] = (await transform(page)).match(/-?[\d.]+/g).map(Number)
  const expected = { x: (drop.x - x) / zoom, y: (drop.y - y) / zoom }

  await shapeButton(page, 'Database').dragTo(page.locator('.vue-flow__pane'), {
    targetPosition: drop,
  })
  await expect(titleField(page)).toBeFocused()
  const id = await added(page).getAttribute('data-id')

  const saved = await page.evaluate(
    (nodeId) =>
      JSON.parse(localStorage.getItem('flow:document')).nodes.find((node) => node.id === nodeId),
    id,
  )
  expect(saved.type).toBe('database')
  // Centred on the pointer: the stored corner is half a shape up and left of it.
  expect(Math.abs(saved.position.x + 116 - expected.x)).toBeLessThan(2)
  expect(Math.abs(saved.position.y + 52 - expected.y)).toBeLessThan(2)
})

test('adds a shape from the keyboard', async ({ page }) => {
  await shapeButton(page, 'Note').focus()
  await page.keyboard.press('Enter')

  await expect(titleField(page)).toBeFocused()
  await expect(titleField(page)).toHaveValue('Note')
})

test('adding a shape in view leaves the canvas where it was', async ({ page }) => {
  const before = await transform(page)
  await shapeButton(page, 'Process').click()
  await expect(titleField(page)).toBeFocused()

  const box = await added(page).boundingBox()
  const viewport = page.viewportSize()
  expect(box.x >= 0 && box.y >= 0 && box.x + box.width <= viewport.width).toBe(true)
  expect(await transform(page)).toBe(before)
})
