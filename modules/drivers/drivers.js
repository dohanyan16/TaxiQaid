/**
 * TaxiQaid | drivers.js
 * Purpose: Driver lookup, profile rendering, edit form, and save.
 *
 * Loaded as a classic script to preserve original cross-file references.
 * Edit only the features owned by this file. See docs/PROJECT_GUIDE.md.
 */

        // --- DRIVERS MANAGEMENT LOGIC ---
    let currentActiveDriver = null;
    let isEditMode = false;
    let driverRefreshSequence = 0;
    const profileContainer = document.getElementById("driver-profile-container");
    const editDriverBtn = document.getElementById("edit-driver-btn");
    const cancelEditBtn = document.getElementById("cancel-edit-btn");
    const driverSearchInput = document.getElementById("driver-search-input");
    const toggleDriverBtn = document.getElementById("toggle-driver-btn");
    const driverDropdown = document.getElementById("driver-dropdown");

    function driverLabel(d) {
      return `${d["Iqama Number"] || d["iqama"] || ""} - ${d["Full Name"] || d["name"] || ""}`;
    }

    function clearDriverSelection() {
      driverSearchInput.value = '';
      profileContainer.style.display = 'none';
      currentActiveDriver = null;
    }
    const driverSearch = setupSearchDropdown({
      input:'driver-search-input', btn:'toggle-driver-btn', dd:'driver-dropdown', config:'drivers', paginate:true,
      getData:()=>driversDatabase, apply:()=>{profileContainer.style.display='none';currentActiveDriver=null;driverOverviewPage=0;renderDriverOverview();},
      onSelect:renderDriverProfile
    });


    let driverOverviewPage=0,driverSourceConnected=false;
    function renderDriverOverview(){
      const columns=TaxiQaidSheetsModel.drivers,filtered=driversDatabase.filter(r=>driverSearch.matches(r)),pages=Math.max(1,Math.ceil(filtered.length/25));driverOverviewPage=Math.min(driverOverviewPage,pages-1);
      const head=document.querySelector('#drivers-overview thead');head.replaceChildren();const tr=document.createElement('tr');for(const label of columns){const th=document.createElement('th');th.textContent=label;tr.append(th);}head.append(tr);
      const records=filtered.slice(driverOverviewPage*25,(driverOverviewPage+1)*25);TaxiQaidPeopleUI.table('drivers-overview',records,columns,renderDriverProfile);
      [...document.querySelectorAll('#drivers-overview tbody tr')].forEach((row,i)=>{if(records[i])row.addEventListener('click',()=>renderDriverProfile(records[i]));});
      if(!filtered.length&&driverSourceConnected)document.querySelector('#drivers-overview .table-empty').textContent='0 authorized records.';
      document.getElementById('drivers-previous').disabled=driverOverviewPage===0;document.getElementById('drivers-next').disabled=driverOverviewPage+1>=pages;document.getElementById('drivers-page').textContent='Page '+(driverOverviewPage+1)+' of '+pages+' — '+filtered.length+' records';
    }
    document.getElementById('drivers-previous').addEventListener('click',()=>{driverOverviewPage--;renderDriverOverview();});document.getElementById('drivers-next').addEventListener('click',()=>{driverOverviewPage++;renderDriverOverview();});
    renderDriverOverview();
    function renderDriverProfile(driver) {
      currentActiveDriver = driver;
      isEditMode = false;
      editDriverBtn.textContent = "Edit Driver Details";editDriverBtn.disabled=false;document.getElementById("driver-write-status").textContent="Driver writes are not activated.";
      editDriverBtn.style.background = "var(--primary)";
      cancelEditBtn.style.display = "none";

      const fullName = driver["Full Name"] || driver["name"] || "Driver";
      document.getElementById("profile-driver-name").textContent = fullName + " - Profile";
      document.getElementById("val-iqama").textContent = driver["Iqama Number"] || driver["iqama"] || "-";
      document.getElementById("val-name").textContent = fullName;
      document.getElementById("val-nationality").textContent = driver["Nationality"] || driver["nationality"] || "-";
      document.getElementById("val-passport").textContent = driver["Passport Number"] || driver["passport number"] || "-";
      document.getElementById("val-tid").textContent = driver["TID"] || driver["tid"] || "-";
      document.getElementById("val-passport-exp").textContent = formatDateForDisplay(driver["Passport Expiry Date"] || driver["passport expiry date"]);
      document.getElementById("val-iqama-issue").textContent = formatDateForDisplay(driver["Iqama Issue Date"] || driver["iqama issue date"]);
      document.getElementById("val-dob").textContent = formatDateForDisplay(driver["Date Of Birth"] || driver["Date of Birth"] || driver["date of birth"],{calendar:true});
      document.getElementById("val-iqama-exp").textContent = formatDateForDisplay(driver["Iqama Expiry Date"] || driver["iqama expiry date"]);
      document.getElementById("val-work-start").textContent = formatDateForDisplay(driver["Employment Start Date"] || driver["employment start date"]);
      document.getElementById("val-phone").textContent = driver["Phone Number"] || driver["phone number"] || "-";
      document.getElementById("val-driver-id").textContent = driver["Driver ID"] || driver["driver id"] || "-";
      document.getElementById("val-arrangement").textContent = driver["Arrangement"] || driver["arrangement"] || "-";

      const licenseVal = driver["KSA Driving License Date"] || driver["ksa driving license date"];
      document.getElementById("val-license-date").textContent = (licenseVal && licenseVal !== "Not Yet") ? formatDateForDisplay(licenseVal) : "Not Yet";

      document.getElementById("val-shift").textContent = driver["Shift"] || driver["shift"] || "-";
      document.getElementById("val-car-plate").textContent = driver["Car Plate"] || driver["car plate"] || "-";
      document.getElementById("val-status").textContent = driver["Status"] || driver["status"] || "-";

      document.getElementById("val-out-project").textContent=driver["Out of Project Date"]?formatDateForDisplay(driver["Out of Project Date"]):"-";
      document.getElementById("val-driver-accidents").textContent=String(driver.Accidents??"-");
      profileContainer.style.display = "block";
    }

    async function enableEditMode() {
      if (!currentActiveDriver || !TaxiQaidAccess.can('drivers.edit')) return;
      await TaxiQaidModules.resource('assets/vendor/phone/libphonenumber-max.js');
      let vehicles=[];try{const result=await TaxiQaidSources.read('fleet',{action:'lookup',signal:driverReadSignal});vehicles=result.connected?result.records:[];}catch{document.getElementById('sync-status').textContent='Vehicle choices unavailable. Retry Refresh; changes cannot be saved.';}
      if (!currentActiveDriver || !TaxiQaidAccess.can('drivers.edit') || driverReadSignal?.aborted) return;
      isEditMode=true;editDriverBtn.textContent='Save Changes';editDriverBtn.disabled=false;cancelEditBtn.style.display='inline-block';
      const d=currentActiveDriver,select=(host,id,value,values)=>TaxiQaidDOM.field(host,{id,value,options:values.map(value=>({value}))});
      TaxiQaidDOM.field('val-tid',{id:'edit-tid',value:d.TID||''});
      const phone=libphonenumber.parsePhoneNumberFromString(String(d['Phone Number']||'')),host=document.getElementById('val-phone');host.replaceChildren();
      const prefix=document.createElement('select');prefix.id='edit-phone-country';prefix.setAttribute('aria-label','Phone country prefix');const names=new Intl.DisplayNames(['en'],{type:'region'});for(const country of libphonenumber.getCountries()){const option=new Option(names.of(country)+' (+'+libphonenumber.getCountryCallingCode(country)+')',country);prefix.add(option);}prefix.value=phone?.country||'SA';
      const input=document.createElement('input');input.id='edit-phone';input.type='tel';input.setAttribute('aria-label','Phone national number');input.value=phone?.nationalNumber||d['Phone Number']||'';host.append(prefix,input);const validatePhone=()=>{const parsed=libphonenumber.parsePhoneNumberFromString(input.value,prefix.value);input.setCustomValidity(!/^(?:\+|00)/.test(input.value)&&/^[\d ()-]+$/.test(input.value)&&parsed?.isValid()&&parsed.countryCallingCode===libphonenumber.getCountryCallingCode(prefix.value)?'':'Enter a valid national phone number for the selected prefix.');};input.addEventListener('input',validatePhone);prefix.addEventListener('change',validatePhone);validatePhone();
      select('val-arrangement','edit-arrangement',d.Arrangement||'', ['Salary','270 SAR per day']);
      select('val-shift','edit-shift',d.Shift||'', ['Day Shift','Night Shift']);
      const dateField=(host,id,value)=>TaxiQaidDOM.field(host,{id,type:'date',value:value?toDateInput(value):''});
      dateField('val-license-date','edit-license-date',d['KSA Driving License Date']);
      const plateChoices=[{value:'',label:'-- Unassigned --'},...vehicles.map(v=>({value:v.values.Plate,label:v.values.Plate+' ('+v.values.Model+')'}))];
      if(d['Car Plate']&&!plateChoices.some(v=>v.value===d['Car Plate']))plateChoices.push({value:d['Car Plate'],label:d['Car Plate']+' — current assignment (not verified)'});
      TaxiQaidDOM.field('val-car-plate',{id:'edit-car-plate',value:d['Car Plate']||'',options:plateChoices});
      select('val-status','edit-status',({'Not Available':'Unavailable','No Longer in the Project':'Out of Project'}[d.Status]||d.Status||'Available'),['Available','Unavailable','Out of Project']);
      dateField('val-out-project','edit-out-project',d['Out of Project Date']);
      document.getElementById('edit-status').addEventListener('change',()=>{document.getElementById('edit-out-project').value=document.getElementById('edit-status').value==='Out of Project'?new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Riyadh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()):'';});
      document.getElementById('driver-write-status').textContent='Only the eight approved fields can be saved. Changes are written to Google Sheets and audited when the backend coordinator is active.';
    }
    async function saveEditedDriver(){
      if(!isEditMode||!currentActiveDriver||!TaxiQaidAccess.can('drivers.edit'))return;
      const d=currentActiveDriver,get=id=>document.getElementById(id)?.value??'';
      const phoneInput=document.getElementById('edit-phone'),region=get('edit-phone-country');
      if(phoneInput&&!phoneInput.reportValidity()){document.getElementById('driver-write-status').textContent='Enter a valid phone number.';return;}
      let phone=null;
      try{if(get('edit-phone').trim()){phone=libphonenumber.parsePhoneNumberFromString(get('edit-phone'),region);if(!phone?.isValid())throw 0;}
        else if(d['Phone Number'])throw 0;
      }catch{document.getElementById('driver-write-status').textContent='Invalid phone number or country prefix.';return;}
      const proposed={
        TID:get('edit-tid').trim(),
        'Phone Number':phone?.number||'',
        Arrangement:get('edit-arrangement'),
        'KSA Driving License Date':get('edit-license-date'),
        Shift:get('edit-shift'),
        'Car Plate':get('edit-car-plate'),
        Status:get('edit-status'),
        'Out of Project Date':get('edit-out-project')
      };
      const changes=Object.fromEntries(Object.entries(proposed).filter(([key,val])=>String(d[key]??'')!==String(val)));
      if(!Object.keys(changes).length){document.getElementById('driver-write-status').textContent='No changes to save.';return;}
      if(driverReadSignal?.aborted){document.getElementById('driver-write-status').textContent='Reopen Drivers and try again.';return;}
      const op=crypto.randomUUID(),id=d._recordId,version=d._rowVersion??0;
      if(!id||!Number.isSafeInteger(version)){document.getElementById('driver-write-status').textContent='Record identity unavailable. Refresh and try again.';return;}
      editDriverBtn.disabled=true;cancelEditBtn.disabled=true;
      document.getElementById('driver-write-status').textContent='Saving authorized changes…';
      try{
        const confirmed=await TaxiQaidSources.updateDriver({operation:op,recordId:id,expectedVersion:version,changes});
        document.getElementById('driver-write-status').textContent='Saved and audited. Refreshing current data…';
        await refreshDriverPreview();
        const updated=driversDatabase.find(x=>x._recordId===confirmed.recordId);
        if(updated)renderDriverProfile(updated);
        document.getElementById('sync-status').textContent='Changes saved to Google Sheets.';
      }catch(error){
        document.getElementById('driver-write-status').textContent=error.message;
        // An uncertain write MUST NOT be automatically repeated or silently discarded.
        if(/uncertain|reconcile|confirm/i.test(error.message))editDriverBtn.disabled=true;
        else editDriverBtn.disabled=false;
      }finally{cancelEditBtn.disabled=false;}
    }
    editDriverBtn.addEventListener('click',()=>{
      if(isEditMode){void saveEditedDriver();return;}
      void enableEditMode().catch(()=>{document.getElementById('driver-write-status').textContent='Unable to prepare editing. Retry after Refresh.';});
    });
    cancelEditBtn.addEventListener('click',()=>{if(currentActiveDriver)renderDriverProfile(currentActiveDriver);});
    let driverReadSignal=null;
    async function refreshDriverPreview({signal=driverReadSignal}={}) {
      const sequence=++driverRefreshSequence,status=document.getElementById('sync-status');status.textContent='Loading authorized drivers…';
      try{const result=await TaxiQaidSources.read('drivers',{signal});if(sequence!==driverRefreshSequence||signal?.aborted)return result;
        driverSourceConnected=result.connected;driversDatabase=result.connected?result.records.map(r=>TaxiQaidSheetsModel.frontend('drivers',r)):[];driverSearch.clear();currentActiveDriver=null;profileContainer.style.display='none';status.textContent=result.message;TaxiQaidModules.fresh('drivers');return result;
      }catch(error){if(error.name!=='AbortError'){status.textContent=error.message+' Previously loaded data may be out of date.';return {connected:false,message:status.textContent};}throw error;}
    }
    document.getElementById('refresh-db-btn').addEventListener('click',()=>{void fetchDrivers().catch(()=>{});});
    document.getElementById('export-excel-btn').addEventListener('click',event=>{void TaxiQaidSources.exportExcel('drivers',event.currentTarget).catch(error=>document.getElementById('sync-status').textContent=error.message);});
    TaxiQaidModules.register('drivers',{onEnter:options=>{driverReadSignal=options.signal;return refreshDriverPreview(options);},onReset:()=>{driverRefreshSequence++;driversDatabase=[];driverSearch.clear();currentActiveDriver=null;profileContainer.style.display='none';document.querySelectorAll('#driver-profile-container [id^=val-]').forEach(e=>e.replaceChildren());}});
