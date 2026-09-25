import { expect, test } from '@playwright/test'

import { fromMenu } from './helpers.js'

const shapes = (page) => page.locator('.vue-flow__node')
const shapeOf = (page, id) => page.locator(`.vue-flow__node[data-id="${id}"] [data-shape]`)

const COMPOSE = `name: shop
services:
  web:
    build: ./web
    ports: ["8080:80"]
    depends_on: [api]
  api:
    image: node:22-alpine
    depends_on: [db]
  db:
    image: postgres:16
`

/** @param {import('@playwright/test').Page} page @param {string} text */
async function importCompose(page, text) {
  await fromMenu(page, 'Import')
  const dialog = page.getByRole('dialog', { name: 'Import' })
  await dialog.getByRole('radio', { name: 'docker-compose' }).click()
  await dialog.getByLabel('docker-compose to import').fill(text)
  return dialog
}

test.beforeEach(async ({ page }) => {
  await page.goto('/new')
  await expect(shapes(page)).toHaveCount(5)
})

test('draws a compose file: services as shapes, dependencies as connections', async ({ page }) => {
  const dialog = await importCompose(page, COMPOSE)
  await dialog.getByRole('radio', { name: /A new diagram/ }).check()
  await expect(dialog.getByRole('status')).toContainText('3 shapes and 2 connections')
  await dialog.getByRole('button', { name: 'Import' }).click()

  await expect(shapes(page)).toHaveCount(3)
  await expect(shapeOf(page, 'db')).toHaveAttribute('data-shape', 'database')
  await expect(page.locator('.vue-flow__node[data-id="web"]')).toContainText('ports 8080:80')
})

test('re-importing updates the diagram and keeps where things were put', async ({ page }) => {
  let dialog = await importCompose(page, COMPOSE)
  await dialog.getByRole('radio', { name: /A new diagram/ }).check()
  await dialog.getByRole('button', { name: 'Import' }).click()
  await expect(shapes(page)).toHaveCount(3)

  // Move the database somewhere deliberate.
  const db = page.locator('.vue-flow__node[data-id="db"]')
  const box = await db.boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + 12)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width / 2 + 20, box.y + 30, { steps: 5 })
  await page.mouse.move(box.x + box.width / 2 + 260, box.y + 160, { steps: 10 })
  await page.mouse.up()
  const saved = () =>
    page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('flow:document')).nodes.find((node) => node.id === 'db')
          .position,
    )
  await expect.poll(saved).not.toBeUndefined()
  const moved = await saved()

  dialog = await importCompose(
    page,
    `${COMPOSE}  worker:\n    image: node:22-alpine\n    depends_on: [db]\n`,
  )
  // Offered by default, since this format made the diagram on screen.
  await expect(dialog.getByRole('radio', { name: /The current diagram/ })).toBeChecked()
  await dialog.getByRole('button', { name: 'Import' }).click()

  await expect(shapes(page)).toHaveCount(4)
  expect(await saved()).toEqual(moved)
})
