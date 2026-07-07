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

async function shot(name,opts){
  const {w=1280,h=720,dsf=1.5,drive=[],settle=2400,wait=3600,isMobile=false,thr=6000,view='',lesson=false,band=[0.25,0.25,0.5,0.5]}=opts
  const url=`http://127.0.0.1:4173/?capture=1${view?'&'+view:''}`
  for(let a=1;a<=8;a++){
    const ctx=await b.newContext({viewport:{width:w,height:h},deviceScaleFactor:dsf,isMobile,hasTouch:isMobile,userAgent:isMobile?'iPhone':undefined})
    const p=await ctx.newPage()
    await p.goto(url,{waitUntil:'load',timeout:60000})
    await p.waitForSelector('canvas'); await p.waitForTimeout(wait)
    if(lesson){
      await p.getByRole('button',{name:'Catalog'}).click()
      await p.locator('.cat-row',{hasText:'Week 01'}).getByRole('button',{name:'Enter'}).click()
      await p.waitForSelector('.study-cinematic',{timeout:5000}); await p.waitForTimeout(3400)
    }
    for(const [key,ms] of drive){ await p.keyboard.down(key); await p.waitForTimeout(ms); await p.keyboard.up(key); await p.waitForTimeout(120) }
    if(drive.length) await p.waitForTimeout(settle)
    const tmp=`/tmp/g_${name}_${a}.png`; await p.screenshot({path:tmp})
    const n=await bright(tmp,...band)
    console.log(`${name} #${a}: bright=${n}`)
    await ctx.close()
    if(n>thr){ fs.copyFileSync(tmp,`renders/${name}.png`); console.log('  GOOD ->',name); return true }
  }
  fs.copyFileSync(`/tmp/g_${name}_1.png`,`renders/${name}.png`); console.log('  FALLBACK ->',name); return false
}

const jobs={
  // drive into the camp/plaza so the character + stations are framed
  camp:      ()=>shot('camp',{drive:[['w',1500]],thr:7000}),
  // west toward the crystal shrine + hero tree
  west:      ()=>shot('west',{drive:[['a',1500],['w',600]],thr:7000}),
  // east toward the rune arch + pavilion
  east:      ()=>shot('east',{drive:[['d',1700]],thr:7000}),
  // run north-east across the plaza
  plaza:     ()=>shot('plaza',{drive:[['shift',50],['w',900],['d',700]],thr:7000}),
  // hero character, hand-framed showcase
  character: ()=>shot('character',{view:'view=character&anim=idle',thr:2500,band:[0.3,0.2,0.4,0.6]}),
  charwalk:  ()=>shot('charwalk',{view:'view=character&anim=walk',thr:2500,band:[0.3,0.2,0.4,0.6]}),
  // close 3/4 inspect of the character in-world
  inspect:   ()=>shot('inspect',{view:'inspect=1',thr:4000,band:[0.25,0.2,0.5,0.6]}),
  // lesson cinematic (with bloom)
  lesson:    ()=>shot('lesson',{lesson:true,thr:3500,band:[0.0,0.15,0.55,0.6]}),
  // phone portrait
  mobile:    ()=>shot('mobile',{w:430,h:820,dsf:2,isMobile:true,drive:[['w',1200]],thr:4000,band:[0.15,0.3,0.7,0.45]}),
}
const only=process.argv.slice(2)
const run=only.length?only:Object.keys(jobs)
for(const k of run){ if(jobs[k]) await jobs[k]() }
await b.close()
