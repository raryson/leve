import test from 'node:test';
import assert from 'node:assert/strict';
import {downloadCatalog} from '../src/catalogDownload.js';
import {asCatalogFood,validateCommunityFood} from '../src/communityFood.js';
import {foods} from '../src/foods.js';
import {groundLocalMeal,localMealItems,parseLocalMeal} from '../src/localMeal.js';
import {parseMealText} from '../src/mealText.js';
import {createFoodsRepository} from '../server/foods-db.js';

const record=i=>({id:`00000000-0000-4000-8000-${String(i).padStart(12,'0')}`,status:'published',version:1,food:validateCommunityFood({name:`Alimento de teste ${i}`,brand:'Marca exemplo',preparation:'Pronto',category:'Outros',kcal:100,sourceText:'Rótulo: 100 kcal por 100 g.',sourceUrl:'https://example.com/rotulo',portion:{grams:40,calories:40}})});

test('baixa 1301 alimentos em todas as páginas, preserva privados e moderação da primeira',async()=>{
  const all=Array.from({length:1301},(_,i)=>record(i)),calls=[];
  const result=await downloadCatalog(async path=>{
    calls.push(path);const offset=Number(new URL(path,'https://leve.test').searchParams.get('offset'));
    return {publicFoods:all.slice(offset,offset+100),nextOffset:offset+100<all.length?offset+100:null,mine:offset?[]:[record(2000)],moderation:offset?[]:[record(2001)],moderationNextOffset:100};
  });
  assert.equal(result.publicFoods.length,1301);assert.equal(result.nextOffset,null);assert.equal(calls.length,14);
  assert.ok(calls.slice(1).every(path=>path.endsWith('&publicOnly=1')));
  assert.equal(result.mine[0].id,record(2000).id);assert.equal(result.moderationNextOffset,100);
  const last=asCatalogFood(result.publicFoods.at(-1));
  const r=groundLocalMeal('50 g de Alimento de teste 1300',[...foods,last]);
  assert.equal(r.complete,true);assert.equal(r.rows[0].foodId,last.id);assert.equal(r.rows[0].amount,50);
});

test('falha, página inválida, cursor repetido e troca de conta não retornam snapshot parcial',async()=>{
  let count=0;
  await assert.rejects(downloadCatalog(async()=>{if(count++)throw Error('offline');return {publicFoods:[record(1)],nextOffset:100};}),/offline/);
  await assert.rejects(downloadCatalog(async()=>({publicFoods:[],nextOffset:100})),/completo/);
  await assert.rejects(downloadCatalog(async()=>({publicFoods:[],nextOffset:undefined})),/completo/);
  await assert.rejects(downloadCatalog(async()=>({nextOffset:null})),/inválida/);
  await assert.rejects(downloadCatalog(async()=>({publicFoods:[],nextOffset:100}),{isCurrent:()=>false}),/cancelada/);
});

test('páginas públicas adicionais não repetem consultas privadas e de moderação',async()=>{
  const queries=[];const repo=createFoodsRepository({query:async(sql,args)=>{queries.push([sql,args]);return {rows:[]};}});
  await repo.list('owner',true,100,0,true);assert.equal(queries.length,1);assert.match(queries[0][0],/status='published'/);
  queries.length=0;await repo.list('owner',true,0,0);assert.equal(queries.length,4);
});

test('mesmo catálogo dinâmico em regras, extração neural e cálculo, inclusive referência particular',()=>{
  const custom=asCatalogFood(record(100));assert.equal(custom.portion.grams,40);
  assert.equal(parseMealText('50 g de Alimento de teste 100','pt',[custom]).rows[0].foodId,custom.id);
  assert.equal(groundLocalMeal('50 g de Alimento de teste 100',foods).complete,false);
  const rows=groundLocalMeal('50 g de Alimento de teste 100',[custom]).rows;
  const wrong=JSON.stringify({items:[{description:'Chia',quantity:999,unit:'g',question:''}]});
  assert.equal(parseLocalMeal(wrong,[custom],'50 g de Alimento de teste 100')[0].foodId,custom.id);
  const saved=localMealItems(rows.map(r=>({...r,confirmed:true})),[custom]);assert.equal(saved[0].calories,50);assert.equal(saved[0].source,'https://example.com/rotulo');
});

test('relatos reais de poke e pão: plurais, porções, marca e ambiguidades',()=>{
  const poke=groundLocalMeal('3 pokes de salmao',foods);assert.equal(poke.complete,true);
  assert.equal(poke.rows[0].foodId,'ready-poke-salmon');assert.equal(poke.rows[0].amount,1200);assert.match(poke.rows[0].assumption,/400 g.*cream cheese/);
  assert.equal(groundLocalMeal('300g de poke de salmão',foods).rows[0].amount,300);
  assert.equal(groundLocalMeal('3 pokes de atum',foods).complete,false);
  const r=groundLocalMeal('dois paes integral, presunto, queijo e maionese hellmans',foods);
  assert.equal(r.complete,true);assert.deepEqual(r.rows.map(row=>[row.foodId,row.amount]),[['taco-52',''],['sbd-ham-cooked',15],['sbd-mozzarella',20],['sbd-hellmanns-mayo',12]]);
  assert.match(r.rows[0].question,/fatias ou pães inteiros/);assert.match(r.rows[2].assumption,/muçarela/);
  assert.throws(()=>localMealItems(r.rows.map(row=>({...row,confirmed:true})),foods));
  assert.deepEqual(groundLocalMeal('duas fatias de pão integral com presunto e queijo e maionese hellmanns',foods).rows.map(row=>row.amount),[50,15,20,12]);
  assert.equal(groundLocalMeal('20g de queijo prato',foods).complete,false);
  assert.equal(groundLocalMeal('12g de maionese hellmans light',foods).complete,false);
  assert.equal(groundLocalMeal('15g de presunto de peru',foods).complete,false);
});


test('maionese genérica usa Hellmann’s tradicional sem exigir marca, preservando quantidades',()=>{
  for(const text of ['12 g de maionese','12 g de maionese heinz','12 g de maionese hemmer']){
    const r=groundLocalMeal(text,foods);assert.equal(r.complete,true,text);assert.equal(r.rows[0].foodId,'sbd-hellmanns-mayo');assert.equal(r.rows[0].amount,12);assert.equal(r.rows[0].estimated,true);assert.match(r.rows[0].assumption,/aproximação/);
  }
  const sandwich=groundLocalMeal('2 fatias de pão integral com presunto e queijo e maionese',foods);
  assert.deepEqual(sandwich.rows.map(row=>row.amount),[50,15,20,12]);
  assert.equal(groundLocalMeal('1 colher de maionese',foods).rows[0].amount,12);
  assert.equal(groundLocalMeal('12 g of mayonnaise',foods,'en').rows[0].amount,12);
  for(const text of ['12 g maionese light','12 g maionese vegana','12 g maionese de batata'])assert.equal(groundLocalMeal(text,foods).complete,false,text);
});
