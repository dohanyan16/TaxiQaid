/** Bounded, cross-page driver selection and explicit requirement evaluation. No storage. */
const TaxiQaidTrainingModel = (() => {
  function createSelection({pageSize=25,match}={}) {
    if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new Error('Page size must be between 1 and 100.');
    let drivers=[], complete=false, query='', page=0;
    const selected = new Set();
    const id = record => String(record['Driver Iqama'] ?? record['Iqama Number'] ?? '').trim();
    function filtered() {return drivers.filter(record=>!query || match(record,query));}
    function load(records,{complete:allLoaded=false,eligibleIds=null}={}) {
      const seen=new Set();
      const eligible=eligibleIds===null?null:new Set(eligibleIds.map(String));
      drivers=records.filter(record=>{
        const key=id(record); if(!key || seen.has(key) || (eligible && !eligible.has(key)))return false;
        seen.add(key); return true;
      });
      complete=allLoaded===true; page=0; selected.forEach(key=>{if(!seen.has(key))selected.delete(key);});
    }
    function snapshot() {
      const results=filtered(), pages=Math.max(1,Math.ceil(results.length/pageSize)); page=Math.min(page,pages-1);
      return {records:results.slice(page*pageSize,(page+1)*pageSize),page,pages,total:results.length,
        selectedCount:selected.size,complete,selectedIds:[...selected]};
    }
    return Object.freeze({id,load,snapshot,search(value){query=String(value||'');page=0;},
      move(value){page=Math.max(0,Math.trunc(value)||0);},
      toggle(key,checked){key=String(key);if(!drivers.some(record=>id(record)===key))throw new Error('Unknown driver.');if(checked)selected.add(key);else selected.delete(key);},
      selectAllFiltered(){if(!complete)throw new Error('Complete eligible results or a backend selection service are required.');filtered().forEach(record=>selected.add(id(record)));},
      remove(key){selected.delete(String(key));},clear(){selected.clear();},
      selectedPage(index=0){const records=drivers.filter(record=>selected.has(id(record)));return records.slice(index*pageSize,(index+1)*pageSize);}
    });
  }
  // Applicability and completion validity are decisions supplied by an approved backend policy.
  function compliance(requirements, completions) {
    if(!Array.isArray(requirements)||!Array.isArray(completions)||requirements.some(item=>!item.id||typeof item.applicable!=='boolean'))return {pending:null,status:'Unavailable — requirements not configured'};
    if(new Set(requirements.map(item=>item.id)).size!==requirements.length)throw new Error('Requirement references must be unique.');
    const applicable=requirements.filter(item=>item.applicable===true);
    const pending=applicable.filter(item=>!completions.some(done=>done.requirementId===item.id && done.verified===true && done.valid===true)).length;
    return {pending,status:pending?'Pending Training Sessions':'On Day'};
  }
  return Object.freeze({createSelection,compliance});
})();
if(typeof module!=='undefined' && module.exports) module.exports=TaxiQaidTrainingModel;
