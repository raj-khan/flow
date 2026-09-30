import { expect, test } from '@playwright/test'

import { history } from './helpers.js'

const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('flow:document')))
const drawnNodes = async (page) => (await saved(page)).nodes.filter((node) => node.id !== 'hint')
const kinds = async (page) => (await drawnNodes(page)).map((node) => node.type)

/** One shape, since an empty diagram shows its welcome instead of a canvas. */
const EMPTY = {
  version: 3,
  title: 'Sketch',
  nodes: [{ id: 'hint', type: 'text', name: 'Sketch here', data: {}, position: { x: 0, y: 0 } }],
  edges: [],
}

/** Drag the pen through these points, relative to the layer's top left. */
async function stroke(page, corners) {
  const layer = await page.getByTestId('pen-layer').boundingBox()
  const at = ([x, y]) => [layer.x + x, layer.y + y]
  await page.mouse.move(...at(corners[0]))
  await page.mouse.down()
  for (let index = 1; index < corners.length; index += 1) {
    await page.mouse.move(...at(corners[index]), { steps: 12 })
  }
  await page.mouse.up()
}

const BOX = [
  [300, 200],
  [520, 204],
  [516, 330],
  [296, 326],
  [302, 206],
]

test.beforeEach(async ({ page }) => {
  await page.goto('/new')
  await page.evaluate((doc) => localStorage.setItem('flow:document', JSON.stringify(doc)), EMPTY)
  await page.reload()
  await page.getByRole('button', { name: 'Pen', exact: true }).click()
})

test('a drawn box becomes a process, with its title ready to type', async ({ page }) => {
  await stroke(page, BOX)

  await expect.poll(() => kinds(page)).toEqual(['process'])
  await expect(page.getByText('Drawn as a rectangle.')).toBeVisible()
  const title = page.getByRole('textbox', { name: 'Shape title' })
  await expect(title).toBeFocused()

  await title.fill('Checkout')
  await title.press('Enter')
  await expect.poll(async () => (await drawnNodes(page))[0].name).toBe('Checkout')
  const { size } = (await drawnNodes(page))[0]
  // Wider than tall, as drawn, whatever the zoom.
  expect(size.width / size.height).toBeGreaterThan(1.4)
  expect(size.width / size.height).toBeLessThan(2.2)

  // Undo takes the title, then the shape.
  await history(page).getByRole('button', { name: 'Undo' }).click()
  await history(page).getByRole('button', { name: 'Undo' }).click()
  await expect.poll(() => kinds(page)).toEqual([])
})

test('an ellipse and a diamond become a terminal and a decision', async ({ page }) => {
  const ellipse = Array.from({ length: 40 }, (_, index) => {
    const angle = (index / 38) * Math.PI * 2
    return [400 + Math.cos(angle) * 120, 260 + Math.sin(angle) * 60]
  })
  await stroke(page, ellipse)
  await expect.poll(() => kinds(page)).toEqual(['terminal'])
  // Escape leaves the kind's own title, and the pen on.
  const title = page.getByRole('textbox', { name: 'Shape title' })
  await title.press('Escape')
  await expect(title).toHaveCount(0)
  await expect(page.getByTestId('pen-layer')).toBeVisible()

  await stroke(page, [
    [700, 120],
    [800, 190],
    [700, 260],
    [600, 190],
    [696, 124],
  ])
  await expect.poll(() => kinds(page)).toEqual(['terminal', 'decision'])
})

test('Keep as drawn puts the stroke back, and scribbles stay strokes', async ({ page }) => {
  await stroke(page, BOX)
  await expect.poll(() => kinds(page)).toEqual(['process'])
  await page.getByRole('button', { name: 'Keep as drawn' }).click()
  await expect.poll(() => kinds(page)).toEqual(['ink'])

  await stroke(page, [
    [600, 400],
    [640, 460],
    [680, 400],
    [720, 460],
    [760, 400],
  ])
  await expect.poll(() => kinds(page)).toEqual(['ink', 'ink'])
})

test('with auto shapes off, a drawn box stays a stroke, and the choice is kept', async ({
  page,
}) => {
  const toggle = page.getByRole('toolbar', { name: 'Pen' }).getByRole('button', {
    name: 'Auto shapes',
  })
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await toggle.click()
  await stroke(page, BOX)
  await expect.poll(() => kinds(page)).toEqual(['ink'])

  await page.reload()
  await page.getByRole('button', { name: 'Pen', exact: true }).click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
})
