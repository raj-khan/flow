import { expect, test } from '@playwright/test'

import { fromMenu } from './helpers.js'

test('copies the diagram as a brief a coding agent can build from', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/new')
  await fromMenu(page, 'New diagram')
  await page.getByRole('button', { name: /Web app architecture/ }).click()
  await expect(page.locator('.vue-flow__node')).toHaveCount(9)

  await page.getByRole('button', { name: 'Copy for AI' }).click()
  await expect(page.getByText(/Brief copied/)).toBeVisible()

  const brief = await page.evaluate(() => navigator.clipboard.readText())
  expect(brief).toMatch(/^# Web app architecture\n/)
  expect(brief).toContain('- **PostgreSQL** `db`: a data store.')
  expect(brief).toContain('- **API** → **PostgreSQL**: SQL')
  expect(brief).toContain('api -> db : SQL')
})

test('notes for the builder show on the shape and travel with the brief', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/new/node/b6a0c1')

  await page.getByLabel('Notes for the builder').fill('Only between 9pm and 7am')
  await page.getByRole('button', { name: 'Save changes' }).click()
  await expect(
    page.locator('.vue-flow__node[data-id="b6a0c1"]').getByTestId('node-notes'),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Copy for AI' }).click()
  const brief = await page.evaluate(() => navigator.clipboard.readText())
  expect(brief).toContain('  - Note: Only between 9pm and 7am\n')
  expect(brief).toContain('b6a0c1 note: Only between 9pm and 7am')
})
