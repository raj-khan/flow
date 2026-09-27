import { expect, test } from '@playwright/test'

/**
 * Touch, on a phone (Pixel 7) and a tablet (Galaxy Tab S4, landscape). The
 * phone gets the phone layout; the tablet keeps the desktop one, by touch.
 */
const shapes = (page) => page.locator('.vue-flow__node')
const node = (page, id) => page.locator(`.vue-flow__node[data-id="${id}"]`)
const tools = (page) => page.getByRole('toolbar', { name: 'Tools' })
const isPhone = (page) => page.viewportSize().width < 768
const transform = (page) =>
  page.locator('.vue-flow__transformationpane').evaluate((element) => element.style.transform)
const zoomOf = async (page) => Number((await transform(page)).match(/scale\(([\d.]+)\)/)[1])

/** Two fingers, from one pair of points to another, in steps. */
async function twoFingers(page, from, to) {
  const cdp = await page.context().newCDPSession(page)
  const points = (pair) => pair.map(([x, y], id) => ({ x, y, id }))
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(from) })
  for (let step = 1; step <= 10; step += 1) {
    const at = from.map(([x, y], index) => [
      x + ((to[index][0] - x) * step) / 10,
      y + ((to[index][1] - y) * step) / 10,
    ])
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(at) })
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

/** A finger resting on a point for longer than a long press. */
async function longPress(page, locator) {
  const box = await locator.boundingBox()
  const cdp = await page.context().newCDPSession(page)
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2, id: 0 }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point] })
  await page.waitForTimeout(700)
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
}

test.beforeEach(async ({ page }) => {
  await page.goto('/new')
  await expect(shapes(page)).toHaveCount(5)
})

test('fits the screen: nothing scrolls sideways, and the tool bar sits where the thumb is', async ({
  page,
}) => {
  if (isPhone(page)) await page.setViewportSize({ width: 360, height: 780 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    page.viewportSize().width,
  )

  const bar = await tools(page).boundingBox()
  const height = page.viewportSize().height
  if (isPhone(page)) expect(bar.y + bar.height).toBeGreaterThan(height - 24)
  else expect(bar.y).toBeLessThan(24)

  for (const button of await page.locator('.island button:visible').all()) {
    const box = await button.boundingBox()
    expect(
      Math.min(box.width, box.height),
      await button.getAttribute('aria-label'),
    ).toBeGreaterThanOrEqual(44)
  }
})

test('pinching zooms, and two fingers pan', async ({ page }) => {
  const { width, height } = page.viewportSize()
  const [cx, cy] = [width / 2, height / 2]
  const before = await zoomOf(page)

  await twoFingers(
    page,
    [
      [cx - 30, cy],
      [cx + 30, cy],
    ],
    [
      [cx - 120, cy],
      [cx + 120, cy],
    ],
  )
  await expect.poll(() => zoomOf(page)).toBeGreaterThan(before)

  const panned = await transform(page)
  await twoFingers(
    page,
    [
      [cx - 40, cy],
      [cx + 40, cy],
    ],
    [
      [cx - 40, cy + 120],
      [cx + 40, cy + 120],
    ],
  )
  await expect.poll(() => transform(page)).not.toBe(panned)

  // A gesture over shapes moves the view, never a shape.
  await expect(
    page.getByRole('toolbar', { name: 'History' }).getByRole('button', { name: 'Undo' }),
  ).toBeDisabled()
})

test('a long press opens the context menu, and its Delete can be undone', async ({ page }) => {
  await longPress(page, node(page, 'e879e4'))
  const menu = page.getByRole('menu', { name: 'Shape' })
  await expect(menu).toBeVisible()
  await expect(menu.getByRole('menuitem')).toHaveText([
    'Open details',
    'Rename',
    'Duplicate',
    'Delete',
  ])

  await menu.getByRole('menuitem', { name: 'Delete' }).tap()
  await expect(shapes(page)).toHaveCount(4)
  await page.getByRole('toolbar', { name: 'History' }).getByRole('button', { name: 'Undo' }).tap()
  await expect(shapes(page)).toHaveCount(5)
})

test('panels rise as sheets on a phone, and float on a tablet', async ({ page }) => {
  await tools(page).getByRole('button', { name: 'Shapes' }).tap()
  const library = await page.getByRole('complementary', { name: 'Shapes' }).boundingBox()
  const { width, height } = page.viewportSize()
  if (isPhone(page)) {
    expect(library.width).toBeCloseTo(width, 0)
    expect(library.y + library.height).toBeCloseTo(height, 0)
  } else {
    expect(library.width).toBeLessThan(width / 2)
  }
})

test('the pen takes a stylus’s pressure, and ignores a resting palm', async ({ page }) => {
  await tools(page).getByRole('button', { name: 'Pen' }).tap()
  const layer = page.getByTestId('pen-layer')
  const box = await layer.boundingBox()
  const at = (dx, dy) => ({ clientX: box.x + 100 + dx, clientY: box.y + 200 + dy })
  const send = (type, init) =>
    layer.dispatchEvent(type, { bubbles: true, isPrimary: true, button: 0, ...init })

  await send('pointerdown', { pointerId: 7, pointerType: 'pen', pressure: 0.2, ...at(0, 0) })
  for (let step = 1; step <= 8; step += 1) {
    await send('pointermove', {
      pointerId: 7,
      pointerType: 'pen',
      pressure: 0.2 + step * 0.08,
      ...at(step * 15, (step % 2) * 20),
    })
  }
  await send('pointerup', { pointerId: 7, pointerType: 'pen', ...at(120, 0) })
  await expect(page.getByTestId('ink-stroke')).toHaveCount(1)

  const ink = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('flow:document')).nodes.find((n) => n.type === 'ink'),
  )
  expect(ink.data.points.split(' ').every((point) => point.split(',').length === 3)).toBe(true)

  // A palm, after the stylus: it draws nothing.
  await send('pointerdown', { pointerId: 9, pointerType: 'touch', ...at(0, 60) })
  await send('pointermove', { pointerId: 9, pointerType: 'touch', ...at(80, 90) })
  await send('pointerup', { pointerId: 9, pointerType: 'touch', ...at(80, 90) })
  await expect(page.getByTestId('ink-stroke')).toHaveCount(1)
})

