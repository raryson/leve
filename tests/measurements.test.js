import test from 'node:test';
import assert from 'node:assert/strict';
import {foods} from '../src/foods.js';
import {sliceGrams,portionCalories,normalizeSavedMeal,normalizeState,newDay,useSavedMeal,saveState,readState,KEY} from '../src/domain.js';
import {parseMealText,reviewedItems} from '../src/mealText.js';
import {createJournalHandler} from '../server/journal.js';

const food=id=>foods.find(f=>f.id===id);
const bread=()=>({food:food('taco-52').name,foodId:'taco-52',grams:50,kcalPer100:253,servingUnit:'slice',servings:2,gramsPerSlice:25});
const drink=(id='coca-cola-original',milliliters=200)=>({food:food(id).name,foodId:id,unit:'ml',milliliters,kcalPer100Ml:food(id).kcal});
const model=()=>({id:'breakfast',name:'Teste de porções',items:[bread(),drink()]});
const state=()=>normalizeState({version:5,profile:{name:'Teste',age:30,height:175,weight:90},days:[],weights:[90]});

test('fatias usam peso editável, frações e limites sem mudar a referência nutricional',()=>{
  assert.equal(food('taco-52').slice.grams,25);
  assert.equal(sliceGrams(2,25),50);assert.equal(portionCalories(sliceGrams(2,25),253),127);
  assert.equal(portionCalories(sliceGrams(2,30),253),152);assert.equal(sliceGrams(.5,25),12.5);
  for(const [count,weight] of [[0,25],[-1,25],[101,25],[2,0],[2,Infinity],[100,500]])assert.throws(()=>sliceGrams(count,weight));
  assert.throws(()=>normalizeSavedMeal({...model(),items:[{...bread(),grams:60}]}));
});

test('bebidas usam kcal por 100 ml, sem converter volume em massa',()=>{
  for(const [id,volume,expected] of [['coca-cola-original',200,85],['coca-cola-original',350,149],['coca-cola-zero',200,0],['coffee-milk-half',200,65],['del-valle-orange',200,88],['nespresso-espresso',40,1]]){
    const item=normalizeSavedMeal({...model(),items:[drink(id,volume)]}).items[0];
    assert.equal(item.calories,expected);assert.equal(item.milliliters,volume);assert.equal(item.grams,null);assert.equal(item.kcalPer100,null);assert.equal(item.quantity,`${volume} ml`);
  }
  assert.equal(food('coffee-milk-half').kcal,(food('nespresso-espresso').kcal+food('ninho-whole-prepared').kcal)/2);
  for(const patch of [{milliliters:0},{milliliters:Infinity},{milliliters:''},{kcalPer100Ml:null},{kcalPer100Ml:-1},{unit:'liters'},{servingUnit:'slice'}])assert.throws(()=>normalizeSavedMeal({...model(),items:[{...drink(),...patch}]}));
});

test('modelos mistos, repetição e backup preservam unidades e recalculam apenas novas porções',()=>{
  const saved=normalizeSavedMeal(model()),changed=structuredClone(saved);
  changed.items[0].servings=3;changed.items[0].grams=75;changed.items[1].milliliters=350;
  const day=useSavedMeal({...newDay('2026-10-14'),waterMl:500},'Lanche',changed);
  assert.equal(day.totalCalories,339);assert.equal(day.waterMl,500);assert.equal(saved.items[0].servings,2);assert.equal(saved.items[1].milliliters,200);
  const s=normalizeState({...state(),days:[day],savedMeals:[saved]});
  const data=new Map(),storage={getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)};
  saveState(storage,s);assert.deepEqual(readState(storage).state,s);assert.ok(data.has(KEY));
});

test('migração v5 mantém gramas, calorias históricas e modelos antigos sem inferir fatias',()=>{
  const old={food:'Pão integral',foodId:'taco-52',grams:50,kcalPer100:253,calories:120,quantity:'50 g'};
  const s=normalizeState({...state(),version:5,days:[{date:'2026-10-13',meals:[{name:'Lanche',items:[old]}]}],savedMeals:[{id:'old',name:'Antigo',items:[old]}]});
  assert.equal(s.version,6);assert.equal(s.days[0].totalCalories,120);assert.equal(s.days[0].meals[0].items[0].quantity,'50 g');assert.equal(s.savedMeals[0].items[0].grams,50);assert.equal(s.savedMeals[0].items[0].servingUnit,undefined);
});

test('relato reconhece fatias de pão em português/inglês e não atribui massa às bebidas',()=>{
  for(const [text,lang] of [['duas fatias de pão integral','pt'],['two slices of whole wheat bread','en']]){
    const item=reviewedItems(parseMealText(text,lang).rows)[0];assert.equal(item.grams,50);assert.equal(item.calories,127);assert.equal(item.servings,2);assert.equal(item.gramsPerSlice,25);
  }
  assert.equal(parseMealText('duas fatias de sorvete').rows[0].grams,'');
  assert.equal(parseMealText('200 ml de Coca-Cola').rows[0].foodId,'');
  assert.throws(()=>reviewedItems([{foodId:'coca-cola-original',grams:200,text:'coca'}]),/ml/);
});

test('API sincroniza modelos e diário com fatias e ml, vinculados ao dono autenticado',async()=>{
  let stored;
  const handler=createJournalHandler({authenticate:async()=>'synthetic-owner',repository:{put:async(owner,value)=>{assert.equal(owner,'synthetic-owner');stored=value;return {state:value,revision:1};}}});
  const value={...state(),savedMeals:[model()],days:[useSavedMeal(newDay('2026-10-14'),'Lanche',model())]};
  const response=await handler(new Request('https://leve.test/api/journal',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({baseRevision:0,operationId:'measurement-operation-12345',state:value})}));
  assert.equal(response.status,200);assert.equal(stored.days[0].totalCalories,212);assert.equal(stored.savedMeals[0].items[0].gramsPerSlice,25);assert.equal(stored.days[0].meals[0].items[1].milliliters,200);
});
