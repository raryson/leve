import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCommunityFood, nutritionFlags, cleanFoodText, asCatalogFood } from '../src/communityFood.js';
import { createFoodsHandler } from '../server/foods.js';
import { COMMUNITY_POLICY_VERSION } from '../src/communityPolicy.js';

const food=()=>({name:'Iogurte natural',brand:'Marca exemplo',preparation:'Pronto para consumo',category:'Laticínios',kcal:60,sourceText:'Rótulo do fabricante: 60 kcal por 100 g.',sourceUrl:'https://example.com/rotulo',portion:{grams:150,calories:90}});
const id='66666666-6666-4666-8666-666666666666';
const req=body=>new Request('https://leve.test/api/foods',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({policyVersion:COMMUNITY_POLICY_VERSION,...body})});
test('valida calorias finitas, porções e conversão sem aceitar strings, infinito ou unidades incompatíveis',()=>{
  assert.equal(validateCommunityFood(food()).kcal,60);
  for(const value of [NaN,Infinity,-1,1001,null,'60',''])assert.throws(()=>validateCommunityFood({...food(),kcal:value}));
  assert.throws(()=>validateCommunityFood({...food(),portion:{grams:0,calories:90}}));
  assert.throws(()=>validateCommunityFood({...food(),portion:{grams:100,calories:90}}));
  assert.ok(validateCommunityFood({...food(),kcal:0,portion:null}));
});
test('nomes inadequados, controles invisíveis e links internos são recusados, nomes legítimos preservados',()=>{
  for(const name of ['merda','m.e.r.d.a','m e r d a','m3rda','me\u200brda','https://site.test','<>'])assert.throws(()=>validateCommunityFood({...food(),name}));
  for(const name of ['Peito de frango','Fruta-pão','Batata doce','Pão de queijo','Piranha assada'])assert.equal(validateCommunityFood({...food(),name}).name,name);
  assert.ok(validateCommunityFood({...food(),sourceText:'Rótulo:\n60 kcal por 100 g.'}));
  for(const sourceUrl of ['http://example.com','https://localhost/x','https://127.0.0.1/x','https://u:p@example.com','javascript:alert(1)'])assert.throws(()=>validateCommunityFood({...food(),sourceUrl}));
  assert.equal(cleanFoodText('  Pão   integral ','Nome',2,120),'Pão integral');
});
test('suspeitas são sinalizadas sem inventar valores e o alimento comunitário leva a referência consigo',()=>{
  assert.ok(nutritionFlags({...food(),name:'Água',kcal:400}).some(f=>f.includes('Água')));
  assert.ok(nutritionFlags({...food(),name:'Azeite',kcal:0}).some(f=>f.includes('Óleo')));
  const f=asCatalogFood({id,status:'published',food:food()});assert.equal(f.id,`community:${id}`);assert.equal(f.kcal,60);assert.match(f.sourceLabel,/Comunidade/);
});
test('visitante lê apenas lista pública e não cadastra, moderação exige permissão derivada da sessão',async()=>{
  let received,mutated=false;
  const repository={list:async(...args)=>{received=args;return {publicFoods:[],mine:[]};},mutate:async()=>{mutated=true;}};
  const handle=createFoodsHandler({authenticate:async()=>null,isModerator:()=>true,repository});
  assert.equal((await handle(new Request('https://leve.test/api/foods'))).status,200);assert.equal(received[1],false);
  assert.equal((await handle(req({action:'create',id,food:food(),share:true}))).status,401);assert.equal(mutated,false);
  const member=createFoodsHandler({authenticate:async()=>'member',isModerator:()=>false,repository});
  assert.equal((await member(req({action:'review',id,version:1,status:'published',reviewed:true,reason:'Referência conferida.',moderator:true}))).status,403);assert.equal(mutated,false);
});
test('API usa dono autenticado, valida corpo antes do banco e exige revisão humana para aprovar',async()=>{
  let received;
  const repository={mutate:async(...args)=>{received=args;return {ok:true};}};
  const handle=createFoodsHandler({authenticate:async()=>'owner',isModerator:()=>true,repository});
  assert.equal((await handle(req({action:'create',id,food:food(),share:true,owner_id:'attacker'}))).status,200);assert.equal(received[0],'owner');
  received=null;
  assert.equal((await handle(req({action:'create',id,food:{...food(),kcal:null},share:true}))).status,400);assert.equal(received,null);
  assert.equal((await handle(req({action:'review',id,version:1,status:'published',reason:'Referência conferida.'}))).status,400);
  assert.equal((await handle(req({action:'review',id,version:1,status:'published',reviewed:true,reason:'Referência conferida.'}))).status,200);
});
test('limite de corpo vale sem content-length e falhas não expõem SQL ou credenciais',async()=>{
  let called=false;
  const handle=createFoodsHandler({authenticate:async()=>'owner',isModerator:()=>false,repository:{mutate:()=>{called=true;throw new Error('secret-db-url');}}});
  assert.equal((await handle(req({action:'create',id,food:food(),share:true,extra:'x'.repeat(16000)}))).status,413);assert.equal(called,false);
  const r=await handle(req({action:'create',id,food:food(),share:true}));assert.equal(r.status,503);assert.doesNotMatch(await r.text(),/secret-db-url/);
});

test('API exige a versão atual das regras antes de gravar qualquer alimento',async()=>{
  let received;
  const handle=createFoodsHandler({authenticate:async()=>'owner',isModerator:()=>false,repository:{mutate:async(...args)=>{received=args;return {ok:true};}}});
  for(const policyVersion of [null,'old',true]){
    assert.equal((await handle(req({action:'create',id,food:food(),share:true,policyVersion}))).status,400);
    assert.equal(received,undefined);
  }
  assert.equal((await handle(req({action:'create',id,food:food(),share:true,reason:'arbitrary'}))).status,200);
  assert.equal(received[2].reason,`Accepted community rules ${COMMUNITY_POLICY_VERSION}`);
});
