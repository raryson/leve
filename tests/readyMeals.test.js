import test from 'node:test';
import assert from 'node:assert/strict';
import {readyMeals} from '../src/readyMeals.js';
import {searchFoods} from '../src/foodLibrary.js';
import {portionCalories,normalizeSavedMeal,newDay,useSavedMeal,normalizeDay} from '../src/domain.js';
import {itemQuantity} from '../src/foodLabels.js';
import {setLanguage} from '../src/i18n.js';
const food=id=>readyMeals.find(f=>f.id===id);
test('porções de sushi e pizza escalam sem confundir peças com gramas',()=>{
  const sushi=food('ready-sushi-mix');
  assert.deepEqual(sushi.presets.map(p=>portionCalories(p.grams,sushi.kcal)),[445,890,1335,1780]);
  for(const [id,expected] of [['ready-pizza-mozzarella',[556,1112,2224]],['ready-pizza-calabresa',[480,960,1920]]])assert.deepEqual(food(id).presets.map(p=>portionCalories(p.grams,food(id).kcal)),expected);
  assert.equal(portionCalories(400,food('ready-poke-salmon').kcal),527);
  const values=['simple','bacon','double','double-bacon'].map(v=>{const f=food('ready-burger-'+v);return portionCalories(f.defaultAmount,f.kcal);});
  assert.deepEqual(values,[666,875,1092,1301]);
});
test('combinação salva e diário preservam estimativa; editar massa não mantém rótulo de fração incorreto',()=>{
  const f=food('ready-pizza-mozzarella');
  const saved=normalizeSavedMeal({id:'pizza-test',name:'Pizza',items:[{foodId:f.id,food:f.name,grams:200,kcalPer100:f.kcal,referenceNote:f.note}]});
  const day=useSavedMeal(newDay('2026-10-16'),'Jantar',saved);
  const item=normalizeDay(JSON.parse(JSON.stringify(day))).meals[0].items[0];
  setLanguage('pt');assert.equal(itemQuantity(item),'¼ de pizza · 200 g');assert.equal(item.calories,556);assert.equal(item.referenceNote,f.note);
  const changed=normalizeSavedMeal({...saved,items:[{...saved.items[0],grams:350}]}).items[0];
  assert.equal(itemQuantity(changed),'350 g');assert.equal(changed.calories,973);assert.equal(saved.items[0].grams,200);
  try{setLanguage('en');assert.equal(itemQuantity(item),'¼ pizza · 200 g');}finally{setLanguage('pt');}
});
test('categoria local inclui todas as refeições e busca aceita português e inglês',()=>{
  assert.equal(searchFoods('','Refeições prontas').length,9);
  assert.equal(searchFoods('poke salmao','Refeições prontas')[0].id,'ready-poke-salmon');
  assert.equal(searchFoods('double bacon','Refeições prontas')[0].id,'ready-burger-double-bacon');
  for(const f of readyMeals){assert.ok(f.note);assert.ok(Number.isFinite(f.kcal)&&f.kcal>0&&f.kcal<=1000);assert.ok(f.presets.some(p=>p.grams===f.defaultAmount));}
});
