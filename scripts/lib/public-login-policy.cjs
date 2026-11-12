// Build-time review input only. Never accept request, environment or database-session overrides.
const fs=require('node:fs'),path=require('node:path');
const file=path.resolve(__dirname,'../../supabase/review/public-login/rate-limit-policy.json');
function exactKeys(value,keys){return value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(',');}
function validate(policy){
 if(!exactKeys(policy,['version','profile','global','ip','identifier'])||policy.version!==1||policy.profile!=='controlled-pilot')throw new Error('Unreviewed public login policy shape or profile.');
 for(const [scope,seconds,ceiling]of [['global',60,20],['ip',60,19],['identifier',900,10]]){
  const value=policy[scope];
  if(!exactKeys(value,['attempts','windowSeconds'])||!Number.isSafeInteger(value.attempts)||value.attempts<1||value.attempts>ceiling||value.windowSeconds!==seconds)throw new Error('Unreviewed public login policy for '+scope+'.');
 }
 if(policy.ip.attempts>=policy.global.attempts)throw new Error('Pilot IP limit must be below global limit for an isolated IP probe.');
 return Object.freeze({...policy,...Object.fromEntries(['global','ip','identifier'].map(scope=>[scope,Object.freeze({...policy[scope]})]))});
}
const load=()=>validate(JSON.parse(fs.readFileSync(file,'utf8')));
const limits=policy=>['global','ip','identifier'].map(scope=>policy[scope].attempts);
const windows=policy=>['global','ip','identifier'].map(scope=>policy[scope].windowSeconds);
module.exports={file,validate,load,limits,windows};
