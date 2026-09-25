import { expect, test } from '@playwright/test'

test('confirms a save, and offers to take it back', async ({ page }) => {
  await page.goto('/new/node/b6a0c1')

  await page.getByLabel('Title').fill('Renamed')
  await page.getByRole('button', { name: 'Save changes' }).click()

  const toast = page.getByRole('status').filter({ hasText: 'Changes saved' })
  await expect(toast).toBeVisible()

  await toast.getByRole('button', { name: 'Undo' }).click()
  await expect(page.locator('.vue-flow__node[data-id="b6a0c1"]')).toContainText('Away Message')
})
