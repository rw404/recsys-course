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
await page.waitForTimeout(6500)
await page.screenshot({ path: 'artifacts/ux-world.png' })

const before = await page.evaluate(() => {
  const runtime = window.__runtime
  return [runtime.playerPosition.x, runtime.playerPosition.z]
})
await page.keyboard.down('w')
await page.waitForTimeout(900)
await page.keyboard.up('w')
await page.waitForTimeout(180)
const afterForward = await page.evaluate(() => {
  const runtime = window.__runtime
  return [runtime.playerPosition.x, runtime.playerPosition.z]
})
const movementForward = Math.hypot(afterForward[0] - before[0], afterForward[1] - before[1])

await page.keyboard.down('d')
await page.waitForTimeout(900)
await page.keyboard.up('d')
await page.waitForTimeout(180)
const afterStrafe = await page.evaluate(() => {
  const runtime = window.__runtime
  return [runtime.playerPosition.x, runtime.playerPosition.z]
})
const movementStrafe = Math.hypot(afterStrafe[0] - afterForward[0], afterStrafe[1] - afterForward[1])

await page.getByRole('button', { name: 'Open course map' }).click()
await page.waitForTimeout(1800)
await page.screenshot({ path: 'artifacts/ux-journey.png' })
await page.getByRole('button', { name: 'Close course map' }).click()

await page.getByRole('button', { name: 'Catalog' }).click()
await page.screenshot({ path: 'artifacts/ux-catalog.png' })
await page.getByRole('button', { name: /Open Week 01/ }).click()
await page.locator('.study-cinematic').waitFor({ state: 'visible' })
await page.waitForTimeout(1600)
await page.screenshot({ path: 'artifacts/ux-study.png' })
await page.close()

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
await mobile.waitForTimeout(5000)
await mobile.screenshot({ path: 'artifacts/ux-mobile.png' })
const touchVisible = await mobile.locator('.mobile-controls').isVisible()

console.log(JSON.stringify({
  movementForward: Number(movementForward.toFixed(2)),
  movementStrafe: Number(movementStrafe.toFixed(2)),
  touchVisible,
  errors,
}, null, 2))
await browser.close()
