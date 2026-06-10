import { chromium } from "playwright";
const BASE = process.env.QA_BASE || "http://localhost:3010";
const routes = ["/","/app","/driver","/admin","/admin/support","/admin/branding"];
const sizes = [[390,844],[768,1024],[1440,900]];
const out = process.env.QA_OUT || "/home/folletos";
import fs from "fs"; fs.mkdirSync(out,{recursive:true});
const b = await chromium.launch();
let bad=0;
for (const [w,h] of sizes){
  const ctx = await b.newContext({viewport:{width:w,height:h}});
  // set demo cookie
  await ctx.addCookies([{name:"rideme_demo",value:"1",url:BASE}]);
  const p = await ctx.newPage();
  const broken=[];
  p.on("response", r=>{ if(r.request().resourceType()==="image" && r.status()>=400) broken.push(r.url()); });
  for (const route of routes){
    const resp = await p.goto(BASE+route,{waitUntil:"networkidle",timeout:30000}).catch(e=>null);
    const st = resp? resp.status() : "ERR";
    const sh = await p.evaluate(()=>document.body.scrollHeight);
    const name = route.replace(/\//g,"_")||"_root";
    await p.screenshot({path:`${out}/rideme_${w}${name}.png`,fullPage:true}).catch(()=>{});
    if(st!==200 && st!==401){bad++;}
    console.log(`${w}x${h} ${route} -> ${st} scrollH=${sh} brokenImgs=${broken.length}`);
  }
  await ctx.close();
}
await b.close();
console.log("BAD="+bad);
process.exit(bad>0?1:0);
