// Actual entry/configuration scripts with synthetic SDK/DOM boundaries. No hosted request.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const read=file=>fs.readFileSync(file,'utf8'),config=read('shared/config.js'),bootstrap=read('shared/bootstrap.js');
test('main entry pins the official SDK and loads the enabled cutover candidate before bootstrap',()=>{
 const html=read('index.html');assert.match(html,/@supabase\/supabase-js@2\.119\.0/);assert.equal((html.match(/@supabase\/supabase-js@/g)||[]).length,1);
 assert.ok(html.indexOf('shared/auth-dedicated-config.js')<html.indexOf('shared/bootstrap.js'));const window={};vm.runInNewContext(read('shared/auth-dedicated-config.js'),{window});assert.equal(window.TAXIQAID_DEDICATED_AUTH.enabled,true);assert.equal(window.TAXIQAID_DEDICATED_AUTH.sessionStorageMode,'memory');assert.equal(Object.isFrozen(window.TAXIQAID_DEDICATED_AUTH),true);
});
test('only boolean true selects the dedicated project, memory options and controller',()=>{
 for(const settings of [undefined,null,{}, {enabled:false},{enabled:'true'},{enabled:1},{enabled:true}]){
  const dedicated=settings?.enabled===true,window={TAXIQAID_DEDICATED_AUTH:settings&&{url:'https://dedicated.example.invalid',publicKey:'synthetic-key',...settings}},calls=[];
  const client=vm.runInNewContext(config+'\nsupabaseClient;',{window,supabase:{createClient:(...args)=>{calls.push(args);return {synthetic:true};}}});assert.ok(client.synthetic);
  assert.equal(calls[0][0],dedicated?'https://dedicated.example.invalid':'https://gycijhgmmaznvcoxphlh.supabase.co');assert.equal(calls[0][1],dedicated?'synthetic-key':'sb_publishable_HzPfzuV-3Z-6aCuvGWcBHQ_R5gF7F7T');
  if(dedicated){assert.equal(calls[0][2].auth.persistSession,false);assert.equal(calls[0][2].auth.autoRefreshToken,true);assert.equal(calls[0][2].auth.detectSessionInUrl,false);}else assert.equal(calls[0][2],undefined);
  const scripts=vm.runInNewContext(bootstrap.slice(0,bootstrap.indexOf('async function getFragment'))+'\nSCRIPT_ORDER;',{window});assert.ok(scripts.includes(dedicated?'modules/login/login-dedicated.js':'modules/login/login.js'));assert.equal(scripts.includes(dedicated?'modules/login/login.js':'modules/login/login-dedicated.js'),false);
 }
 // An enabled incomplete configuration must not fall back to the legacy project.
 assert.throws(()=>vm.runInNewContext(config,{window:{TAXIQAID_DEDICATED_AUTH:{enabled:true}},supabase:{createClient:url=>{assert.equal(url,undefined);throw new Error('Missing dedicated project.');}}}),/Missing dedicated project/);
});
test('inactive dedicated controller performs no DOM, client, session or event initialization',()=>{
 for(const settings of [undefined,{}, {enabled:false},{enabled:'true'},{enabled:1}]){
  const result=vm.runInNewContext(read('modules/login/login-dedicated.js')+'\nTaxiQaidDedicatedLogin;',{window:{TAXIQAID_DEDICATED_AUTH:settings}});assert.equal(result.active,false);assert.equal(result.auth,undefined);
 }
});
test('incomplete enabled main entry fails before loading or revealing an unwired credential form',async()=>{
 let requests=0,alert=false;const workspace={hidden:true},status={setAttribute:(name,value)=>{if(name==='role'&&value==='alert')alert=true;}};
 vm.runInNewContext(bootstrap,{window:{supabase:{createClient(){}},TAXIQAID_DEDICATED_AUTH:{enabled:true,url:'https://dedicated.example.invalid',publicKey:'synthetic',brokerUrl:null}},document:{getElementById:id=>id==='workspace'?workspace:status},fetch:()=>{requests++;throw new Error('Must not load a form.');},URL,console:{error(){}}});
 await new Promise(resolve=>setImmediate(resolve));assert.equal(requests,0);assert.equal(workspace.hidden,true);assert.equal(alert,true);
});
test('existing action authorization follows the same explicit activation gate',async()=>{
 for(const enabled of [false,'true',true]){
  let native=0,dedicated=0;const context=vm.createContext({window:{TAXIQAID_DEDICATED_AUTH:{enabled}},TaxiQaidDedicatedLogin:{auth:{refresh:async()=>{dedicated++;return {uid:'synthetic-uid',fullName:'Synthetic Name'};}}},supabaseClient:{auth:{getUser:async()=>{native++;return {data:{user:{id:'synthetic-uid'}},error:null};}},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:{role:'Administrator'},error:null})})})})}});
  vm.runInContext(read('shared/write-guard.js'),context);assert.equal((await vm.runInContext('requireAuthorizedUser()',context)).id,'synthetic-uid');assert.equal(native,enabled===true?0:1);assert.equal(dedicated,enabled===true?1:0);
 }
});
