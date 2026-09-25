import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/new')
  await expect(page.locator('.vue-flow__node[data-id="b6a0c1"]')).toBeVisible()
})

test('arrows move focus between nodes and Enter opens the focused one', async ({ page }) => {
  await page.locator('.vue-flow__pane').click()
  await page.keyboard.press('ArrowDown')

  const focused = page.locator('.vue-flow__node [aria-current="true"]')
  await expect(focused).toHaveCount(1)

  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/\/new\/node\//)
})

test('the canvas releases the keyboard while a dialog is open', async ({ page }) => {
  await page.getByRole('button', { name: 'Keyboard shortcuts' }).click()
  await page.keyboard.press('ArrowDown')

  await expect(page.locator('.vue-flow__node [aria-current="true"]')).toHaveCount(0)
  await expect(page.getByRole('dialog')).toBeVisible()
})
