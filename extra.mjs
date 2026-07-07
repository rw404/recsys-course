import { chromium } from 'playwright-core'
import sharp from 'sharp'
import fs from 'fs'
process.env.LD_LIBRARY_PATH='/tmp/chromelibs/root/usr/lib/x86_64-linux-gnu:'+(process.env.LD_LIBRARY_PATH||'')
const EXE=process.env.HOME+'/.cache/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-linux64/chrome-headless-shell'
const b=await chromium.launch({executablePath:EXE,args:['--no-sandbox','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader','--ignore-gpu-blocklist','--disable-dev-shm-usage']})
async function bright(file,l,t,w,h){
  const img=sharp(file); const m=await img.metadata()
  const {data,info}=await img.extract({left:Math.floor(m.width*l),top:Math.floor(m.height*t),width:Math.floor(m.width*w),height:Math.floor(m.height*h)}).raw().toBuffer({resolveWithObject:true})
  let n=0; for(let i=0;i<data.length;i+=info.channels){if(data[i]+data[i+1]+data[i+2]>150)n++}
  return n
}
async function cap(name,url,vp,band,thr){
  let ok=false
  for(let a=1;a<=7&&!ok;a++){
    const ctx=await b.newContext({viewport:vp,deviceScaleFactor:vp.dsf||1.5,isMobile:!!vp.mob,hasTouch:!!vp.mob,userAgent:vp.mob?'iPhone':undefined})
    const p=await ctx.newPage()
    await p.goto(url,{waitUntil:'load',timeout:60000})
    await p.waitForSelector('canvas'); await p.waitForTimeout(4200)
    const tmp=`/tmp/x_${name}_${a}.png`; await p.screenshot({path:tmp})
    const n=await bright(tmp,...band); console.log(`${name} #${a}: bright=${n}`)
    await ctx.close()
    if(n>thr){ fs.copyFileSync(tmp,`renders/${name}.png`); ok=true; console.log('  GOOD',name) }
  }
  if(!ok){ fs.copyFileSync(`/tmp/x_${name}_1.png`,`renders/${name}.png`); console.log('  fallback',name) }
}
// hero character close-up (hand-framed viewer)
await cap('character','http://127.0.0.1:4173/?capture=1&view=character&anim=idle',{width:900,height:1000},[0.3,0.2,0.4,0.6],2500)
// phone portrait — showcase framing widened for vertical
await cap('mobile','http://127.0.0.1:4173/?capture=1&showcase=1&px=-3&py=0.9&pz=2&cx=2&cy=12&cz=23&lx=2&ly=1&lz=-3&fov=60',{width:430,height:860,dsf:2,mob:true},[0.1,0.25,0.8,0.5],9000)
await b.close()
