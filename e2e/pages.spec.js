import { expect, test } from '@playwright/test'

const converter = (page) => page.frameLocator('iframe[title^="The "]')

test('a template page shows the diagram, its source and a live link into the editor', async ({
  page,
}) => {
  await page.goto('/templates/url-shortener')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('URL shortener')

  const drawing = page.locator('.drawing svg')
  await expect(drawing).toBeVisible()

  await expect(page.locator('#the-source')).toContainText('redirect = process "Redirect service"')
  await page.getByRole('button', { name: 'Copy' }).click()

  const open = page.getByRole('link', { name: 'Open this template' })
  await expect(open).toHaveAttribute('href', /\/flow#flow=z[\w-]+/)
  await open.click()
  await expect(page.locator('.vue-flow__node')).toHaveCount(6)
  // The editor's own routes are /new now; the old /flow form of the same link lands here too.
  await expect(page).toHaveURL(/\/new|\/flow/)
})

test('the templates index lists every one of them', async ({ page }) => {
  await page.goto('/templates')
  const cards = page.locator('.grid .step')
  await expect(cards).toHaveCount(10)
  await expect(page.getByRole('link', { name: /RAG pipeline/ })).toBeVisible()
  await page.getByRole('link', { name: /RAG pipeline/ }).click()
  await expect(page).toHaveURL(/\/templates\/rag-pipeline/)
})

test('a comparison is fair: what the other tool does better, and what isketch adds', async ({
  page,
}) => {
  await page.goto('/vs/excalidraw')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('isketch vs Excalidraw')
  await expect(page.getByRole('heading', { name: 'Where Excalidraw is better' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Where isketch adds something different' }),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'Excalidraw', exact: true })).toHaveAttribute(
    'href',
    'https://excalidraw.com',
  )
})

test('the converters run in the browser: SQL becomes an ER diagram', async ({ page }) => {
  await page.goto('/convert/sql-to-er')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('SQL to ER diagram')
  await page.locator('.convert iframe').scrollIntoViewIfNeeded()

  const tool = converter(page)
  await expect(tool.locator('#preview svg')).toBeVisible({ timeout: 15_000 })
  await expect(tool.locator('#flow')).toHaveValue(/customers = table "customers"/)
  await expect(tool.locator('#open')).toHaveAttribute('href', /\/flow#flow=z[\w-]+/)
  await tool.getByRole('button', { name: 'Convert' }).click()
  await expect(tool.locator('#preview svg')).toBeVisible()
})

test('mermaid converts to draw.io XML in the browser', async ({ page }) => {
  await page.goto('/convert/mermaid-to-drawio')
  await page.locator('.convert iframe').scrollIntoViewIfNeeded()
  const tool = converter(page)
  await expect(tool.locator('#output')).toHaveValue(/<mxGraphModel/, { timeout: 15_000 })
})

test('every generated page has its own title, description and OG image', async ({ request }) => {
  for (const path of [
    '/templates',
    '/templates/url-shortener',
    '/vs/drawio',
    '/convert',
    '/convert/openapi-to-diagram',
  ]) {
    const response = await request.get(path)
    expect(response.status(), path).toBe(200)
    const html = await response.text()
    expect(html, path).toContain('<meta name="description"')
    expect(html, path).toContain(
      `<meta property="og:image" content="https://isketch.online${path}/og.png">`,
    )

    const image = await request.get(`${path}/og.png`)
    expect(image.status(), path).toBe(200)
    expect(image.headers()['content-type'], path).toContain('image/png')
  }
})
