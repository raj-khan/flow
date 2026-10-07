/**
 * Run `act` on an action's button: in the side panel where it shows, opened
 * for the moment if folded, else in the ☰ menu (phones, zen mode).
 * @param {import('@playwright/test').Page} page
 * @param {string | RegExp} name
 * @param {(item: import('@playwright/test').Locator) => Promise<void>} act
 */
async function withAction(page, name, act) {
  const menuButton = page.getByRole('button', { name: 'Menu', exact: true })
  const dock = page.getByTestId('side-dock')
  await menuButton.or(dock).first().waitFor()
  if (await menuButton.isVisible()) {
    await menuButton.click()
    const menu = page.getByRole('menu')
    await act(menu.getByRole('menuitem', { name }).or(menu.getByRole('menuitemcheckbox', { name })))
    return
  }
  const folded = (await dock.getAttribute('aria-label')) === 'Side panel, folded'
  if (folded) await page.getByRole('button', { name: 'Open the side panel' }).click()
  await act(dock.getByRole('button', { name }))
  const modal = page.locator('[role="dialog"][aria-modal="true"]')
  if (folded && (await modal.count()) === 0) {
    await page.getByRole('button', { name: 'Fold the side panel' }).click()
  }
}

/**
 * Choose an action from the side panel, or the ☰ menu where there is none.
 * @param {import('@playwright/test').Page} page
 * @param {string | RegExp} name
 */
export async function fromMenu(page, name) {
  await withAction(page, name, (item) => item.click())
}

/** The undo and redo buttons, bottom left. @param {import('@playwright/test').Page} page */
export const history = (page) => page.getByRole('toolbar', { name: 'History' })

/**
 * Whether an action that toggles is on, as 'true' or 'false'.
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
export async function menuChecked(page, name) {
  let checked = null
  await withAction(page, name, async (item) => {
    checked = (await item.getAttribute('aria-checked')) ?? (await item.getAttribute('aria-pressed'))
  })
  if (await page.getByRole('menu').isVisible()) await page.keyboard.press('Escape')
  return checked
}

/**
 * Open the shape library from the tool bar and return it. It closes itself
 * once a shape is added.
 * @param {import('@playwright/test').Page} page
 */
export async function openLibrary(page) {
  const library = page.getByRole('complementary', { name: 'Shapes' })
  if (!(await library.isVisible())) {
    await page
      .getByRole('toolbar', { name: 'Tools' })
      .getByRole('button', { name: 'Shapes' })
      .click()
  }
  return library
}
