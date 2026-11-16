/** Loopback-only synthetic transport for the REAL frontend/official SDK. Never loaded by production. */
(()=>{
 if(location.protocol!=='http:'||location.hostname!=='127.0.0.1')throw new Error('Local fixture requires loopback.');
 const nativeFetch=window.fetch.bind(window),project='https://mqkflwsvnzcaylxtvsje.supabase.co',legacyProject='https://gycijhgmmaznvcoxphlh.supabase.co',gateway='https://taxiqaid-auth-gateway.dohanyan.workers.dev',uid='00000000-0000-4000-8000-000000000154';
 const password='LOCAL_SYNTHETIC_PASSWORD',username='syntheticmaster',tokens=new Map(),refreshes=new Map();
 let catalog=[],mode='success',leaseMs=60000,serial=0,heldBroker=null,holdBroker=false,heldRefresh=null,holdRefresh=false;
 const counts={broker:0,identity:0,access:0,refresh:0,logout:0,blocked:0,legacyPassword:0,legacyRole:0,legacyIdentity:0,legacyLogout:0},headers={'Cache-Control':'no-store'};
 const json=(body,status=200)=>Response.json(body,{status,headers});
 const jwtPart=value=>btoa(JSON.stringify(value)).replaceAll('=','').replaceAll('+','-').replaceAll('/','_');
 function session(id){
  serial++;const issued=Math.floor(Date.now()/1000),access=jwtPart({alg:'HS256',typ:'JWT'})+'.'+jwtPart({sub:uid,role:'authenticated',aud:'authenticated',aal:'aal1',email:'local-fixture@example.invalid',iat:issued,exp:issued+3600,session_id:id})+'.bG9jYWwtc3ludGhldGlj',refresh='LOCAL_SYNTHETIC_REFRESH_'+serial;
  tokens.set(access,{id,expires:issued+3600});refreshes.set(refresh,{id,revoked:false});return {access_token:access,refresh_token:refresh,token_type:'bearer',expires_in:3600,user:user()};
 }
 function user(){return {id:uid,email:'local-fixture@example.invalid',role:'authenticated',aud:'authenticated',email_confirmed_at:'2026-01-01T00:00:00Z',factors:[]};}
 function fill(){for(const [id,value]of [['username',username],['password',password],['portal-iqama','1000000001'],['portal-password',password]]){const input=document.getElementById(id);if(input){input.readOnly=true;input.value=value;input.autocomplete='off';}}}
 window.TaxiQaidLocalPilot=Object.freeze({snapshot:()=>({mode,counts:{...counts},liveAuthenticationVerified:false}),setMode:value=>{if(!['success','logout-error','access-denied','refresh-error','wrong-user','broker-denied','broker-unavailable','broker-network','permission-deny'].includes(value))throw new Error('Unknown local fixture mode.');mode=value;},setLease:ms=>{if(!Number.isInteger(ms)||ms<50||ms>60000)throw new Error('Invalid local fixture lease.');leaseMs=ms;},fill,holdBroker:()=>{holdBroker=true;},releaseBroker:()=>{holdBroker=false;heldBroker?.();heldBroker=null;},holdRefresh:()=>{holdRefresh=true;},releaseRefresh:()=>{holdRefresh=false;heldRefresh?.();heldRefresh=null;},allRefreshRevoked:()=>[...refreshes.values()].every(row=>row.revoked)});
 window.fetch=async(input,init={})=>{
  const request=input instanceof Request?new Request(input,init):new Request(new URL(input instanceof URL?input.href:input,location.href),init),target=new URL(request.url);
  if(target.origin===location.origin)return nativeFetch(input,init);
  if(![project,legacyProject,gateway].includes(target.origin)){counts.blocked++;throw new Error('Local preview blocks external network requests.');}
  const raw=request.method==='POST'?await request.text():'';const body=raw?JSON.parse(raw):null;
  if(target.origin===gateway&&target.pathname==='/login-with-identifier'&&!target.search&&request.method==='POST'){
   counts.broker++;if(body?.identifier!==username||body?.password!==password||Object.keys(body).sort().join(',')!=='identifier,password')return json({error:'Only the synthetic fixture is accepted.'},401);
   if(mode==='broker-denied'||mode==='broker-unavailable')return json({error:'SYNTHETIC_PRIVATE_PROVIDER_DETAIL'},mode==='broker-denied'?401:503);
   if(mode==='broker-network')throw new Error('SYNTHETIC_PRIVATE_TRANSPORT_DETAIL');
   if(holdBroker)await new Promise(resolve=>heldBroker=resolve);
   return json(session('local-session-'+(serial+1)));
  }
  if(target.origin===legacyProject){
   if(target.pathname==='/auth/v1/token'&&target.searchParams.get('grant_type')==='password'&&request.method==='POST'){
    counts.legacyPassword++;if(body?.email!==username+'@taxiqaiddemand.com'||body?.password!==password)return json({error:'Synthetic legacy credentials rejected.'},400);return json(session('local-legacy-'+(serial+1)));
   }
   const current=tokens.get((request.headers.get('authorization')||'').replace(/^Bearer /,''));if(!current)return json({error:'Synthetic legacy session missing.'},401);
   if(target.pathname==='/rest/v1/taxiqaid_roles'&&request.method==='GET'){counts.legacyRole++;return json([{role:'Administrator'}]);}
   if(target.pathname==='/auth/v1/user'&&request.method==='GET'){counts.legacyIdentity++;return json(user());}
   if(target.pathname==='/auth/v1/logout'&&request.method==='POST'){counts.legacyLogout++;for(const row of refreshes.values())if(row.id===current.id)row.revoked=true;return new Response(null,{status:204,headers});}
   counts.blocked++;throw new Error('Local preview blocks that legacy request.');
  }
  if(target.origin!==project){counts.blocked++;throw new Error('Local preview blocks that request.');}
  if(target.pathname==='/auth/v1/token'&&target.searchParams.get('grant_type')==='refresh_token'&&request.method==='POST'){
   counts.refresh++;if(holdRefresh)await new Promise(resolve=>heldRefresh=resolve);const prior=refreshes.get(body?.refresh_token);if(!prior||prior.revoked||mode==='refresh-error')return json({error:'Synthetic refresh rejected.',error_code:'refresh_token_not_found'},400);prior.revoked=true;return json(session(prior.id));
  }
  const current=tokens.get((request.headers.get('authorization')||'').replace(/^Bearer /,''));
  if(!current||current.expires<=Date.now()/1000)return json({error:'Synthetic session expired.'},401);
  if(target.pathname==='/auth/v1/user'&&request.method==='GET'){counts.identity++;return json(mode==='wrong-user'?{...user(),id:'00000000-0000-4000-8000-000000000155'}:user());}
  if(target.pathname==='/auth/v1/logout'&&request.method==='POST'){
   counts.logout++;if(mode==='logout-error')return json({error:'Synthetic logout unavailable.'},500);
   for(const row of refreshes.values())if(row.id===current.id)row.revoked=true;
   return new Response(null,{status:204,headers});
  }
  if(target.pathname==='/functions/v1/get-my-access'&&request.method==='GET'){
   counts.access++;if(mode==='access-denied')return json({error:'Synthetic access rejected.'},403);
   return json({version:1,uid,account:{uid,type:'management',status:'active',role:'super_admin',username,fullName:'Local Synthetic Master'},departments:['it'],permissions:{roleDefaults:catalog.filter(p=>p.audience!=='Driver').map(p=>p.key),overrides:mode==='permission-deny'?{'fuel.view':'deny','fuel.create':'allow'}:{}},scope:{departments:[],driverRecordRefs:[],documentIds:[]},validUntil:Date.now()+leaseMs});
  }
  counts.blocked++;throw new Error('Local preview blocks that request.');
 };
 const ready=nativeFetch('/__pilot__/catalog.json').then(response=>response.json()).then(value=>catalog=value);
 document.addEventListener('taxiqaid:app-ready',async()=>{
  await ready;const banner=document.createElement('aside');banner.id='local-pilot-banner';banner.setAttribute('role','status');banner.textContent='LOCAL SIMULATION — synthetic Master only; no hosted authentication is verified. ';
  const reset=document.createElement('button');reset.type='button';reset.textContent='Fill synthetic credentials';reset.addEventListener('click',fill);banner.appendChild(reset);document.body.prepend(banner);fill();
 },{once:true});
})();
