import { chromium } from 'playwright-core'
import sharp from 'sharp'
import fs from 'fs'
process.env.LD_LIBRARY_PATH='/tmp/chromelibs/root/usr/lib/x86_64-linux-gnu:'+(process.env.LD_LIBRARY_PATH||'')
const EXE=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell'
const OUT=process.argv[2]||'scene.png'
const URL=process.argv[3]||'http://127.0.0.1:4173/?capture=1'
const W=Number(process.argv[4]||900), H=Number(process.argv[5]||430)
const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage']})
async function brightness(file){
  const img=sharp(file); const meta=await img.metadata()
  const top=Math.floor(meta.height*0.30), h=Math.floor(meta.height*0.45)
  const {data,info}=await img.extract({left:0,top,width:meta.width,height:h}).raw().toBuffer({resolveWithObject:true})
  let n=0; for(let i=0;i<data.length;i+=info.channels){const r=data[i],g=data[i+1],bl=data[i+2];if(r>95&&bl>95&&(r+g+bl)>240)n++}
  return n
}
let ok=false
for(let a=1;a<=18&&!ok;a++){
  const ctx=await b.newContext({viewport:{width:W,height:H},deviceScaleFactor:2,isMobile:true,hasTouch:true,userAgent:'iPhone'})
  const p=await ctx.newPage()
  await p.goto(URL,{waitUntil:'load',timeout:60000}); await p.waitForSelector('canvas'); await p.waitForTimeout(9500)
  const tmp=`/tmp/cap_${a}.png`; await p.screenshot({path:tmp})
  const n=await brightness(tmp); console.log(`attempt ${a}: sceneBright=${n}`)
  if(n>8000){ fs.copyFileSync(tmp,OUT); ok=true; console.log('GOOD ->',OUT) }
  await ctx.close()
}
if(!ok) console.log('no good screenshot in 12 tries')
await b.close()
