/** English-only vector schedule template. Source proper names are preserved as data. */
const TaxiQaidRosterPdf = (() => {
  const labels=['Car','Starting Hour','Ending Hour','Starting Zone','Petrol Station'];
  function create(driver,week,catalog,resources,publication=null) {
    if (!driver || driver.assignments.length!==7 || driver.assignments.some((a,index)=>a.date!==week[index])) throw new Error('A complete validated personal week is required.');
    const model=TaxiQaidRosterModel;
    const doc=new resources.jsPDF({orientation:'landscape',unit:'mm',format:'a4',putOnlyUsedFonts:true,compress:true});
    doc.addFileToVFS('Roster-Regular.ttf',resources.regular);doc.addFont('Roster-Regular.ttf','Roster','normal');
    doc.addFileToVFS('Roster-Bold.ttf',resources.bold);doc.addFont('Roster-Bold.ttf','Roster','bold');
    doc.setFont('Roster','normal');
    // Fail visibly instead of silently replacing a proper name with unsupported glyphs.
    const glyph=doc.getFont().metadata.characterToGlyph?.bind(doc.getFont().metadata);
    const sourceText=[driver.name,driver.iqama,...driver.assignments.flatMap(a=>[a.plate,a.zone,a.stop,a.station?.name||''])].join('');
    if(glyph&&[...sourceText].some(char=>char.trim()&&!glyph(char.codePointAt(0))))throw new Error('The PDF font cannot represent a source character. A compatible font is required; no PDF was generated.');
    const width=297,x=35,tableWidth=227,labelWidth=30,dayWidth=(tableWidth-labelWidth)/7;
    const pad=1.6,lineFactor=0.43;
    if(!resources.logo?.length)throw new Error('TaxiQaid logo is unavailable.');
    doc.addImage(resources.logo,'JPEG',x,24,34,26);
    doc.setFont('Roster','bold');doc.setFontSize(15);doc.text('WEEKLY SCHEDULE',170,28,{align:'center'});
    doc.setFontSize(10);
    const nameLines=doc.splitTextToSize('Driver Name: '+driver.name,153);
    doc.text(nameLines,108,39);const iqamaY=39+nameLines.length*4.6;
    doc.text('Driver Iqama: '+driver.iqama,108,iqamaY);
    const headerY=Math.max(53,iqamaY+6),headerHeight=14;
    function parts(assignment,row) {
      if(assignment.duty==='Rest Day')return [{text:'REST DAY'}];
      if(row===0)return [{text:assignment.plate}];
      if(row===1)return [{text:assignment.start}];
      if(row===2)return [{text:assignment.end+(assignment.crossMidnight?'\nNext day':'')}];
      if(row===3)return [{text:assignment.zone,url:map(assignment.zone,'zone')},{text:'Stop: '+assignment.stop,url:map(assignment.stop)}];
      if(!assignment.station)return [{text:'Not Configured'}];
      return [{text:assignment.station.name+(assignment.station.time?' - '+model.time(assignment.station.time):''),url:map(assignment.station.name)}];
    }
    function map(name,kind) {const location=model.findLocation(catalog,name,kind);return location?model.mapUrl(location):null;}
    let font=9,rows;
    function layout() {
      doc.setFont('Roster','normal');doc.setFontSize(font);
      return labels.map((label,row)=>{
        const cells=driver.assignments.map(a=>parts(a,row).flatMap(part=>doc.splitTextToSize(part.text,dayWidth-pad*2).map(text=>({text,url:part.url}))));
        const labelLines=doc.splitTextToSize(label,labelWidth-pad*2);
        const maxLines=Math.max(labelLines.length,...cells.map(cell=>cell.length));
        return {labelLines,cells,height:Math.max(row===3?25:18,maxLines*font*lineFactor+pad*2)};
      });
    }
    do {rows=layout();if(headerY+headerHeight+rows.reduce((sum,row)=>sum+row.height,0)<=190)break;font-=0.5;}while(font>=7);
    if(font<7)throw new Error('Source text is too long for a readable landscape schedule. Review the source; no clipped PDF was generated.');
    function border(cx,cy,cw,ch,fill) {
      doc.setDrawColor(0);doc.setLineWidth(0.3);if(fill){doc.setFillColor(...fill);doc.rect(cx,cy,cw,ch,'FD');}else doc.rect(cx,cy,cw,ch);
    }
    doc.setFont('Roster','bold');doc.setFontSize(9);
    week.forEach((date,index)=>{
      const left=x+labelWidth+index*dayWidth;
      border(left,headerY,dayWidth,7,[248,203,173]);border(left,headerY+7,dayWidth,7,[248,203,173]);
      doc.text(model.DAYS[index],left+dayWidth/2,headerY+4.7,{align:'center'});
      doc.text(date.split('-').reverse().join('/'),left+dayWidth/2,headerY+11.7,{align:'center'});
    });
    let y=headerY+headerHeight;
    rows.forEach(row=>{
      border(x,y,labelWidth,row.height);
      doc.setFont('Roster','bold');doc.setFontSize(font);
      doc.text(row.labelLines,x+labelWidth/2,y+row.height/2-(row.labelLines.length-1)*font*lineFactor/2+font*0.12,{align:'center',lineHeightFactor:1.22});
      row.cells.forEach((lines,index)=>{
        const left=x+labelWidth+index*dayWidth;
        border(left,y,dayWidth,row.height,driver.assignments[index].duty==='Rest Day'?[146,208,80]:null);
        doc.setFont('Roster','normal');doc.setFontSize(font);
        const first=y+row.height/2-(lines.length-1)*font*lineFactor/2+font*0.12;
        lines.forEach((line,lineIndex)=>{
          const baseline=first+lineIndex*font*lineFactor;
          doc.setTextColor(...(line.url?[0,65,95]:[0,0,0]));doc.text(line.text,left+dayWidth/2,baseline,{align:'center'});
          if(line.url)doc.link(left+pad,baseline-font*0.32,dayWidth-pad*2,font*lineFactor,{url:line.url});
        });doc.setTextColor(0);
      });y+=row.height;
    });
    doc.setFontSize(7);doc.setFont('Roster','normal');
    const publicationLabel=publication?.version?'Published version: '+publication.version:'Local preview - unpublished';
    doc.text(driver.shift+' | Asia/Riyadh | '+publicationLabel,width/2,y+5,{align:'center'});
    doc.text('Overnight shifts end the next calendar day. Unmapped locations retain the original text without a map link.',width/2,y+9,{align:'center'});
    doc.setProperties({title:'TaxiQaid Weekly Schedule',subject:publication?.version?'Personal weekly schedule - published version '+publication.version:'Personal weekly schedule - local preview',author:'TaxiQaid',creator:'TaxiQaid Roster Management'});
    return new Uint8Array(doc.output('arraybuffer'));
  }
  return Object.freeze({create});
})();
