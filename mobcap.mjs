import { chromium } from 'playwright-core'
process.env.LD_LIBRARY_PATH =
  '/tmp/chromelibs/root/usr/lib/x86_64-linux-gnu:' + (process.env.LD_LIBRARY_PATH || '')
const EXE =
  process.env.HOME +
  '/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell'
const URL = process.env.URL || 'http://127.0.0.1:4173/?capture=1'
const TAG = process.env.TAG || 'after'

const browser = await chromium.launch({
  executablePath: EXE,
  args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--use-gl=angle', '--use-angle=swiftshader', '--ignore-gpu-blocklist', '--disable-dev-shm-usage'],
})

const errors = []
async function newMobilePage(w, h) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  })
  const page = await ctx.newPage()
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
  return page
}
const shot = async (page, name, ms = 300) => {
  await page.waitForTimeout(ms)
  const p = `mobile-${TAG}-${name}.png`
  await page.screenshot({ path: p })
  console.log('  📸', p)
}

// ---- PORTRAIT ----
let page = await newMobilePage(390, 844)
await page.goto(URL, { waitUntil: 'load', timeout: 45000 })
await page.waitForSelector('canvas', { timeout: 20000 })
await page.waitForTimeout(8500)
await shot(page, '01-portrait', 400)

// drag the virtual joystick (up + right) to show movement + camera pull-back
const js = await page.$('.joystick')
if (js) {
  const b = await js.boundingBox()
  const cx = b.x + b.width / 2
  const cy = b.y + b.height / 2
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx + 34, cy - 40, { steps: 6 }) // push toward Week 01
  await page.waitForTimeout(1600)
  await shot(page, '02-joystick-walk', 200)
  await page.mouse.up()
} else {
  console.log('  (no joystick present — desktop-only build)')
}

// open the Ranking Sandbox lab via catalog to show the bottom-sheet lab on a phone
try {
  await page.getByRole('button', { name: 'Catalog' }).click({ timeout: 4000 })
  await page.waitForSelector('.catalog-list', { timeout: 4000 })
  // week01 first so sandbox unlocks
  await page.locator('.cat-row', { hasText: 'Week 01' }).getByRole('button', { name: 'Enter' }).click()
  await page.getByRole('button', { name: /Complete checkpoint/ }).click()
  await page.waitForTimeout(400)
  await page.getByRole('button', { name: 'Catalog' }).click()
  await page.locator('.cat-row', { hasText: 'Ranking Sandbox' }).getByRole('button', { name: 'Enter' }).click()
  await page.waitForSelector('.lab-grid', { timeout: 4000 })
  await shot(page, '03-lab', 400)
} catch (e) {
  console.log('  (lab flow skipped:', e.message.split('\n')[0], ')')
}
await page.context().close()

// ---- LANDSCAPE ----
page = await newMobilePage(844, 390)
await page.goto(URL, { waitUntil: 'load', timeout: 45000 })
await page.waitForSelector('canvas', { timeout: 20000 })
await page.waitForTimeout(8000)
await shot(page, '04-landscape', 400)
await page.context().close()

console.log('errors:', errors.length)
errors.slice(0, 8).forEach((e) => console.log('  !', e))
await browser.close()
