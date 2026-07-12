import assert from 'node:assert/strict'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:5173'
const executablePath = process.env.CHROMIUM_PATH
  ?? '/home/claude-agent/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell'
const expectedDataset = process.env.EXPECTED_DATASET ?? 'MovieLens 100K'
const expectedSource = process.env.EXPECTED_SOURCE ?? 'GroupLens Research'
const expectsImdbPosters = expectedDataset.includes('MovieTweetings')

await mkdir('artifacts', { recursive: true })
const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: ['--no-sandbox', '--ignore-certificate-errors', '--enable-webgl', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--disable-dev-shm-usage'],
})

async function openFoundry(page) {
  await page.goto(baseURL + '/?capture=1', { waitUntil: 'networkidle', timeout: 60000 })
  await page.getByRole('button', { name: 'Open system Foundry' }).click()
  await page.locator('.system-builder').waitFor()
  await page.locator('.foundry-dataset-chip.is-official').waitFor({ state: 'attached', timeout: 15000 })
  await page.getByText('Trace complete', { exact: true }).waitFor({ timeout: 20000 })
}

async function assertRealPosters(page, selector, minimum) {
  await page.waitForFunction(
    ({ selector: posterSelector, minimum: expected }) => (
      [...document.querySelectorAll(posterSelector)]
        .filter((element) => element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0)
        .length >= expected
    ),
    { selector, minimum },
    { timeout: 30000 },
  )
  const loaded = await page.locator(selector).evaluateAll((images) => (
    images.filter((element) => element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0).length
  ))
  assert.ok(loaded >= minimum, `Only ${loaded} real movie posters loaded; expected at least ${minimum}`)
  return loaded
}

const desktop = await browser.newPage({ viewport: { width: 1536, height: 960 } })
const errors = []
desktop.on('pageerror', (error) => errors.push(error.message))
desktop.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
await openFoundry(desktop)

assert.equal(await desktop.locator('.foundry-results-tabs > button').count(), 4)
assert.match(await desktop.locator('.foundry-results-source').innerText(), /100,000 ratings/)
assert.match(await desktop.locator('.foundry-results-source').innerText(), new RegExp(expectedDataset))
assert.ok(await desktop.locator('.foundry-movie-card').count() >= 4)
const primaryTextSize = await desktop.locator('.foundry-movie-card .movie-copy strong').first().evaluate((element) => parseFloat(getComputedStyle(element).fontSize))
assert.ok(primaryTextSize >= 10, `Movie title text is only ${primaryTextSize}px`)
const loadedDesktopPosters = expectsImdbPosters
  ? await assertRealPosters(desktop, '.foundry-movie-card .movie-cover img', 4)
  : 0
await desktop.screenshot({ path: 'artifacts/foundry-readable-recommendations.png' })

await desktop.getByRole('tab', { name: /Stage trace/ }).click()
await desktop.locator('.trace-stage-detail').waitFor()
assert.ok(await desktop.locator('.trace-stage-rail button').count() >= 4)
await desktop.locator('.trace-stage-rail button').nth(3).click()
assert.ok(await desktop.locator('.stage-lineage.is-expanded article').count() > 0)
await desktop.screenshot({ path: 'artifacts/foundry-readable-trace.png' })

await desktop.getByRole('tab', { name: /Dataset evidence/ }).click()
await desktop.locator('.movielens-explorer').waitFor()
assert.match(await desktop.locator('.movielens-summary').innerText(), new RegExp(expectedSource))
assert.match(await desktop.locator('.movielens-summary').innerText(), /100,000/)
await desktop.getByRole('tab', { name: 'Ratings', exact: true }).click()
assert.ok(await desktop.locator('.movielens-rating-table > div').count() >= 10)
assert.match(await desktop.locator('.movielens-rating-table > div').first().innerText(), /5 \/ 5|4 \/ 5|3 \/ 5|2 \/ 5|1 \/ 5/)
await desktop.screenshot({ path: 'artifacts/foundry-readable-movielens.png' })

await desktop.getByRole('tab', { name: /Service simulation/ }).click()
await desktop.getByRole('button', { name: 'Simulate service' }).click()
await desktop.locator('.service-trend').waitFor()
assert.equal(await desktop.locator('.service-trend > span').count(), 7)
assert.ok(await desktop.locator('.service-event-log article').count() >= 8)
assert.match(await desktop.locator('.service-method-strip').innerText(), /Observed input/)
const serviceGeometry = await desktop.evaluate(() => {
  const trend = document.querySelector('.service-trend')?.getBoundingClientRect()
  const events = document.querySelector('.service-event-log')?.getBoundingClientRect()
  const policy = document.querySelector('.service-policy')?.getBoundingClientRect()
  const body = document.querySelector('.service-simulator-body')
  return {
    trendBottom: trend?.bottom ?? 0,
    eventsHeight: events?.height ?? 0,
    policyTop: policy?.top ?? 0,
    bodyClientHeight: body?.clientHeight ?? 0,
    bodyScrollHeight: body?.scrollHeight ?? 0,
  }
})
assert.ok(serviceGeometry.eventsHeight >= 128, `Event log collapsed to ${serviceGeometry.eventsHeight}px`)
assert.ok(serviceGeometry.trendBottom <= serviceGeometry.policyTop, `Chart overlaps policy by ${serviceGeometry.trendBottom - serviceGeometry.policyTop}px`)
await desktop.screenshot({ path: 'artifacts/foundry-readable-service.png' })

const desktopOverflow = await desktop.evaluate(() => ({
  x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
}))
assert.deepEqual(desktopOverflow, { x: 0, y: 0 })

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true })
mobile.on('pageerror', (error) => errors.push(`mobile: ${error.message}`))
mobile.on('console', (message) => { if (message.type() === 'error') errors.push(`mobile: ${message.text()}`) })
await openFoundry(mobile)
await mobile.getByRole('button', { name: /Slate/ }).click()
const loadedMobilePosters = expectsImdbPosters
  ? await assertRealPosters(mobile, '.foundry-movie-card .movie-cover img', 2)
  : 0
await mobile.getByRole('tab', { name: /Dataset evidence/ }).click()
await mobile.locator('.movielens-explorer').waitFor()
await mobile.screenshot({ path: 'artifacts/foundry-readable-mobile.png' })
const mobileOverflow = await mobile.evaluate(() => ({
  x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
}))
assert.deepEqual(mobileOverflow, { x: 0, y: 0 })
assert.deepEqual(errors, [])

console.log(JSON.stringify({ expectedDataset, primaryTextSize, loadedDesktopPosters, loadedMobilePosters, serviceGeometry, desktopOverflow, mobileOverflow, errors }, null, 2))
await browser.close()
