import { expect, test } from '@playwright/test'

const firstEdge = (page) => page.locator('.vue-flow__edge').first()
const textPane = (page) => page.getByLabel('Diagram as .flow text')

test.beforeEach(async ({ page }) => {
  await page.goto('/new')
  await expect(page.locator('.vue-flow__node').first()).toBeVisible()
})

test('dashes a connection and gives it an arrow at each end, from its own controls', async ({
  page,
}) => {
  const edge = firstEdge(page)
  await expect(edge.locator('.vue-flow__edge-path')).toHaveAttribute('marker-end', /isketch-arrow/)

  await edge.getByTestId('edge-hit-area').hover({ force: true })
  await page.getByRole('button', { name: 'Dashed line' }).click()
  await expect(edge.locator('.vue-flow__edge-path')).toHaveCSS('stroke-dasharray', '6px, 4px')

  await edge.getByTestId('edge-hit-area').hover({ force: true })
  await page.getByRole('button', { name: 'Arrows both ways' }).click()
  await expect(edge.locator('.vue-flow__edge-path')).toHaveAttribute(
    'marker-start',
    /isketch-arrow/,
  )

  await page.getByRole('button', { name: 'Edit as text' }).click()
  await expect(textPane(page)).toHaveValue(/ <--> /)

  await page.getByRole('banner').getByRole('button', { name: 'Undo' }).click()
  await expect(textPane(page)).toHaveValue(/ --> /)
})

test('switches every connection between steps, curves and straight lines', async ({ page }) => {
  const path = firstEdge(page).locator('.vue-flow__edge-path')
  await expect(path).toHaveAttribute('d', /V/)

  await page.getByRole('button', { name: 'Lines: step' }).click()
  await expect(path).toHaveAttribute('d', / C/)
  await page.getByRole('button', { name: 'Lines: curved' }).click()
  await expect(path).toHaveAttribute('d', /^M[\d.]+,[\d.]+ L[\d.]+,[\d.]+$/)

  await page.getByRole('button', { name: 'Edit as text' }).click()
  await expect(textPane(page)).toHaveValue(/\nlines: straight\n/)
  await page.getByRole('button', { name: 'Lines: straight' }).click()
  await expect(textPane(page)).not.toHaveValue(/lines:/)
})
