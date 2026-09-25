import { expect, test } from '@playwright/test'

const shapes = (page) => page.locator('.vue-flow__node')
const textPane = (page) => page.getByRole('complementary', { name: 'Diagram as text' })

test.beforeEach(async ({ page }) => {
  await page.goto('/new')
  await expect(shapes(page)).toHaveCount(5)
  await page.getByRole('button', { name: 'Edit as text' }).click()
})

test('imports a pasted flowchart, says what it skipped, and undo brings the old one back', async ({
  page,
}) => {
  await page.getByRole('banner').getByRole('button', { name: 'Import' }).click()
  const dialog = page.getByRole('dialog', { name: 'Import' })

  await dialog
    .getByLabel('Mermaid to import')
    .fill(
      [
        'flowchart LR',
        '  A[Order placed] --> B{In stock?}',
        '  B -->|yes| C[(Warehouse)]',
        '  B -- no --> D([Refund])',
        '  style A fill:#f9f',
      ].join('\n'),
    )
  await expect(dialog.getByRole('status')).toContainText('4 shapes and 3 connections')
  await expect(dialog.getByRole('list', { name: 'Lines that will be skipped' })).toContainText(
    'Line 5',
  )

  await dialog.getByRole('button', { name: 'Import', exact: true }).click()

  await expect(shapes(page)).toHaveCount(4)
  await expect(page.locator('.vue-flow__node[data-id="B"] [data-shape]')).toHaveAttribute(
    'data-shape',
    'decision',
  )
  await expect(page.getByTestId('edge-label').filter({ hasText: 'yes' })).toBeVisible()

  await page.getByRole('banner').getByRole('button', { name: 'Undo' }).click()
  await expect(shapes(page)).toHaveCount(5)
})

test('copies the diagram as Mermaid', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await textPane(page).getByRole('button', { name: 'Copy as Mermaid' }).click()

  const copied = await page.evaluate(() => navigator.clipboard.readText())
  expect(copied).toMatch(/^---\ntitle: Support flow\n---\nflowchart TD\n/)
  expect(copied).toContain('d09c08{"Business Hours"}')
  expect(copied).toContain('d09c08 -->|"Success"| b0653a')
})
