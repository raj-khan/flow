import { expect, test } from '@playwright/test'

import { history, openLibrary } from './helpers.js'

const shapes = (page) => page.locator('.vue-flow__node')
const node = (page, id) => page.locator(`.vue-flow__node[data-id="${id}"]`)
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('flow:document')))
const positionOf = async (page, id) =>
  (await saved(page)).nodes.find((each) => each.id === id).position

const at = (x, y) => ({ position: { x, y } })
const SHOP = {
  version: 3,
  title: 'Shop',
  nodes: [
    {
      id: 'checkout',
      type: 'frame',
      name: 'Checkout',
      data: {},
      ...at(0, 0),
      size: { width: 640, height: 420 },
    },
    { id: 'pay', type: 'process', name: 'Pay', data: {}, ...at(40, 80) },
    { id: 'ship', type: 'process', name: 'Ship', data: {}, ...at(340, 240) },
    { id: 'mail', type: 'process', name: 'Mail', data: {}, ...at(820, 80) },
  ],
  edges: [
    { id: 'e-pay-ship', source: 'pay', target: 'ship' },
    { id: 'e-ship-mail', source: 'ship', target: 'mail' },
  ],
}

/** The frame's own surface, clear of the shapes inside it: near its name. */
const frameLabel = (page) => node(page, 'checkout').getByRole('heading', { name: 'Checkout' })

test.beforeEach(async ({ page }) => {
  await page.goto('/new')
  await page.evaluate(
    (document) => localStorage.setItem('flow:document', JSON.stringify(document)),
    SHOP,
  )
  await page.reload()
  await expect(shapes(page)).toHaveCount(4)
})

test('a frame sits behind the shapes it holds, named at its top left', async ({ page }) => {
  const frame = await node(page, 'checkout').boundingBox()
  const label = await frameLabel(page).boundingBox()
  expect(label.x - frame.x).toBeLessThan(30)
  expect(label.y - frame.y).toBeLessThan(30)

  // Pay is inside the frame and still takes its own clicks.
  await node(page, 'pay').click()
  await expect(page).toHaveURL(/\/new\/node\/pay$/)
})

test('dragging a frame carries what is inside it, and one undo puts it all back', async ({
  page,
}) => {
  const before = { pay: await positionOf(page, 'pay'), mail: await positionOf(page, 'mail') }
  const box = await frameLabel(page).boundingBox()
  await page.mouse.move(box.x + 10, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + 60, box.y + 40, { steps: 5 })
  await page.mouse.move(box.x + 130, box.y + 90, { steps: 10 })
  await page.mouse.up()

  await expect.poll(async () => (await positionOf(page, 'pay')).x).not.toBe(before.pay.x)
  const frame = await positionOf(page, 'checkout')
  const pay = await positionOf(page, 'pay')
  expect(Math.round(pay.x - before.pay.x)).toBe(Math.round(frame.x))
  expect(Math.round(pay.y - before.pay.y)).toBe(Math.round(frame.y))
  expect(await positionOf(page, 'mail')).toEqual(before.mail)

  await history(page).getByRole('button', { name: 'Undo' }).click()
  await expect.poll(async () => (await positionOf(page, 'pay')).x).toBe(before.pay.x)
  expect(await positionOf(page, 'checkout')).toEqual({ x: 0, y: 0 })
})

test('a frame copies for AI on its own, with only what it holds', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await frameLabel(page).click({ button: 'right' })
  await page
    .getByRole('menu', { name: 'Shape' })
    .getByRole('menuitem', { name: 'Copy frame for AI' })
    .click()

  await expect(page.getByText(/Copied the Checkout frame/)).toBeVisible()
  const brief = await page.evaluate(() => navigator.clipboard.readText())
  expect(brief).toMatch(/^# Checkout\n/)
  expect(brief).toContain('**Pay** → **Ship**')
  expect(brief).not.toContain('Mail')
})

test('a frame exports on its own', async ({ page }) => {
  await frameLabel(page).click({ button: 'right' })
  await page.getByRole('menuitem', { name: 'Export frame' }).click()

  const dialog = page.getByRole('dialog', { name: 'Export' })
  await expect(dialog.getByRole('combobox')).toHaveValue('checkout')
  await dialog.getByText('SVG', { exact: true }).click()
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: /Download/ }).click(),
  ])
  expect(download.suggestedFilename()).toBe('checkout.svg')
  const svg = await (await download.createReadStream()).toArray()
  const text = Buffer.concat(svg).toString('utf8')
  expect(text).toContain('>Pay</text>')
  expect(text).not.toContain('>Mail</text>')
})

test('the library adds a frame, large enough to hold a few shapes', async ({ page }) => {
  const library = await openLibrary(page)
  await library.getByRole('button', { name: 'Frame', exact: true }).click()
  await expect(shapes(page)).toHaveCount(5)
  const added = (await saved(page)).nodes.at(-1)
  expect(added.type).toBe('frame')
  const box = await page.locator(`.vue-flow__node[data-id="${added.id}"]`).boundingBox()
  const pay = await node(page, 'pay').boundingBox()
  expect(box.width).toBeGreaterThan(pay.width * 2)
})
