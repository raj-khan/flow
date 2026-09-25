import { expect, test } from '@playwright/test'

const shapes = (page) => page.locator('.vue-flow__node')
const editor = (page) => page.getByLabel('Diagram as .flow text')

test.beforeEach(async ({ page }) => {
  await page.goto('/new')
  await expect(shapes(page)).toHaveCount(5)
  await page.getByRole('button', { name: 'Edit as text' }).click()
})

test('shows the diagram as text beside the canvas', async ({ page }) => {
  await expect(page.getByRole('button', { name: 'Edit as text' })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(editor(page)).toHaveValue(/^title: Support flow\n/)
  await expect(editor(page)).toHaveValue(/d09c08 -> b0653a : Success/)
})

test('draws what is typed, and undo takes it back', async ({ page }) => {
  const text = await editor(page).inputValue()
  await editor(page).fill(`${text}\ncache = database "Redis"\nb0653a -> cache : reads`)

  await expect(shapes(page)).toHaveCount(6)
  await expect(page.locator('.vue-flow__node[data-id="cache"]')).toContainText('Redis')

  await page.getByRole('banner').getByRole('button', { name: 'Undo' }).click()
  await expect(shapes(page)).toHaveCount(5)
  await expect(editor(page)).not.toHaveValue(/Redis/)
})

test('keeps the last good diagram and points at the line while the text is wrong', async ({
  page,
}) => {
  const text = await editor(page).inputValue()
  await editor(page).fill(`${text}\nbroken = hexagon "Nope"`)

  const problems = page.getByRole('complementary', { name: 'Diagram as text' }).getByRole('alert')
  await expect(problems).toContainText(/Line \d+: Unknown shape "hexagon"/)
  await expect(shapes(page)).toHaveCount(5)

  await problems.getByRole('button').click()
  await expect(editor(page)).toBeFocused()
})

test('rewrites the text when the diagram is edited on the canvas', async ({ page }) => {
  await page.locator('.vue-flow__node[data-id="b6a0c1"]').click()
  await page.getByLabel('Title').fill('Out of hours')
  await page.getByRole('button', { name: 'Save changes' }).click()

  await expect(editor(page)).toHaveValue(/b6a0c1 = process "Out of hours"/)
})

test('a label changed in the text reaches the canvas', async ({ page }) => {
  const text = await editor(page).inputValue()
  await editor(page).fill(text.replace('d09c08 -> b0653a : Success', 'd09c08 -> b0653a : Open'))

  await expect(page.getByTestId('edge-label').filter({ hasText: 'Open' })).toBeVisible()
  await expect(page.getByTestId('edge-label').filter({ hasText: 'Success' })).toHaveCount(0)
})
