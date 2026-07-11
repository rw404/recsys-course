import { mkdir } from 'node:fs/promises'
import { chromium } from 'playwright-core'

const baseURL = process.env.BASE_URL ?? 'http://127.0.0.1:5173'
const executablePath =
  process.env.CHROMIUM_PATH ??
  '/home/claude-agent/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell'

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
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await context.newPage()
page.on('pageerror', (error) => errors.push('page: ' + error.message))
page.on('console', (message) => {
  if (message.type() === 'error') errors.push('console: ' + message.text())
})

await page.goto(baseURL + '/?capture=1', { waitUntil: 'networkidle', timeout: 60000 })
await page.locator('canvas').waitFor({ state: 'visible' })
await page.getByRole('heading', { name: 'Recommender Systems' }).waitFor()
await page.waitForTimeout(4500)
await page.screenshot({ path: 'artifacts/cloud-overview.png' })

await page.getByRole('button', { name: 'Explore Foundations' }).click()
await page.waitForTimeout(280)
await page.screenshot({ path: 'artifacts/cloud-reveal.png' })
await page.waitForTimeout(2100)
await page.screenshot({ path: 'artifacts/cloud-foundations.png' })

const before = await page.evaluate(() => window.__runtime.playerPosition.toArray())
await page.keyboard.down('w')
await page.waitForTimeout(1100)
await page.keyboard.up('w')
await page.waitForTimeout(180)
const afterForward = await page.evaluate(() => window.__runtime.playerPosition.toArray())
await page.keyboard.down('d')
await page.waitForTimeout(1100)
await page.keyboard.up('d')
await page.waitForTimeout(180)
const afterStrafe = await page.evaluate(() => window.__runtime.playerPosition.toArray())

await page.getByRole('button', { name: 'Open next field note' }).click()
await page.locator('.study-cinematic').waitFor({ state: 'visible' })
await page.waitForTimeout(900)
await page.screenshot({ path: 'artifacts/cloud-study.png' })
await page.keyboard.press('Escape')
await page.waitForTimeout(300)
await page.getByRole('button', { name: 'Course world map', exact: true }).click()
await page.waitForTimeout(1500)
await page.getByRole('button', { name: 'Course index' }).click()
await page.waitForTimeout(300)
await page.screenshot({ path: 'artifacts/cloud-catalog.png' })
const chapterLabels = await page.locator('.chapter-map-label').count()
await context.close()

const mobileContext = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
  isMobile: true,
  hasTouch: true,
})
const mobile = await mobileContext.newPage()
mobile.on('pageerror', (error) => errors.push('mobile page: ' + error.message))
mobile.on('console', (message) => {
  if (message.type() === 'error') errors.push('mobile console: ' + message.text())
})
await mobile.goto(baseURL + '/?capture=1', { waitUntil: 'networkidle', timeout: 60000 })
await mobile.locator('canvas').waitFor({ state: 'visible' })
await mobile.waitForTimeout(4000)
await mobile.screenshot({ path: 'artifacts/cloud-mobile-overview.png' })
await mobile.getByRole('button', { name: 'Explore Foundations' }).click()
await mobile.waitForTimeout(2200)
await mobile.screenshot({ path: 'artifacts/cloud-mobile-foundations.png' })

const movementForward = Math.hypot(
  afterForward[0] - before[0],
  afterForward[2] - before[2],
)
const movementStrafe = Math.hypot(
  afterStrafe[0] - afterForward[0],
  afterStrafe[2] - afterForward[2],
)

console.log(JSON.stringify({
  movementForward: Number(movementForward.toFixed(2)),
  movementStrafe: Number(movementStrafe.toFixed(2)),
  touchVisible: await mobile.locator('.mobile-controls').isVisible(),
  chapterLabels,
  errors,
}, null, 2))

await browser.close()
