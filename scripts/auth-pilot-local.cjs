// Loopback-only synthetic frontend context. No credentials, cloud connections or live mode.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),sdkHash='a867edbcfb029370aeec7223dd6180b560b621fbe3bc64c6584fb0369d1b7bce';
function pinnedSdk(){const source=fs.readFileSync(path.join(root,'scripts/_broker_smoke/dashboard-snippet.js'),'utf8'),begin='// BEGIN PUBLIC SUPABASE SDK\n',end='\n// END PUBLIC SUPABASE SDK',start=source.indexOf(begin),finish=source.indexOf(end);if(start<0||finish<0)throw new Error('Pinned SDK markers missing.');const sdk=source.slice(start+begin.length,finish);if(crypto.createHash('sha256').update(sdk).digest('hex')!==sdkHash)throw new Error('Pinned SDK integrity failed.');return sdk;}
async function start({port=0,enabled}={}){
 if(enabled!==undefined&&typeof enabled!=='boolean')throw new Error('Local activation must be an explicit boolean.');
 const sdk=pinnedSdk();let origin;
 const server=http.createServer((request,response)=>{
  const send=(status,body,type='text/plain')=>{response.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'self'; script-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; object-src 'none'; frame-src 'none'; frame-ancestors 'none'; form-action 'self'; base-uri 'none'"});response.end(body);};
  if(request.headers.host!==new URL(origin).host||!['GET','HEAD'].includes(request.method)){send(403,'Local preview request rejected.');return;}
  const target=new URL(request.url,origin);if(target.search){send(403,'Local preview request rejected.');return;}
  const name=target.pathname;
  if(name==='/__pilot__/sdk.js'){send(200,sdk,'text/javascript');return;}
  if(name==='/__pilot__/fixture.js'){send(200,fs.readFileSync(path.join(root,'scripts/_auth_pilot/fixture.js')),'text/javascript');return;}
  if(name==='/__pilot__/catalog.json'){send(200,JSON.stringify(require('../shared/permission-catalog.js').ALL),'application/json');return;}
  if(name==='/'||name==='/index.html'||name==='/auth-migration-preview.html'){
   let html=fs.readFileSync(path.join(root,name==='/auth-migration-preview.html'?'auth-migration-preview.html':'index.html'),'utf8');
   // Only the official pinned SDK is needed for authentication; operational export libraries stay unavailable here.
   html=html.replace(/<script src="https:[^"]+"><\/script>/g,tag=>tag.includes('@supabase/supabase-js@2.119.0')?'<script src="/__pilot__/fixture.js"></script><script src="/__pilot__/sdk.js"></script>':'');
   send(200,html,'text/html');return;
  }
  if(name==='/shared/auth-dedicated-config.js'){
   const source=fs.readFileSync(path.join(root,name.slice(1)),'utf8');if((source.match(/enabled:(?:false|true)/g)||[]).length!==1){send(503,'Authentication configuration changed unexpectedly.');return;}
   send(200,enabled===undefined?source:source.replace(/enabled:(?:false|true)/,'enabled:'+enabled),'text/javascript');return;
  }
  if(!/^\/(?:shared|modules|assets)\/[a-zA-Z0-9_./-]+\.(?:js|mjs|html|css|json|svg|png|jpg|jpeg|webp|woff2?|ttf)$/.test(name)||name.split('/').some(part=>part.startsWith('.'))){send(404,'Not part of the local authentication context.');return;}
  const file=path.resolve(root,name.slice(1));if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){send(404,'Not found.');return;}
  const types={'.js':'text/javascript','.mjs':'text/javascript','.json':'application/json','.html':'text/html','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'};
  send(200,fs.readFileSync(file),types[path.extname(file)]||'application/octet-stream');
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});origin='http://127.0.0.1:'+server.address().port;
 return {origin,close:()=>new Promise(resolve=>server.close(resolve))};
}
module.exports={start};
if(require.main===module)start({port:Number(process.argv[2]||8016)}).then(server=>{console.log('LOCAL SYNTHETIC AUTH ONLY: '+server.origin+'/');const close=()=>server.close().then(()=>process.exit(0));process.once('SIGINT',close);process.once('SIGTERM',close);}).catch(()=>{console.error('Unable to start the loopback-only authentication preview.');process.exitCode=1;});