test('a shared link opens read-only and fitted on a phone, with Copy for AI and Edit', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  const hash =
    '#flow=t' +
    Buffer.from(
      // Fanned out wider than a phone, so it has to be fitted to be seen.
      [
        'title: Checkout',
        'pay = process "Pay"',
        ...['ship', 'mail', 'bill', 'log'].map((id) => `${id} = process "${id}"\npay -> ${id}`),
      ].join('\n'),
      'utf8',
    ).toString('base64url')
  await page.goto(`/new${hash}`)
  await expect(shapes(page)).toHaveCount(5)

  const viewer = page.getByRole('toolbar', { name: 'Shared diagram' })
  if (!isPhone(page)) {
    await expect(viewer).toHaveCount(0)
    await expect(tools(page)).toBeVisible()
    return
  }

  await expect(page.getByRole('heading', { name: 'Checkout' })).toBeVisible()
  // Fitted: every shape is on screen.
  const { width, height } = page.viewportSize()
  await expect
    .poll(async () => {
      const boxes = await Promise.all(
        (await shapes(page).all()).map((shape) => shape.boundingBox()),
      )
      return boxes.every(
        (box) => box.x >= 0 && box.x + box.width <= width && box.y + box.height <= height,
      )
    })
    .toBe(true)
  await expect(tools(page)).toHaveCount(0)
  await node(page, 'pay').tap()
  await expect(page).toHaveURL(/\/new$/)

  await viewer.getByRole('button', { name: 'Copy for AI' }).tap()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Pay')

  await viewer.getByRole('button', { name: 'Edit' }).tap()
  await expect(tools(page)).toBeVisible()
  await node(page, 'pay').tap()
  await expect(page).toHaveURL(/\/new\/node\/pay$/)
})
