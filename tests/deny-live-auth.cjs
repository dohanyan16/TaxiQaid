// Offline preload. Page-level fixtures may fulfill simulated Auth; no unmocked external request is sent.
const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),launch=chromium.launch.bind(chromium),root=path.resolve(__dirname,'..');
const snippet=fs.readFileSync(path.join(root,'scripts/_broker_smoke/dashboard-snippet.js'),'utf8'),begin='// BEGIN PUBLIC SUPABASE SDK\n',finish='\n// END PUBLIC SUPABASE SDK',start=snippet.indexOf(begin),end=snippet.indexOf(finish),sdk=snippet.slice(start+begin.length,end);
if(start<0||end<0||crypto.createHash('sha256').update(sdk).digest('hex')!=='a867edbcfb029370aeec7223dd6180b560b621fbe3bc64c6584fb0369d1b7bce')throw new Error('Offline pinned SDK integrity check failed.');
async function isolate(context){await context.route('**/*',route=>{
 const url=new URL(route.request().url());
 if(['http:','https:'].includes(url.protocol)&&['127.0.0.1','localhost','[::1]'].includes(url.hostname))return route.continue();
 if(url.href==='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.119.0')return route.fulfill({contentType:'text/javascript',body:sdk});
 if(url.href==='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js')return route.fulfill({contentType:'text/javascript',body:fs.readFileSync(path.join(root,'assets/vendor/roster/xlsx.full.min.js'),'utf8')});
 if(url.href==='https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js')return route.fulfill({contentType:'text/javascript',body:'/* Operational HTML export is unavailable in offline frontend tests. */'});
 return route.abort('blockedbyclient');
});}
chromium.launch=async options=>{
 const browser=await launch(options),newContext=browser.newContext.bind(browser);
 browser.newContext=async settings=>{const context=await newContext(settings);await isolate(context);return context;};
 const newPage=browser.newPage.bind(browser);
 browser.newPage=async settings=>{const page=await newPage(settings);await isolate(page.context());return page;};
 return browser;
};
