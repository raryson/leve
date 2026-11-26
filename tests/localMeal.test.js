import test from 'node:test';
import assert from 'node:assert/strict';
import {foods} from '../src/foods.js';
import {mealMessages,parseLocalMeal,localMealItems} from '../src/localMeal.js';
import {createLocalMealEngine} from '../src/localMealEngine.js';
import {applyEntry} from '../src/entries.js';
import {newDay,normalizeState} from '../src/domain.js';

const item=(patch={})=>({description:'Arroz branco',foodId:'taco-3',quantity:150,unit:'g',question:'',...patch});
const parse=items=>parseLocalMeal(JSON.stringify({items}),foods);
test('IA usa catálogo para calorias, exige confirmação e conserva líquidos no diário',()=>{
  const rows=parse([item({foodId:'taco-371',calories:999999,kcalPer100:9999}),item({description:'Café com leite sem açúcar',foodId:'coffee-milk-half',quantity:150,unit:'ml'})]);
  assert.throws(()=>localMealItems(rows,foods),/Confirme/);
  const reviewed=localMealItems(rows.map(r=>({...r,confirmed:true})),foods);
  assert.equal(reviewed[0].calories,192);assert.equal(reviewed[0].grams,150);
  assert.equal(reviewed[1].calories,48);assert.equal(reviewed[1].milliliters,150);assert.equal(reviewed[1].grams,null);
  assert.equal(reviewed[0].entryMethod,'reviewed-local-ai');
});
test('alimentos desconhecidos e porções ambíguas ficam pendentes, sem trocar unidades ou adivinhar gramas',()=>{
  const rows=parse([item({description:'Pastel médio',foodId:'invented',quantity:5,unit:'unit'}),item({description:'Xícara de café',foodId:'coffee-milk-half',quantity:1,unit:'unknown'}),item({description:'Arroz branco',foodId:'taco-3',quantity:200,unit:'ml'})]);
  assert.equal(rows.length,3);assert.equal(rows[0].foodId,'');assert.ok(rows.every(r=>r.amount===''));
  assert.throws(()=>localMealItems(rows.map(r=>({...r,confirmed:true})),foods));
  const fruit=parse([item({description:'Ameixa, crua',foodId:'taco-172',quantity:2,unit:'unit'})])[0];
  assert.equal(fruit.amount,84);assert.equal(fruit.estimated,true);assert.equal(fruit.confirmed,false);
  const spoon=parse([item({description:'Pasta de amendoim integral',foodId:'sbd-power-one-integral',quantity:2,unit:'tablespoon'})])[0];assert.equal(spoon.amount,30);
});
test('saídas incompletas, não finitas e excessivas são recusadas sem produzir um registro parcial',()=>{
  for(const content of ['oops','{"items":[]}',JSON.stringify({items:[item(),item({quantity:-1})]}),JSON.stringify({items:[item({quantity:'150'})]}),JSON.stringify({items:[item({unit:'cup'})]}),JSON.stringify({items:Array(31).fill(item())})])assert.throws(()=>parseLocalMeal(content,foods));
  const row=parse([item()])[0];for(const amount of ['',0,-1,Infinity,10001])assert.throws(()=>localMealItems([{...row,confirmed:true,amount}],foods));
  assert.throws(()=>mealMessages('a'.repeat(2501),foods));
});
test('prompt só recebe descrição e exemplos genéricos, sem catálogo, perfil, calorias ou diário',()=>{
  const messages=mealMessages('150 g arroz',foods,'en');
  assert.equal(messages.length,2);assert.match(messages[0].content,/English/);assert.equal(messages[1].content,'150 g arroz');
  assert.doesNotMatch(messages[0].content,/"kcal"|"sourceUrl"|"profile"|"days"|taco-3/);
});
test('salvar itens revisados segue o diário existente sem mudar água, pesos ou o plano',()=>{
  const state={version:8,profile:{name:'Teste',age:30,height:175,weight:80},weights:[80],days:[{...newDay('2026-11-25'),waterMl:500}],mealPlan:null};
  const before=structuredClone(state);
  const rows=parse([item(),item({description:'Banana prata',quantity:2,unit:'unit'})]);
  const items=localMealItems(rows.map(r=>({...r,confirmed:true})),foods);
  const saved=applyEntry(state,{type:'meal',id:'local-ai-test',date:'2026-11-25',time:'20:00',name:'Jantar',items});
  assert.deepEqual(state,before);assert.deepEqual(saved.weights,state.weights);assert.equal(saved.days[0].waterMl,500);
  assert.equal(saved.days[0].totalCalories,270);assert.equal(saved.days[0].meals[0].items[1].estimated,true);
  const roundTrip=normalizeState(JSON.parse(JSON.stringify(saved)));
  assert.equal(roundTrip.days[0].meals[0].items[0].entryMethod,'reviewed-local-ai');
});
test('worker só nasce no clique, não aceita concorrência e ignora resposta cancelada',async()=>{
  const workers=[];const make=()=>{const worker={postMessage(message){this.sent=message;},terminate(){this.terminated=true;}};workers.push(worker);return worker;};
  const engine=createLocalMealEngine(make);assert.equal(workers.length,0);
  const progress=[];const loading=engine.load(p=>progress.push(p));assert.equal(workers.length,1);
  await assert.rejects(engine.load(),{code:'busy'});
  const first=workers[0];first.onmessage({data:{id:first.sent.id,type:'progress',progress:.5}});first.onmessage({data:{id:first.sent.id,type:'result',result:true}});
  assert.equal(await loading,true);assert.deepEqual(progress,[.5]);
  const pending=engine.generate([]);const cancelled=assert.rejects(pending,{code:'cancelled'});engine.stop();await cancelled;assert.equal(first.terminated,true);
  const retry=engine.load();const second=workers[1];first.onmessage({data:{id:first.sent.id,type:'result',result:'stale'}});
  second.onmessage({data:{id:second.sent.id,type:'result',result:true}});assert.equal(await retry,true);engine.stop();
});
