import { expect, test } from '@playwright/test'

import { history } from './helpers.js'

const shapes = (page) => page.locator('.vue-flow__node')
const shape = (page, id) => page.locator(`.vue-flow__node[data-id="${id}"]`)
const saved = (page) =>
  page.evaluate(() =>
    Object.fromEntries(
      JSON.parse(localStorage.getItem('flow:document')).nodes.map((node) => [
        node.id,
        node.position,
      ]),
    ),
  )

test.beforeEach(async ({ page }) => {
  await page.goto('/new')
  await expect(shapes(page)).toHaveCount(5)
})

test('Shift+click builds a selection that moves as one, and undoes as one', async ({ page }) => {
  await shape(page, 'b6a0c1').click({ modifiers: ['Shift'] })
  await shape(page, 'e879e4').click({ modifiers: ['Shift'] })
  await expect(page.locator('.vue-flow__node.selected')).toHaveCount(2)
  // Modifier clicks select; they do not open the drawer.
  await expect(page).toHaveURL(/\/new$/)

  const box = await shape(page, 'b6a0c1').boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + 12)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 20, box.y + 30, { steps: 5 })
  await page.mouse.move(box.x + box.width / 2 + 180, box.y + 90, { steps: 10 })
  await page.mouse.up()

  await expect.poll(async () => Boolean((await saved(page)).e879e4)).toBe(true)
  const after = await saved(page)
  expect(after.b6a0c1).toBeTruthy()

  await history(page).getByRole('button', { name: 'Undo' }).click()
  await expect.poll(async () => (await saved(page)).e879e4 ?? null).toBeNull()
  expect((await saved(page)).b6a0c1 ?? null).toBeNull()
})

test('Ctrl+A then Delete removes everything in one step, and Undo brings it back', async ({
  page,
}) => {
  await page.locator('.vue-flow__pane').click({ position: { x: 20, y: 300 } })
  await page.keyboard.press('Control+a')
  await expect(page.locator('.vue-flow__node.selected')).toHaveCount(5)

  await page.keyboard.press('Delete')
  await expect(shapes(page)).toHaveCount(0)
  await expect(page.getByText('Deleted 5 shapes')).toBeVisible()

  await page.getByRole('button', { name: 'Undo' }).last().click()
  await expect(shapes(page)).toHaveCount(5)
})

test('Shift+drag on the canvas draws a selection box', async ({ page }) => {
  const away = await shape(page, 'b6a0c1').boundingBox()
  const note = await shape(page, 'e879e4').boundingBox()

  await page.keyboard.down('Shift')
  await page.mouse.move(away.x - 20, away.y - 20)
  await page.mouse.down()
  await page.mouse.move(note.x + note.width + 20, note.y + note.height + 20, { steps: 10 })
  await page.mouse.up()
  await page.keyboard.up('Shift')

  await expect(shape(page, 'b6a0c1')).toHaveClass(/selected/)
  await expect(shape(page, 'e879e4')).toHaveClass(/selected/)
  await expect(shape(page, '1')).not.toHaveClass(/selected/)
})

test('Delete removes a selected shape, or a lone selected edge, with an undo', async ({ page }) => {
  await shape(page, 'e879e4').click({ modifiers: ['Shift'] })
  await page.keyboard.press('Delete')
  await expect(shapes(page)).toHaveCount(4)
  await expect(page.getByText('Deleted a shape')).toBeVisible()
  // The diagram changed, not only the picture of it.
  const stored = await page.evaluate(
    () => JSON.parse(localStorage.getItem('flow:document')).nodes.length,
  )
  expect(stored).toBe(4)

  // Dispatched, not clicked: the middle of an L-shaped edge's box is empty canvas.
  const edge = page.locator('.vue-flow__edge[data-id="e-d09c08-b0653a"]')
  await edge.locator('[data-testid="edge-hit-area"]').dispatchEvent('click')
  await expect(edge).toHaveClass(/selected/)
  await page.keyboard.press('Delete')
  await expect
    .poll(() =>
      page.evaluate(() =>
        JSON.parse(localStorage.getItem('flow:document')).edges.some(
          (edge) => edge.id === 'e-d09c08-b0653a',
        ),
      ),
    )
    .toBe(false)
  await expect(shapes(page)).toHaveCount(4)
})
