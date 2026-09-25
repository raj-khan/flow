import { expect, test } from '@playwright/test'

const shapes = (page) => page.locator('.vue-flow__node')

test('the landing page says the loop, shows a live canvas and the agent setup', async ({
  page,
}) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Sketch it. Hand it to your agent.',
  )
  await expect(
    page.getByText(
      'Sketch the system → Copy for AI → your agent builds it → the diagram stays true.',
    ),
  ).toBeVisible()

  // The real editor, live on the page.
  const canvas = page.frameLocator('iframe[title="The isketch editor, live"]')
  await expect(canvas.locator('.vue-flow__node').first()).toBeVisible({ timeout: 15_000 })

  // The brief an agent receives, copyable.
  await expect(page.getByRole('heading', { name: 'What your agent receives' })).toBeVisible()
  await expect(page.locator('#the-brief')).toContainText('Web app architecture')

  // The MCP setup lines.
  await expect(page.locator('#mcp-stdio')).toContainText('claude mcp add isketch')
  await expect(page.locator('#mcp-http')).toContainText('/mcp')

  // And a way in.
  await page.getByRole('link', { name: 'Open the editor' }).click()
  await expect(shapes(page)).toHaveCount(9)
  await expect(page).toHaveURL(/\/new/)
})

test('the editor lives at /new, and old /flow links still open it', async ({ page }) => {
  await page.goto('/new')
  await expect(shapes(page)).toHaveCount(5)
  await expect(page).toHaveURL(/\/new/)

  await page.goto('/flow')
  await expect(shapes(page)).toHaveCount(5)
  await expect(page).toHaveURL(/\/flow/)

  // A share-hash link made before the landing page: the diagram it carries opens.
  const hash =
    '#flow=t' +
    Buffer.from('title: Shared\ngreeting = process "Greet"', 'utf8').toString('base64url')
  await page.goto(`/flow${hash}`)
  await expect(shapes(page)).toHaveCount(1)
  await expect(page.getByRole('heading', { name: 'Greet' })).toBeVisible()
})

test('the landing and the app are both reachable on one server', async ({ page }) => {
  const landing = await page.request.get('/')
  expect(landing.status()).toBe(200)
  await expect.poll(async () => (await landing.text()).length).toBeGreaterThan(1000)

  // The SPA shell, not the landing, answers an app route.
  const app = await page.request.get('/new')
  expect(app.status()).toBe(200)
  expect(await app.text()).toContain('id="app"')
})
