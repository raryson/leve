import test from 'node:test';
import assert from 'node:assert/strict';
import {foods} from '../src/foods.js';
import {mealMessages,parseLocalMeal,localMealItems,groundLocalMeal} from '../src/localMeal.js';
import {createLocalMealEngine} from '../src/localMealEngine.js';
import {applyEntry} from '../src/entries.js';
import {newDay,normalizeState} from '../src/domain.js';

const item=(patch={})=>({description:'Arroz branco',foodId:'taco-3',quantity:150,unit:'g',question:'',...patch});
const parse=items=>parseLocalMeal(JSON.stringify({items}),foods);
const breakfast='cafe da manha, ta sendo duas fatias de pao integral, uma colher de pasta de amendoim, um pouquiinho de geleia de figo e dois pessegos';

test('relato real de arroz e peito assado mantém 200 g e 190 g com unidade abreviada',()=>{
  const text='200 gramas de arroz, 190 de peito de frango asado e salada de tomate e alface';
  const result=groundLocalMeal(text,foods);assert.equal(result.complete,true);
  assert.deepEqual(result.rows.map(r=>[r.foodId,r.amount]),[['taco-3',200],['usda-05064',190],['taco-157',15],['taco-77',15]]);
  assert.match(result.rows[0].assumption,/arroz branco cozido/);assert.match(result.rows[1].assumption,/gramas.*anterior/);assert.match(result.rows[1].assumption,/sem pele/);
  const lost=JSON.stringify({items:[item({description:'Arroz',quantity:null,unit:'unknown'}),item({description:'Peito de frango assado',quantity:null,unit:'unknown'})]});
  const recovered=parseLocalMeal(lost,foods,text);assert.deepEqual(recovered.map(r=>r.amount),[200,190,15,15]);
  const saved=localMealItems(recovered.map(r=>({...r,confirmed:true})),foods);assert.equal(saved[0].calories,256);assert.equal(saved[1].calories,314);
});

test('tipo do arroz e pele/preparo do peito explícitos prevalecem sobre padrões',()=>{
  for(const [text,foodId] of [['200 g de arroz integral','taco-1'],['190 g de peito de frango assado com pele','taco-406'],['190 g de peito de frango assado sem pele','usda-05064'],['190 g de peito de frango cozido','taco-408'],['190 g de peito de frango grelhado','taco-410']]){
    const result=groundLocalMeal(text,foods);assert.equal(result.complete,true,text);assert.equal(result.rows[0].foodId,foodId,text);assert.ok(result.rows[0].amount>=190);
  }
  assert.equal(groundLocalMeal('200 g de arroz cru',foods).complete,false);
  assert.equal(groundLocalMeal('190 g de peito de frango frito',foods).complete,false);
});

test('unidade implícita não atravessa bebidas e não transforma frutas ou fatias em gramas',()=>{
  const liquid=groundLocalMeal('200 ml de café com leite e 190 de peito de frango assado',foods);assert.equal(liquid.rows[1].amount,'');
  const fruit=groundLocalMeal('200 g de arroz e 2 de banana prata',foods);assert.equal(fruit.rows[1].amount,80);assert.equal(fruit.rows[1].unit,'unit');
  const bread=groundLocalMeal('200 g de arroz e 2 de pão integral',foods);assert.equal(bread.rows[1].amount,'');
  const mixed=groundLocalMeal('200 g de arroz e 2 bananas prata e 190 de peito de frango assado',foods);assert.equal(mixed.rows[2].amount,'');
  const plain=groundLocalMeal('Arroz e peito de frango assado',foods);assert.ok(plain.rows.every(r=>r.foodId&&r.amount===''));
});

test('relato real mantém pão, colher, geleia e pêssegos com quantidades de cada trecho',()=>{
  const result=groundLocalMeal(breakfast,foods);
  assert.equal(result.complete,true);
  assert.deepEqual(result.rows.map(r=>[r.foodId,r.quantity,r.amount]),[['taco-52',2,50],['sbd-power-one-integral',1,15],['jam-fig-casa-madeira',null,''],['taco-244',2,120]]);
  assert.ok(result.rows.every(r=>r.estimated&&!r.confirmed));
  assert.match(result.rows[1].question,/colher de sopa/);assert.match(result.rows[2].question,/pouquinho/);
  const wrong=JSON.stringify({items:[item({description:'Peixes',quantity:null,unit:'unknown'})]});
  const fixed=parseLocalMeal(wrong,foods,breakfast);
  assert.equal(fixed.length,4);assert.deepEqual(fixed.map(r=>r.foodId),result.rows.map(r=>r.foodId));
});
test('origem preserva itens omitidos; gramas, geleias e correções não viram unidades de fruta',()=>{
  const partial=groundLocalMeal('duas fatias de pao integral e 2 temakis pequenos',foods);assert.equal(partial.complete,false);
  const rows=parseLocalMeal(JSON.stringify({items:[item({description:'Pão integral',quantity:null,unit:'unknown'})]}),foods,'duas fatias de pao integral e 2 temakis pequenos');
  assert.equal(rows.length,2);assert.equal(rows[0].amount,50);assert.equal(rows[1].foodId,'');assert.match(rows[1].description,/temakis/);
  const grams=groundLocalMeal('120 g de pessegos',foods);assert.equal(grams.rows[0].amount,120);
  const coffee=groundLocalMeal('150 ml de cafe com leite sem acucar',foods);assert.equal(coffee.complete,true);assert.equal(coffee.rows[0].amount,150);assert.equal(coffee.rows[0].unit,'ml');
  const jam=groundLocalMeal('uma colher de geleia de pessego',foods);assert.equal(jam.rows[0].foodId,'jam-peach-hiperfoods');assert.equal(jam.rows[0].amount,20);
  assert.equal(groundLocalMeal('dois pessegos em calda',foods).complete,false);
  assert.equal(groundLocalMeal('dois pessegos, na verdade um',foods).complete,false);
  assert.equal(groundLocalMeal('nao comi pessegos',foods).rows.length,0);
});
test('medidas por extenso e plurais também mantêm o alimento em inglês',()=>{
  const result=groundLocalMeal('two slices of whole wheat bread and two peaches',foods,'en');
  assert.equal(result.complete,true);assert.deepEqual(result.rows.map(r=>r.amount),[50,120]);
});
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
