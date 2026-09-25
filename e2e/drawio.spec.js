import { readFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'

import { fromMenu } from './helpers.js'

const shapes = (page) => page.locator('.vue-flow__node')

const DRAWIO = `<mxfile><diagram name="Checkout"><mxGraphModel><root>
  <mxCell id="0"/><mxCell id="1" parent="0"/>
  <mxCell id="a" value="Cart" style="ellipse;" vertex="1" parent="1"><mxGeometry x="0" y="0" width="120" height="60" as="geometry"/></mxCell>
  <mxCell id="b" value="Paid?" style="rhombus;" vertex="1" parent="1"><mxGeometry x="0" y="150" width="120" height="80" as="geometry"/></mxCell>
  <mxCell id="e" value="pay" edge="1" parent="1" source="a" target="b"><mxGeometry relative="1" as="geometry"/></mxCell>
</root></mxGraphModel></diagram></mxfile>`

test('imports a draw.io file, and downloads the diagram as one', async ({ page }) => {
  await page.goto('/new')
  await expect(shapes(page)).toHaveCount(5)

  await fromMenu(page, 'Import')
  const dialog = page.getByRole('dialog', { name: 'Import' })
  await dialog.getByRole('radio', { name: 'draw.io' }).click()
  await dialog.getByLabel('draw.io to import').fill(DRAWIO)
  await dialog.getByRole('radio', { name: /A new diagram/ }).check()
  await expect(dialog.getByRole('status')).toContainText('2 shapes and 1 connection')
  await dialog.getByRole('button', { name: 'Import' }).click()

  await expect(shapes(page)).toHaveCount(2)
  await expect(page.locator('.vue-flow__node[data-id="paid"] [data-shape]')).toHaveAttribute(
    'data-shape',
    'decision',
  )
  await expect(page.getByTestId('edge-label').filter({ hasText: 'pay' })).toBeVisible()

  await fromMenu(page, 'Export')
  const exporting = page.getByRole('dialog', { name: 'Export' })
  await exporting.getByText('draw.io', { exact: true }).click()
  const download = page.waitForEvent('download')
  await exporting.getByRole('button', { name: 'Download checkout.drawio' }).click()
  const file = await download
  expect(file.suggestedFilename()).toBe('checkout.drawio')
  const xml = await readFile(await file.path(), 'utf8')
  expect(xml).toContain('value="Cart"')
  expect(xml).toContain('source="n-cart" target="n-paid"')
})
