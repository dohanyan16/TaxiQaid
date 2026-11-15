// Only expected repository sources are converted. Never normalize a live database body for authorization.
const crypto=require('node:crypto');
const sha256=source=>crypto.createHash('sha256').update(source,'utf8').digest('hex');
function sourceFingerprints(source){
 const lf=source.replaceAll('\r\n','\n');
 if(lf.includes('\r'))throw new Error('Unreviewed lone CR in SQL source.');
 // Conservative eligibility check, not a general SQL parser. Refuse constructs where changing line
 // endings could alter literal/identifier values, or where escape/quoting needs a separate review.
 let state='code',depth=0;
 for(let index=0;index<lf.length;index++){
  const char=lf[index],next=lf[index+1];
  if(state==='line'){if(char==='\n')state='code';continue;}
  if(state==='block'){
   if(char==='/'&&next==='*'){depth++;index++;}
   else if(char==='*'&&next==='/'){if(--depth===0)state='code';index++;}
   continue;
  }
  if(state==='single'||state==='double'){
   const quote=state==='single'?"'":'"';
   if(char==='\n'||char==='\\')throw new Error('Quoted newlines or escapes require separate fingerprint review.');
   if(char===quote){if(next===quote)index++;else state='code';}
   continue;
  }
  if(char==='-'&&next==='-'){state='line';index++;}
  else if(char==='/'&&next==='*'){state='block';depth=1;index++;}
  else if(char==="'")state='single';
  else if(char==='"')state='double';
  else if(char==='$'&&/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/.test(lf.slice(index)))throw new Error('Nested dollar quoting requires separate fingerprint review.');
 }
 if(!['code','line'].includes(state))throw new Error('Incomplete SQL quoting/comment requires review.');
 return [{lineEndings:'LF',hash:sha256(lf)},{lineEndings:'CRLF',hash:sha256(lf.replaceAll('\n','\r\n'))}];
}
module.exports={sha256,sourceFingerprints};
