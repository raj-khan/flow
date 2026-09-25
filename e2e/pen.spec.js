import { expect, test } from '@playwright/test'

const shapes = (page) => page.locator('.vue-flow__node')
const strokes = (page) => page.getByTestId('ink-stroke')

test('draws a stroke with the pen, as a shape that undo takes back', async ({ page }) => {
  await page.goto('/new')
  await expect(shapes(page)).toHaveCount(5)

  const pen = page.getByRole('button', { name: 'Pen', exact: true })
  await pen.click()
  await expect(pen).toHaveAttribute('aria-pressed', 'true')

  const layer = await page.getByTestId('pen-layer').boundingBox()
  const x = layer.x + layer.width - 260
  const y = layer.y + 120
  await page.mouse.move(x, y)
  await page.mouse.down()
  for (let step = 1; step <= 12; step += 1) {
    await page.mouse.move(x + step * 12, y + Math.sin(step / 2) * 30)
  }
  await page.mouse.up()

  await expect(shapes(page)).toHaveCount(6)
  await expect(strokes(page)).toHaveCount(1)
  await expect(strokes(page).locator('path').first()).toHaveAttribute('d', /^M[\d.]+,[\d.]+ Q/)

  // Escape puts the pen down, and the canvas pans again.
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('pen-layer')).toHaveCount(0)

  await page.getByRole('button', { name: 'Edit as text' }).click()
  await expect(page.getByLabel('Diagram as .flow text')).toHaveValue(/\n@ink\nink-1 [\d., ]+\n$/)

  await page.getByRole('banner').getByRole('button', { name: 'Undo' }).click()
  await expect(strokes(page)).toHaveCount(0)
})

test('picks the pen up with P', async ({ page }) => {
  await page.goto('/new')
  await expect(shapes(page)).toHaveCount(5)
  await page.keyboard.press('p')
  await expect(page.getByTestId('pen-layer')).toBeVisible()
  await page.keyboard.press('p')
  await expect(page.getByTestId('pen-layer')).toHaveCount(0)
})

test('lets clicks through a stroke to the shape it circles', async ({ page }) => {
  await page.goto('/new')
  const target = page.locator('.vue-flow__node[data-id="b0653a"]')
  const box = await target.boundingBox()
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2

  await page.keyboard.press('p')
  await page.mouse.move(x + 150, y)
  await page.mouse.down()
  for (let angle = 0; angle <= Math.PI * 2.1; angle += 0.15) {
    await page.mouse.move(x + 150 * Math.cos(angle), y + 75 * Math.sin(angle))
  }
  await page.mouse.up()
  await page.keyboard.press('Escape')
  await expect(strokes(page)).toHaveCount(1)

  await page.mouse.click(x, y)
  await expect(page).toHaveURL(/\/new\/node\/b0653a$/)
})
