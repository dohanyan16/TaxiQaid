// Preload for browser regressions: page-level mocks may fulfill Auth, unmocked requests cannot reach it.
const {chromium}=require('playwright'),launch=chromium.launch.bind(chromium);
chromium.launch=async options=>{
 const browser=await launch(options),newContext=browser.newContext.bind(browser);
 browser.newContext=async settings=>{const context=await newContext(settings);await context.route(/^https:\/\/[^/]+\.(?:supabase\.co|workers\.dev)(?:\/|$)/,route=>route.abort('blockedbyclient'));return context;};
 const newPage=browser.newPage.bind(browser);
 browser.newPage=async settings=>{const page=await newPage(settings);await page.context().route(/^https:\/\/[^/]+\.(?:supabase\.co|workers\.dev)(?:\/|$)/,route=>route.abort('blockedbyclient'));return page;};
 return browser;
};
