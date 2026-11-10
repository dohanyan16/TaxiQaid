/** Financial arithmetic in integer halalas. NCR points and fuel quantities are never money. */
const TaxiQaidDeductionsPolicy = (() => {
  const SOURCES=Object.freeze(['NCR Financial Fine','Fuel Charge','Traffic Violation','Manual Expense']);
  function cents(value,{positive=false}={}) {
    const text=String(value??'').trim();
    if(!/^\d+(?:\.\d{1,2})?$/.test(text))throw new Error('Enter a finite SAR amount with at most two decimal places.');
    const [whole,fraction='']=text.split('.');
    const amount=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
    if(amount>BigInt(Number.MAX_SAFE_INTEGER) || (positive && amount<=0n))throw new Error('Enter a positive SAR amount within the supported range.');
    return Number(amount);
  }
  function format(amount) {
    if(!Number.isSafeInteger(amount))throw new Error('Invalid financial amount.');
    const absolute=BigInt(Math.abs(amount));return `${amount<0?'-':''}${absolute/100n}.${String(absolute%100n).padStart(2,'0')}`;
  }
  function preview(original,previous,next) {
    const charged=cents(original,{positive:true}),deducted=cents(previous),amount=cents(next,{positive:true});
    if(deducted>charged)throw new Error('Previous deductions exceed the original expense.');
    const outstanding=charged-deducted;
    if(amount>outstanding)throw new Error('Deduction amount must not exceed the outstanding amount.');
    return {charged,deducted,amount,outstanding,remaining:outstanding-amount};
  }
  // Adapter must supply explicit authorization/posting/dispute decisions, never infer them from points.
  function balance(charges,deductions) {
    const eligible=item=>item.authorized===true && item.posted===true && item.disputed!==true && item.reversed!==true;
    const sum=items=>items.filter(eligible).reduce((total,item)=>{
      const result=total+cents(item.amount,{positive:true});if(!Number.isSafeInteger(result))throw new Error('Financial total exceeds the supported range.');return result;
    },0);
    const charged=sum(charges),deducted=sum(deductions);return {charged,deducted,outstanding:charged-deducted};
  }
  function expense(source,amount,reference='') {
    if(!SOURCES.includes(source))throw new Error('Select an approved expense source.');
    if(source!=='Manual Expense' && !reference.trim())throw new Error('The original source reference is required.');
    return {source,amount:cents(amount,{positive:true}),reference:reference.trim()};
  }
  return Object.freeze({SOURCES,cents,format,preview,balance,expense});
})();
if(typeof module!=='undefined' && module.exports) module.exports=TaxiQaidDeductionsPolicy;
