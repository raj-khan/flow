import { expect, test } from '@playwright/test'

const setDark = async (page) => {
  await page.goto('/new')
  await page.evaluate(() => localStorage.setItem('flow:theme', 'dark'))
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
}

test('remembers an explicit theme across a reload', async ({ page }) => {
  await setDark(page)

  const toggle = page.getByRole('button', { name: /theme/i })
  await toggle.click()
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', 'dark')
})

test('leaves no form control transparent in dark', async ({ page }) => {
  await setDark(page)
  await page.goto('/new/node/d09c08')

  // A transparent select opens a white native popup on a dark page.
  const transparent = await page.evaluate(() =>
    [...document.querySelectorAll('select, input, textarea, option')]
      .filter((element) => element.checkVisibility?.() !== false)
      .filter((element) => {
        const background = getComputedStyle(element).backgroundColor
        return background === 'transparent' || background === 'rgba(0, 0, 0, 0)'
      })
      .map((element) => element.tagName + (element.id ? `#${element.id}` : '')),
  )

  expect(transparent).toEqual([])
})
