/** No operational requests or writes. Authorized adapters are reserved for future backend integration. */
const TaxiQaidDriverPortal = (() => {
  const $=id=>document.getElementById(id),policy=TaxiQaidPortalPolicy;
  let packet=null,mode='driver',documentLoader=null,documentState=null,epoch=0,objectUrls=[],selectedPreview=null,previewDrivers=[];
  const show=(id,text)=>{const element=$(id);element.textContent=text;element.hidden=false;};
  const resource=()=>({...policy.resource(packet),mode});
  const permitted=key=>mode==='driver'&&packet&&TaxiQaidAccess.can('driver-portal.'+key,resource());
  const previewCan=(key,extra={})=>mode==='management-preview'&&packet&&TaxiQaidAccess.can('driver-portal.'+key,{...resource(),...extra});
  const text=(tag,value,cls='')=>{const element=document.createElement(tag);element.textContent=value;element.className=cls;return element;};
  const countries=policy.countries();let selectedCountry=null;
  const countrySearch=TaxiQaidSearch.create({input:'portal-phone-country',fields:['country','prefix','code'],getData:()=>countries,getIdentifier:country=>country.code,label:country=>country.country+' ('+country.prefix+')',onSelect:country=>{selectedCountry=country.code;$('portal-phone-country').value=country.country+' ('+country.prefix+')';}});
  $('portal-phone-country').addEventListener('input',()=>{selectedCountry=null;});
  const previewSearch=$('portal-preview-driver')?TaxiQaidSearch.create({input:'portal-preview-driver',fields:['iqama','name'],getData:()=>previewDrivers,getIdentifier:driver=>driver.driverRecordRef,onSelect:driver=>{selectedPreview=driver;$('portal-preview-open').disabled=!TaxiQaidAccess.can('driver-portal.preview',{driverRecordRef:driver.driverRecordRef});}}):{clear(){}};
  $('portal-preview-driver')?.addEventListener('input',()=>{selectedPreview=null;$('portal-preview-open').disabled=true;});
  TaxiQaidPeopleUI.tabs($('portal-content'));
  function revoke() {objectUrls.forEach(url=>URL.revokeObjectURL(url));objectUrls=[];documentState=null;}
  function clear() {
    epoch++;revoke();packet=null;documentLoader=null;previewDrivers=[];selectedPreview=null;previewSearch.clear();countrySearch.clear();selectedCountry=null;
    ['portal-settings-form','portal-appeals-form','portal-login-form'].forEach(id=>$(id).reset());
    ['portal-settings-status','portal-appeals-status','portal-login-status','portal-sign-status'].forEach(id=>$(id).hidden=true);
    ['portal-approved-profile','portal-profile-requests','portal-files-list','portal-document-viewer'].forEach(id=>$(id).replaceChildren());
    ['portal-sign-modal','portal-document-modal'].forEach(id=>{if($(id).style.display==='flex')closePreviewModal($(id));});
    $('portal-document-title').textContent='Document';$('portal-document-version').textContent='';$('portal-document-status').textContent='';
    $('portal-driver-name').textContent='Driver account integration pending';$('portal-profile-state').textContent='No Pending Requests';
    $('portal-files-empty').hidden=false;
    $('portal-content').hidden=true;$('driver-portal').hidden=true;
  }
  function shell(preview,loggedIn) {
    mode=preview?'management-preview':'driver';$('driver-portal').hidden=false;if($('erp-app'))$('erp-app').style.display='none';if($('login-screen'))$('login-screen').style.display='none';
    $('portal-login').hidden=loggedIn;$('portal-content').hidden=!loggedIn;$('portal-preview-banner').hidden=!preview;$('portal-return').hidden=!preview;
    $('portal-signout').hidden=preview;
    ['portal-proposed-name','portal-phone-country','portal-proposed-phone','portal-request-changes','portal-appeal-description','portal-submit-appeal'].forEach(id=>$(id).disabled=preview);
  }
  function render() {
    $('portal-driver-name').textContent=packet?.profile?.name||(mode==='driver'?TaxiQaidAccess.getContext()?.fullName:null)||'Driver information unavailable';
    const profile=packet?.profile||{};$('portal-approved-profile').replaceChildren();
    [['Driver Name',profile.name],['Iqama',packet?.iqama],['Contact Phone',profile.phone]].forEach(([label,value])=>$('portal-approved-profile').append(text('dt',label),text('dd',value||'Unavailable — integration pending')));
    const requests=packet?.profileRequests||[];
    $('portal-profile-state').textContent=requests.some(request=>request.status==='Pending Approval')?'Pending Approval':'No Pending Requests';
    $('portal-profile-requests').replaceChildren();requests.forEach(request=>{
      if(!['Pending Approval','Approved','Rejected'].includes(request.status))return;
      const card=text('div','', 'portal-file');card.append(text('strong',request.status));
      for(const key of ['name','phone'])if(request.proposed?.[key])card.append(text('p','Proposed '+key+': '+request.proposed[key]));
      if(request.reviewedAt)card.append(text('p','Reviewed: '+request.reviewedAt));$('portal-profile-requests').append(card);
    });
    $('portal-files-list').replaceChildren();
    const docs=(packet?.documents||[]).filter(doc=>mode==='driver'?permitted('files.view'):previewCan('preview-documents',{documentId:doc.documentId}));
    $('portal-files-empty').hidden=docs.length>0;
    docs.forEach(doc=>{
      const card=text('article','', 'portal-file'),button=text('button','View Document','btn-secondary');button.type='button';
      card.append(text('h3',doc.title||'Assigned Document'),text('p','Version: '+doc.version),text('p',['Signed','Pending Signature'].includes(doc.status)?doc.status:'Unavailable'));
      if(doc.assignedAtKsa)card.append(text('p','Assigned: '+doc.assignedAtKsa));
      if(doc.status==='Signed'&&doc.confirmation){card.append(text('p','Method: '+doc.confirmation.method));if(doc.confirmation.signedAtKsa)card.append(text('p','Signed: '+doc.confirmation.signedAtKsa));if(doc.confirmation.reference)card.append(text('p','Confirmation: '+doc.confirmation.reference));}
      button.disabled=!documentLoader||!['Signed','Pending Signature'].includes(doc.status);button.addEventListener('click',()=>viewDocument(doc.documentId,doc.version));card.append(button);$('portal-files-list').append(card);
    });
    $('portal-request-changes').disabled=!permitted('request-changes');$('portal-submit-appeal').disabled=!permitted('submit-appeal');
  }
  function openLogin(){clear();shell(false,false);$('portal-iqama').focus();}
  $('driver-signin-entry')?.addEventListener('click',openLogin);
  $('portal-management-login')?.addEventListener('click',()=>{clear();if($('login-screen'))$('login-screen').style.display='flex';});
  if(window.TAXIQAID_DEDICATED_AUTH?.enabled !== true)$('portal-login-form').addEventListener('submit',event=>{event.preventDefault();$('portal-password').value='';show('portal-login-status','Driver account authentication is not configured yet.');});
  $('portal-recovery').addEventListener('click',()=>show('portal-login-status','Secure account recovery integration pending. Contact your administrator.'));
  $('portal-signout').addEventListener('click',async()=>{if(window.TAXIQAID_DEDICATED_AUTH?.enabled === true)await (window.TaxiQaidDriverEntry?.auth||TaxiQaidDedicatedLogin.auth).logout();else await supabaseClient.auth.signOut();TaxiQaidAccess.reset();clear();if($('erp-app'))$('erp-app').style.display='none';if($('login-screen'))$('login-screen').style.display='flex';});
  $('portal-return').addEventListener('click',()=>{clear();if($('erp-app'))$('erp-app').hidden=false;if($('erp-app'))$('erp-app').style.display='flex';});
  $('portal-preview-empty')?.addEventListener('click',()=>{
    if(!TaxiQaidAccess.hasLegacyManagementSession()&&TaxiQaidAccess.getContext()?.accountType!=='Management')return;
    clear();shell(true,true);render();
  });
  $('portal-preview-open')?.addEventListener('click',()=>{if(!selectedPreview||!TaxiQaidAccess.can('driver-portal.preview',{driverRecordRef:selectedPreview.driverRecordRef}))return;show('portal-preview-status','Authorized personal preview source integration pending.');});
  $('portal-settings-form').addEventListener('submit',event=>{
    event.preventDefault();if(!permitted('request-changes'))return;
    try {policy.changes(packet.profile||{},$('portal-proposed-name').value,selectedCountry,$('portal-proposed-phone').value);show('portal-settings-status','Approval workflow pending — your changes have not been submitted.');}
    catch(error){show('portal-settings-status',error.message);}
  });
  $('portal-appeals-form').addEventListener('submit',event=>{event.preventDefault();if(!permitted('submit-appeal'))return;if(!$('portal-appeal-description').value.trim()){show('portal-appeals-status','Enter a description.');return;}show('portal-appeals-status','Appeal integration pending — your appeal has not been submitted.');});
  async function viewDocument(id,version) {
    const matches=packet?.documents?.filter(item=>item.documentId===id&&(!version||item.version===version))||[];
    const doc=matches.length===1?matches[0]:null,allowed=doc&&(mode==='driver'?permitted('files.view'):previewCan('preview-documents',{documentId:id}));
    if(!allowed||!documentLoader||!['Signed','Pending Signature'].includes(doc.status))return;
    revoke();const currentEpoch=++epoch;documentState={id,version:doc.version,sha256:doc.sha256,loaded:false,reviewed:false};
    $('portal-document-viewer').replaceChildren();$('portal-document-title').textContent=doc.title||'Assigned Document';$('portal-document-version').textContent='Version: '+doc.version;
    $('portal-document-reviewed').disabled=true;$('portal-document-sign').disabled=true;$('portal-document-status').textContent='Loading private document…';$('portal-sign-status').hidden=true;openPreviewModal($('portal-document-modal'));
    try {
      const blob=await documentLoader({documentId:id,version:doc.version,sha256:doc.sha256});
      if(currentEpoch!==epoch||!documentState||documentState.id!==id||documentState.version!==doc.version)return;
      if(!(blob instanceof Blob)||blob.type!=='application/pdf')throw new Error('A private PDF for this exact version is required.');
      const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',await blob.arrayBuffer()))].map(byte=>byte.toString(16).padStart(2,'0')).join('');
      if(currentEpoch!==epoch||documentState?.version!==doc.version)return;
      if(digest.toLowerCase()!==doc.sha256.toLowerCase())throw new Error('Document version verification failed.');
      const url=URL.createObjectURL(blob);objectUrls.push(url);const frame=document.createElement('iframe');frame.title='Full assigned document';frame.src=url;frame.addEventListener('load',()=>{if(currentEpoch===epoch&&documentState?.version===doc.version){documentState.loaded=true;$('portal-document-reviewed').disabled=false;}});
      const link=text('a','Open Full PDF in a New Tab');link.href=url;link.target='_blank';link.rel='noopener';$('portal-document-viewer').append(link,frame);
      $('portal-document-status').textContent=doc.status==='Signed'?'Signed — this version has already been acknowledged.':'View the full document before confirming.';
    } catch(error){if(currentEpoch===epoch)show('portal-document-status',error.message);}
  }
  function signable() {const doc=packet?.documents?.find(item=>item.documentId===documentState?.id&&item.version===documentState?.version);return permitted('sign')&&documentState?.loaded&&documentState.reviewed&&doc?.status==='Pending Signature'&&doc.version===documentState.version&&doc.sha256===documentState.sha256;}
  $('portal-document-reviewed').addEventListener('click',()=>{if(!documentState?.loaded)return;documentState.reviewed=true;$('portal-document-sign').disabled=!signable();});
  $('portal-document-sign').addEventListener('click',()=>{if(signable())openPreviewModal($('portal-sign-modal'));});
  $('portal-confirm-sign').addEventListener('click',()=>{if(signable())show('portal-sign-status','Signature integration pending — document not signed.');});
  TaxiQaidAccess.subscribe(()=>{const wasPreview=mode==='management-preview'&&!$('driver-portal').hidden;clear();if(wasPreview&&TaxiQaidAccess.getContext()?.accountType==='Management')if($('erp-app'))$('erp-app').style.display='flex';if(TaxiQaidAccess.getContext()?.accountType==='Driver'){if($('erp-app'))$('erp-app').style.display='none';const hasAccess=TaxiQaidAccess.can('driver-portal.view');shell(false,hasAccess);if(hasAccess)render();else show('portal-login-status','Driver Portal access is unavailable for this account.');}});

  return Object.freeze({openLogin,viewDocument,
    setAuthorizedSnapshot(source,{loadDocument}={}) {
      const context=TaxiQaidAccess.getContext(),preview=context?.accountType==='Management';
      const next=policy.snapshot(context,source,preview?'management-preview':'driver');
      if(!TaxiQaidAccess.can(preview?'driver-portal.preview':'driver-portal.view',policy.resource(next)))throw new Error('Portal access is not authorized.');
      clear();packet=next;documentLoader=typeof loadDocument==='function'?loadDocument:null;shell(preview,true);render();
    },
    setAuthorizedPreviewDrivers(source) {
      const context=TaxiQaidAccess.getContext();if(context?.accountType!=='Management'||source.source!=='authorized-backend'||source.subjectUid!==context.uid||!TaxiQaidAccess.can('driver-portal.view'))throw new Error('Management preview permission unavailable.');
      previewDrivers=(source.drivers||[]).filter(driver=>TaxiQaidAccess.can('driver-portal.preview',{driverRecordRef:driver.driverRecordRef})).map(driver=>({...driver}));previewSearch.clear();
    }
  });
})();
