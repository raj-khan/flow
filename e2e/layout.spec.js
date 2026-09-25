import { expect, test } from '@playwright/test'

import { history } from './helpers.js'

const nodeAt = (page, id) => page.locator(`.vue-flow__node[data-id="${id}"]`)
const transform = (page, id) => nodeAt(page, id).evaluate((node) => node.style.transform)

test('tidies up a hand-placed diagram, and undo puts it back', async ({ page }) => {
  await page.goto('/new')
  await expect(nodeAt(page, 'b6a0c1')).toBeVisible()
  const laidOut = await transform(page, 'b6a0c1')

  const box = await nodeAt(page, 'b6a0c1').boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 300, box.y + box.height / 2 + 200, { steps: 8 })
  await page.mouse.up()
  await expect.poll(() => transform(page, 'b6a0c1')).not.toBe(laidOut)
  const dragged = await transform(page, 'b6a0c1')

  await page.getByRole('button', { name: 'Tidy up' }).click()
  await expect(page.getByText('Laid out the whole diagram')).toBeVisible()
  await expect.poll(() => transform(page, 'b6a0c1')).toBe(laidOut)

  await history(page).getByRole('button', { name: 'Undo' }).click()
  await expect.poll(() => transform(page, 'b6a0c1')).toBe(dragged)
})
