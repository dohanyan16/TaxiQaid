/** Minimal management bootstrap. Business modules load only after verified navigation. */
const FEATURE_MODULES = [
  {name: "dashboard", folder: "modules/dashboard"},
  {name: "fleet", folder: "modules/fleet"},
  {name: "drivers", folder: "modules/drivers"},
  {name: "tripcheck", folder: "modules/tripcheck"},
  {name: "accidents", folder: "modules/accidents"},
  {name: "breakdowns", folder: "modules/breakdowns"},
  {name: "maintenance", folder: "modules/maintenance"},
  {name: "fuel", folder: "modules/operations/fuel"},
  {name: "ncr", folder: "modules/compliance/ncr"},
  {name: "penalties", folder: "modules/compliance/penalties"},
  {name: "training", folder: "modules/people/training"},
  {name: "customer-care", folder: "modules/customer/customer-care"},
  {name: "driver-deductions", folder: "modules/people/driver-deductions"},
  {name: "driver-appeals", folder: "modules/people/driver-appeals"},
  {name: "helpdesk", folder: "modules/customer/helpdesk"},
  {name: "roster", folder: "modules/people/roster"},
  {name: "driver-portal-preview", folder: "modules/driver-portal"},
  {name: "user-management", folder: "modules/administration/user-management"}
];
const SCRIPT_ORDER=[
  "shared/config.js",
  "shared/state.js",
  "shared/permission-catalog.js",
  "shared/permission-model.js",
  "shared/auth-contract.js",
  "shared/auth-client.js",
  "shared/access-runtime.js",
  "shared/module-runtime.js",
  "shared/permission-bindings.js",
  "shared/navigation.js",
  window.TAXIQAID_DEDICATED_AUTH?.enabled === true ? "modules/login/login-dedicated.js" : "modules/login/login.js",
  "modules/login/request-password-reset.js"
];
const MODULE_SCRIPTS={ncr:['modules/compliance/ncr/ncr-policy.js'],training:['modules/people/training/training-model.js'],'customer-care':['modules/customer/support-policy.js'],'driver-deductions':['modules/people/driver-deductions/deductions-policy.js'],'driver-appeals':['modules/people/driver-appeals/appeals-policy.js'],helpdesk:['modules/customer/support-policy.js'],roster:['modules/people/roster/roster-model.js'],'user-management':['shared/user-admin-model.js'],'driver-portal-preview':['assets/vendor/phone/libphonenumber-max.js','modules/driver-portal/portal-policy.js','modules/people/roster/roster-model.js','modules/driver-portal/driver-portal.js']};
const versioned=path=>window.TAXIQAID_ASSET_VERSIONS?.[path]?path+'?v='+window.TAXIQAID_ASSET_VERSIONS[path]:path;
async function getFragment(path){const response=await fetch(versioned(path));if(!response.ok)throw new Error('Unable to load '+path);const parsed=new DOMParser().parseFromString(await response.text(),'text/html'),fragment=document.createDocumentFragment();while(parsed.body.firstChild)fragment.append(parsed.body.firstChild);return fragment;}
function addScript(path){return new Promise((resolve,reject)=>{const script=document.createElement('script');script.async=false;const hex=window.TAXIQAID_ASSET_VERSIONS?.[path];if(hex)script.integrity='sha256-'+btoa(String.fromCharCode(...hex.match(/../g).map(n=>parseInt(n,16))));script.src=versioned(path);script.onload=resolve;script.onerror=()=>reject(new Error('Unable to load '+path));document.head.append(script);});}
async function initializeApplication(){const workspace=document.getElementById('workspace'),bootStatus=document.getElementById('boot-status');try{
 if(typeof window.supabase?.createClient!=='function')throw new Error('The authentication SDK is unavailable.');
 if(window.TAXIQAID_DEDICATED_AUTH?.enabled===true){const s=window.TAXIQAID_DEDICATED_AUTH;if(typeof s.url!=='string'||typeof s.brokerUrl!=='string'||typeof s.publicKey!=='string'||!s.publicKey.trim())throw new Error('Dedicated authentication configuration is incomplete.');const project=new URL(s.url),gateway=new URL(s.brokerUrl);if(project.protocol!=='https:'||project.origin!==s.url||gateway.protocol!=='https:'||!gateway.hostname.endsWith('.workers.dev')||gateway.username||gateway.password||gateway.port||gateway.pathname!=='/login-with-identifier'||gateway.search||gateway.hash)throw new Error('Dedicated authentication configuration is incomplete.');}
 const [login,shell]=await Promise.all([getFragment('modules/login/login.html'),getFragment('shared/shell.html')]);workspace.append(login,shell);const overlays=document.createElement('div');overlays.id='module-overlays';workspace.append(overlays);const status=document.createElement('p');status.id='module-status';status.className='preview-note';status.setAttribute('role','status');status.hidden=true;document.getElementById('module-views').before(status);
 await Promise.all(SCRIPT_ORDER.map(addScript));
 TaxiQaidModules.define(FEATURE_MODULES.map(m=>({...m,permission:TaxiQaidPermissionCatalog.MODULES.find(c=>c.view===m.name).permissions[0].key,css:m.name==='driver-portal-preview'?'driver-portal':m.name,portal:m.name==='driver-portal-preview',scripts:[...(MODULE_SCRIPTS[m.name]||[]),...(m.name==='driver-portal-preview'?[]:[m.folder+'/'+m.name+'.js'])]})));

 if(window.TAXIQAID_DEDICATED_AUTH?.enabled===true&&(typeof TaxiQaidDedicatedLogin==='undefined'||!TaxiQaidDedicatedLogin.auth))throw new Error('The dedicated authentication controller is unavailable.');
 if(typeof initializeFrontendPreview==='function')initializeFrontendPreview();TaxiQaidPermissionBindings.reconcile();workspace.hidden=false;bootStatus.remove();performance.mark('taxiqaid:login-visible');document.dispatchEvent(new CustomEvent('taxiqaid:app-ready'));
 }catch(error){console.error('Unable to initialize TaxiQaid:',error);bootStatus.textContent='Unable to load the application. Open it through an HTTP(S) server and reload the page.';bootStatus.setAttribute('role','alert');}}
initializeApplication();
