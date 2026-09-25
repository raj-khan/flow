import { expect, test } from '@playwright/test'

import { fromMenu, history, menuChecked } from './helpers.js'

const outlines = (page) => page.getByTestId('sketch-outline')

test('switches the diagram to a hand-drawn sketch, and back with undo', async ({ page }) => {
  await page.goto('/new')
  await expect(page.locator('.vue-flow__node').first()).toBeVisible()
  await expect(outlines(page)).toHaveCount(0)

  await fromMenu(page, 'Sketch style')
  await expect.poll(() => menuChecked(page, 'Sketch style')).toBe('true')
  await expect(outlines(page).first()).toBeVisible()
  await expect(page.locator('.vue-flow__node .font-sketch').first()).toBeVisible()

  await fromMenu(page, 'Edit as text')
  await expect(page.getByLabel('Diagram as .flow text')).toHaveValue(/^title: .*\nstyle: sketch\n/)

  await history(page).getByRole('button', { name: 'Undo' }).click()
  await expect(outlines(page)).toHaveCount(0)
  await expect.poll(() => menuChecked(page, 'Sketch style')).toBe('false')
})
