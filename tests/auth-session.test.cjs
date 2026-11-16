// Session state-machine regressions with synthetic SDK transport. No hosted Auth or real credentials.
const {test}=require('node:test'),assert=require('node:assert/strict'),factory=require('../shared/auth-client.js'),catalog=require('../shared/permission-catalog.js');
const brokerUrl='https://review.example.workers.dev/login-with-identifier',uid='synthetic-session-uid',tick=()=>new Promise(resolve=>setImmediate(resolve));
const payload=(lease=60000)=>({version:1,uid,account:{uid,type:'management',status:'active',username:'syntheticmaster',fullName:'Synthetic Master',role:'super_admin'},departments:['it'],permissions:{roleDefaults:catalog.ALL.filter(p=>p.audience!=='Driver').map(p=>p.key),overrides:{}},validUntil:Date.now()+lease});
function fixture({logout='success',fetcher,lease=60000,accountType=null}={}){
 let session=null,listener,signouts=0,installs=0,subscriptions=0,accesses=0,clears=0,stops=0,starts=0;
 const client={auth:{getSession:async()=>({data:{session},error:null}),getUser:async()=>({data:{user:{id:uid}},error:null}),setSession:async tokens=>{installs++;session={...tokens,expires_at:Date.now()/1000+3600};listener?.('SIGNED_IN',{user:{id:uid}});return {error:null};},signOut:async()=>{signouts++;if(!session)return {error:null};if(logout==='throw')throw new Error('SYNTHETIC_PRIVATE_PROVIDER_ERROR');session=null;listener?.('SIGNED_OUT',null);return {error:logout==='error'?{message:'SYNTHETIC_PRIVATE_PROVIDER_ERROR'}:null};},stopAutoRefresh:async()=>{stops++;},startAutoRefresh:async()=>{starts++;},onAuthStateChange:callback=>{subscriptions++;listener=callback;return {data:{subscription:{unsubscribe(){listener=null;}}}};}}};
 const cleanup=[],auth=factory.create({client,url:'https://project.example.invalid',key:'public',brokerUrl,enabled:true,accountType,onClear:()=>clears++,onCleanup:state=>cleanup.push(state),onAccess:()=>accesses++,fetcher:fetcher||(async url=>Response.json(url===brokerUrl?{access_token:'SYNTHETIC_ACCESS',refresh_token:'SYNTHETIC_REFRESH'}:payload(lease)))});
 return {auth,client,cleanup,emit:(event,subject=uid)=>listener?.(event,{user:{id:subject}}),rotate:()=>{session={...session,access_token:'SYNTHETIC_ROTATED'};listener?.('TOKEN_REFRESHED',{user:{id:uid}});},state:()=>({session,signouts,installs,subscriptions,accesses,clears,stops,starts})};
}
test('enabled dedicated login requires a signed Worker; no direct-origin fallback exists',()=>{assert.throws(()=>factory.create({client:{auth:{}},url:'https://project.invalid',key:'public',enabled:true}),/signed authentication gateway/);});
test('returned signOut error is retained across repeated cleanup; late SDK events cannot unlock UI',async()=>{
 const f=fixture({logout:'error'});try{await f.auth.start();await f.auth.login('syntheticmaster','fixture');const before=f.state().accesses,result=await f.auth.logout();assert.deepEqual(result,{localCleared:true,remoteRevoked:false});const calls=f.state().signouts;await f.auth.logout();assert.equal(f.state().signouts,calls);assert.equal(f.auth.getCleanupState().remoteRevoked,false);f.emit('TOKEN_REFRESHED');f.emit('SIGNED_IN');await tick();assert.equal(f.auth.getContext(),null);assert.equal(f.state().accesses,before);assert.equal(JSON.stringify(f.cleanup).includes('PRIVATE'),false);}finally{f.auth.destroy();}
});
test('thrown cleanup with retained SDK state locks new admission instead of claiming local sign-out',async()=>{
 const f=fixture({logout:'throw'});try{await f.auth.login('syntheticmaster','fixture');assert.deepEqual(await f.auth.logout(),{localCleared:false,remoteRevoked:false});await assert.rejects(f.auth.login('syntheticmaster','fixture'),/cleanup could not be confirmed/);assert.equal(f.state().installs,1);assert.equal(f.auth.getContext(),null);}finally{f.auth.destroy();}
});
test('logout while broker is pending retires a late issued session and never grants access',async()=>{
 let finish;const f=fixture({fetcher:url=>url===brokerUrl?new Promise(resolve=>finish=resolve):Promise.resolve(Response.json(payload()))});
 try{const login=f.auth.login('syntheticmaster','fixture');await tick();assert.equal((await f.auth.logout()).remoteRevoked,false);finish(Response.json({access_token:'SYNTHETIC_LATE_ACCESS',refresh_token:'SYNTHETIC_LATE_REFRESH'}));await assert.rejects(login);assert.equal(f.state().accesses,0);assert.equal(f.state().installs,1);assert.equal(f.state().session,null);assert.deepEqual(f.auth.getCleanupState(),{localCleared:true,remoteRevoked:true});}finally{f.auth.destroy();}
});
test('an old access response after logout cannot overwrite or revoke a newer valid session',async()=>{
 let finish,hold=false;const f=fixture({fetcher:url=>Promise.resolve(url===brokerUrl?Response.json({access_token:'SYNTHETIC_ACCESS',refresh_token:'SYNTHETIC_REFRESH'}):hold?(hold=false,new Promise(resolve=>finish=resolve)):Response.json(payload()))});
 try{await f.auth.login('syntheticmaster','fixture');hold=true;const old=f.auth.refresh();await tick();await f.auth.logout();await f.auth.login('syntheticmaster','fixture');const signouts=f.state().signouts;finish(Response.json(payload()));await assert.rejects(old);assert.ok(f.auth.getContext());assert.equal(f.state().signouts,signouts);}finally{f.auth.destroy();}
});
test('access lease expires the rendered authority even while a revalidation response is pending',async()=>{
 let hold=false,finish;const f=fixture({fetcher:url=>url===brokerUrl?Promise.resolve(Response.json({access_token:'SYNTHETIC_ACCESS',refresh_token:'SYNTHETIC_REFRESH'})):hold?new Promise(resolve=>finish=resolve):Promise.resolve(Response.json(payload(100)))});
 try{await f.auth.login('syntheticmaster','fixture');hold=true;const pending=f.auth.refresh();await tick();await new Promise(resolve=>setTimeout(resolve,160));assert.equal(f.auth.getContext(),null);assert.equal(f.state().session,null);finish(Response.json(payload()));await assert.rejects(pending);assert.equal(f.state().accesses,1);}finally{f.auth.destroy();}
});
test('verified token refresh revalidates access; startup is idempotent and logout blocks further refresh',async()=>{
 const f=fixture();try{await f.auth.start();await f.auth.start();assert.equal(f.state().subscriptions,1);await f.auth.login('syntheticmaster','fixture');f.rotate();await tick();await tick();assert.equal(f.state().accesses,2);assert.equal(f.auth.getContext().roleDefaults.length,101);await f.auth.logout();const calls=f.state().accesses;f.rotate();await tick();assert.equal(f.state().accesses,calls);await assert.rejects(f.auth.refresh(),/No active authorized session/);}finally{f.auth.destroy();}
});
test('broker network uncertainty is reported without leaking the transport exception',async()=>{
 const f=fixture({fetcher:async()=>{throw new Error('SYNTHETIC_PRIVATE_URL_AND_PASSWORD');}});try{await assert.rejects(f.auth.login('syntheticmaster','fixture'),error=>/Unable to sign in/.test(error.message)&&!error.message.includes('PRIVATE'));assert.deepEqual(f.auth.getCleanupState(),{localCleared:true,remoteRevoked:false});assert.equal(f.state().installs,0);}finally{f.auth.destroy();}
});
test('a malformed successful broker response cannot be reported as confirmed session cleanup',async()=>{
 const f=fixture({fetcher:async()=>Response.json(null)});try{await assert.rejects(f.auth.login('syntheticmaster','fixture'),/Unable to sign in/);assert.equal(f.auth.getCleanupState().remoteRevoked,false);assert.equal(f.state().installs,0);}finally{f.auth.destroy();}
});
test('a restored authorized session owns cleanup and cannot be silently replaced by another login',async()=>{
 const f=fixture();try{await f.client.auth.setSession({access_token:'SYNTHETIC_RESTORED',refresh_token:'SYNTHETIC_REFRESH'});await f.auth.start();assert.equal(f.auth.getCleanupState().localCleared,false);await assert.rejects(f.auth.login('syntheticmaster','fixture'));assert.equal(f.state().installs,1);assert.ok(f.auth.getContext());assert.deepEqual(await f.auth.logout(),{localCleared:true,remoteRevoked:true});}finally{f.auth.destroy();}
});

test('Driver entry rejects a real-shaped Management access response before publishing authority',async()=>{const f=fixture({accountType:'Driver'});try{await assert.rejects(f.auth.login('syntheticmaster','fixture'));assert.equal(f.state().accesses,0);assert.equal(f.state().session,null);assert.equal(f.auth.getContext(),null);}finally{f.auth.destroy();}});
