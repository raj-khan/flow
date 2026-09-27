import { readFile } from 'node:fs/promises'

import { expect, test } from '@playwright/test'

import { fromMenu, history } from './helpers.js'

const shapes = (page) => page.locator('.vue-flow__node')
const modifier = process.platform === 'darwin' ? 'Meta' : 'Control'

const base = { angle: 0, isDeleted: false, roughness: 1, strokeStyle: 'solid' }
const ELEMENTS = [
  { ...base, id: 'cart', type: 'ellipse', x: 0, y: 0, width: 160, height: 70 },
  {
    ...base,
    id: 't1',
    type: 'text',
    x: 0,
    y: 0,
    width: 40,
    height: 20,
    text: 'Cart',
    originalText: 'Cart',
    containerId: 'cart',
  },
  { ...base, id: 'paid', type: 'diamond', x: 0, y: 200, width: 160, height: 90 },
  {
    ...base,
    id: 't2',
    type: 'text',
    x: 0,
    y: 0,
    width: 40,
    height: 20,
    text: 'Paid?',
    originalText: 'Paid?',
    containerId: 'paid',
  },
  {
    ...base,
    id: 'go',
    type: 'arrow',
    x: 80,
    y: 70,
    width: 0,
    height: 130,
    points: [
      [0, 0],
      [0, 130],
    ],
    startBinding: { elementId: 'cart' },
    endBinding: { elementId: 'paid' },
    endArrowhead: 'arrow',
  },
  {
    ...base,
    id: 't3',
    type: 'text',
    x: 0,
    y: 0,
    width: 40,
    height: 20,
    text: 'pay',
    originalText: 'pay',
    containerId: 'go',
  },
  {
    ...base,
    id: 'stray',
    type: 'line',
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    points: [
      [0, 0],
      [10, 10],
    ],
  },
]
const FILE = JSON.stringify({
  type: 'excalidraw',
  version: 2,
  elements: ELEMENTS,
  appState: {},
  files: {},
})

test.beforeEach(async ({ page }) => {
  await page.goto('/new')
  await expect(shapes(page)).toHaveCount(5)
})

test('imports an Excalidraw file, says what it skipped, and exports one back', async ({ page }) => {
  await fromMenu(page, 'Import')
  const dialog = page.getByRole('dialog', { name: 'Import' })
  await dialog.getByRole('radio', { name: 'Excalidraw' }).click()
  await dialog.getByLabel('Excalidraw to import').fill(FILE)
  await expect(dialog.getByRole('status')).toContainText('2 shapes and 1 connection')
  await expect(dialog.getByRole('list', { name: 'What will be skipped' })).toHaveText(
    'Skipped a line (only arrows between shapes connect them).',
  )
  await dialog.getByRole('button', { name: 'Import' }).click()

  await expect(shapes(page)).toHaveCount(2)
  await expect(page.locator('.vue-flow__node[data-id="paid"] [data-shape]')).toHaveAttribute(
    'data-shape',
    'decision',
  )
  await expect(page.getByTestId('edge-label').filter({ hasText: 'pay' })).toBeVisible()

  await fromMenu(page, 'Export')
  const exporting = page.getByRole('dialog', { name: 'Export' })
  await exporting.getByText('Excalidraw', { exact: true }).click()
  const download = page.waitForEvent('download')
  await exporting.getByRole('button', { name: /Download .*\.excalidraw/ }).click()
  const file = JSON.parse(await readFile(await (await download).path(), 'utf8'))
  expect(file.type).toBe('excalidraw')
  expect(file.elements.find((element) => element.id === 'paid')).toMatchObject({ type: 'diamond' })
  expect(file.elements.find((element) => element.type === 'arrow')).toMatchObject({
    startBinding: { elementId: 'cart' },
    endBinding: { elementId: 'paid' },
  })
})

test('shapes copied in Excalidraw paste onto the canvas, as one undoable change', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const clipboard = JSON.stringify({ type: 'excalidraw/clipboard', elements: ELEMENTS, files: {} })
  await page.evaluate((text) => navigator.clipboard.writeText(text), clipboard)
  await page.locator('.vue-flow__pane').click({ position: { x: 20, y: 300 } })
  await page.keyboard.press(`${modifier}+v`)

  await expect(shapes(page)).toHaveCount(7)
  await expect(page.locator('.vue-flow__node.selected')).toHaveCount(2)
  await history(page).getByRole('button', { name: 'Undo' }).click()
  await expect(shapes(page)).toHaveCount(5)
})
