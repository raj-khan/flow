import { expect, test } from '@playwright/test'

import { history } from './helpers.js'

const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('flow:document')))
const colors = async (page) =>
  Object.fromEntries((await saved(page)).nodes.map((node) => [node.id, node.data?.color ?? '']))

const DOC = {
  version: 3,
  title: 'Shop',
  nodes: [
    { id: 'api', type: 'process', name: 'API', data: {}, position: { x: 0, y: 0 } },
    { id: 'db', type: 'database', name: 'Orders', data: {}, position: { x: 320, y: 0 } },
    { id: 'web', type: 'screen', name: 'Web', data: {}, position: { x: 0, y: 240 } },
  ],
  edges: [],
}
const node = (page, id) => page.locator(`.vue-flow__node[data-id="${id}"]`)
const toolbar = (page) => page.getByRole('toolbar', { name: 'Selection' })

test.beforeEach(async ({ page }) => {
  await page.goto('/new')
  await page.evaluate((doc) => localStorage.setItem('flow:document', JSON.stringify(doc)), DOC)
  await page.reload()
  await expect(node(page, 'web')).toBeVisible()
})

test('colours the selected shapes in one undoable change, and Default clears it', async ({
  page,
}) => {
  await node(page, 'api').click({ modifiers: ['Shift'] })
  await node(page, 'db').click({ modifiers: ['Shift'] })
  const colour = toolbar(page).getByRole('radiogroup', { name: 'Colour' })
  await expect(colour.getByRole('radio', { name: 'Default' })).toHaveAttribute(
    'aria-checked',
    'true',
  )

  await colour.getByRole('radio', { name: 'Blue' }).click()
  await expect.poll(() => colors(page)).toEqual({ api: 'blue', db: 'blue', web: '' })
  await expect(node(page, 'api').locator('svg[data-color="blue"]')).toHaveCount(1)
  await expect(colour.getByRole('radio', { name: 'Blue' })).toHaveAttribute('aria-checked', 'true')

  await history(page).getByRole('button', { name: 'Undo' }).click()
  await expect.poll(() => colors(page)).toEqual({ api: '', db: '', web: '' })

  await history(page).getByRole('button', { name: 'Redo' }).click()
  await expect.poll(() => colors(page)).toEqual({ api: 'blue', db: 'blue', web: '' })
  await colour.getByRole('radio', { name: 'Default' }).click()
  await expect.poll(() => colors(page)).toEqual({ api: '', db: '', web: '' })
})

test('the pen draws in its own colour, remembered', async ({ page }) => {
  await page.getByRole('button', { name: 'Pen', exact: true }).click()
  const pen = page.getByRole('toolbar', { name: 'Pen' })
  await pen.getByRole('radio', { name: 'Red' }).click()

  const layer = await page.getByTestId('pen-layer').boundingBox()
  const x = layer.x + layer.width - 260
  const y = layer.y + 160
  await page.mouse.move(x, y)
  await page.mouse.down()
  for (let step = 1; step <= 12; step += 1) {
    await page.mouse.move(x + step * 12, y + Math.sin(step / 2) * 30)
  }
  await page.mouse.up()

  await expect.poll(async () => (await colors(page))['ink-1']).toBe('red')
  await page.reload()
  await page.getByRole('button', { name: 'Pen', exact: true }).click()
  await expect(
    page.getByRole('toolbar', { name: 'Pen' }).getByRole('radio', { name: 'Red' }),
  ).toHaveAttribute('aria-checked', 'true')
})
