// Real SQL semantics in the disposable PostgreSQL fixture. No benchmark or provider-capacity claim.
const assert=require('node:assert/strict'),{load}=require('../scripts/lib/public-login-policy.cjs');
module.exports=function capacityFixture({sql,runtime,hash,lit}){
 const policy=load(),{global:{attempts:globalLimit},ip:{attempts:ipLimit},identifier:{attempts:identifierLimit}}=policy;
 const counter=key=>JSON.parse(sql('SELECT coalesce(json_agg(json_build_object(\'window\',window_start,\'attempts\',attempts) ORDER BY window_start),\'[]\') FROM taxiqaid_private.login_attempt_counters WHERE bucket='+lit(hash(key))+';'));
 const query=(group,n,ip,identifier)=>`SELECT allowed FROM taxiqaid_auth_api.begin_signed_login_attempt('unknownfixture',${lit(hash(group+'-ip-'+ip))},${lit(hash(group+'-account-'+identifier))},${lit(hash(group+'-global'))},${lit(hash(group+'-nonce-'+n))},floor(extract(epoch FROM clock_timestamp()))::bigint);`;
 // Rerun with isolated synthetic keys if the real fixed-window clock rolls during a batch.
 function batch(label,count,choose,inspect){for(let trial=0;trial<4;trial++){
  const group='capacity-'+label+'-'+trial,queries=Array.from({length:count},(_,n)=>query(group,n,...choose(n))),results=runtime(queries.join('\n')).split('\n');
  if(counter(group+'-global').length!==1)continue;
  inspect(group,results);return;
 }throw new Error('Capacity fixture repeatedly crossed a real clock boundary.');}
 batch('shared-nat',ipLimit+1,n=>['office',n],(group,results)=>{
  assert.deepEqual(results,[...Array(ipLimit).fill('t'),'f']);
  assert.equal(counter(group+'-global')[0].attempts,ipLimit+1);
  assert.equal(counter(group+'-ip-office')[0].attempts,ipLimit+1);
  assert.deepEqual(counter(group+'-account-'+ipLimit),[],'IP denial precedes identifier consumption and lookup');
 });
 batch('distributed-identifier',identifierLimit+1,n=>[n,'victim'],(group,results)=>{
  assert.deepEqual(results,[...Array(identifierLimit).fill('t'),'f']);assert.equal(counter(group+'-account-victim')[0].attempts,identifierLimit+1);
 });
 batch('global-exhaustion',globalLimit+2,n=>[n===globalLimit+1?'victim':'attacker',n],(group,results)=>{
  assert.deepEqual(results,[...Array(ipLimit).fill('t'),...Array(globalLimit+2-ipLimit).fill('f')]);
  assert.equal(counter(group+'-global')[0].attempts,globalLimit+1,'Saturating count does not reopen budget');
  assert.deepEqual(counter(group+'-ip-victim'),[],'One IP can spend global budget even after its own denial; victim cannot proceed');
 });
 // A successful mapped account and unknown/disabled accounts all spend the same committed budget.
 const group='capacity-outcomes';
 const outcomes=['dohanyan','unknownfixture','disabledfixture'];
 const results=runtime(outcomes.map((identifier,n)=>query(group,n,n,n).replace("'unknownfixture'",lit(identifier)).replace('SELECT allowed','SELECT allowed::text||\':\'||(uid IS NULL)::text')).join('\n')).split('\n');
 assert.deepEqual(results,['true:false','true:true','true:true']);
 assert.equal(counter(group+'-global').reduce((total,row)=>total+row.attempts,0),3);
 for(let n=0;n<3;n++)assert.equal(counter(group+'-account-'+n)[0].attempts,1);
 process.stderr.write('PASS: shared-NAT burst, distributed identifier guessing, global exhaustion through IP denials, saturating counters and mapped/unknown/disabled accounting (SQL fixtures, not load measurements).\n');
};
