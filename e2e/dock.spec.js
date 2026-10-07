import { expect, test } from '@playwright/test'

// Someone new: the side panel open, as it starts.
test.use({
  storageState: {
    cookies: [],
    origins: [
      {
        origin: 'http://localhost:4173',
        localStorage: [{ name: 'flow:tutorial-seen', value: 'yes' }],
      },
    ],
  },
})

const dock = (page) => page.getByTestId('side-dock')
const shapes = (page) => page.locator('.vue-flow__node')

test.beforeEach(async ({ page }) => {
  await page.goto('/new')
  await expect(shapes(page)).toHaveCount(5)
})

test('every action is in view at the left, and the canvas starts beside it', async ({ page }) => {
  for (const name of ['File', 'Agent', 'View', 'Help']) {
    await expect(dock(page).getByRole('button', { name, exact: true })).toBeVisible()
  }
  for (const name of [
    'New diagram',
    'Import',
    'Export',
    'Copy for AI',
    'Edit as text',
    'Tidy up',
  ]) {
    await expect(dock(page).getByRole('button', { name })).toBeVisible()
  }

  const panel = await dock(page).boundingBox()
  const pane = await page.locator('.vue-flow__pane').boundingBox()
  expect(pane.x).toBe(panel.width)

  // A toggle shows its state, and runs the same action as the menu.
  const sketch = dock(page).getByRole('button', { name: 'Sketch style' })
  await expect(sketch).toHaveAttribute('aria-pressed', 'false')
  await sketch.click()
  await expect(sketch).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('sketch-outline').first()).toBeVisible()
})

test("the selection's colours sit in the panel, not over the shapes", async ({ page }) => {
  await shapes(page).first().click()
  const selection = dock(page).getByRole('toolbar', { name: 'Selection' })
  await expect(selection).toBeVisible()
  await selection.getByRole('radio', { name: 'Red' }).click()
  await expect(page.locator('[data-color="red"]')).toHaveCount(1)
})

test('folds to a rail of icons, and stays folded', async ({ page }) => {
  await dock(page).getByRole('button', { name: 'Fold the side panel' }).click()
  await expect(dock(page).getByRole('button', { name: 'Import' })).toHaveCount(0)
  await expect(dock(page)).toHaveAttribute('aria-label', 'Side panel, folded')

  // Folded, the selection floats at the left edge instead.
  await shapes(page).first().click()
  await expect(page.getByRole('toolbar', { name: 'Selection' })).toBeVisible()

  await page.reload()
  await expect(dock(page)).toHaveAttribute('aria-label', 'Side panel, folded')

  // A section's icon opens the panel on it.
  await dock(page).getByRole('button', { name: 'View' }).click()
  await expect(dock(page).getByRole('button', { name: 'Tidy up' })).toBeVisible()
})

test('a section folds away, and stays folded', async ({ page }) => {
  const file = dock(page).getByRole('button', { name: 'File', exact: true })
  await file.click()
  await expect(file).toHaveAttribute('aria-expanded', 'false')
  await expect(dock(page).getByRole('button', { name: 'Import' })).toHaveCount(0)

  await page.reload()
  await expect(dock(page).getByRole('button', { name: 'Import' })).toHaveCount(0)
  await expect(dock(page).getByRole('button', { name: 'Copy for AI' })).toBeVisible()
})

test('a phone keeps the menu, with no side panel', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 })
  await expect(dock(page)).toHaveCount(0)
  const pane = await page.locator('.vue-flow__pane').boundingBox()
  expect(pane.x).toBe(0)
})
