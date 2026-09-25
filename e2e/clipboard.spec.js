import { expect, test } from '@playwright/test'

const shapes = (page) => page.locator('.vue-flow__node')
const NODE = { away: 'b6a0c1', welcome: 'e879e4' }
const nodeAt = (page, id) => page.locator(`.vue-flow__node[data-id="${id}"]`)
const modifier = process.platform === 'darwin' ? 'Meta' : 'Control'

test.beforeEach(async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/new')
  await expect(shapes(page)).toHaveCount(5)
})

test('copies shapes as .flow text, and pastes them selected, as one undoable change', async ({
  page,
}) => {
  await nodeAt(page, NODE.away).click({ modifiers: ['Shift'] })
  await nodeAt(page, NODE.welcome).click({ modifiers: ['Shift'] })
  await page.keyboard.press(`${modifier}+c`)
  await expect(page.getByText('Copied 2 shapes')).toBeVisible()

  const text = await page.evaluate(() => navigator.clipboard.readText())
  expect(text).toContain('b6a0c1 = process "Away Message"')

  await page.keyboard.press(`${modifier}+v`)
  await expect(shapes(page)).toHaveCount(7)
  await expect(page.locator('.vue-flow__node.selected')).toHaveCount(2)
  await expect(nodeAt(page, `${NODE.away}-2`)).toContainText('Away Message')

  await page.getByRole('banner').getByRole('button', { name: 'Undo' }).click()
  await expect(shapes(page)).toHaveCount(5)
})

test('duplicates with Ctrl+D, and cuts with Ctrl+X', async ({ page }) => {
  await nodeAt(page, NODE.away).click({ modifiers: ['Shift'] })
  await page.keyboard.press(`${modifier}+d`)
  await expect(shapes(page)).toHaveCount(6)
  await expect(page.locator('.vue-flow__node.selected')).toHaveCount(1)

  await page.keyboard.press(`${modifier}+x`)
  await expect(shapes(page)).toHaveCount(5)
  await expect(page.getByText('Deleted a shape')).toBeVisible()
})
