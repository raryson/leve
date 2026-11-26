import {MLCEngine,deleteModelAllInfoInCache,hasModelInCache} from '@mlc-ai/web-llm';
import {LOCAL_MEAL_MODEL,LOCAL_MEAL_SCHEMA} from './localMeal.js';

let engine;
self.onmessage=async({data})=>{
  const {id,type,messages}=data;
  try{
    if(type==='status'){
      self.postMessage({id,type:'result',result:await hasModelInCache(LOCAL_MEAL_MODEL)});
    }else if(type==='load'){
      engine=new MLCEngine({logLevel:'SILENT',initProgressCallback:report=>self.postMessage({id,type:'progress',progress:Math.min(1,Math.max(0,report.progress||0))})});
      await engine.reload(LOCAL_MEAL_MODEL,{context_window_size:4096});
      self.postMessage({id,type:'result',result:true});
    }else if(type==='generate'){
      if(!engine)throw Error('not-loaded');
      await engine.resetChat();
      const reply=await engine.chat.completions.create({messages,temperature:0,max_tokens:1536,response_format:{type:'json_object',schema:JSON.stringify(LOCAL_MEAL_SCHEMA)}});
      if(reply.choices?.[0]?.finish_reason==='length')throw Error('incomplete');
      self.postMessage({id,type:'result',result:reply.choices?.[0]?.message?.content||''});
      await engine.resetChat();
    }else if(type==='clear'){
      if(engine)await engine.unload();
      engine=null;
      await deleteModelAllInfoInCache(LOCAL_MEAL_MODEL);
      self.postMessage({id,type:'result',result:true});
    }
  }catch(error){self.postMessage({id,type:'error',code:type==='load'?'load':type==='clear'?'clear':'generate'});}
};
