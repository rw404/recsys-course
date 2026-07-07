import { chromium } from 'playwright-core'

// headless-shell resolves all libs via the locally-extracted deb prefix
process.env.LD_LIBRARY_PATH =
  '/tmp/chromelibs/root/usr/lib/x86_64-linux-gnu:' + (process.env.LD_LIBRARY_PATH || '')

const EXE =
  process.env.HOME +
  '/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell'
const URL = process.env.URL || 'http://localhost:4173/'
// SwiftShader (software WebGL) can't reliably paint a large buffer; keep it small + dpr=1.
const W = 1200
const H = 750

const errors = []
const browser = await chromium.launch({
  executablePath: EXE,
  args: [
    '--no-sandbox',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--ignore-gpu-blocklist',
    '--enable-webgl',
    '--disable-dev-shm-usage',
  ],
})
// deviceScaleFactor:2 uses a compositor path that reliably paints the WebGL buffer
// under headless SwiftShader (DSF:1 intermittently captures black).
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 })
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))

const shots = []
async function shot(name, ms = 300) {
  await page.waitForTimeout(ms)
  // Force the WebGL backbuffer to rasterize before compositing — without this,
  // headless SwiftShader intermittently captures a black canvas at larger sizes.
  await page.evaluate(() => {
    const c = document.querySelector('canvas')
    if (!c) return
    const t = document.createElement('canvas')
    t.width = 4
    t.height = 4
    const x = t.getContext('2d', { willReadFrequently: true })
    x.drawImage(c, 0, 0, 4, 4)
    x.getImageData(0, 0, 4, 4)
  })
  const path = `preview-${name}.png`
  await page.screenshot({ path })
  shots.push(path)
  console.log('  📸', path)
}

console.log('loading', URL)
await page.goto(URL, { waitUntil: 'load', timeout: 45000 })
// give swiftshader time to compile shaders + first frames
await page.waitForSelector('canvas', { timeout: 20000 })
await page.waitForTimeout(8500)

// 1) spawn world
await shot('01-spawn', 500)

// 2) drive WASD to show movement + follow camera (walk toward Week 01 station)
await page.mouse.click(W / 2, H / 2) // focus the window
await page.keyboard.down('KeyW')
await page.keyboard.down('KeyD')
await page.waitForTimeout(1400)
await page.keyboard.up('KeyD')
await page.waitForTimeout(900)
await page.keyboard.up('KeyW')
await shot('02-walk', 400)

// 3) talk to guide via E? proximity is unreliable headless — use Catalog for deterministic flow
await page.keyboard.press('KeyC')
await page.waitForSelector('.catalog-list', { timeout: 5000 })
await shot('03-catalog', 300)

// enter Week 01 lesson (Study Mode) from catalog
await page.locator('.cat-row', { hasText: 'Week 01' }).getByRole('button', { name: 'Enter' }).click()
await page.waitForSelector('.modal .kicker', { timeout: 5000 })
await shot('04-study', 400)

// complete the lesson checkpoint → unlocks Ranking Sandbox
await page.getByRole('button', { name: /Complete checkpoint/ }).click()
await page.waitForTimeout(600)
await shot('05-after-lesson', 500)

// open Ranking Sandbox lab via catalog
await page.keyboard.press('KeyC')
await page.waitForSelector('.catalog-list', { timeout: 5000 })
await page.locator('.cat-row', { hasText: 'Ranking Sandbox' }).getByRole('button', { name: 'Enter' }).click()
await page.waitForSelector('.lab-grid', { timeout: 5000 })
await shot('06-lab-empty', 300)

// build a passing slate: two rel-3 then two rel-2 (NDCG@4 = 1.0)
for (const name of ['Live Jazz Session', 'Indie Puzzle Game', 'Espresso Basics', 'City Hiking Trails']) {
  await page.locator('.pool .item', { hasText: name }).click()
  await page.waitForTimeout(150)
}
await shot('07-lab-solved', 400)

// forge the Metric Compass
await page.getByRole('button', { name: /Forge Metric Compass/ }).click()
await page.waitForTimeout(700)
await shot('08-artifact', 600)

// open the quiz via catalog and answer correctly
await page.keyboard.press('KeyC')
await page.waitForSelector('.catalog-list', { timeout: 5000 })
await page.locator('.cat-row', { hasText: 'Quiz' }).getByRole('button', { name: 'Enter' }).click()
await page.waitForSelector('.q', { timeout: 5000 })
for (const opt of ['It increases', 'Recall@k', 'Coverage / diversity']) {
  await page.getByRole('button', { name: opt, exact: true }).click()
  await page.waitForTimeout(120)
}
await shot('09-quiz', 400)

// light the bridge
await page.getByRole('button', { name: /Light the bridge/ }).click()
await page.waitForTimeout(800)
await shot('10-bridge-lit', 700)

console.log('\nerrors:', errors.length)
errors.slice(0, 12).forEach((e) => console.log('  !', e))
console.log('shots:', shots.length)
await browser.close()
process.exit(0)
