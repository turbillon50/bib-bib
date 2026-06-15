import { chromium } from "playwright";
const BASE = process.env.CRAWL_BASE;
const b = await chromium.launch();
const seeds = ["/","/app","/driver","/admin","/admin/rides","/admin/drivers","/admin/users","/admin/invitations","/admin/support","/admin/branding","/app/history","/app/offers","/app/schedule","/app/trip","/app/profile","/driver/earnings","/driver/profile","/driver/trip","/driver/subscription"];
const results = {};
const dead = [];
for (const vp of [[390,844],[1440,900]]) {
  const ctx = await b.newContext({viewport:{width:vp[0],height:vp[1]}});
  await ctx.addCookies([{name:"rideme_demo",value:"1",url:BASE}]);
  const p = await ctx.newPage();
  // gather all internal links by visiting seeds
  const links = new Set(seeds);
  for (const s of seeds) {
    try {
      const r = await p.goto(BASE+s,{waitUntil:"domcontentloaded",timeout:25000});
      const st = r?r.status():0;
      results[`${vp[0]}|${s}`]=st;
      if (st>=400) dead.push(`${vp[0]} ${s} -> ${st}`);
      const hrefs = await p.$$eval("a[href]", as=>as.map(a=>a.getAttribute("href")));
      hrefs.filter(h=>h&&h.startsWith("/")&&!h.startsWith("//")).forEach(h=>links.add(h.split("#")[0]));
    } catch(e){ dead.push(`${vp[0]} ${s} -> NAV_ERR`); }
  }
  // visit every discovered link once at this viewport
  for (const l of links) {
    if (results[`${vp[0]}|${l}`]!=null) continue;
    try {
      const r = await p.goto(BASE+l,{waitUntil:"domcontentloaded",timeout:25000});
      const st = r?r.status():0;
      results[`${vp[0]}|${l}`]=st;
      if (st>=400) dead.push(`${vp[0]} ${l} -> ${st}`);
    } catch(e){ dead.push(`${vp[0]} ${l} -> NAV_ERR`); }
  }
  await ctx.close();
}
await b.close();
const all = Object.entries(results);
console.log("TOTAL_CHECKS="+all.length);
console.log("DEAD="+dead.length);
dead.forEach(d=>console.log("  X "+d));
console.log("OK_ROUTES="+all.filter(([k,v])=>v>=200&&v<400).length);
process.exit(dead.length>0?1:0);
