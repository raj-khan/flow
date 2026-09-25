import { expect, test } from '@playwright/test'

const shape = (page, id) => page.locator(`.vue-flow__node[data-id="${id}"]`)
const labels = (page) => page.getByTestId('edge-label')

test.beforeEach(async ({ page }) => {
  await page.goto('/new')
  await expect(page.locator('.vue-flow__node')).toHaveCount(5)
})

test('double-click renames a shape in place, and undo takes it back', async ({ page }) => {
  await shape(page, 'e879e4').getByRole('heading').dblclick()
  const field = page.getByRole('textbox', { name: 'Shape title' })
  await expect(field).toBeFocused()

  await field.fill('Log it')
  await field.press('Enter')
  await expect(shape(page, 'e879e4').getByRole('heading')).toHaveText('Log it')

  await page.getByRole('banner').getByRole('button', { name: 'Undo' }).click()
  await expect(shape(page, 'e879e4').getByRole('heading')).toHaveText('Add Comment #1')
})

test('Escape leaves the title as it was, and an empty title is not saved', async ({ page }) => {
  await shape(page, 'e879e4').getByRole('heading').dblclick()
  await page.getByRole('textbox', { name: 'Shape title' }).fill('Never mind')
  await page.getByRole('textbox', { name: 'Shape title' }).press('Escape')
  await expect(shape(page, 'e879e4').getByRole('heading')).toHaveText('Add Comment #1')

  await shape(page, 'e879e4').getByRole('heading').dblclick()
  await page.getByRole('textbox', { name: 'Shape title' }).fill('   ')
  await page.getByRole('textbox', { name: 'Shape title' }).press('Enter')
  await expect(shape(page, 'e879e4').getByRole('heading')).toHaveText('Add Comment #1')
})

test('F2 renames the shape the keyboard is on', async ({ page }) => {
  await page.locator('.vue-flow__pane').click({ position: { x: 20, y: 20 } })
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('F2')

  const field = page.getByRole('textbox', { name: 'Shape title' })
  await expect(field).toBeFocused()
  await field.fill('Begin')
  await field.press('Enter')
  await expect(shape(page, '1').getByRole('heading')).toHaveText('Begin')
})

test('double-click adds, edits and clears an edge label', async ({ page }) => {
  // Edit an existing label.
  await labels(page).filter({ hasText: 'Success' }).dblclick()
  const field = page.getByRole('textbox', { name: 'Connection label' })
  await field.fill('In hours')
  await field.press('Enter')
  await expect(labels(page).filter({ hasText: 'In hours' })).toBeVisible()

  // Clear it: the label goes, the connection stays.
  await labels(page).filter({ hasText: 'In hours' }).dblclick()
  await page.getByRole('textbox', { name: 'Connection label' }).fill('')
  await page.getByRole('textbox', { name: 'Connection label' }).press('Enter')
  await expect(labels(page)).toHaveText(['Failure'])

  // Add one to an edge that had none.
  await page
    .locator('.vue-flow__edge[data-id="e-b6a0c1-e879e4"] [data-testid="edge-hit-area"]')
    .dispatchEvent('dblclick')
  await page.getByRole('textbox', { name: 'Connection label' }).fill('logs')
  await page.getByRole('textbox', { name: 'Connection label' }).press('Enter')
  await expect(labels(page).filter({ hasText: 'logs' })).toBeVisible()
})
