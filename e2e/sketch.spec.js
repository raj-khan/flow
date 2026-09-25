import { expect, test } from '@playwright/test'

const outlines = (page) => page.getByTestId('sketch-outline')

test('switches the diagram to a hand-drawn sketch, and back with undo', async ({ page }) => {
  await page.goto('/new')
  await expect(page.locator('.vue-flow__node').first()).toBeVisible()
  await expect(outlines(page)).toHaveCount(0)

  const toggle = page.getByRole('button', { name: 'Sketch style' })
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-pressed', 'true')
  await expect(outlines(page).first()).toBeVisible()
  await expect(page.locator('.vue-flow__node .font-sketch').first()).toBeVisible()

  await page.getByRole('button', { name: 'Edit as text' }).click()
  await expect(page.getByLabel('Diagram as .flow text')).toHaveValue(/^title: .*\nstyle: sketch\n/)

  await page.getByRole('banner').getByRole('button', { name: 'Undo' }).click()
  await expect(outlines(page)).toHaveCount(0)
  await expect(toggle).toHaveAttribute('aria-pressed', 'false')
})
