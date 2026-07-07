import { chromium } from 'playwright-core'
process.env.LD_LIBRARY_PATH='/tmp/chromelibs/root/usr/lib/x86_64-linux-gnu:'+(process.env.LD_LIBRARY_PATH||'')
const EXE=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell'
// Final look: postFX ON (no nofx), no forced gesture -> Astra cycles her real page-0 sequence.
// Snap several frames so we see each natural gesture in the cycle (CYCLE_SEC = 4.5).
const SHOTS = JSON.parse(process.env.SHOTS || '[{"tag":"final_g1","wait":2600},{"tag":"final_g2","wait":7100},{"tag":"final_g3","wait":11600}]')
const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage']})
const ctx=await b.newContext({viewport:{width:1600,height:820},deviceScaleFactor:1.25})
const p=await ctx.newPage()
const EXTRA = process.env.EXTRA ? '&'+process.env.EXTRA : ''
await p.goto('http://127.0.0.1:4173/?capture=1&lsnap=1'+EXTRA,{waitUntil:'load',timeout:60000})
await p.waitForSelector('canvas'); await p.waitForTimeout(2200)
await p.getByRole('button',{name:'Catalog'}).click()
await p.locator('.cat-row',{hasText:'Week 01'}).getByRole('button',{name:'Enter'}).click()
await p.waitForSelector('.study-cinematic',{timeout:5000})
let elapsed=0
for (const {tag,wait} of SHOTS){
  await p.waitForTimeout(Math.max(0,wait-elapsed)); elapsed=wait
  await p.screenshot({path:`renders/${tag}.png`}); console.log(tag)
}
await ctx.close(); await b.close()
