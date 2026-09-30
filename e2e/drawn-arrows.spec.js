import { expect, test } from '@playwright/test'

import { history } from './helpers.js'

const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('flow:document')))
const node = (page, id) => page.locator(`.vue-flow__node[data-id="${id}"]`)

const DOC = {
  version: 3,
  title: 'Shop',
  nodes: [
    { id: 'api', type: 'process', name: 'API', data: {}, position: { x: 0, y: 0 } },
    { id: 'db', type: 'database', name: 'Orders', data: {}, position: { x: 480, y: 0 } },
  ],
  edges: [],
}

/** Drag the pen through these page points. */
async function stroke(page, corners) {
  await page.mouse.move(...corners[0])
  await page.mouse.down()
  for (let index = 1; index < corners.length; index += 1) {
    await page.mouse.move(...corners[index], { steps: 14 })
  }
  await page.mouse.up()
}

const middle = (box) => [box.x + box.width / 2, box.y + box.height / 2]

test.beforeEach(async ({ page }) => {
  await page.goto('/new')
  await page.evaluate((doc) => localStorage.setItem('flow:document', JSON.stringify(doc)), DOC)
  await page.reload()
  await expect(node(page, 'db')).toBeVisible()
  await page.getByRole('button', { name: 'Pen', exact: true }).click()
})

test('an arrow drawn from one shape to another connects them', async ({ page }) => {
  const [ax, ay] = middle(await node(page, 'api').boundingBox())
  const [dx, dy] = middle(await node(page, 'db').boundingBox())
  // Shaft, then a > for the head.
  await stroke(page, [
    [ax, ay],
    [dx, dy],
    [dx - 22, dy - 16],
    [dx, dy],
    [dx - 22, dy + 16],
  ])

  await expect
    .poll(async () => (await saved(page)).edges)
    .toEqual([{ id: 'e-api-db', source: 'api', target: 'db' }])
  await expect(page.getByText('Connected.')).toBeVisible()
  expect((await saved(page)).nodes.map((each) => each.type)).toEqual(['process', 'database'])

  await history(page).getByRole('button', { name: 'Undo' }).click()
  await expect.poll(async () => (await saved(page)).edges).toEqual([])
})

test('an arrow from a shape into open canvas adds the next shape there', async ({ page }) => {
  const box = await node(page, 'api').boundingBox()
  const [ax] = middle(box)
  const start = [ax, box.y + box.height - 10]
  const tip = [ax, box.y + box.height + 160]
  await stroke(page, [start, tip, [tip[0] - 14, tip[1] - 20]])

  await expect.poll(async () => (await saved(page)).nodes.length).toBe(3)
  const { nodes, edges } = await saved(page)
  expect(nodes[2]).toMatchObject({ id: 'process-1', type: 'process' })
  expect(edges).toEqual([{ id: 'e-api-process-1', source: 'api', target: 'process-1' }])
  const title = page.getByRole('textbox', { name: 'Shape title' })
  await expect(title).toBeFocused()
  await title.fill('Charge card')
  await title.press('Enter')
  await expect.poll(async () => (await saved(page)).nodes[2].name).toBe('Charge card')
})

test('an arrow touching no shape straightens, with its head; Keep as drawn undoes it', async ({
  page,
}) => {
  const box = await node(page, 'api').boundingBox()
  const y = box.y + box.height + 220
  const from = [box.x, y]
  const tip = [box.x + 240, y + 6]
  await stroke(page, [from, tip, [tip[0] - 20, tip[1] - 14]])

  await expect.poll(async () => (await saved(page)).nodes.at(-1)?.data?.arrow).toBe('end')
  await expect(page.getByTestId('ink-stroke').locator('path').first()).toHaveAttribute(
    'd',
    /^M[\d.]+,[\d.]+ L[\d.]+,[\d.]+ M/,
  )

  await page.getByRole('button', { name: 'Keep as drawn' }).click()
  await expect.poll(async () => (await saved(page)).nodes.at(-1)?.data?.arrow).toBeUndefined()
  expect((await saved(page)).nodes.at(-1).type).toBe('ink')
})
