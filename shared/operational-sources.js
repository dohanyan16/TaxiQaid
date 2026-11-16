/** Source boundary: no Google/legacy connections, persistence or fabricated success. */
const TaxiQaidSources=(()=>{
 const pending=Object.freeze({connected:false,records:Object.freeze([]),message:'Database integration pending — no operational source is connected.'});
 const inflight=new Map();let generation=0;
 async function read(module,{signal}={}){const uid=TaxiQaidAccess.getUid(),key=uid+':'+module;const epoch=generation;if(!uid||!TaxiQaidModules.allowed(module))throw new Error('Access denied.');if(signal?.aborted)throw new DOMException('Aborted','AbortError');if(inflight.has(key))return inflight.get(key);const task=Promise.resolve().then(()=>{if(epoch!==generation||signal?.aborted||uid!==TaxiQaidAccess.getUid()||!TaxiQaidModules.allowed(module))throw new DOMException('Aborted','AbortError');return pending;});inflight.set(key,task);try{return await task;}finally{if(inflight.get(key)===task)inflight.delete(key);}}
 TaxiQaidAccess.subscribe(()=>{generation++;inflight.clear();});return Object.freeze({read});
})();
