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

test('tag cloud filters the cards', async ({ page }) => {
  await page.goto('/')
  const cloud = page.getByRole('navigation', { name: 'Filter by tag' })
  const cards = page.locator('.wish')

  // Pick tags from the data so the test survives wishlist edits.
  const items = data.items as { tags?: string[] }[]
  const [firstTag] = items.flatMap((item) => item.tags ?? [])
  test.skip(!firstTag, 'no tags in wishlist.json')

  await cloud.getByRole('button', { name: new RegExp(`^#${firstTag} `) }).click()
  const tagged = items.filter((item) => item.tags?.includes(firstTag))
  await expect(cards).toHaveCount(tagged.length)

  await cloud.getByRole('button', { name: 'All' }).click()
  await expect(cards).toHaveCount(data.items.length)

  // Tags on a card filter too.
  const cardTag = items[0].tags?.at(-1)
  if (cardTag) {
    await cards.first().getByRole('button', { name: `#${cardTag}`, exact: true }).click()
    await expect(cards).toHaveCount(items.filter((item) => item.tags?.includes(cardTag)).length)
  }
})

test('theme toggle overrides the OS and persists', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' })
  await page.goto('/')
  const bg = () => page.evaluate(() => getComputedStyle(document.documentElement).backgroundColor)
  const toggle = page.getByRole('group', { name: 'Color theme' })

  await expect(toggle.getByRole('button', { name: 'Auto' })).toHaveAttribute('aria-pressed', 'true')
  expect(await bg()).toBe('rgb(255, 255, 255)')

  await toggle.getByRole('button', { name: 'Dark' }).click()
  expect(await bg()).toBe('rgb(22, 23, 29)')

  // Survives a reload, applied before the app mounts.
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  expect(await bg()).toBe('rgb(22, 23, 29)')

  // Auto follows the OS again.
  await toggle.getByRole('button', { name: 'Auto' }).click()
  await expect(page.locator('html')).not.toHaveAttribute('data-theme')
  await page.emulateMedia({ colorScheme: 'dark' })
  expect(await bg()).toBe('rgb(22, 23, 29)')
  await toggle.getByRole('button', { name: 'Light' }).click()
  expect(await bg()).toBe('rgb(255, 255, 255)')
})
