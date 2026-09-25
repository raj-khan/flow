import { expect, test } from '@playwright/test'

import { fromMenu } from './helpers.js'

const SPEC = `openapi: 3.1.0
info:
  title: Shop API
paths:
  /orders:
    get:
      tags: [Orders]
      responses:
        '200':
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Order' }
components:
  schemas:
    Order:
      properties:
        id: { type: string }
        customer: { $ref: '#/components/schemas/Customer' }
    Customer:
      properties:
        email: { type: string }
`

test('maps an OpenAPI spec: tags as services, schemas as data', async ({ page }) => {
  await page.goto('/new')
  await fromMenu(page, 'Import')

  const dialog = page.getByRole('dialog', { name: 'Import' })
  await dialog.getByRole('radio', { name: 'OpenAPI' }).click()
  await dialog.getByLabel('OpenAPI to import').fill(SPEC)
  await dialog.getByRole('radio', { name: /A new diagram/ }).check()
  await expect(dialog.getByRole('status')).toContainText('3 shapes and 2 connections')
  await dialog.getByRole('button', { name: 'Import' }).click()

  await expect(page.locator('.vue-flow__node')).toHaveCount(3)
  await expect(page.locator('.vue-flow__node[data-id="api-Orders"]')).toContainText('GET /orders')
  await expect(
    page.locator('.vue-flow__node[data-id="schema-Customer"] [data-shape]'),
  ).toHaveAttribute('data-shape', 'data')
})
