import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'

import { fromMenu, history } from './helpers.js'

const shapes = (page) => page.locator('.vue-flow__node')

const HAND_WRITTEN = `title: Checkout
cart = terminal "Cart"
pay = decision "Paid?"
cart -> pay
`

test.describe('without the File System Access API', () => {
  test.beforeEach(async ({ page }) => {
    // What Firefox and Safari have: upload and download only.
    await page.addInitScript(() => {
      delete window.showOpenFilePicker
      delete window.showSaveFilePicker
    })
    await page.goto('/new')
    await expect(shapes(page)).toHaveCount(5)
  })

  test('saves by downloading a .flow file named after the diagram', async ({ page }) => {
    const download = page.waitForEvent('download')
    await fromMenu(page, 'Save')

    const file = await download
    expect(file.suggestedFilename()).toBe('support-flow.flow')
    expect(await readFile(await file.path(), 'utf8')).toMatch(/^title: Support flow\n/)
  })

  test('Ctrl+S saves too, even from a text field', async ({ page }) => {
    await fromMenu(page, 'Edit as text')
    await page.getByLabel('Diagram as .flow text').focus()

    const download = page.waitForEvent('download')
    await page.keyboard.press('Control+s')
    expect((await download).suggestedFilename()).toBe('support-flow.flow')
  })

  test('opens a .flow file as an undoable change, and names it in the header', async ({ page }) => {
    const chooser = page.waitForEvent('filechooser')
    await fromMenu(page, 'Open file')
    await (
      await chooser
    ).setFiles({
      name: 'checkout.flow',
      mimeType: 'text/plain',
      buffer: Buffer.from(HAND_WRITTEN),
    })

    await expect(shapes(page)).toHaveCount(2)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('checkout.flow')

    await history(page).getByRole('button', { name: 'Undo' }).click()
    await expect(shapes(page)).toHaveCount(5)
  })

  test('refuses a file with errors, and says where', async ({ page }) => {
    const chooser = page.waitForEvent('filechooser')
    await fromMenu(page, 'Open file')
    await (
      await chooser
    ).setFiles({
      name: 'broken.flow',
      mimeType: 'text/plain',
      buffer: Buffer.from('a = hexagon "A"'),
    })

    await expect(page.getByText(/broken\.flow could not be opened\. Line 1:/)).toBeVisible()
    await expect(shapes(page)).toHaveCount(5)
  })
})

test('with the File System Access API, Save writes back to the file that was opened', async ({
  page,
}) => {
  // Native pickers cannot be driven by a test, so the file is a stand-in that records writes.
  await page.addInitScript((text) => {
    window.__writes = []
    const handle = {
      name: 'checkout.flow',
      getFile: async () => new File([text], 'checkout.flow'),
      createWritable: async () => {
        let written = ''
        return {
          write: async (chunk) => (written += chunk),
          close: async () => window.__writes.push(written),
        }
      },
    }
    window.showOpenFilePicker = async () => [handle]
    window.showSaveFilePicker = async () => {
      throw new Error('Save should reuse the opened file, not ask again')
    }
  }, HAND_WRITTEN)

  await page.goto('/new')
  await fromMenu(page, 'Open file')
  await expect(shapes(page)).toHaveCount(2)

  await page.locator('.vue-flow__node[data-id="pay"]').click()
  await page.getByLabel('Title').fill('Paid in full?')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(page.locator('.vue-flow__node[data-id="pay"]')).toContainText('Paid in full?')

  await page.keyboard.press('Control+s')
  await expect(page.getByText('Saved to checkout.flow')).toBeVisible()
  const writes = await page.evaluate(() => window.__writes)
  expect(writes).toHaveLength(1)
  expect(writes[0]).toContain('pay = decision "Paid in full?"')

  // A new diagram is not that file any more.
  await fromMenu(page, 'New diagram')
  await expect(page.getByRole('heading', { level: 1 })).not.toContainText('checkout.flow')
})
