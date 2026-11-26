// The heavy runtime is imported only inside a worker created after an explicit click.
export function createLocalMealEngine(makeWorker=()=>new Worker(new URL('./localMeal.worker.js',import.meta.url),{type:'module'})){
  let worker=null,pending=null,sequence=0;
  function stop(){
    worker?.terminate();worker=null;
    if(pending){pending.reject(Object.assign(Error('cancelled'),{code:'cancelled'}));pending=null;}
  }
  function request(type,payload={},onProgress){
    if(pending)return Promise.reject(Object.assign(Error('busy'),{code:'busy'}));
    if(!worker){
      worker=makeWorker();
      worker.onmessage=({data})=>{
        if(!pending||data.id!==pending.id)return;
        if(data.type==='progress'){pending.onProgress?.(data.progress);return;}
        const current=pending;pending=null;clearTimeout(current.timeout);
        if(data.type==='error')current.reject(Object.assign(Error(data.code),{code:data.code}));else current.resolve(data.result);
      };
      worker.onerror=()=>{const current=pending;pending=null;worker?.terminate();worker=null;if(current){clearTimeout(current.timeout);current.reject(Object.assign(Error('worker'),{code:'worker'}));}};
    }
    return new Promise((resolve,reject)=>{
      const id=++sequence;
      const timeout=setTimeout(()=>{if(pending?.id===id){stop();}},type==='load'?15*60*1000:3*60*1000);
      pending={id,resolve,reject,onProgress,timeout};
      worker.postMessage({id,type,...payload});
    });
  }
  return {load:onProgress=>request('load',{},onProgress),generate:messages=>request('generate',{messages}),clear:()=>request('clear'),stop:()=>{if(pending)clearTimeout(pending.timeout);stop();}};
}
