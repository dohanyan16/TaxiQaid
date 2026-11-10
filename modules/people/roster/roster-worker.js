/** Private file parsing and PDF batches run off the interface thread. Nothing is uploaded. */
importScripts('roster-model.js');
const cancelled=new Set();
let pdfResources=null,pdfLoading=null;
const vendor='../../../assets/vendor/roster/';
function workbook(buffer,shift) {
  if(!self.XLSX)importScripts(vendor+'xlsx.full.min.js');
  const book=XLSX.read(buffer,{type:'array',cellDates:false,sheetRows:20004,sheets:['Roster'],cellHTML:false,bookVBA:false});
  const sheet=book.Sheets.Roster;
  if(!sheet)throw new Error(shift+': worksheet Roster was not found.');
  const range=XLSX.utils.decode_range(sheet['!fullref']||sheet['!ref']||'A1');
  if(range.e.r>20001||range.e.c>9)throw new Error(shift+': source exceeds the supported paired-row structure (10,000 drivers; columns A–J).');
  const rows=[];
  for(let row=0;row<=range.e.r;row++) {
    rows.push(Array.from({length:10},(_,column)=>{
      const cell=sheet[XLSX.utils.encode_cell({r:row,c:column})];
      return cell?{v:cell.v,t:cell.t,f:cell.f}:null;
    }));
  }
  return TaxiQaidRosterModel.parseRows(rows,shift,{date1904:book.Workbook?.WBProps?.date1904===true});
}
async function resource(path) {
  const response=await fetch(path);if(!response.ok)throw new Error('A local PDF resource could not be loaded.');
  return new Uint8Array(await response.arrayBuffer());
}
function binary(bytes) {let result='';for(let i=0;i<bytes.length;i+=16384)result+=String.fromCharCode(...bytes.subarray(i,i+16384));return result;}
async function preparePdf() {
  if(pdfResources)return pdfResources;
  if(pdfLoading)return pdfLoading;
  pdfLoading=(async()=>{
    importScripts(vendor+'jspdf.umd.min.js',vendor+'jszip.min.js','roster-pdf.js');
    const [regular,bold,logo]=await Promise.all([resource(vendor+'DejaVuSansCondensed.ttf'),resource(vendor+'DejaVuSansCondensed-Bold.ttf'),resource('../../../assets/TaxiQaidLogo.jpg')]);
    pdfResources={jsPDF:self.jspdf.jsPDF,regular:binary(regular),bold:binary(bold),logo};return pdfResources;
  })().catch(error=>{pdfLoading=null;throw error;});return pdfLoading;
}
function send(id,type,body={},transfer=[]) {self.postMessage({id,type,...body},transfer);}
self.onmessage=async event=>{
  const {id,type,...payload}=event.data;
  if(type==='cancel'){cancelled.add(id);return;}
  try {
    if(type==='validate') {
      const day=workbook(payload.day,'Day Shift'),night=workbook(payload.night,'Night Shift');
      send(id,'validated',{result:TaxiQaidRosterModel.combine(day,night)});return;
    }
    const resources=await preparePdf();
    if(type==='pdf') {
      const bytes=TaxiQaidRosterPdf.create(payload.driver,payload.week,payload.catalog,resources);
      send(id,'pdf',{buffer:bytes.buffer},[bytes.buffer]);return;
    }
    if(type!=='batch')throw new Error('Unknown roster task.');
    const zip=new self.JSZip(),errors=[],total=payload.roster.drivers.length;let generated=0;
    if(!payload.roster.ok||!total||new Set(payload.roster.drivers.map(driver=>driver.iqama)).size!==total)throw new Error('A complete validated roster with unique drivers is required.');
    for(const driver of payload.roster.drivers) {
      if(cancelled.has(id)) {send(id,'cancelled');return;}
      try {zip.file(TaxiQaidRosterModel.filename(driver),TaxiQaidRosterPdf.create(driver,payload.roster.week,payload.catalog,resources));generated++;}
      catch(error){errors.push({iqama:driver.iqama,message:error.message});}
      send(id,'progress',{total,generated,remaining:total-generated,errors:errors.length,percent:Math.floor((generated+errors.length)/total*100),phase:'Generating PDFs'});
      await new Promise(resolve=>setTimeout(resolve,0));
    }
    if(errors.length) {send(id,'incomplete',{generated,total,errors});return;}
    const bytes=await zip.generateAsync({type:'uint8array',compression:'DEFLATE',compressionOptions:{level:3}},metadata=>{
      if(cancelled.has(id))throw new Error('Generation cancelled.');
      send(id,'progress',{total,generated,remaining:0,errors:0,percent:100,zipPercent:Math.floor(metadata.percent),phase:'Preparing ZIP'});
    });
    if(cancelled.has(id)){send(id,'cancelled');return;}
    send(id,'batch',{buffer:bytes.buffer,generated,total},[bytes.buffer]);
  } catch(error){send(id,'error',{message:error.message||'Roster task failed.'});}
  finally {cancelled.delete(id);}
};
