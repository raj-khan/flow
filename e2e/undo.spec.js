import { expect, test } from '@playwright/test'

import { history } from './helpers.js'

const nodeAt = (page, id) => page.locator(`.vue-flow__node[data-id="${id}"]`)
// Scoped to the header: the toast carries an Undo of its own.
const undoButton = (page) => history(page).getByRole('button', { name: 'Undo' })

test('undoes a delete, and the button names the change', async ({ page }) => {
  await page.goto('/new/node/b6a0c1')

  await page.getByRole('button', { name: 'Delete node' }).click()
  await page.getByRole('button', { name: 'Confirm delete' }).click()
  await expect(nodeAt(page, 'b6a0c1')).toHaveCount(0)

  await expect(undoButton(page).locator('xpath=..')).toHaveAttribute('title', /delete node/i)
  await undoButton(page).click()
  await expect(nodeAt(page, 'b6a0c1')).toBeVisible()
})

test('undoes an edit with the keyboard', async ({ page }) => {
  await page.goto('/new/node/b6a0c1')

  await page.getByLabel('Title').fill('Renamed')
  await page.getByRole('button', { name: 'Save changes' }).click()
  // The card updates optimistically; history records once the write succeeds.
  await expect(undoButton(page).locator('xpath=..')).toHaveAttribute('title', /edit node/i)

  // Away from the field: inside one, Ctrl+Z is the browser's own undo.
  await page.locator('.vue-flow__pane').click()
  await page.keyboard.press('Control+z')

  await expect(nodeAt(page, 'b6a0c1')).toContainText('Away Message')
})

test('undoes one change per Ctrl+Z, even with the drawer open', async ({ page }) => {
  await page.goto('/new/node/b6a0c1')

  for (const [index, name] of ['First', 'Second'].entries()) {
    await page.getByLabel('Title').fill(name)
    await page.getByRole('button', { name: 'Save changes' }).click()
    // The card updates at once; history only once the write lands, which the toast marks.
    await expect(page.getByText('Changes saved')).toHaveCount(index + 1)
  }

  // A drawer control that is not a text field, so the shortcut is ours.
  await page.getByRole('button', { name: 'Close details' }).focus()
  await page.keyboard.press('Control+z')

  await expect(nodeAt(page, 'b6a0c1')).toContainText('First')
})
