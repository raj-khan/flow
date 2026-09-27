import { expect, test } from '@playwright/test'

import { fromMenu, history } from './helpers.js'

const shapes = (page) => page.locator('.vue-flow__node')

const ANSWER = `Here is your diagram:

\`\`\`flow
title: Checkout
note: Failed payments retry

web = screen "Web app" -- /checkout
pay = process "Payments API"
stripe = terminal "Stripe"
db = database "Orders"

web -> pay : HTTPS
pay -> stripe : charge
pay -> db : write order
pay --> web : retry
\`\`\`

Tell me if you want the refunds flow too.`

test('drafts a diagram with your agent: copy the prompt, paste the answer, undo', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/new')
  await expect(shapes(page)).toHaveCount(5)

  await fromMenu(page, 'Draft with your agent')
  const dialog = page.getByRole('dialog', { name: 'Draft with your agent' })
  const copy = dialog.getByRole('button', { name: 'Copy prompt' })
  await expect(copy).toBeDisabled()

  await dialog
    .getByLabel('1. Describe the diagram')
    .fill('A checkout that charges Stripe and writes orders.')
  await copy.click()
  const prompt = await page.evaluate(() => navigator.clipboard.readText())
  expect(prompt).toContain('A checkout that charges Stripe and writes orders.')
  expect(prompt).toContain('Reply with only the diagram')
  await expect(dialog.getByRole('link', { name: 'Open in Claude' })).toHaveAttribute(
    'href',
    /^https:\/\/claude\.ai\/new\?q=Draw%20this/,
  )

  const answer = dialog.getByLabel('2. Paste the answer')
  await answer.fill('```flow\ntitle: X\na = blob "A"\n```')
  await expect(dialog.getByRole('status')).toContainText('Line 2:')
  await expect(dialog.getByRole('button', { name: 'Use this diagram' })).toBeDisabled()

  await answer.fill(ANSWER)
  await expect(dialog.getByRole('status')).toHaveText('4 shapes and 4 connections, ready.')
  await dialog.getByRole('button', { name: 'Use this diagram' }).click()

  await expect(shapes(page)).toHaveCount(4)
  await expect(page.locator('.vue-flow__node[data-id="stripe"]')).toContainText('Stripe')
  await history(page).getByRole('button', { name: 'Undo' }).click()
  await expect(shapes(page)).toHaveCount(5)
})
