import { chromium } from 'playwright-core'
import fs from 'fs'
process.env.LD_LIBRARY_PATH='/tmp/chromelibs/root/usr/lib/x86_64-linux-gnu:'+(process.env.LD_LIBRARY_PATH||'')
const EXE=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell'
const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage']})

// 1) world player feet — low showcase angle
{
  const ctx=await b.newContext({viewport:{width:1100,height:900},deviceScaleFactor:1.5})
  const p=await ctx.newPage()
  await p.goto('http://127.0.0.1:4173/?capture=1&nofx=1&showcase=1&px=-3&py=0.9&pz=2&cx=-3&cy=1.15&cz=6.2&lx=-3&ly=0.45&lz=2&fov=38',{waitUntil:'load',timeout:60000})
  await p.waitForSelector('canvas'); await p.waitForTimeout(4200)
  await p.screenshot({path:'renders/feet_check.png'}); console.log('feet_check saved')
  await ctx.close()
}
// 2) lesson gesture on page 3 (present/lean-in) — click Next 3x, snap mid-gesture
{
  const ctx=await b.newContext({viewport:{width:1600,height:820},deviceScaleFactor:1.25})
  const p=await ctx.newPage()
  await p.goto('http://127.0.0.1:4173/?capture=1&nofx=1',{waitUntil:'load',timeout:60000})
  await p.waitForSelector('canvas'); await p.waitForTimeout(3000)
  await p.getByRole('button',{name:'Catalog'}).click()
  await p.locator('.cat-row',{hasText:'Week 01'}).getByRole('button',{name:'Enter'}).click()
  await p.waitForSelector('.study-cinematic',{timeout:5000}); await p.waitForTimeout(2600)
  const next=p.getByRole('button',{name:/Next/})
  await next.click(); await p.waitForTimeout(700)
  await next.click(); await p.waitForTimeout(700)
  await next.click(); await p.waitForTimeout(350)   // page 3 → snap ~0.35s into the gesture burst
  await p.screenshot({path:'renders/gesture_p3.png'}); console.log('gesture_p3 saved')
  await ctx.close()
}
await b.close()
