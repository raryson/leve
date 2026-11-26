import {createJournalHandler} from '../server/journal.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {offProduct,foodSearchQuery,normalizeExternalFood,addExternalFood,suggestedFoodQuery} from '../src/externalFoods.js';
import {createFoodSearchHandler} from '../server/food-search.js';
import {normalizeState,newDay} from '../src/domain.js';
import {groundLocalMeal,localMealItems,parseLocalMeal} from '../src/localMeal.js';
import {foods} from '../src/foods.js';
import {applyEntry} from '../src/entries.js';

const product=(patch={})=>({code:'7891234567890',product_name:'Picles',brands:'Exemplo',nutrition_data_per:'100g',nutriments:{'energy-kcal_100g':24,'energy-kj_100g':100.4},data_quality_errors_tags:[],...patch});
test('rótulos externos exigem base explícita, energia finita, alimento e fonte canônica',()=>{
  const ref=offProduct(product());assert.equal(ref.kcal,24);assert.equal(ref.unit,'g');assert.equal(ref.sourceUrl,'https://world.openfoodfacts.org/product/7891234567890');
  const kj=offProduct(product({nutriments:{'energy-kj_100g':418.4}}));assert.equal(kj.kcal,100);
  for(const patch of [{nutrition_data_per:'serving'},{nutrition_data_per:undefined},{nutriments:{'energy-kcal_100g':''}},{nutriments:{'energy-kcal_100g':null}},{nutriments:{'energy-kcal_100g':Infinity}},{nutriments:{'energy-kcal_100g':-1}},{nutriments:{'energy-kcal_100g':1001}},{nutriments:{'energy-kcal_100g':24,'energy-kj_100g':3000}},{data_quality_errors_tags:['invalid']},{no_nutrition_data:'on'},{code:'https://evil.test'},{product_name:''}])assert.equal(offProduct(product(patch)),null);
  assert.throws(()=>normalizeExternalFood({...ref,sourceUrl:'https://evil.test'}));
});
test('bebida não herda unidade do tamanho da embalagem nem troca ml por gramas',()=>{
  assert.equal(offProduct(product({categories_tags:['en:beverages']})),null);
  const liquid=offProduct(product({categories_tags:['en:beverages'],nutrition_data_per:'100ml'}));assert.equal(liquid.unit,'ml');assert.equal(liquid.kcal,24);
});
test('busca envia só termo validado, sem cookies, diário ou identidade; cache e concorrência reutilizam resposta',async()=>{
  let count=0,release;const seen=[];
  const handler=createFoodSearchHandler({fetcher:async(url,options)=>{count++;seen.push({url,options});await new Promise(resolve=>release=resolve);return Response.json({hits:[product()]});}});
  const request=()=>new Request('https://leve.test/api/food-search?q=picles',{headers:{Cookie:'private',Authorization:'Bearer private'}});
  const first=handler(request()),second=handler(request());release();const responses=await Promise.all([first,second]);
  assert.deepEqual(await responses[0].json(),await responses[1].json());assert.equal(count,1);
  assert.equal(new URL(seen[0].url).hostname,'search.openfoodfacts.org');assert.equal(JSON.parse(seen[0].options.body).q,'picles');
  assert.deepEqual(Object.keys(seen[0].options.headers).sort(),['Accept','Content-Type','User-Agent']);assert.doesNotMatch(JSON.stringify(seen),/Bearer|Cookie|private|@/);
  assert.equal((await handler(request())).status,200);assert.equal(count,1);
  for(const value of ['a','https://evil.test','email@example.com','5551986598986','um dois tres quatro cinco seis sete oito nove'])assert.throws(()=>foodSearchQuery(value));
  assert.equal((await handler(new Request('https://leve.test/api/food-search?q=https://evil.test'))).status,400);
  assert.equal((await handler(new Request('https://leve.test/api/food-search?q=picles',{method:'POST'}))).status,405);
});
test('falha e limite de consultas não criam alimentos; nova tentativa funciona após o intervalo',async()=>{
  let time=0,calls=0;const handler=createFoodSearchHandler({now:()=>time,fetcher:async()=>{calls++;throw Error('offline');}});
  for(let n=0;n<4;n++)assert.equal((await handler(new Request('https://leve.test/api/food-search?q=alimento'+n))).status,503);
  assert.equal((await handler(new Request('https://leve.test/api/food-search?q=outro'))).status,429);assert.equal(calls,8);
  time=60001;assert.equal((await handler(new Request('https://leve.test/api/food-search?q=outro'))).status,503);assert.equal(calls,10);
});
test('referência escolhida persiste no diário e backup; inclusão é idempotente e não publica na comunidade',()=>{
  const state=normalizeState({profile:{name:'Teste',age:30,height:175,weight:80},weights:[80],days:[newDay('2026-11-26')]});
  const ref=offProduct(product());const added=addExternalFood(addExternalFood(state,ref),ref);assert.equal(added.externalFoods.length,1);assert.equal(state.externalFoods.length,0);
  const restored=normalizeState(JSON.parse(JSON.stringify(added)));assert.deepEqual(restored.externalFoods,[ref]);
  const items=localMealItems([{foodId:ref.id,amount:50,confirmed:true,estimated:false}],[ref]);
  const saved=applyEntry(restored,{type:'meal',id:'test',date:'2026-11-26',time:'12:00',name:'Almoço',items});assert.equal(saved.days[0].totalCalories,12);assert.equal(saved.days[0].meals[0].items[0].source,ref.sourceUrl);
  assert.throws(()=>normalizeState({...state,externalFoods:[{...ref,kcal:Infinity}]}));
});
test('sanduíche informado separa seis componentes e declara estimativas, sem inventar preparo preciso',()=>{
  assert.equal(suggestedFoodQuery('100 g de homus'),'homus');
  const text='Comi um sanduíche de pão de forma com uma colher de carne de panela, alface, tomate e picles, acompanhado de uma xícara de café com leite no almoço';
  const result=groundLocalMeal(text,foods);assert.equal(result.complete,true);
  assert.deepEqual(result.rows.map(r=>[r.foodId,r.amount]),[['sbd-white-sliced-bread',50],['sbd-beef-stew-average',30],['taco-77',15],['taco-157',15],['sbd-pickled-cucumber',15],['coffee-milk-half',200]]);
  assert.ok(result.rows.every(row=>row.estimated&&row.assumption));
  assert.equal(groundLocalMeal(text.replace('no almoço','sem açúcar no almoço'),foods).complete,true);
  const volume=groundLocalMeal('uma xícara com 150 ml de café com leite',foods);assert.equal(volume.rows[0].amount,150);
  const negated=groundLocalMeal('Comi um sanduíche de pão de forma sem picles',foods);assert.equal(negated.complete,false);
  const items=localMealItems(result.rows.map(row=>({...row,confirmed:true})),foods);assert.ok(items.every(item=>item.referenceNote.length));
  const explicit=groundLocalMeal('Comi um sanduíche com 4 fatias de pão de forma e 60 g de carne de panela e 150 ml de café com leite',foods);assert.equal(explicit.rows[0].amount,100);assert.equal(explicit.rows[1].amount,60);assert.equal(explicit.rows[2].amount,150);
  const unknown=groundLocalMeal('Comi um sanduíche de pão de forma com 1 colher de carne de panela e ingrediente misterioso',foods);assert.equal(unknown.complete,false);assert.match(unknown.rows.at(-1).description,/ingrediente misterioso/);
  const preserved=parseLocalMeal(JSON.stringify({items:[{description:'Carne de panela',quantity:1,unit:'tablespoon',question:''}]}),foods,'2 fatias de pão de forma e ingrediente misterioso');assert.equal(preserved.length,2);assert.equal(preserved.at(-1).foodId,'');
});

