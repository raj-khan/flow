import { expect, test } from '@playwright/test'

import { fromMenu, history } from './helpers.js'

const shapes = (page) => page.locator('.vue-flow__node')
const node = (page, id) => page.locator(`.vue-flow__node[data-id="${id}"]`)
const tool = (page, name) =>
  page.getByRole('toolbar', { name: 'Tools' }).getByRole('button', { name, exact: true })
const titleField = (page) => page.getByRole('textbox', { name: 'Shape title' })
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('flow:document')))

test.beforeEach(async ({ page }) => {
  await page.goto('/new')
  await expect(shapes(page)).toHaveCount(5)
})

test('the eraser deletes everything it is dragged over, as one undoable change', async ({
  page,
}) => {
  await tool(page, 'Eraser').click()
  const away = await node(page, 'b6a0c1').boundingBox()
  const welcome = await node(page, 'b0653a').boundingBox()
  await page.mouse.move(away.x + 20, away.y + away.height / 2)
  await page.mouse.down()
  await page.mouse.move(welcome.x + welcome.width - 20, welcome.y + welcome.height / 2, {
    steps: 25,
  })
  await page.mouse.up()

  await expect(shapes(page)).toHaveCount(3)
  await history(page).getByRole('button', { name: 'Undo' }).click()
  await expect(shapes(page)).toHaveCount(5)
})

test('the laser leaves a fading trail and changes nothing', async ({ page }) => {
  const before = JSON.stringify(await saved(page))
  await page.keyboard.press('8')
  await expect(tool(page, 'Laser')).toHaveAttribute('aria-pressed', 'true')

  await page.mouse.move(300, 400)
  await page.mouse.down()
  await page.mouse.move(600, 450, { steps: 10 })
  await expect(page.getByTestId('laser-trail')).toBeVisible()
  await page.mouse.up()
  await expect(page.getByTestId('laser-trail')).toHaveCount(0, { timeout: 3000 })
  expect(JSON.stringify(await saved(page))).toBe(before)
})

test('typing on a blank diagram starts a shape named with what is typed', async ({ page }) => {
  await fromMenu(page, 'New diagram')
  await expect(shapes(page)).toHaveCount(0)

  await page.keyboard.type('Checkout')
  await page.keyboard.press('Enter')
  await expect(shapes(page)).toHaveCount(1)
  await expect(shapes(page).first()).toContainText('Checkout')
  // The letters named the shape; none of them picked a tool.
  await expect(tool(page, 'Select')).toHaveAttribute('aria-pressed', 'true')
})

test('a double click on empty canvas puts a shape there, ready to name', async ({ page }) => {
  await page.locator('.vue-flow__pane').dblclick({ position: { x: 200, y: 620 } })
  await expect(shapes(page)).toHaveCount(6)
  await expect(titleField(page)).toBeFocused()
})

test('Tab adds the next step below the selected shape, connected, to name', async ({ page }) => {
  await node(page, 'e879e4').click({ modifiers: ['Shift'] })
  await page.keyboard.press('Tab')

  await expect(shapes(page)).toHaveCount(6)
  await expect(titleField(page)).toBeFocused()
  await page.keyboard.type('Notify the team')
  await page.keyboard.press('Enter')

  const document = await saved(page)
  const added = document.nodes.find((each) => each.name === 'Notify the team')
  expect(added).toBeTruthy()
  expect(document.edges).toContainEqual(
    expect.objectContaining({ source: 'e879e4', target: added.id }),
  )

  await history(page).getByRole('button', { name: 'Undo' }).click()
  await history(page).getByRole('button', { name: 'Undo' }).click()
  await expect(shapes(page)).toHaveCount(5)
})

test('Ctrl+K finds any action or shape by name', async ({ page }) => {
  const palette = page.getByRole('dialog', { name: 'Commands' })

  await page.keyboard.press('Control+k')
  await expect(palette.getByRole('combobox', { name: 'Search commands' })).toBeFocused()
  await page.keyboard.type('add decision')
  await expect(palette.getByRole('option').first()).toHaveText(/Add Decision/)
  await page.keyboard.press('Enter')
  await expect(palette).toHaveCount(0)
  await expect(shapes(page)).toHaveCount(6)

  await page.keyboard.press('Escape')
  await page.keyboard.press('Control+k')
  await page.keyboard.type('png')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Export' })).toBeVisible()

  await page.keyboard.press('Escape')
  await page.keyboard.press('Control+k')
  await page.keyboard.type('nothing like this')
  await expect(palette.getByText('Nothing matches')).toBeVisible()
  await page.keyboard.press('Control+k')
  await expect(palette).toHaveCount(0)
})
