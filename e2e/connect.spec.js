import { expect, test } from '@playwright/test'

const node = (page, id) => page.locator(`.vue-flow__node[data-id="${id}"]`)

/** Edges are hidden rather than removed, so count the drawn ones. */
const drawnEdges = (page) =>
  page.evaluate(
    () =>
      [...document.querySelectorAll('.vue-flow__edge')].filter(
        (edge) => edge.style.display !== 'none',
      ).length,
  )

/** The saved edges into a node, as their source ids. */
const sourcesInto = (page, id) =>
  page.evaluate((nodeId) => {
    const saved = JSON.parse(localStorage.getItem('flow:document'))
    return saved.edges
      .filter((edge) => edge.target === nodeId)
      .map((edge) => edge.source)
      .sort()
  }, id)

/**
 * The canvas eases into place, so coordinates are only safe once it stops. Still
 * for several samples, not one: a pan towards a just-added shape can start a
 * moment after the shape is measured, and one still sample would miss it.
 */
async function whenStill(locator, samples = 4) {
  let previous = null
  let still = 0
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const box = await locator.boundingBox()
    const unmoved =
      previous && Math.abs(box.x - previous.x) < 0.5 && Math.abs(box.y - previous.y) < 0.5
    still = unmoved ? still + 1 : 0
    if (still >= samples) return box
    previous = box
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  return previous
}

/**
 * The remove control appears while the edge is hovered. Hovering the edge's own hit
 * path lets Playwright wait for the element, rather than us computing a point on a
 * canvas that may still be easing.
 */
async function removeControl(page, edgeId) {
  // Forced: the control appears under the cursor, and Playwright would otherwise
  // retry the hover forever because the button it just revealed is in the way.
  await page
    .locator(`.vue-flow__edge[data-id="${edgeId}"] [data-testid="edge-hit-area"]`)
    .hover({ force: true })

  return page.getByRole('button', { name: 'Remove this connection' }).first()
}

test.beforeEach(async ({ page }) => {
  await page.goto('/new')
  await expect(node(page, 'b6a0c1')).toBeVisible()
})

test('drags between nodes to add a second incoming edge, keeping the first', async ({ page }) => {
  expect(await drawnEdges(page)).toBe(4)

  const from = await node(page, 'e879e4').locator('.vue-flow__handle-bottom').boundingBox()
  const to = await node(page, 'b0653a').boundingBox()

  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + 6, { steps: 14 })
  await page.mouse.up()

  await expect.poll(() => sourcesInto(page, 'b0653a')).toEqual(['d09c08', 'e879e4'])
  await expect.poll(() => drawnEdges(page)).toBe(5)
})

test('removes a connection from the edge, and undo puts it back', async ({ page }) => {
  await (await removeControl(page, 'e-d09c08-b6a0c1')).click()
  await expect.poll(() => sourcesInto(page, 'b6a0c1')).toEqual([])
  expect(await drawnEdges(page)).toBe(3)

  await page.getByRole('banner').getByRole('button', { name: 'Undo' }).click()
  await expect.poll(() => sourcesInto(page, 'b6a0c1')).toEqual(['d09c08'])
  await expect.poll(() => drawnEdges(page)).toBe(4)
})

test('leaves the node where it was when its connection goes', async ({ page }) => {
  const before = await node(page, 'b6a0c1').boundingBox()

  await (await removeControl(page, 'e-d09c08-b6a0c1')).click()
  await expect.poll(() => sourcesInto(page, 'b6a0c1')).toEqual([])

  const after = await node(page, 'b6a0c1').boundingBox()
  expect(Math.abs(after.y - before.y)).toBeLessThan(4)
  expect(Math.abs(after.x - before.x)).toBeLessThan(4)
})

test('draws the edge at once when a created node is connected', async ({ page }) => {
  await page
    .getByRole('complementary', { name: 'Shapes' })
    .getByRole('button', { name: 'Process', exact: true })
    .click()
  const created = await page.locator('.vue-flow__node.selected').getAttribute('data-id')
  await page.getByRole('textbox', { name: 'Shape title' }).press('Enter')
  expect(await drawnEdges(page)).toBe(4)

  await whenStill(node(page, created))
  const from = await node(page, 'b6a0c1').locator('.vue-flow__handle-bottom').boundingBox()
  const to = await node(page, created).boundingBox()
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + to.width / 2, to.y + 6, { steps: 14 })
  await page.mouse.up()

  // No reload: the edge has to appear on its own.
  await expect.poll(() => drawnEdges(page)).toBe(5)
  await expect.poll(() => sourcesInto(page, created)).toEqual(['b6a0c1'])
})