test('API autenticada preserva catálogo externo no envio e recebimento sem trocar a conta',async()=>{
  const reference={...offProduct(product()),searchAliases:['picles teste']};
  const state=addExternalFood(normalizeState({profile:{name:'Teste',age:30,height:175,weight:80},weights:[80],days:[]}),reference);
  let stored;const handler=createJournalHandler({authenticate:async()=> 'user-test',repository:{put:async(owner,state)=>{assert.equal(owner,'user-test');stored=state;return {revision:1,state};},get:async owner=>{assert.equal(owner,'user-test');return {revision:1,state:stored};}}});
  const response=await handler(new Request('https://leve.test/api/journal',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({state,baseRevision:0,operationId:'external-reference-test'})}));assert.equal(response.status,200);
  const remote=await(await handler(new Request('https://leve.test/api/journal'))).json();assert.deepEqual(remote.state.externalFoods,state.externalFoods);
  const result=groundLocalMeal('50 g de picles teste',[...foods,...remote.state.externalFoods]);assert.equal(result.complete,true);assert.equal(result.rows[0].foodId,reference.id);assert.equal(result.rows[0].amount,50);
});

test('falha 503 no endpoint moderno usa alternativa oficial; limite 429 não é contornado',async()=>{
  const requests=[];const fallback=createFoodSearchHandler({fetcher:async url=>{requests.push(String(url));return String(url).startsWith('https://search.openfoodfacts.org/')?new Response('Unavailable',{status:503}):Response.json({products:[product()]});}});
  const response=await fallback(new Request('https://leve.test/api/food-search?q=picles'));
  assert.equal(response.status,200);assert.equal((await response.json()).foods[0].kcal,24);assert.equal(requests.length,2);
  assert.ok(requests[1].startsWith('https://world.openfoodfacts.org/cgi/search.pl?'));
  let count=0;const limited=createFoodSearchHandler({fetcher:async()=>{count++;return new Response('',{status:429});}});
  const rate=await limited(new Request('https://leve.test/api/food-search?q=picles'));assert.equal(rate.status,429);assert.equal(rate.headers.get('Retry-After'),'60');assert.equal(count,1);
});

