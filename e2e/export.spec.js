import { readFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'

/** Click Download in the Export dialog and read what the browser saved. */
async function exportAs(page, format, look = 'Light') {
  await page.getByRole('banner').getByRole('button', { name: 'Export' }).click()
  const dialog = page.getByRole('dialog', { name: 'Export' })
  await dialog.getByText(format, { exact: true }).click()
  if (format !== 'draw.io') await dialog.getByLabel(look).check()
  await expect(dialog.getByRole('img', { name: 'What the export will look like' })).toBeVisible()

  const download = page.waitForEvent('download')
  await dialog.getByRole('button', { name: /^Download / }).click()
  const file = await download
  return { name: file.suggestedFilename(), bytes: await readFile(await file.path()) }
}

test.beforeEach(async ({ page }) => {
  await page.goto('/new')
  await expect(page.locator('.vue-flow__node').first()).toBeVisible()
})

test('downloads the diagram as a sharp PNG', async ({ page }) => {
  const { name, bytes } = await exportAs(page, 'PNG', 'Dark')

  expect(name).toMatch(/\.png$/)
  expect(bytes.subarray(1, 4).toString()).toBe('PNG')
  // Twice the drawing's size, read from the PNG header.
  expect(bytes.readUInt32BE(16)).toBeGreaterThan(800)
  await expect(page.getByText(`Downloaded ${name}`)).toBeVisible()
})

test('downloads a sketch as SVG, carrying its handwriting font', async ({ page }) => {
  await page.getByRole('button', { name: 'Sketch style' }).click()
  const { name, bytes } = await exportAs(page, 'SVG')
  const svg = bytes.toString()

  expect(name).toMatch(/\.svg$/)
  expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/)
  expect(svg).toContain("@font-face{font-family:'Patrick Hand';src:url(data:font/woff2;base64,")
})
