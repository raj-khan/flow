import { expect, test } from '@playwright/test'

import { fromMenu, history, openLibrary } from './helpers.js'

const shapes = (page) => page.locator('.vue-flow__node')
const node = (page, id) => page.locator(`.vue-flow__node[data-id="${id}"]`)
const tool = (page, name) =>
  page.getByRole('toolbar', { name: 'Tools' }).getByRole('button', { name, exact: true })
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('flow:document')))

test.beforeEach(async ({ page }) => {
  await page.goto('/new')
  await expect(shapes(page)).toHaveCount(5)
})

test('the canvas fills the screen beside the folded side panel, with the tools floating over it', async ({
  page,
}) => {
  const pane = await page.locator('.vue-flow__pane').boundingBox()
  const rail = await page.getByTestId('side-dock').boundingBox()
  const { width, height } = page.viewportSize()
  expect(pane).toMatchObject({ x: rail.width, y: 0, width: width - rail.width, height })

  for (const name of ['Select', 'Hand', 'Shapes', 'Connector', 'Text', 'Pen', 'Eraser']) {
    await expect(tool(page, name)).toBeVisible()
  }
  await expect(tool(page, 'Select')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('complementary', { name: 'Shapes' })).toHaveCount(0)
})

test('number keys and letters pick a tool, and Escape goes back to Select', async ({ page }) => {
  await page.keyboard.press('2')
  await expect(tool(page, 'Hand')).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('e')
  await expect(tool(page, 'Eraser')).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Escape')
  await expect(tool(page, 'Select')).toHaveAttribute('aria-pressed', 'true')

  await page.keyboard.press('3')
  await expect(page.getByRole('complementary', { name: 'Shapes' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('complementary', { name: 'Shapes' })).toHaveCount(0)
})

test('the hand moves around without opening or moving shapes', async ({ page }) => {
  await tool(page, 'Hand').click()
  await node(page, 'b6a0c1').click()
  await expect(page).toHaveURL(/\/new$/)
  await expect(page.locator('.vue-flow__node.selected')).toHaveCount(0)
})

test('the connector joins two shapes with two clicks', async ({ page }) => {
  const before = (await saved(page)).edges.length
  await tool(page, 'Connector').click()
  await node(page, 'e879e4').click()
  await node(page, 'd09c08').click()

  await expect.poll(async () => (await saved(page)).edges.length).toBe(before + 1)
  const added = (await saved(page)).edges.at(-1)
  expect(added).toMatchObject({ source: 'e879e4', target: 'd09c08' })
})

test('the text tool writes where the canvas is clicked, then hands back to Select', async ({
  page,
}) => {
  await tool(page, 'Text').click()
  await page.locator('.vue-flow__pane').click({ position: { x: 200, y: 600 } })

  await expect(shapes(page)).toHaveCount(6)
  await expect(page.getByRole('textbox', { name: 'Shape title' })).toBeFocused()
  await expect(tool(page, 'Select')).toHaveAttribute('aria-pressed', 'true')
  expect((await saved(page)).nodes.at(-1).type).toBe('text')
})

test('the eraser deletes a shape with a click, and undo brings it back', async ({ page }) => {
  await tool(page, 'Eraser').click()
  // Through the eraser's layer, which takes every press while it is on.
  await node(page, 'e879e4').click({ force: true })
  await expect(shapes(page)).toHaveCount(4)

  await history(page).getByRole('button', { name: 'Undo' }).click()
  await expect(shapes(page)).toHaveCount(5)
})

test('the library closes itself once a shape is added', async ({ page }) => {
  const library = await openLibrary(page)
  await expect(tool(page, 'Shapes')).toHaveAttribute('aria-pressed', 'true')
  await library.getByRole('button', { name: 'Decision', exact: true }).click()
  await expect(shapes(page)).toHaveCount(6)
  await expect(library).toHaveCount(0)
})

test('the text pane and the details drawer float and close', async ({ page }) => {
  await fromMenu(page, 'Edit as text')
  const text = page.getByRole('complementary', { name: 'Diagram as text' })
  await expect(text).toBeVisible()
  await text.getByRole('button', { name: 'Close text' }).click()
  await expect(text).toHaveCount(0)

  await node(page, 'b6a0c1').click()
  await expect(page).toHaveURL(/\/new\/node\/b6a0c1$/)
  await page.getByRole('button', { name: 'Close details' }).click()
  await expect(page).toHaveURL(/\/new$/)
})

test('a right click opens the context menu for a shape or a connection', async ({ page }) => {
  await node(page, 'e879e4').click({ button: 'right' })
  const menu = page.getByRole('menu', { name: 'Shape' })
  await expect(menu.getByRole('menuitem').first()).toBeFocused()
  await menu.getByRole('menuitem', { name: 'Duplicate' }).click()
  await expect(shapes(page)).toHaveCount(6)

  await page.keyboard.press('Escape')
  // A step line's box has no line at its centre, so the menu is asked for on the line itself.
  await page
    .locator('.vue-flow__edge[data-id="e-d09c08-b6a0c1"] path.cursor-pointer')
    .dispatchEvent('contextmenu', { bubbles: true, clientX: 10, clientY: 10 })
  await expect(page.getByRole('menu', { name: 'Connection' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
})
