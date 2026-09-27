import { expect, test } from '@playwright/test'

const shapes = (page) => page.locator('.vue-flow__node')

test.describe('offline', () => {
  test.use({ serviceWorkers: 'allow' })

  test('the service worker caches the app, which then opens with no connection', async ({
    page,
    context,
  }) => {
    await page.goto('/new')
    await expect(shapes(page)).toHaveCount(5)
    await page.evaluate(() => navigator.serviceWorker.ready)
    // Controlled from the next load on; that load also fills the cache.
    await page.reload()
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true)

    await context.setOffline(true)
    await page.reload()
    await expect(shapes(page)).toHaveCount(5)
    await page.goto('/new/node/b6a0c1')
    await expect(page.getByLabel('Title')).toHaveValue('Away Message')
  })

  test('Chrome finds it installable, with a manifest it has no complaint about', async ({
    page,
    context,
  }) => {
    await page.goto('/new')
    await page.evaluate(() => navigator.serviceWorker.ready)
    const cdp = await context.newCDPSession(page)
    expect((await cdp.send('Page.getInstallabilityErrors')).installabilityErrors).toEqual([])
    expect((await cdp.send('Page.getAppManifest')).errors).toEqual([])
  })
})

test('the manifest makes it installable, opening .flow files and taking shared text', async ({
  request,
}) => {
  const manifest = await (await request.get('/manifest.webmanifest')).json()
  expect(manifest).toMatchObject({ start_url: '/new', display: 'standalone' })
  expect(manifest.file_handlers[0].accept['text/plain']).toContain('.flow')
  expect(manifest.share_target).toMatchObject({ action: '/new', method: 'GET' })
  expect(manifest.icons.some((icon) => icon.sizes === '512x512')).toBe(true)
})

test('text shared to the app opens as a diagram, and undo brings the old one back', async ({
  page,
}) => {
  const text = 'pay = process "Pay"\nship = process "Ship"\npay -> ship'
  await page.goto(`/new?title=Checkout&text=${encodeURIComponent(text)}`)
  await expect(shapes(page)).toHaveCount(2)
  await expect(page).toHaveURL(/\/new$/)
  await expect(page.getByText('Opened what was shared.')).toBeVisible()

  await page.getByRole('button', { name: 'Undo' }).last().click()
  await expect(shapes(page)).toHaveCount(5)
})

test('shared text that is not a diagram says so, and changes nothing', async ({ page }) => {
  await page.goto('/new?text=Look%20at%20this')
  await expect(page.getByText('What was shared is not a diagram isketch can read.')).toBeVisible()
  await expect(shapes(page)).toHaveCount(5)
})

test('a .flow file opened with the app from the system opens as a diagram', async ({ page }) => {
  // The system's launch queue, as Chrome gives an installed app a file it opens.
  await page.addInitScript(() => {
    // Chrome has its own, which a plain assignment would not replace.
    Object.defineProperty(window, 'launchQueue', {
      configurable: true,
      value: { setConsumer: (consumer) => (window.__launch = consumer) },
    })
  })
  await page.goto('/new')
  await expect(shapes(page)).toHaveCount(5)

  await page.evaluate(() =>
    window.__launch({
      files: [
        {
          getFile: async () =>
            new File(['title: Launched\na = process "A"\nb = process "B"'], 'launched.flow'),
        },
      ],
    }),
  )
  await expect(shapes(page)).toHaveCount(2)
  await expect(page.getByText('Opened launched.flow')).toBeVisible()
})
