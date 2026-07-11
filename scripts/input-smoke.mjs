import { chromium } from 'playwright-core'

const browser = await chromium.launch({
  headless: true,
  executablePath: '/home/claude-agent/.cache/ms-playwright/chromium_headless_shell-1148/chrome-linux/headless_shell',
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'],
})
const page = await browser.newPage({ viewport: { width: 1200, height: 760 } })
await page.goto(process.env.SMOKE_URL ?? 'http://127.0.0.1:5173/?capture=1', { waitUntil: 'networkidle', timeout: 60000 })
await page.locator('canvas').waitFor()
await page.waitForTimeout(4500)
await page.evaluate(() => {
  window.__inputEvents = []
  window.addEventListener('keydown', (event) => window.__inputEvents.push(`down:${event.code}`))
  window.addEventListener('keyup', (event) => window.__inputEvents.push(`up:${event.code}`))
})

const snapshot = () => page.evaluate(() => ({
  position: window.__runtime.playerPosition.toArray(),
  speed: window.__runtime.playerSpeed,
  mode: window.__progress.getState().mode,
  events: window.__inputEvents,
}))

const before = await snapshot()
await page.keyboard.down('w')
await page.waitForTimeout(900)
const duringKeyboard = await snapshot()
await page.keyboard.up('w')
await page.waitForTimeout(250)
const afterKeyboard = await snapshot()

await page.evaluate(() => {
  const target = window.__runtime.playerPosition.clone()
  target.x += 3
  window.__runtime.moveTarget = target
})
await page.waitForTimeout(1400)
const afterTarget = await snapshot()

console.log(JSON.stringify({ before, duringKeyboard, afterKeyboard, afterTarget }, null, 2))
await browser.close()
