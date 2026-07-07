import { chromium } from 'playwright-core'
process.env.LD_LIBRARY_PATH='/tmp/chromelibs/root/usr/lib/x86_64-linux-gnu:'+(process.env.LD_LIBRARY_PATH||'')
const EXE=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell'
const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage']})
const ctx=await b.newContext({viewport:{width:1600,height:900},deviceScaleFactor:1})
const p=await ctx.newPage()
const errs=[]; p.on('pageerror',e=>errs.push('PAGEERR '+e.message))
// spawn just in front of Astra (node at 3.0,0,1.4); no lsnap -> normal explore follow-cam
await p.goto('http://127.0.0.1:4173/?capture=1&nofx=1&px=3.0&py=0.9&pz=4.2',{waitUntil:'load',timeout:60000})
await p.waitForSelector('canvas'); await p.waitForTimeout(3000)
await p.screenshot({path:'renders/explore_astra.png'}); console.log('explore_astra')
// nudge forward (W) to enter the interaction radius, then press E to open the lesson from the world
await p.keyboard.down('KeyW'); await p.waitForTimeout(700); await p.keyboard.up('KeyW')
await p.waitForTimeout(600)
await p.screenshot({path:'renders/explore_nearby.png'}); console.log('explore_nearby')
await p.keyboard.press('KeyE'); await p.waitForTimeout(1500)
const opened = await p.locator('.study-cinematic').count()
await p.screenshot({path:'renders/explore_after_E.png'}); console.log('explore_after_E, study open =', opened)
console.log('errors:', errs.slice(0,6))
await b.close()
