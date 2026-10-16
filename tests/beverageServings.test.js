import test from 'node:test';
import assert from 'node:assert/strict';
import {foods} from '../src/foods.js';
import {alcoholicDrinks} from '../src/alcoholicDrinks.js';
import {beverageServings} from '../src/beverageServings.js';
import {searchFoods} from '../src/foodLibrary.js';
import {normalizeSavedMeal,newDay,useSavedMeal,normalizeDay,portionCalories} from '../src/domain.js';
const food=id=>foods.find(f=>f.id===id);
test('copos usam volume declarado e drinks usam rendimento da receita, sem inferir gelo ou massa',()=>{
  assert.deepEqual(beverageServings(food('taco-3')),[]);
  assert.equal(beverageServings(food('coca-cola-original')).find(s=>s.id==='americano').ml,190);
  assert.equal(beverageServings(food('coffee-milk-half')).find(s=>s.id==='mug').ml,300);
  assert.equal(beverageServings(food('sbd-beer')).find(s=>s.id==='pint').ml,500);
  assert.deepEqual(beverageServings(food('ref-negroni')).map(s=>s.ml),[90,180]);
  assert.deepEqual(beverageServings(food('ref-mimosa')).map(s=>s.ml),[150,300]);
  assert.ok(!beverageServings(food('bombay-gin-40')).some(s=>s.ml>60));
});
test('álcool e açúcar entram nas calorias; modelos e diário preservam ml sem somar à água',()=>{
  for(const [id,ml,kcal] of [['sbd-beer',350,143],['martini-rosso',60,87],['sbd-wine-red',150,108],['sbd-wine-white',150,99],['bombay-gin-40',50,110],['sbd-caipirinha',200,240],['ref-negroni',90,185],['ref-mimosa',150,101]]){
    const f=food(id);assert.equal(portionCalories(ml,f.kcal),kcal);
    const model=normalizeSavedMeal({id:'drink-model',name:'Bebida de teste',items:[{food:f.name,foodId:id,unit:'ml',milliliters:ml,kcalPer100Ml:f.kcal,referenceNote:f.note}]});
    const day=normalizeDay(JSON.parse(JSON.stringify(useSavedMeal({...newDay('2026-10-16'),waterMl:250},'Jantar',model))));
    assert.equal(day.waterMl,250);assert.equal(day.totalCalories,kcal);assert.equal(day.meals[0].items[0].milliliters,ml);assert.equal(day.meals[0].items[0].grams,null);assert.equal(day.meals[0].items[0].referenceNote,f.note);
    assert.equal(portionCalories(ml*2,f.kcal),Math.round(ml*2*f.kcal/100));
  }
});
test('bebidas alcoólicas ficam na categoria local e são encontradas em português e inglês',()=>{
  assert.equal(searchFoods('','Bebidas alcoólicas').length,8);
  assert.equal(searchFoods('dry red wine','Bebidas alcoólicas')[0].id,'sbd-wine-red');
  assert.equal(searchFoods('vermute','Bebidas alcoólicas')[0].id,'martini-rosso');
  for(const f of alcoholicDrinks){assert.equal(f.unit,'ml');assert.ok(f.sourceUrl&&f.note);assert.ok(Number.isFinite(f.kcal)&&f.kcal>0);assert.ok(beverageServings(f).length);}
});
