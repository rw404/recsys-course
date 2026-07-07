import { chromium } from 'playwright-core'
import sharp from 'sharp'
import fs from 'fs'
process.env.LD_LIBRARY_PATH='/tmp/chromelibs/root/usr/lib/x86_64-linux-gnu:'+(process.env.LD_LIBRARY_PATH||'')
const EXE=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell'
const OUT=process.argv[2]||'renders/lesson2.png'
const PARAMS=process.argv[3]||''
const FX=process.argv[4]==='fx'
const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage']})
async function rb(f){const img=sharp(f);const m=await img.metadata();const {data,info}=await img.extract({left:Math.floor(m.width*0.52),top:Math.floor(m.height*0.2),width:Math.floor(m.width*0.46),height:Math.floor(m.height*0.7)}).raw().toBuffer({resolveWithObject:true});let n=0;for(let i=0;i<data.length;i+=info.channels){if(data[i]+data[i+1]+data[i+2]>150)n++}return n}
let ok=false
for(let a=1;a<=10&&!ok;a++){
  const ctx=await b.newContext({viewport:{width:1600,height:820},deviceScaleFactor:1.25})
  const p=await ctx.newPage()
  const url=`http://127.0.0.1:4173/?capture=1${FX?'':'&nofx=1'}${PARAMS?'&'+PARAMS:''}`
  await p.goto(url,{waitUntil:'load',timeout:60000})
  await p.waitForSelector('canvas'); await p.waitForTimeout(3200)
  await p.getByRole('button',{name:'Catalog'}).click()
  await p.locator('.cat-row',{hasText:'Week 01'}).getByRole('button',{name:'Enter'}).click()
  await p.waitForSelector('.study-cinematic',{timeout:5000}); await p.waitForTimeout(3200)
  const tmp=`/tmp/l2_${a}.png`; await p.screenshot({path:tmp})
  const n=await rb(tmp); console.log(`#${a}: rightBright=${n}`)
  await ctx.close()
  if(n>4000){ fs.copyFileSync(tmp,OUT); ok=true; console.log('GOOD ->',OUT) }
}
if(!ok){ fs.copyFileSync('/tmp/l2_1.png',OUT); console.log('fallback ->',OUT) }
await b.close()
