/**
 * Choose an item from the menu at the top left, where file, import, export,
 * view and help live since the canvas went full screen.
 * @param {import('@playwright/test').Page} page
 * @param {string | RegExp} name
 */
export async function fromMenu(page, name) {
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  const menu = page.getByRole('menu')
  await menu
    .getByRole('menuitem', { name })
    .or(menu.getByRole('menuitemcheckbox', { name }))
    .click()
}

/** The undo and redo buttons, bottom left. @param {import('@playwright/test').Page} page */
export const history = (page) => page.getByRole('toolbar', { name: 'History' })

/**
 * Whether a checkbox item in the menu is on, read with the menu open and then
 * closed again.
 * @param {import('@playwright/test').Page} page
 * @param {string} name
 */
export async function menuChecked(page, name) {
  await page.getByRole('button', { name: 'Menu', exact: true }).click()
  const item = page.getByRole('menu').getByRole('menuitemcheckbox', { name })
  const checked = await item.getAttribute('aria-checked')
  await page.keyboard.press('Escape')
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
