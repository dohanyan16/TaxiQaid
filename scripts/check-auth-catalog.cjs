/** Read-only inventory verification. Exporting definitions never grants a role or changes a database. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const catalog=require('../shared/permission-catalog.js');
const file=path.join(__dirname,'../supabase/baseline/permission-definitions.json');
const definitions=catalog.ALL.map(({key,module,audience,requires})=>({key,module,audience,requires}));
if(process.argv.includes('--export'))fs.writeFileSync(file,JSON.stringify({version:1,definitions},null,2)+'\n');
else {assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')).definitions,definitions);assert.equal(definitions.length,107);assert.equal(definitions.filter(p=>p.audience==='Driver').length,6);console.log('PASS: 107 unchanged permission definitions; six driver-only actions. No database writes.');}
