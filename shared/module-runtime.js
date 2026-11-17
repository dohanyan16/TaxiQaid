/** Permission-bound lazy lifecycle. Resource promises initialize each classic module once. */
const TaxiQaidModules=(()=>{
 const common=['shared/utils.js','shared/dom.js','shared/write-guard.js','shared/data.js','shared/search.js','shared/workflow-options.js','shared/frontend-preview.js','shared/people-preview.js','shared/operational-contract.js','shared/operational-schemas.js','shared/operational-sources.js'];
 const definitions=new Map(),loaded=new Map(),hooks=new Map(),resources=new Map(),quarantined=new Set();let queue=Promise.resolve(),navigation=0,active=null,controller=null;
 function define(items){if(definitions.size)throw new Error('Module registry is already initialized.');for(const item of items){if(!/^[a-z-]+$/.test(item.name)||!/^modules\/[a-z/-]+$/.test(item.folder)||!item.scripts.every(p=>/^(?:shared|modules|assets)\/[a-zA-Z0-9_./-]+\.js$/.test(p)))throw new Error('Invalid fixed module registry.');definitions.set(item.name,Object.freeze({...item,scripts:Object.freeze([...item.scripts])}));}}
 function allowed(name){const definition=definitions.get(name);if(!definition)return false;const context=TaxiQaidAccess.getContext();if(context?.accountType==='Management')return TaxiQaidAccess.can(definition.permission);return window.TAXIQAID_DEDICATED_AUTH?.enabled!==true&&TaxiQaidAccess.hasLegacyManagementSession();}
 const integrity=path=>{const hex=window.TAXIQAID_ASSET_VERSIONS?.[path];return hex?'sha256-'+btoa(String.fromCharCode(...hex.match(/../g).map(n=>parseInt(n,16)))):'';};
 const worker=path=>path+'?v='+window.TAXIQAID_RELEASE;
 const asset=path=>{const version=window.TAXIQAID_ASSET_VERSIONS?.[path];if(window.TAXIQAID_ASSET_VERSIONS&&!version)throw new Error('Resource is absent from the reviewed static release.');return version?path+'?v='+version:path;};
 function resource(path,css=false){if(resources.has(path))return resources.get(path);const promise=new Promise((resolve,reject)=>{const element=document.createElement(css?'link':'script');if(integrity(path))element.integrity=integrity(path);if(css){element.rel='stylesheet';element.href=asset(path);}else{element.async=false;element.src=asset(path);}const runtimeError=event=>{if(!css&&event.filename===element.src){window.removeEventListener('error',runtimeError);reject(new Error('Page initialization failed. Reload the application.'));}};window.addEventListener('error',runtimeError);element.onload=()=>{window.removeEventListener('error',runtimeError);resolve();};element.onerror=()=>{window.removeEventListener('error',runtimeError);element.remove();resources.delete(path);reject(new Error('Unable to load a required application resource.'));};document.head.append(element);});resources.set(path,promise);return promise;}
 async function fragment(path){const response=await fetch(asset(path),{cache:'default'});if(!response.ok)throw new Error('Unable to load the page.');const parsed=new DOMParser().parseFromString(await response.text(),'text/html');for(const script of parsed.querySelectorAll('script,base,object,embed'))script.remove();for(const e of parsed.querySelectorAll('*'))for(const a of [...e.attributes])if(/^on/i.test(a.name)||(['href','src','action'].includes(a.name)&&/^\s*(?:javascript|data):/i.test(a.value)))e.removeAttribute(a.name);const result=document.createDocumentFragment();while(parsed.body.firstChild)result.append(parsed.body.firstChild);return result;}
 function register(name,callbacks){hooks.set(name,callbacks);}
 function ensure(name){if(!allowed(name))return Promise.reject(new Error('Access denied.'));if(quarantined.has(name))return Promise.reject(new Error('Reload the application before opening this page.'));if(loaded.has(name))return loaded.get(name);const definition=definitions.get(name);const promise=queue.then(async()=>{if(!allowed(name))throw new Error('Access denied.');if(name!=='dashboard')await Promise.all(common.map(path=>resource(path)));if(!allowed(name))throw new Error('Access denied.');const markup=await fragment(definition.folder+'/'+name+'.html');if(!allowed(name))throw new Error('Access denied.');const section=markup.querySelector('#view-'+name);if(!section)throw new Error('Missing page.');section.hidden=true;section.inert=true;document.getElementById('module-views').append(markup);for(const modal of [...section.parentElement.querySelectorAll('.modal-overlay')]){modal.dataset.module=name;document.getElementById('module-overlays').append(modal);}
 // Overlay siblings belong to the same freshly loaded fragment, now inside module-views.
 if(definition.portal){const portal=await fragment('modules/driver-portal/driver-portal.html');document.getElementById('workspace').append(portal);}
 if(definition.css!==false)await resource(definition.folder+'/'+(definition.css||name)+'.css',true);for(const script of definition.scripts){if(!allowed(name))throw new Error('Access denied.');await resource(script);}if(typeof initializeFrontendPreview==='function')initializeFrontendPreview();TaxiQaidPermissionBindings.reconcile();await hooks.get(name)?.init?.();document.dispatchEvent(new CustomEvent('taxiqaid:module-ready',{detail:{name}}));return section;});queue=promise.catch(()=>{});loaded.set(name,promise);promise.catch(()=>{if(!document.getElementById('view-'+name))loaded.delete(name);});return promise;}
 async function enter(name){const request=++navigation;controller?.abort();hooks.get(active)?.onLeave?.();controller=new AbortController();const signal=controller.signal;document.querySelectorAll('#module-views .view-section').forEach(e=>{e.classList.remove('active');e.hidden=true;e.inert=true;});active=null;const status=document.getElementById('module-status');status.hidden=false;status.textContent=loaded.has(name)?'Refreshing page data… Previously loaded data may be out of date.':'Loading page…';try{if(!allowed(name))throw new Error('Access denied.');const section=await ensure(name);if(request!==navigation||signal.aborted||!allowed(name))return false;active=name;section.dataset.ready='false';section.hidden=false;section.inert=false;section.classList.add('active');TaxiQaidPermissionBindings.reconcile();if(name==='user-management')await new Promise(resolve=>setTimeout(resolve,40));if(request!==navigation||signal.aborted||!allowed(name))return false;const hook=hooks.get(name);
   const backgroundRead=['accidents','tripcheck','penalties','driver-appeals'].includes(name);
   const livePanelPage=['breakdowns','maintenance','fuel','ncr','training','driver-deductions','customer-care','user-management'].includes(name);
   let result;
   if(livePanelPage){
    const prior=hook?.onEnter?await hook.onEnter({signal}):null;
    // Keep the existing forms and official User Management controls intact.
    // Live DATA panels are read-only and must not delay module navigation.
    void resource('shared/live-sheets.js').then(()=>{
     if(request!==navigation||signal.aborted||active!==name||!allowed(name))return;
     TaxiQaidLiveSheets.enter(name,section,signal);
    }).catch(()=>{
     if(request===navigation&&!signal.aborted&&active===name){
      status.textContent='Unable to load the operational records view. Retry after refreshing.';
      status.hidden=false;
     }
    });
    result=name==='user-management'?prior:{connected:true};
   }else if(backgroundRead){
    const task=hook?.onEnter?hook.onEnter({signal}):TaxiQaidSources.read(name,{signal});
    void Promise.resolve(task).then(loaded=>{
     if(request!==navigation||signal.aborted||active!==name||!allowed(name))return;
     status.textContent=loaded?.connected===false?loaded.message:'';status.hidden=!status.textContent;
    }).catch(error=>{
     if(request!==navigation||signal.aborted||active!==name)return;
     status.textContent=error.message||'Unable to load operational data. Retry Refresh.';status.hidden=false;
    });
    result={connected:false,message:'Loading authorized operational data…'};
   }else result=hook?.onEnter?await hook.onEnter({signal}):name==='dashboard'||definitions.get(name).comingSoon?null:await TaxiQaidSources.read(name,{signal});
   if(request!==navigation||signal.aborted||!allowed(name))return false;status.textContent=result?.connected===false?result.message:'';status.hidden=!status.textContent;section.dataset.ready='true';document.dispatchEvent(new CustomEvent('taxiqaid:module-entered',{detail:{name}}));return true;}catch(error){if(request===navigation&&!signal.aborted){status.textContent=error.name==='AbortError'?'Page request cancelled.':error.message||'Unable to refresh the page.';status.hidden=false;}return false;}}
 function reset(){navigation++;controller?.abort();const prior=active;active=null;document.querySelectorAll('.modal-overlay').forEach(m=>{m.style.display='none';m.setAttribute('aria-hidden','true');});document.querySelectorAll('#module-views .view-section').forEach(e=>{e.classList.remove('active');e.hidden=true;e.inert=true;});driversDatabase=[];fleetDatabase=[];tripChecksDatabase=[];accidentsDatabase=[];try{hooks.get(prior)?.onLeave?.();}catch{quarantined.add(prior);}for(const [name,h]of hooks)try{h.onReset?.();}catch{quarantined.add(name);}}

 function fresh(name){if(active===name&&allowed(name)){const status=document.getElementById('module-status');status.hidden=true;status.textContent='';}}
 return Object.freeze({define,allowed,register,ensure,enter,reset,resource,fragment,asset,worker,fresh,current:()=>active,loaded:()=>[...loaded.keys()]});
})();
