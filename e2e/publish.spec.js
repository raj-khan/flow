import { expect, test } from '@playwright/test'

/**
 * The server is mocked at the network: its own behaviour is tested against
 * PostgreSQL in server/. This covers the app's side of the conversation.
 */
const API = 'https://api.isketch.test'

test('publishes a public link, updates it in place, and unpublishes it', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const calls = []
  await page.route(`${API}/api/diagrams**`, async (route) => {
    const request = route.request()
    calls.push({
      method: request.method(),
      url: request.url(),
      auth: request.headers().authorization,
      body: request.postData(),
    })
    const url = 'https://isketch.test/d/abc123'
    const links = {
      page: url,
      markdown: `${url}.md`,
      flow: `${url}.flow`,
      svg: `${url}.svg`,
      json: `${url}.json`,
    }
    if (request.method() === 'POST') {
      return route.fulfill({
        status: 201,
        json: { id: 'abc123', url, revision: 1, links, editToken: 'secret-token' },
      })
    }
    if (request.method() === 'PUT')
      return route.fulfill({ json: { id: 'abc123', url, revision: 2, links } })
    return route.fulfill({ status: 204 })
  })

  await page.goto('/new')
  await expect(page.locator('.vue-flow__node').first()).toBeVisible()
  const share = () => page.getByRole('banner').getByRole('button', { name: 'Share' }).click()

  await share()
  const dialog = page.getByRole('dialog', { name: 'Share' })
  await dialog.getByRole('button', { name: 'Publish a public link' }).click()
  await expect(dialog.getByLabel('Public link')).toHaveValue('https://isketch.test/d/abc123')
  expect(calls[0]).toMatchObject({ method: 'POST' })
  expect(calls[0].body).toMatch(/^title: Support flow\n/)

  await dialog.getByRole('button', { name: 'Copy brief link (.md)' }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    'https://isketch.test/d/abc123.md',
  )

  // The token is remembered, so a later visit updates the same link.
  await page.keyboard.press('Escape')
  await page.reload()
  await share()
  await dialog.getByRole('button', { name: 'Update with this version' }).click()
  await expect.poll(() => calls.length).toBe(2)
  expect(calls[1]).toMatchObject({ method: 'PUT', auth: 'Bearer secret-token' })
  expect(calls[1].url).toBe(`${API}/api/diagrams/abc123`)

  await dialog.getByRole('button', { name: 'Unpublish' }).click()
  await expect(dialog.getByRole('button', { name: 'Publish a public link' })).toBeVisible()
  expect(calls[2]).toMatchObject({ method: 'DELETE', auth: 'Bearer secret-token' })
})

test('says what went wrong when the server refuses', async ({ page }) => {
  await page.route(`${API}/api/diagrams`, (route) =>
    route.fulfill({
      status: 422,
      json: {
        message: 'The .flow text has errors.',
        errors: [{ line: 3, message: 'Unknown shape' }],
      },
    }),
  )
  await page.goto('/new')
  await expect(page.locator('.vue-flow__node').first()).toBeVisible()
  await page.getByRole('banner').getByRole('button', { name: 'Share' }).click()
  await page.getByRole('button', { name: 'Publish a public link' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Line 3' })).toContainText(
    'The .flow text has errors. Line 3: Unknown shape',
  )
})
