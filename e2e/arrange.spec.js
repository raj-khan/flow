import { expect, test } from '@playwright/test'

const nodeAt = (page, id) => page.locator(`.vue-flow__node[data-id="${id}"]`)
const NODE = { start: '1', away: 'b6a0c1', welcome: 'b0653a', comment: 'e879e4' }
const toolbar = (page) => page.getByRole('toolbar', { name: 'Arrange the selection' })

test.beforeEach(async ({ page }) => {
  await page.goto('/new')
  await expect(nodeAt(page, NODE.away)).toBeVisible()
})

test('aligns a selection, as one undoable change', async ({ page }) => {
  await expect(toolbar(page)).toHaveCount(0)
  await nodeAt(page, NODE.away).click({ modifiers: ['Shift'] })
  await nodeAt(page, NODE.welcome).click({ modifiers: ['Shift'] })
  await expect(toolbar(page)).toContainText('2 selected')

  const before = await nodeAt(page, NODE.welcome).boundingBox()
  await toolbar(page).getByRole('button', { name: 'Align left' }).click()

  await expect
    .poll(async () => (await nodeAt(page, NODE.welcome).boundingBox()).x)
    .toBeCloseTo((await nodeAt(page, NODE.away).boundingBox()).x, 0)

  await page.getByRole('banner').getByRole('button', { name: 'Undo' }).click()
  await expect
    .poll(async () => Math.round((await nodeAt(page, NODE.welcome).boundingBox()).x))
    .toBe(Math.round(before.x))
})

test('distributes three shapes with equal gaps', async ({ page }) => {
  for (const id of [NODE.start, NODE.away, NODE.comment]) {
    await nodeAt(page, id).click({ modifiers: ['Shift'] })
  }
  await toolbar(page).getByRole('button', { name: 'Distribute down' }).click()

  await expect
    .poll(async () => {
      const [a, b, c] = await Promise.all(
        [NODE.start, NODE.away, NODE.comment].map((id) => nodeAt(page, id).boundingBox()),
      )
      return Math.abs(b.y - (a.y + a.height) - (c.y - (b.y + b.height)))
    })
    .toBeLessThan(2)
})

test('remembers whether shapes snap to the grid', async ({ page }) => {
  const snap = page.getByRole('button', { name: 'Snap to grid' })
  await expect(snap).toHaveAttribute('aria-pressed', 'true')
  await snap.click()
  await expect(snap).toHaveAttribute('aria-pressed', 'false')
  await page.reload()
  await expect(page.getByRole('button', { name: 'Snap to grid' })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
})

test('snaps a dragged shape to the grid of dots', async ({ page }) => {
  const box = await nodeAt(page, NODE.away).boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 47, box.y + box.height / 2 + 31, { steps: 8 })
  await page.mouse.up()

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem('flow:document')).nodes.find((n) => n.id === 'b6a0c1')
            .position,
      ),
    )
    .toEqual({ x: expect.any(Number), y: expect.any(Number) })
  const { x, y } = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem('flow:document')).nodes.find((n) => n.id === 'b6a0c1')
        .position,
  )
  expect(x % 18).toBe(0)
  expect(y % 18).toBe(0)
})