test('indisponibilidade usa cache anterior identificado, sem cachear erro nem inventar referência',async()=>{
  let time=0,online=true;const handler=createFoodSearchHandler({now:()=>time,fetcher:async()=>online?Response.json({hits:[product()]}):new Response('Unavailable',{status:503})});
  const request=()=>new Request('https://leve.test/api/food-search?q=picles');
  assert.equal((await handler(request())).status,200);online=false;time=86400001;
  const stale=await handler(request());assert.equal(stale.status,200);assert.equal(stale.headers.get('Cache-Control'),'no-store');const saved=await stale.json();assert.equal(saved.stale,true);assert.equal(saved.foods[0].kcal,24);
  time=7*86400000+1;const failed=await handler(request());assert.equal(failed.status,503);assert.equal((await failed.json()).code,'provider-unavailable');
});

test('relato original sem tipo de pão reconhece salada e café; só o pão não especificado permanece desconhecido',()=>{
  const text='comi um sanduiche de carne de panela com salade de alface, tomate e picles e acompanhado de um café com liete de almoço';
  const result=groundLocalMeal(text,foods);
  assert.deepEqual(result.rows.map(r=>r.foodId),['sbd-beef-stew-average','taco-77','taco-157','sbd-pickled-cucumber','coffee-milk-half','']);
  assert.deepEqual(result.rows.slice(1,4).map(r=>r.amount),[15,15,15]);assert.equal(result.rows[4].amount,200);assert.match(result.rows.at(-1).description,/pao/);
  assert.equal(groundLocalMeal('salada de alface',foods).rows[0].foodId,'taco-77');
  const cup=groundLocalMeal('uma xicara de cafe com liete de almoco',foods).rows[0];assert.equal(cup.foodId,'coffee-milk-half');assert.equal(cup.amount,200);
  const model=parseLocalMeal(JSON.stringify({items:[{description:'Salada de alface',quantity:15,unit:'g',question:''},{description:'Café com liete',quantity:200,unit:'ml',question:''}]}),foods);
  assert.deepEqual(model.map(r=>[r.foodId,r.amount]),[['taco-77',15],['coffee-milk-half',200]]);
});

test('estimativas da salada não substituem pesos e ingredientes extras continuam pendentes',()=>{
  const text='Comi um sanduíche de pão de forma com salada de alface, 45 g de tomate e picles e uma xícara de café com liete de almoço';
  const result=groundLocalMeal(text,foods);assert.equal(result.complete,true);
  assert.deepEqual(result.rows.map(r=>r.amount),[50,15,45,15,200]);assert.equal(result.rows[2].estimated,false);
  assert.match(result.rows[1].assumption,/15 g/);
  const unknown=groundLocalMeal(text+' e molho misterioso',foods);assert.equal(unknown.rows.at(-1).foodId,'');assert.match(unknown.rows.at(-1).description,/molho misterioso/);
  const noContext=groundLocalMeal('alface e tomate',foods);assert.ok(noContext.rows.every(r=>r.amount===''));
});
