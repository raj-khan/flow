import { expect, test } from '@playwright/test'

import { fromMenu } from './helpers.js'

test('opens the shortcut reference with ? and from the toolbar', async ({ page }) => {
  await page.goto('/new')
  // The shell binds the key on mount.
  await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeVisible()

  await page.keyboard.press('?')
  const dialog = page.getByRole('dialog', { name: 'Keyboard shortcuts' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByText('Undo the last change')).toBeVisible()

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)

  await fromMenu(page, 'Keyboard shortcuts')
  await expect(dialog).toBeVisible()
})

test('leaves ? alone while typing in a field', async ({ page }) => {
  await page.goto('/new/node/b6a0c1')

  await page.getByLabel('Title').fill('Away?')
  await expect(page.getByRole('dialog', { name: 'Keyboard shortcuts' })).toHaveCount(0)
  await expect(page.getByLabel('Title')).toHaveValue('Away?')
})
