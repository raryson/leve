import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyState, normalizeState, normalizeSavedMeal, newDay, useSavedMeal, saveState, readState, KEY } from '../src/domain.js';
import { searchFoods, trackRecentFoods } from '../src/foodLibrary.js';
import { createJournalHandler } from '../server/journal.js';

const template = () => ({ id:'lunch-home', name:'Almoço de casa', items:[
  { food:'Arroz branco tipo 1, cozido', foodId:'taco-3', grams:200, kcalPer100:128, calories:999 },
  { food:'Feijão preto, cozido', foodId:'taco-567', grams:100, kcalPer100:77, calories:999 },
] });
const state = () => normalizeState({ version:4, profile:{name:'Teste',age:30,height:175,weight:90},weights:[90],days:[] });

test('migração preserva diário antigo e inicia biblioteca vazia; backup mantém biblioteca e preferências',()=>{
  const s=state();assert.equal(s.version,5);assert.deepEqual(s.savedMeals,[]);assert.deepEqual(s.favoriteFoods,[]);
  const next=normalizeState({...s,savedMeals:[template()],favoriteFoods:['taco-3'],recentFoods:['taco-567']});
  const data=new Map();const storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
  saveState(storage,next);assert.deepEqual(readState(storage).state,next);assert.ok(data.has(KEY));
});

test('reutilizar recalcula porções sem alterar modelo, dia anterior, água ou treino',()=>{
  const saved=normalizeSavedMeal(template());assert.equal(saved.items[0].calories,256);
  const day={...newDay('2026-10-14'),waterMl:500};
  const changed=structuredClone(saved);changed.items[0].grams=150;
  const result=useSavedMeal(day,'Jantar',changed);
  assert.equal(result.totalCalories,269);assert.equal(result.waterMl,500);assert.equal(result.meals[0].name,'Jantar');
  assert.equal(saved.items[0].grams,200);assert.equal(day.meals.length,0);
  assert.equal(useSavedMeal(result,'Jantar',saved).totalCalories,602);
});

test('modelos recusam porção desconhecida, nome vazio, kcal inválidas e IDs duplicados',()=>{
  for(const patch of [{grams:''},{kcalPer100:null},{grams:-1}]){const t=template();Object.assign(t.items[0],patch);assert.throws(()=>normalizeSavedMeal(t));}
  assert.throws(()=>normalizeSavedMeal({...template(),name:' '}));
  assert.throws(()=>normalizeState({...state(),savedMeals:[template(),template()]}));
  assert.equal(normalizeSavedMeal({...template(),items:[{food:'Zero',grams:100,kcalPer100:0}]}).items[0].calories,0);
});

test('busca ignora acentos, combina palavras e filtra favoritos e recentes sem misturar referências',()=>{
  assert.ok(searchFoods('feijao preto','Todos').some(f=>f.id==='taco-567'));
  assert.equal(searchFoods('sobrecoxa sem pele','Todos').length,1);
  assert.deepEqual(searchFoods('','Favoritos',['taco-3']).map(f=>f.id),['taco-3']);
  assert.deepEqual(searchFoods('','Recentes',[],['taco-567','taco-3']).map(f=>f.id),['taco-567','taco-3']);
  assert.equal(searchFoods('sorvete','Carnes').length,0);
});

test('recentes incluem itens antigos por nome, ficam deduplicados e limitados',()=>{
  const day=useSavedMeal(newDay('2026-10-14'),'Almoço',template());
  assert.deepEqual(trackRecentFoods({recentFoods:['taco-3','taco-1']},day),['taco-567','taco-3','taco-1']);
  delete day.meals[0].items[0].foodId;
  assert.ok(trackRecentFoods({recentFoods:[]},day).includes('taco-3'));
});

test('API da conta valida e preserva modelos e favoritos no diário sincronizado',async()=>{
  let stored;
  const handle=createJournalHandler({authenticate:async()=>'verified-owner',repository:{put:async(owner,value)=>{stored=value;assert.equal(owner,'verified-owner');return {state:value,revision:1};}}});
  const value={...state(),savedMeals:[template()],favoriteFoods:['taco-3'],recentFoods:['taco-567']};
  const response=await handle(new Request('https://leve.test/api/journal',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({baseRevision:0,operationId:'library-operation-12345',state:value})}));
  assert.equal(response.status,200);assert.equal(stored.savedMeals[0].items[0].calories,256);assert.deepEqual(stored.favoriteFoods,['taco-3']);
});
