import { chromium } from 'playwright-core'
import fs from 'fs'
process.env.LD_LIBRARY_PATH='/tmp/chromelibs/root/usr/lib/x86_64-linux-gnu:'+(process.env.LD_LIBRARY_PATH||'')
const EXE=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell'
const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage']})
// snap camera → framing is immediate; sweep player position (and pull camera back a touch)
const CAM='lsnap=1&lcx=7.6&lcy=1.5&lcz=5.0'
const V=[
  ['lpA','lpx=5.6&lpz=0.9'],
  ['lpB','lpx=6.0&lpz=1.4'],
  ['lpC','lpx=5.3&lpz=0.2'],
]
for(const [name,q] of V){
  const ctx=await b.newContext({viewport:{width:1600,height:820},deviceScaleFactor:1.25})
  const p=await ctx.newPage()
  await p.goto(`http://127.0.0.1:4173/?capture=1&nofx=1&${CAM}&${q}`,{waitUntil:'load',timeout:60000})
  await p.waitForSelector('canvas'); await p.waitForTimeout(2600)
  await p.getByRole('button',{name:'Catalog'}).click()
  await p.locator('.cat-row',{hasText:'Week 01'}).getByRole('button',{name:'Enter'}).click()
  await p.waitForSelector('.study-cinematic',{timeout:5000}); await p.waitForTimeout(2200)
  await p.screenshot({path:`renders/${name}.png`}); console.log(name)
  await ctx.close()
}
await b.close()
