import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMealPlan,normalizeMealPlan,mealPlanSlot} from '../src/mealPlan.js';
import {normalizeState,newDay} from '../src/domain.js';
import {applyEntry} from '../src/entries.js';
import {createJournalHandler} from '../server/journal.js';

const sample='MEU PLANO\nCAFÉ DA MANHÃ\nOpção 1:\n- 2 fatias de pão\n- 1 fruta\nALMOÇO\nOpção 1 — Arroz:\n- 200 g de arroz\n- Salada\nOpção 2 — Batata:\n- 100 a 200 g de batata\nLANCHE DA TARDE\nOpção 1:\n- Iogurte\nJANTAR\nOpção 1:\n- Repetir uma das opções do almoço\nMETAS DIÁRIAS\nÁgua: referência pessoal\nOBJETIVO\nMinha rotina';
const state=()=>normalizeState({version:7,profile:{name:'Teste',age:30,height:170,weight:80},weights:[80],days:[{...newDay('2026-11-24'),waterMl:500,meals:[{name:'Almoço',items:[{food:'Teste',calories:100}]}]}]});
test('importa opções sem inventar porções, calorias ou transformar metas em ingredientes',()=>{
  const plan=parseMealPlan(sample);assert.deepEqual(plan.slots.map(s=>s.options.length),[1,2,1,1]);
  assert.equal(plan.slots[0].options[0].lines[1],'1 fruta');
  assert.equal(plan.slots[1].options[1].lines[0],'100 a 200 g de batata');
  assert.equal(plan.slots[3].options[0].lines.length,1);assert.match(plan.notes,/Minha rotina/);
  assert.equal(plan.slots[0].options[0].calories,undefined);
});
test('horário considera a ordem cronológica e respeita limites editáveis',()=>{
  const plan=parseMealPlan(sample);assert.equal(mealPlanSlot(plan,'11:59').id,'breakfast');assert.equal(mealPlanSlot(plan,'12:00').id,'lunch');assert.equal(mealPlanSlot(plan,'19:00').id,'dinner');assert.equal(mealPlanSlot(plan,'00:00').id,'breakfast');
  plan.slots.reverse();assert.equal(mealPlanSlot(plan,'16:05').id,'snack');
  assert.equal(mealPlanSlot(plan,'27:00'),null);
  assert.throws(()=>normalizeMealPlan({...plan,slots:[{...plan.slots[0],time:'25:00'}]}));
  assert.throws(()=>normalizeMealPlan({...plan,slots:[plan.slots[0],plan.slots[0]]}));
  assert.throws(()=>parseMealPlan('apenas texto sem refeições'));
  assert.throws(()=>normalizeMealPlan({...plan,notes:'x'.repeat(12001)}));
});
test('v8 preserva plano particular no backup e salva só alimentos confirmados sem alterar metas ou água',()=>{
  const before=state(),plan=parseMealPlan(sample),withPlan=normalizeState({...before,mealPlan:plan});
  assert.equal(before.mealPlan,null);assert.equal(withPlan.version,8);assert.deepEqual(normalizeState(JSON.parse(JSON.stringify(withPlan))),withPlan);
  const next=applyEntry(withPlan,{id:'confirmed-meal',type:'meal',date:'2026-11-24',time:'19:00',name:'Jantar',items:[{food:'Arroz',grams:100,kcalPer100:128,calories:128}]});
  assert.equal(next.days[0].meals.length,2);assert.equal(next.days[0].waterMl,500);assert.equal(next.days[0].totalCalories,228);assert.deepEqual(next.profile,before.profile);assert.deepEqual(next.mealPlan,plan);
});
test('API autentica e normaliza o plano junto do diário sem expor outro proprietário',async()=>{
  let stored;const saved=normalizeState({...state(),mealPlan:parseMealPlan(sample)});
  const handler=createJournalHandler({authenticate:async()=>'owner',repository:{put:async(owner,value)=>{stored={owner,value};return {revision:2,state:value};}}});
  const response=await handler(new Request('https://leve.test/api/journal',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({state:saved,baseRevision:1,operationId:'plan-operation-00001'})}));
  assert.equal(response.status,200);assert.equal(stored.owner,'owner');assert.equal(stored.value.mealPlan.slots.length,4);
});
