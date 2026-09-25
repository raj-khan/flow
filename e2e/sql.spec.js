import { expect, test } from '@playwright/test'

import { fromMenu } from './helpers.js'

const DDL = `CREATE TABLE customers (
  id uuid PRIMARY KEY,
  email text NOT NULL
);
CREATE TABLE orders (
  id bigint PRIMARY KEY,
  customer_id uuid REFERENCES customers (id),
  total numeric(10, 2)
);`

test('draws SQL tables with their columns, and foreign keys as labelled edges', async ({
  page,
}) => {
  await page.goto('/new')
  await fromMenu(page, 'Import')

  const dialog = page.getByRole('dialog', { name: 'Import' })
  await dialog.getByRole('radio', { name: 'SQL' }).click()
  await dialog.getByLabel('SQL to import').fill(DDL)
  await dialog.getByRole('radio', { name: /A new diagram/ }).check()
  await expect(dialog.getByRole('status')).toContainText('2 shapes and 1 connection')
  await dialog.getByRole('button', { name: 'Import' }).click()

  const orders = page.locator('.vue-flow__node[data-id="table-orders"]')
  await expect(orders.locator('[data-shape]')).toHaveAttribute('data-shape', 'table')
  await expect(orders).toContainText('customer_id FK')
  await expect(page.getByTestId('edge-label')).toHaveText('customer_id')
})
