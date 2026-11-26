import test from 'node:test';
import assert from 'node:assert/strict';
import {createMealRuntime,AUTO_AI_KEY} from '../src/localMealRuntime.js';

function setup({cached=true,automatic=true,available=true}={}){
  const calls={created:0,status:0,load:0,generate:0,stop:0,clear:0},values=new Map([[AUTO_AI_KEY,automatic?'on':'off']]);
  const runtime=createMealRuntime({storage:{getItem:k=>values.get(k),setItem:(k,v)=>values.set(k,v)},compatible:async()=>available,makeEngine:()=>{calls.created++;return {status:async()=>{calls.status++;return cached;},load:async progress=>{calls.load++;progress(.4);},generate:async()=>{calls.generate++;return 'result';},clear:async()=>{calls.clear++;},stop:()=>{calls.stop++;}};}});
  return {runtime,calls,values};
}
test('abrir o app prepara somente um modelo já em cache; não baixa pesos para novos visitantes',async()=>{
  const cold=setup({cached:false});await cold.runtime.warm();assert.equal(cold.calls.status,1);assert.equal(cold.calls.load,0);assert.equal(cold.runtime.getSnapshot().phase,'idle');
  const warm=setup();await Promise.all([warm.runtime.warm(),warm.runtime.warm()]);assert.equal(warm.calls.created,1);assert.equal(warm.calls.load,1);assert.equal(warm.runtime.getSnapshot().phase,'ready');
  await warm.runtime.load();await warm.runtime.generate([]);await warm.runtime.generate([]);assert.equal(warm.calls.load,1);assert.equal(warm.calls.generate,2);
});
test('preferência desliga autoload; liberar memória e remover cache preservam os registros',async()=>{
  const paused=setup({automatic:false});await paused.runtime.warm();assert.equal(paused.calls.created,0);
  const {runtime,calls,values}=setup();await runtime.warm();runtime.setAutomatic(false);assert.equal(values.get(AUTO_AI_KEY),'off');assert.equal(runtime.getSnapshot().phase,'idle');assert.equal(runtime.getSnapshot().cached,true);
  await runtime.load();assert.equal(calls.load,2);await runtime.clear();assert.equal(runtime.getSnapshot().cached,false);assert.equal(calls.clear,1);assert.equal(values.size,1);
});
test('GPU indisponível não inicia inferência nem impede o catálogo local',async()=>{
  const {runtime,calls}=setup({available:false});await runtime.warm();assert.equal(runtime.getSnapshot().phase,'unsupported');assert.equal(calls.load,0);await assert.rejects(runtime.generate([]),{code:'not-ready'});
});
test('cancelar carregamento invalida retorno atrasado; warmup não interrompe download explícito',async()=>{
  let finish,loads=0,status=0;
  const runtime=createMealRuntime({storage:{getItem:()=>null},compatible:async()=>true,makeEngine:()=>({status:async()=>{status++;return true;},load:()=>{loads++;return new Promise(resolve=>finish=resolve);},stop:()=>{}})});
  const pending=runtime.load();await Promise.resolve();const auto=runtime.warm();assert.equal(status,0);assert.equal(loads,1);
  runtime.release();finish();await Promise.all([pending,auto]);assert.equal(runtime.getSnapshot().phase,'idle');
});
