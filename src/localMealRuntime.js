import {createLocalMealEngine} from './localMealEngine.js';

export const AUTO_AI_KEY='leve-local-ai-auto-v1';
export function createMealRuntime({makeEngine=createLocalMealEngine,storage,compatible=async()=>Boolean(globalThis.isSecureContext&&globalThis.navigator?.gpu&&await navigator.gpu.requestAdapter())}={}){
  let automatic=true;try{storage=storage??globalThis.localStorage;automatic=storage?.getItem(AUTO_AI_KEY)!=='off';}catch{storage=null;}
  let state={phase:'idle',progress:0,cached:false,automatic,error:''},engine=null,loading=null,warming=null,epoch=0;
  const listeners=new Set();
  const publish=patch=>{state={...state,...patch};listeners.forEach(listener=>listener());};
  const client=()=>engine||(engine=makeEngine());
  function release(){epoch++;engine?.stop();engine=null;loading=null;publish({phase:'idle',progress:0,error:''});}
  async function load(){
    if(loading)return loading;
    if(state.phase==='ready')return true;
    if(state.phase==='generating'||state.phase==='clearing')throw Error('busy');
    const current=epoch;
    loading=(async()=>{
      try{
        if(!await compatible()){if(current===epoch)publish({phase:'unsupported'});return false;}
        if(current!==epoch)return false;
        publish({phase:'loading',progress:0,error:''});
        await client().load(progress=>{if(current===epoch)publish({progress});});
        if(current!==epoch)return false;
        publish({phase:'ready',progress:1,cached:true,error:''});return true;
      }catch{if(current===epoch){engine?.stop();engine=null;publish({phase:'error',error:'Não foi possível preparar a IA. O texto e o registro manual continuam disponíveis.'});}return false;}
      finally{if(current===epoch)loading=null;}
    })();
    return loading;
  }
  async function warm(){
    if(warming)return warming;
    if(loading)return loading;
    if(['ready','generating','clearing'].includes(state.phase))return false;
    if(!state.automatic)return false;
    const current=epoch;
    warming=(async()=>{
      try{
        publish({phase:'checking',error:''});
        const cached=await client().status();
        if(current!==epoch)return false;
        publish({cached:Boolean(cached),phase:'idle'});
        if(!cached){engine?.stop();engine=null;return false;}
        return await load();
      }catch{if(current===epoch){engine?.stop();engine=null;publish({phase:'idle'});}return false;}
    })();return warming;
  }
  return {
    getSnapshot:()=>state,
    subscribe:listener=>{listeners.add(listener);return()=>listeners.delete(listener);},
    warm,
    load:async()=>{if(state.phase==='checking')await warming;return load();},
    release,
    setAutomatic(value){try{storage?.setItem(AUTO_AI_KEY,value?'on':'off');}catch{/* Session preference remains usable. */}publish({automatic:value});if(!value)release();else{warming=null;void warm();}},
    async generate(messages){
      if(state.phase==='loading')await loading;
      if(state.phase!=='ready')throw Object.assign(Error('not-ready'),{code:'not-ready'});
      const current=epoch;publish({phase:'generating'});
      try{const output=await client().generate(messages);if(current!==epoch)throw Object.assign(Error('cancelled'),{code:'cancelled'});publish({phase:'ready'});return output;}
      catch(error){if(current===epoch){release();publish({phase:'error',error:'A interpretação não terminou. Seu texto foi preservado.'});}throw error;}
    },
    async clear(){
      release();const current=epoch;publish({phase:'clearing'});
      try{await client().clear();if(current!==epoch)return;engine?.stop();engine=null;publish({phase:'idle',cached:false});}
      catch{if(current===epoch){engine?.stop();engine=null;publish({phase:'error',error:'Não foi possível remover todos os arquivos do modelo. Tente novamente.'});}}
    },
  };
}
export const mealRuntime=createMealRuntime();
