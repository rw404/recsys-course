import { chromium } from 'playwright-core'
process.env.LD_LIBRARY_PATH='/tmp/chromelibs/root/usr/lib/x86_64-linux-gnu:'+(process.env.LD_LIBRARY_PATH||'')
const EXE=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell'
// list of "tag=extra-query" pairs
const CONFIGS = JSON.parse(process.env.CONFIGS)
const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage']})
for (const {tag, q} of CONFIGS){
  const ctx=await b.newContext({viewport:{width:1600,height:820},deviceScaleFactor:1.25})
  const p=await ctx.newPage()
  await p.goto('http://127.0.0.1:4173/?capture=1&nofx=1&lsnap=1&'+q,{waitUntil:'load',timeout:60000})
  await p.waitForSelector('canvas'); await p.waitForTimeout(2400)
  await p.getByRole('button',{name:'Catalog'}).click()
  await p.locator('.cat-row',{hasText:'Week 01'}).getByRole('button',{name:'Enter'}).click()
  await p.waitForSelector('.study-cinematic',{timeout:5000}); await p.waitForTimeout(2200)
  await p.screenshot({path:`renders/sw_${tag}.png`}); console.log(tag)
  await ctx.close()
}
await b.close()
