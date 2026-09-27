import { expect, test } from '@playwright/test'

import { fromMenu } from './helpers.js'

const shapes = (page) => page.locator('.vue-flow__node')

const PRISMA = `model User {
  id    Int    @id
  email String
  posts Post[]
}

model Post {
  id       Int  @id
  author   User @relation(fields: [authorId], references: [id])
  authorId Int
}`

const DRIZZLE = `export const users = pgTable('users', {
  id: serial('id').primaryKey(),
})

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  authorId: integer('author_id').references(() => users.id),
})`

for (const { label, text, key } of [
  { label: 'Prisma', text: PRISMA, key: 'authorId' },
  { label: 'Drizzle', text: DRIZZLE, key: 'author_id' },
]) {
  test(`draws a ${label} schema as tables, with its relations`, async ({ page }) => {
    await page.goto('/new')
    await expect(shapes(page)).toHaveCount(5)

    await fromMenu(page, 'Import')
    const dialog = page.getByRole('dialog', { name: 'Import' })
    await dialog.getByRole('radio', { name: label }).click()
    await dialog.getByLabel(`${label} to import`).fill(text)
    await dialog.getByRole('radio', { name: /A new diagram/ }).check()
    await expect(dialog.getByRole('status')).toContainText('2 shapes and 1 connection')
    await dialog.getByRole('button', { name: 'Import' }).click()

    await expect(shapes(page)).toHaveCount(2)
    await expect(shapes(page).locator('[data-shape="table"]')).toHaveCount(2)
    await expect(page.getByTestId('edge-label').filter({ hasText: key })).toBeVisible()
  })
}
