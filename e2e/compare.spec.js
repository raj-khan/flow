import { expect, test } from '@playwright/test'

test('compares another version with the diagram on screen, as a list and a picture', async ({
  page,
}) => {
  await page.goto('/new')
  await expect(page.locator('.vue-flow__node')).toHaveCount(5)

  // The version on screen, as text, then an older version of it: no note, and a different name.
  await page.getByRole('button', { name: 'Edit as text' }).click()
  const now = await page.getByLabel('Diagram as .flow text').inputValue()
  const older = now
    .split('\n')
    .filter((line) => !line.startsWith('e879e4') && !line.includes('-> e879e4'))
    .join('\n')
    .replace('"Away Message"', '"Away"')

  await page.getByRole('banner').getByRole('button', { name: 'Compare' }).click()
  const dialog = page.getByRole('dialog', { name: 'Compare' })
  await dialog.getByLabel('The version to compare with').fill(older)

  const changes = dialog.getByRole('list', { name: 'Changes' })
  await expect(changes).toContainText('+ Add Comment #1')
  await expect(changes).toContainText('~ Away → Away Message')
  await expect(changes).toContainText('+ Away Message → Add Comment #1')
  await expect(dialog.getByRole('img')).toHaveAttribute('src', /^data:image\/svg\+xml/)

  await dialog.getByLabel('The version to compare with').fill(now)
  await expect(dialog.getByRole('status')).toHaveText('No changes.')
})
