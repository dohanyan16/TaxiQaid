/** Personal-source validation only; the future authenticated backend remains the authority. */
const TaxiQaidPortalPolicy = (() => {
  const phone=typeof libphonenumber!=='undefined'?libphonenumber:require('../../assets/vendor/phone/libphonenumber-max.js');
  function normalizePhone(country,national) {
    if(!phone.getCountries().includes(country))throw new Error('Select a valid country calling code.');
    const value=String(national).trim();
    if(!value||/^\+|^00/.test(value)||!/^[\d ()-]+$/.test(value))throw new Error('Enter the national phone number without an international prefix.');
    const parsed=phone.parsePhoneNumberFromString(value,country);
    if(!parsed||parsed.countryCallingCode!==phone.getCountryCallingCode(country)||!parsed.isValid()||parsed.number.length>16)throw new Error('Enter a valid national phone number for the selected country.');
    if(value.replace(/\D/g,'')===parsed.countryCallingCode+parsed.nationalNumber)throw new Error('Enter the national phone number without repeating the country calling code.');
    return parsed.number;
  }
  function changes(current,name,country,national) {
    const result={},next=String(name).trim().replace(/\s+/g,' ');
    if(next) {if(next.length<2||next.length>150||!/[\p{L}]/u.test(next)||/[<>\x00-\x1f]/.test(next))throw new Error('Enter a valid proposed name (2–150 characters).');if(next!==current.name)result.name=next;}
    if(String(national).trim()){const number=normalizePhone(country,national);if(number!==current.phone)result.phone=number;}
    if(!Object.keys(result).length)throw new Error('Enter a changed name, phone number, or both.');
    return result;
  }
  function snapshot(context,packet,mode='driver') {
    if(!context||context.verified!==true||context.source!=='authorized-backend'||context.accountStatus!=='Active'||packet?.source!=='authorized-backend'||packet.subjectUid!==context.uid)throw new Error('An authorized response for the current account is required.');
    const ref=packet.driverRecordRef;
    if(!ref||!/^\d{10}$/.test(packet.iqama||''))throw new Error('Verified driver identity unavailable.');
    if(mode==='driver') {
      if(context.accountType!=='Driver'||ref!==context.driverRecordRef||packet.iqama!==context.iqama||packet.ownerUid!==context.uid)throw new Error('Personal driver ownership mismatch.');
    } else if(context.accountType!=='Management'||!context.scope?.driverRecordRefs?.includes(ref))throw new Error('Driver is outside the management preview scope.');
    if((packet.documents||[]).some(doc=>doc.driverRecordRef!==ref||doc.ownerUid!==packet.ownerUid||!doc.documentId||!doc.version||! /^[a-f\d]{64}$/i.test(doc.sha256||'')))throw new Error('Document owner or immutable version metadata is invalid.');
    if((packet.profileRequests||[]).some(request=>request.driverRecordRef!==ref||request.ownerUid!==packet.ownerUid))throw new Error('Profile request ownership mismatch.');
    const documentKeys=(packet.documents||[]).map(doc=>doc.documentId+'\u0000'+doc.version);
    if(new Set(documentKeys).size!==documentKeys.length)throw new Error('An immutable document version must have one assignment entry.');
    const schedule=packet.schedule;
    if(schedule&&(!schedule.published||!schedule.approved||!schedule.version||schedule.driverRecordRef!==ref||schedule.ownerUid!==packet.ownerUid||schedule.driver?.iqama!==packet.iqama||schedule.driver?.assignments?.length!==7||schedule.week?.length!==7||schedule.driver.assignments.some((day,index)=>day.date!==schedule.week[index]||!/^\d{4}-\d{2}-\d{2}$/.test(day.date)||new Date(day.date+'T00:00:00Z').getTime()!==new Date(schedule.week[0]+'T00:00:00Z').getTime()+index*86400000)||new Date(schedule.week[0]+'T00:00:00Z').getUTCDay()!==0))throw new Error('Only the approved, published personal week is available.');
    if(schedule){const roster=typeof TaxiQaidRosterModel!=='undefined'?TaxiQaidRosterModel:require('../people/roster/roster-model.js');schedule.week.forEach(date=>roster.isoDate(date));}
    return structuredClone(packet);
  }
  const resource=packet=>({driverRecordRef:packet?.driverRecordRef,ownerUid:packet?.ownerUid});
  return Object.freeze({normalizePhone,changes,snapshot,resource,countries:()=>phone.getCountries().map(code=>({code,prefix:'+'+phone.getCountryCallingCode(code),country:new Intl.DisplayNames(['en'],{type:'region'}).of(code)}))});
})();
if(typeof module!=='undefined'&&module.exports)module.exports=TaxiQaidPortalPolicy;
