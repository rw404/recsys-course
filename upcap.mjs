import { chromium } from 'playwright-core'
process.env.LD_LIBRARY_PATH='/tmp/chromelibs/root/usr/lib/x86_64-linux-gnu:'+(process.env.LD_LIBRARY_PATH||'')
const EXE=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell'
const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage']})
// frame the camp lab + quiz stations (world 01) with the new models
const ctx=await b.newContext({viewport:{width:1200,height:720},deviceScaleFactor:1})
const p=await ctx.newPage()
await p.goto('http://127.0.0.1:4173/?capture=1&nofx=1&showcase=1&cx=6&cy=7&cz=14&lx=9&ly=1&lz=-3&fov=46',{waitUntil:'load',timeout:60000})
await p.waitForSelector('canvas'); await p.waitForTimeout(5000)
await p.screenshot({path:'renders/up_camp.png'}); console.log('camp')
await b.close(); console.log('DONE')
