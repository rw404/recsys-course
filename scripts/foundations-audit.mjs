import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

process.env.LD_LIBRARY_PATH = `/tmp/chromelibs/root/usr/lib/x86_64-linux-gnu:${process.env.LD_LIBRARY_PATH ?? ''}`

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:5173'
const executablePath = [
  process.env.CHROMIUM_PATH,
  '/home/claude-agent/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell',
  '/home/claude-agent/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell',
].find((candidate) => candidate && existsSync(candidate))

if (!executablePath) throw new Error('No Playwright Chromium executable was found')

await mkdir('artifacts', { recursive: true })

const browser = await chromium.launch({
  headless: true,
  executablePath,
  args: [
    '--no-sandbox',
    '--enable-webgl',
    '--enable-unsafe-swiftshader',
    '--use-angle=swiftshader',
    '--ignore-gpu-blocklist',
    '--disable-dev-shm-usage',
  ],
})

const errors = []

async function openFoundationsLab(context, label) {
  const page = await context.newPage()
  await page.addInitScript(() => window.localStorage.clear())
  page.on('pageerror', (error) => errors.push(`${label} page: ${error.message}`))
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.text().includes('favicon')) {
      errors.push(`${label} console: ${message.text()}`)
    }
  })
  await page.goto(`${baseURL}/?capture=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.locator('canvas').waitFor({ state: 'visible', timeout: 60000 })
  await page.evaluate(async () => {
    const { useProgress } = await import('/src/state/progress.ts')
    useProgress.getState().completeNode('week01-station')
    useProgress.getState().openNode('ranking-sandbox')
  })
  await page.locator('.foundations-lab').waitFor({ state: 'visible', timeout: 30000 })
  await page.locator('.foundation-candidate').first().waitFor({ state: 'visible', timeout: 30000 })
  await page.waitForTimeout(800)
  return page
}

const desktopContext = await browser.newContext({
  viewport: { width: 1440, height: 1000 },
  deviceScaleFactor: 1,
})

const theory = await desktopContext.newPage()
await theory.addInitScript(() => window.localStorage.clear())
theory.on('pageerror', (error) => errors.push(`theory page: ${error.message}`))
theory.on('console', (message) => {
  if (message.type() === 'error' && !message.text().includes('favicon')) {
    errors.push(`theory console: ${message.text()}`)
  }
})
await theory.goto(`${baseURL}/?capture=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
await theory.locator('canvas').waitFor({ state: 'visible', timeout: 60000 })
await theory.evaluate(async () => {
  const { useProgress } = await import('/src/state/progress.ts')
  useProgress.getState().openNode('week01-station')
})
await theory.locator('.imax-learning-contract').waitFor({ state: 'visible', timeout: 30000 })
await theory.waitForTimeout(2500)
assert.equal(await theory.locator('.imax-learning-contract li').count(), 3)
assert.equal(await theory.locator('.imax-learning-contract > div span').count(), 4)
await theory.screenshot({ path: 'artifacts/foundations-theory-contract.png' })
await theory.getByRole('button', { name: /Open concept 11/ }).click()
await theory.getByText('Next learning move', { exact: true }).waitFor()
await theory.waitForTimeout(900)
await theory.screenshot({ path: 'artifacts/foundations-theory-handoff.png' })
await theory.getByRole('button', { name: 'Test a ranking on real ratings' }).click()
await theory.locator('.foundations-lab').waitFor({ state: 'visible', timeout: 30000 })
await theory.close()

const returningStudent = await desktopContext.newPage()
await returningStudent.addInitScript(() => window.localStorage.clear())
await returningStudent.goto(`${baseURL}/?capture=1`, { waitUntil: 'domcontentloaded', timeout: 60000 })
await returningStudent.locator('canvas').waitFor({ state: 'visible', timeout: 60000 })
await returningStudent.evaluate(async () => {
  const { useProgress } = await import('/src/state/progress.ts')
  useProgress.getState().completeNode('week01-station')
  useProgress.getState().openNode('week01-station')
  useProgress.getState().setLessonPage(10)
})
await returningStudent.getByRole('button', { name: 'Test a ranking on real ratings' }).waitFor({
  state: 'visible',
  timeout: 30000,
})
await returningStudent.getByRole('button', { name: 'Test a ranking on real ratings' }).click()
await returningStudent.locator('.foundations-lab').waitFor({ state: 'visible', timeout: 30000 })
await returningStudent.close()

const desktop = await openFoundationsLab(desktopContext, 'desktop')
assert.equal(await desktop.locator('.foundation-candidate').count(), 9)
assert.equal(await desktop.locator('.foundation-slot').count(), 4)
await desktop.waitForFunction(() => (
  [...document.querySelectorAll('.foundation-candidate img')]
    .filter((image) => image.complete && image.naturalWidth > 0).length >= 6
), undefined, { timeout: 20000 })
const loadedPosters = await desktop.locator('.foundation-candidate img').evaluateAll((images) => images.filter((image) => image.complete && image.naturalWidth > 0).length)

const desktopOverflow = await desktop.evaluate(() => ({
  x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
}))
assert.equal(desktopOverflow.x, 0)
assert.equal(desktopOverflow.y, 0)
await desktop.screenshot({ path: 'artifacts/foundations-desktop.png' })

while (await desktop.locator('.foundation-candidate[aria-pressed="true"]').count()) {
  await desktop.locator('.foundation-candidate[aria-pressed="true"]').first().click()
}
const ranking = await desktop.locator('.foundation-candidate').evaluateAll((nodes) => nodes
  .map((node, index) => ({
    index,
    rating: Number(node.querySelector('.foundation-candidate-copy em')?.textContent?.trim() ?? 0),
  }))
  .sort((left, right) => right.rating - left.rating)
  .slice(0, 4))
for (const candidate of ranking) await desktop.locator('.foundation-candidate').nth(candidate.index).click()

await desktop.locator('.foundation-reflection-options button').first().click()
await desktop.getByText('Evidence and explanation complete', { exact: true }).waitFor()
assert.equal(await desktop.getByRole('button', { name: /Open baseline in Foundry/ }).isEnabled(), true)
assert.equal(await desktop.getByRole('button', { name: /Continue to checkpoint/ }).isEnabled(), true)
await desktop.screenshot({ path: 'artifacts/foundations-complete.png' })

await desktop.getByRole('button', { name: /Open baseline in Foundry/ }).click()
await desktop.locator('.system-builder').waitFor({ state: 'visible', timeout: 30000 })
assert.equal(await desktop.locator('.template-select select').inputValue(), 'fast')

const mobileContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
})
const mobile = await openFoundationsLab(mobileContext, 'mobile')
assert.equal(await mobile.locator('.foundation-candidate').count(), 9)
const mobileOverflow = await mobile.evaluate(() => ({
  x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
  scrollPanel: document.querySelector('.foundation-lab-scroll')?.scrollHeight ?? 0,
  viewportPanel: document.querySelector('.foundation-lab-scroll')?.clientHeight ?? 0,
}))
assert.equal(mobileOverflow.x, 0)
assert.equal(mobileOverflow.y, 0)
assert.equal(mobileOverflow.scrollPanel > mobileOverflow.viewportPanel, true)
await mobile.screenshot({ path: 'artifacts/foundations-mobile.png' })

console.log(JSON.stringify({
  loadedPosters,
  desktopOverflow,
  mobileOverflow,
  errors,
}, null, 2))

await browser.close()
assert.deepEqual(errors, [])
