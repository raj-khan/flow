import { expect, test } from '@playwright/test'

const NODE = { away: 'b6a0c1', hours: 'd09c08' }

const nodeAt = (page, id) => page.locator(`.vue-flow__node[data-id="${id}"]`)

test.beforeEach(async ({ page }) => {
  await page.goto('/new')
  await expect(nodeAt(page, NODE.away)).toBeVisible()
})

test('renders every node of the starter diagram, with its outline, title and description', async ({
  page,
}) => {
  await expect(page.locator('.vue-flow__node')).toHaveCount(5)

  const card = nodeAt(page, NODE.away)
  await expect(card.locator('svg')).toBeVisible()
  await expect(card.getByRole('heading')).toHaveText('Away Message')
  await expect(card).toContainText('Sorry, we are currently away')
})

test('drags a node and keeps it there after a reload', async ({ page }) => {
  const card = nodeAt(page, NODE.away)
  const before = await card.boundingBox()
  const grabX = before.x + before.width / 2
  const grabY = before.y + 12

  await page.mouse.move(grabX, grabY)
  await page.mouse.down()
  // Vue Flow starts a drag only once the pointer moves, so nudge first.
  await page.mouse.move(grabX + 20, grabY + 15, { steps: 5 })
  await page.mouse.move(grabX + 200, grabY + 150, { steps: 15 })
  await page.mouse.up()

  const moved = await card.boundingBox()
  expect(moved.x - before.x).toBeGreaterThan(120)

  await page.reload()
  await expect(card).toBeVisible()
  // Flow coordinates, not screen ones: a reload refits the view.
  const position = await card.evaluate((element) => element.style.transform)
  expect(position).not.toBe('')
})

test('opens a node by clicking it', async ({ page }) => {
  await nodeAt(page, NODE.away).click()
  await expect(page).toHaveURL(/\/new\/node\/b6a0c1/)
})

test('draws each node as its shape, and labels the branches on their edges', async ({ page }) => {
  await expect(nodeAt(page, NODE.hours).locator('[data-shape]')).toHaveAttribute(
    'data-shape',
    'decision',
  )
  await expect(page.getByTestId('edge-label')).toHaveText(['Success', 'Failure'], {
    useInnerText: true,
  })
})

test('zoom steps land on round numbers, and the label resets to 100%', async ({ page }) => {
  const zoom = page.getByRole('button', { name: /Reset zoom/i })

  // From a known zoom: where fit to screen lands depends on the diagram.
  await zoom.click()
  await expect(zoom).toHaveText('100%')

  await page.getByRole('button', { name: 'Zoom out' }).click()
  await expect(zoom).toHaveText('75%')

  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect(zoom).toHaveText('100%')
  await page.getByRole('button', { name: 'Zoom in' }).click()
  await expect(zoom).toHaveText('150%')

  await page.getByRole('button', { name: 'Fit to screen' }).click()
  await expect(zoom).not.toHaveText('150%')

  await zoom.click()
  await expect(zoom).toHaveText('100%')
})

test('clicking a shape opens it without moving the canvas', async ({ page }) => {
  const pane = page.locator('.vue-flow__transformationpane')
  const before = await pane.evaluate((element) => element.style.transform)

  // The Welcome Message sits on the right, under where the drawer opens.
  await nodeAt(page, 'b0653a').click()
  await expect(page).toHaveURL(/\/new\/node\/b0653a/)
  await page.waitForTimeout(400)

  expect(await pane.evaluate((element) => element.style.transform)).toBe(before)
})

test('resizes a selected shape, and keeps the size after a reload', async ({ page }) => {
  await nodeAt(page, 'e879e4').click({ modifiers: ['Shift'] })
  const handle = nodeAt(page, 'e879e4').locator('.vue-flow__resize-control.bottom.right')
  const start = await handle.boundingBox()

  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2)
  await page.mouse.down()
  await page.mouse.move(start.x + 60, start.y + 40, { steps: 8 })
  await page.mouse.up()

  const size = () =>
    page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('flow:document')).nodes.find((n) => n.id === 'e879e4').size,
    )
  await expect.poll(size).not.toBeUndefined()
  const saved = await size()
  expect(saved.width).toBeGreaterThan(232 + 30)
  expect(saved.height).toBeGreaterThan(104 + 20)

  await page.reload()
  const box = await nodeAt(page, 'e879e4').boundingBox()
  const zoom = Number(
    (
      await page.locator('.vue-flow__transformationpane').evaluate((el) => el.style.transform)
    ).match(/scale\(([\d.]+)\)/)[1],
  )
  expect(Math.abs(box.width / zoom - saved.width)).toBeLessThan(2)
})
