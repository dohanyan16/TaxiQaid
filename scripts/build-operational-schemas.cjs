// Public schema contract only. No workbook IDs, credentials, private rows or activation.
const fs=require('node:fs'),contract=JSON.parse(fs.readFileSync('schemas/operational-template-contract.json','utf8'));
const domains=contract.domains,technical=['Record ID','Row Version','Updated At UTC'];
if(Object.keys(domains).length!==14)throw new Error('Exactly 14 domain templates are required');
for(const [key,domain] of Object.entries(domains)){
 if(domain.module!==key||!/^TAXIQAID_[A-Z_]+_SHEET_ID$/.test(domain.secret)||domain.sourceVerified!==false)throw new Error('Invalid domain contract');
 for(const [tab,headers] of Object.entries(domain.tabs)){
  if(!Array.isArray(headers)||headers.length!==new Set(headers).size)throw new Error('Duplicate headers: '+key+'/'+tab);
  if(tab!=='CHANGE_LOG'&&tab!=='CATEGORIES'&&headers.slice(-3).join('|')!==technical.join('|'))throw new Error('Technical header mismatch: '+key+'/'+tab);
 }
}
const output='/** GENERATED from schemas/operational-template-contract.json. Public headers only; never activation authority. */\nconst TaxiQaidOperationalSchemas=(()=>{const freeze=value=>{if(value&&typeof value===\'object\'){Object.values(value).forEach(freeze);Object.freeze(value);}return value;};return freeze('+JSON.stringify(domains,null,2)+');})();\nif(typeof module!==\'undefined\'&&module.exports)module.exports=TaxiQaidOperationalSchemas;\n';
if(process.argv.includes('--check')){if(fs.readFileSync('shared/operational-schemas.js','utf8')!==output)throw new Error('Operational schema artifact drift');}else fs.writeFileSync('shared/operational-schemas.js',output);
console.log('PASS: 14 template schemas; unique headers and approved technical columns');
