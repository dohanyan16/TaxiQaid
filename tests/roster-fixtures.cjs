// Synthetic inputs only. Private reference workbooks are passed through environment variables.
const XLSX=require('../assets/vendor/roster/xlsx.full.min.js');
const model=require('../modules/people/roster/roster-model.js');
function rows({drivers=2,base=9000000000,week='2026-11-08',start='12:00',end='00:00',stop='Kuday 1',zone='Kuday -At Taqwa',platePrefix='TEST',restDay=0}={}) {
 const header=[null,'Driver Name','Driver Nº',...Array.from({length:7},(_,i)=>(Date.parse(model.addDays(week,i)+'T00:00:00Z')-Date.UTC(1899,11,30))/86400000)];
 const data=[[],header];
 for(let i=0;i<drivers;i++) {
  data.push([null,'Synthetic Driver '+i,String(base+i),...Array.from({length:7},(_,day)=>day===restDay?'REST DAY':'('+start+')-('+end+')-Zone: '+zone+' - Stop: '+stop)]);
  data.push([null,null,null,...Array.from({length:7},(_,day)=>day===restDay?'REST DAY':String(i)+'-'+platePrefix)]);
 }
 return data;
}
function workbook(data,worksheet='Roster') {const book=XLSX.utils.book_new();XLSX.utils.book_append_sheet(book,XLSX.utils.aoa_to_sheet(data),worksheet);return Buffer.from(XLSX.write(book,{type:'array',bookType:'xlsx'}));}
module.exports={rows,workbook,XLSX};
