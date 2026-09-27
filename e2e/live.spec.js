import { expect, test } from '@playwright/test'

import { fromMenu, history } from './helpers.js'

const shapes = (page) => page.locator('.vue-flow__node')
const node = (page, id) => page.locator(`.vue-flow__node[data-id="${id}"]`)

const ON_DISK = 'title: Checkout\npay = process "Pay"\nship = process "Ship"\npay -> ship\n'

/** An agent, or an editor, writing the open file. */
const writeDisk = (page, text) =>
  page.evaluate((next) => {
    window.__disk = { text: next, modified: window.__disk.modified + 1000 }
  }, text)

test.beforeEach(async ({ page }) => {
  // The opened file is a stand-in whose contents the test changes, as a writer on disk would.
  await page.addInitScript((text) => {
    window.__disk = { text, modified: 1_000_000 }
    const handle = {
      name: 'checkout.flow',
      getFile: async () =>
        new File([window.__disk.text], 'checkout.flow', { lastModified: window.__disk.modified }),
      createWritable: async () => {
        let written = ''
        return {
          write: async (chunk) => (written += chunk),
          close: async () =>
            (window.__disk = { text: written, modified: window.__disk.modified + 1 }),
        }
      },
    }
    window.showOpenFilePicker = async () => [handle]
  }, ON_DISK)

  await page.goto('/new')
  await fromMenu(page, 'Open file')
  await expect(shapes(page)).toHaveCount(2)
})

test('a change on disk comes in, marked, and undo takes it back', async ({ page }) => {
  await writeDisk(
    page,
    `${ON_DISK.replace('"Pay"', '"Take payment"')}mail = process "Mail"\nship -> mail : notify\n`,
  )

  await expect(shapes(page)).toHaveCount(3)
  await expect(
    page.getByText('checkout.flow changed on disk. This is the new version.'),
  ).toBeVisible()
  await expect(node(page, 'mail').locator('[data-flash]')).toHaveAttribute('data-flash', 'added')
  await expect(node(page, 'pay').locator('[data-flash]')).toHaveAttribute('data-flash', 'changed')
  await expect(node(page, 'pay')).toContainText('Take payment')
  // The mark fades after a few seconds.
  await expect(page.locator('[data-flash]')).toHaveCount(0, { timeout: 8000 })

  await history(page).getByRole('button', { name: 'Undo' }).click()
  await expect(shapes(page)).toHaveCount(2)
})

test('its own save is not taken for a change on disk', async ({ page }) => {
  await node(page, 'pay').click()
  await page.getByLabel('Title').fill('Pay now')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.keyboard.press('Control+s')
  await expect(page.getByText('Saved to checkout.flow')).toBeVisible()

  await page.waitForTimeout(2500)
  await expect(page.getByText(/changed on disk/)).toHaveCount(0)
  await expect(page.getByRole('dialog', { name: 'The file changed on disk' })).toHaveCount(0)
})

test('with unsaved edits here, it asks which to keep', async ({ page }) => {
  await node(page, 'pay').click()
  await page.getByLabel('Title').fill('Pay here')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await page.keyboard.press('Escape')

  await writeDisk(page, `${ON_DISK}mail = process "Mail"\n`)
  const dialog = page.getByRole('dialog', { name: 'The file changed on disk' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Keep mine' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(shapes(page)).toHaveCount(2)
  await expect(node(page, 'pay')).toContainText('Pay here')

  // Asked again at the next change, and this time the file wins.
  await writeDisk(page, `${ON_DISK}mail = process "Mail"\nlog = process "Log"\n`)
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: "Use the file's version" }).click()
  await expect(shapes(page)).toHaveCount(4)
  await expect(node(page, 'pay')).toContainText('Pay')
  await expect(node(page, 'pay')).not.toContainText('Pay here')
})

test('a broken file on disk leaves the diagram alone, and says where', async ({ page }) => {
  await writeDisk(page, 'title: Checkout\npay = process "Pay\n')
  await expect(
    page.getByText(/checkout\.flow changed on disk, but line \d+ has an error/),
  ).toBeVisible()
  await expect(shapes(page)).toHaveCount(2)
})
