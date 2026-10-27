import { expect, test } from '@playwright/test'
import data from '../data/wishlist.json' with { type: 'json' }

test('wishlist walkthrough', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(data.title)

  const cards = page.locator('.wish')
  await expect(cards).toHaveCount(data.items.length)

  // Visit each card so the video shows the whole list.
  for (const card of await cards.all()) {
    await card.scrollIntoViewIfNeeded()
    await card.hover()
  }

  await page.locator('footer').scrollIntoViewIfNeeded()
  await expect(page.locator('footer')).toContainText(`Wishlist by ${data.author}`)
})

test('layout fits the viewport without horizontal scroll', async ({ page }) => {
  await page.goto('/')
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})

test('item links are comfortable touch targets on mobile', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile-only check')
  await page.goto('/')
  for (const link of await page.locator('.wish a').all()) {
    const box = await link.boundingBox()
    expect(box?.height).toBeGreaterThanOrEqual(44)
  }
})
