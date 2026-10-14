import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { verifiedConnection } from '../server/connection.js';
import { createFoodsRepository } from '../server/foods-db.js';
import { createFoodsHandler } from '../server/foods.js';

const connection=process.env.LEVE_DATABASE_URL_UNPOOLED;
if(!connection || new URL(connection).pathname!=='/leve_development')throw new Error('Esta verificação só pode usar leve_development.');
const pool=new pg.Pool({connectionString:verifiedConnection(connection),max:4,connectionTimeoutMillis:15000});
const prefix=`verification-${randomUUID()}`,a=`${prefix}-a`,b=`${prefix}-b`,mod=`${prefix}-moderator`;
const actors=[a,b,mod],id=randomUUID();
const repo=createFoodsRepository(pool);
const handler=user=>createFoodsHandler({authenticate:async()=>user,isModerator:user=>user===mod,repository:repo});
const post=async(user,body)=>handler(user)(new Request('https://leve.test/api/foods',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}));
const listing=async user=>(await handler(user)(new Request('https://leve.test/api/foods'))).json();
const food={name:`Iogurte de teste ${prefix.slice(-8)}`,brand:'Teste sintético',preparation:'Pronto para consumo',category:'Laticínios',kcal:60,sourceText:'Referência fictícia exclusivamente para teste automático.',sourceUrl:'https://example.com/rotulo',portion:{grams:150,calories:90}};
try {
  let response=await post(a,{action:'create',id,food,share:false});assert.equal(response.status,200);let item=(await response.json()).item;
  assert.equal(item.status,'private');assert.equal((await listing(b)).mine.length,0);assert.ok(!(await listing(b)).publicFoods.some(r=>r.id===id));
  assert.equal((await post(a,{action:'create',id,food,share:false})).status,200);
  assert.equal((await post(a,{action:'create',id,food,share:true})).status,409);
  response=await post(a,{action:'update',id,version:item.version,food,share:true});item=(await response.json()).item;assert.equal(item.status,'pending');
  assert.ok(!(await listing(b)).publicFoods.some(r=>r.id===id));
  assert.equal((await post(b,{action:'review',id,version:item.version,status:'published',reviewed:true,reason:'Referência de teste conferida.'})).status,403);
  assert.equal((await post(b,{action:'update',id,version:item.version,food,share:false})).status,404);
  const decision={action:'review',id,version:item.version,status:'published',reviewed:true,reason:'Referência de teste conferida.'};
  const concurrent=await Promise.all([post(mod,decision),post(mod,decision)]);assert.deepEqual(concurrent.map(r=>r.status).sort(),[200,409]);
  item=(await listing(a)).mine.find(r=>r.id===id);assert.equal(item.status,'published');
  const publicRow=(await listing(b)).publicFoods.find(r=>r.id===id);assert.ok(publicRow);assert.equal(publicRow.owner_id,undefined);assert.equal(publicRow.creation_payload,undefined);assert.equal(publicRow.reason,undefined);
  assert.equal((await post(b,{action:'create',id:randomUUID(),food,share:true})).status,409);
  assert.equal((await post(a,{action:'update',id,version:1,food,share:true})).status,409);
  assert.equal((await post(b,{action:'report',id,category:'nutrition',message:'Conferir a referência de teste.'})).status,200);
  const report=(await listing(mod)).reports.find(r=>r.food_id===id);assert.ok(report);assert.equal(report.reporter_id,undefined);
  assert.equal((await post(mod,{action:'resolve-report',id:report.id,reason:'Denúncia sintética verificada.'})).status,200);
  assert.equal((await post(mod,{action:'review',id,version:item.version,status:'hidden',reason:'Ocultado para teste de segurança.'})).status,200);
  assert.ok(!(await listing(b)).publicFoods.some(r=>r.id===id));
  item=(await listing(a)).mine.find(r=>r.id===id);
  response=await post(a,{action:'update',id,version:item.version,food:{...food,kcal:50,portion:{grams:150,calories:75}},share:true});item=(await response.json()).item;assert.equal(item.status,'pending');
  response=await post(mod,{action:'review',id,version:item.version,status:'rejected',reason:'Corrigir a referência nutricional.'});item=(await response.json()).item;assert.equal(item.status,'rejected');
  response=await post(a,{action:'update',id,version:item.version,food,share:true});item=(await response.json()).item;
  response=await post(a,{action:'cancel',id,version:item.version});item=(await response.json()).item;assert.equal(item.status,'private');
  const eventCount=Number((await pool.query("SELECT count(*)::int AS n FROM leve_food_events WHERE actor_id=$1 AND action IN ('create','update')",[a])).rows[0].n);
  for(let i=eventCount;i<20;i++)assert.equal((await post(a,{action:'create',id:randomUUID(),food:{...food,name:`Teste de limite ${prefix.slice(-8)} ${i}`},share:false})).status,200);
  assert.equal((await post(a,{action:'create',id:randomUUID(),food:{...food,name:`Limite extra ${prefix.slice(-8)}`},share:false})).status,429);
  console.log('Catálogo verificado no banco isolado: privacidade, aprovação em duas contas, permissões, duplicatas, versões, concorrência, idempotência, edição, denúncia, ocultação, cancelamento e limite diário.');
} finally {
  // Only records created by these random synthetic actors are removed.
  await pool.query('DELETE FROM leve_food_reports WHERE reporter_id=ANY($1::text[]) OR food_id IN(SELECT id FROM leve_community_foods WHERE owner_id=ANY($1::text[]))',[actors]);
  await pool.query('DELETE FROM leve_food_events WHERE actor_id=ANY($1::text[]) OR food_id IN(SELECT id FROM leve_community_foods WHERE owner_id=ANY($1::text[]))',[actors]);
  await pool.query('DELETE FROM leve_community_foods WHERE owner_id=ANY($1::text[])',[actors]);
  await pool.end();
}
