const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const source=require('../scripts/lib/public-login-policy.cjs'),copy=()=>JSON.parse(fs.readFileSync(source.file,'utf8'));
test('reviewed pilot SQL and browser probe use the same bounded operator policy',()=>{
 const policy=source.load();assert.deepEqual(source.limits(policy),[20,10,10]);assert.deepEqual(source.windows(policy),[60,60,900]);assert.ok(Object.isFrozen(policy.ip));
 const sql=fs.readFileSync(path.resolve(__dirname,'../supabase/review/public-login/00_conservative_limits.sql'),'utf8');
 assert.ok(sql.includes('limits integer[] := ARRAY['+source.limits(policy).join(',')+'];'));
 assert.ok(sql.includes('widths integer[] := ARRAY['+source.windows(policy).join(',')+'];'));
 const probe=fs.readFileSync(path.resolve(__dirname,'../scripts/_public_gateway/provenance-probes.js'),'utf8');assert.ok(probe.includes('const reviewedIpLimit='+policy.ip.attempts+';'));assert.ok(probe.includes('index<=reviewedIpLimit+1'));
});
test('invalid, unbounded and client-shaped policy changes fail before proposal generation',()=>{
 const changes=[p=>p.version=2,p=>p.profile='production',p=>p.global.attempts=21,p=>p.ip.attempts=p.global.attempts,p=>p.identifier.attempts=11,p=>p.global.attempts=0,p=>p.ip.attempts=-1,p=>p.ip.attempts=1.5,p=>p.ip.attempts='10',p=>p.ip.attempts=Infinity,p=>p.identifier.windowSeconds=60,p=>p.ip.windowSeconds=900,p=>p.global.windowSeconds=30,p=>p.request={ip:100},p=>p.ip.header='x-forwarded-for',p=>delete p.ip,p=>p.ip=null,p=>p.ip=[],p=>p.constructor='override'];
 for(const mutate of changes){const value=copy();mutate(value);assert.throws(()=>source.validate(value));}
 const smaller=copy();smaller.global.attempts=12;smaller.ip.attempts=6;smaller.identifier.attempts=5;assert.deepEqual(source.limits(source.validate(smaller)),[12,6,5]);
});
