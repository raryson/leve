import { foodKey, nutritionFlags, validateCommunityFood } from '../src/communityFood.js';
import { isDeepStrictEqual } from 'node:util';

export class FoodError extends Error {
  constructor(message,status=400) {super(message);this.status=status;}
}
const dto = (row, privateFields=false) => ({id:row.id,food:row.food,status:row.status,version:row.version,updatedAt:row.updated_at,...(privateFields?{flags:row.flags,reason:row.reason}:{})});
export function createFoodsRepository(pool) {
  return {
    async list(userId,moderator,offset=0,moderationOffset=0) {
      const [pub,mine,queue,reports]=await Promise.all([
        pool.query("SELECT * FROM leve_community_foods WHERE status='published' ORDER BY updated_at DESC,id LIMIT 101 OFFSET $1",[offset]),
        userId?pool.query('SELECT * FROM leve_community_foods WHERE owner_id=$1 ORDER BY updated_at DESC LIMIT 200',[userId]):{rows:[]},
        moderator?pool.query("SELECT * FROM leve_community_foods WHERE status IN ('pending','published','rejected','hidden') ORDER BY (status='pending') DESC, updated_at DESC,id LIMIT 101 OFFSET $1",[moderationOffset]):{rows:[]},
        moderator?pool.query('SELECT r.id,r.food_id,r.category,r.message,f.food FROM leve_food_reports r JOIN leve_community_foods f ON f.id=r.food_id WHERE NOT r.resolved ORDER BY r.created_at LIMIT 100'):{rows:[]},
      ]);
      return {publicFoods:pub.rows.slice(0,100).map(r=>dto(r)),mine:mine.rows.map(r=>dto(r,true)),moderation:queue.rows.slice(0,100).map(r=>dto(r,true)),reports:reports.rows,moderator,nextOffset:pub.rows.length>100?offset+100:null,moderationNextOffset:queue.rows.length>100?moderationOffset+100:null};
    },
    async mutate(userId,moderator,body,food) {
      const db=await pool.connect();
      try {
        await db.query('BEGIN');
        await db.query('SELECT pg_advisory_xact_lock(hashtext($1))',[`leve-food:${userId}`]);
        if(['review','resolve-report'].includes(body.action) && !moderator) throw new FoodError('Apenas moderadores podem fazer isso.',403);
        if(body.action==='resolve-report') {
          const r=await db.query('UPDATE leve_food_reports SET resolved=true WHERE id=$1 RETURNING food_id',[body.id]);
          if(!r.rows.length) throw new FoodError('Denúncia não encontrada.',404);
          await db.query('INSERT INTO leve_food_events(food_id,actor_id,action,reason) VALUES($1,$2,$3,$4)',[r.rows[0].food_id,userId,'resolve-report',body.reason]);
          await db.query('COMMIT');return {ok:true};
        }
        const existing=(await db.query('SELECT * FROM leve_community_foods WHERE id=$1 FOR UPDATE',[body.id])).rows[0];
        if(body.action==='create' && existing) {
          if(existing.owner_id!==userId || !isDeepStrictEqual(existing.creation_payload,{food,share:body.share})) throw new FoodError('Identificador já usado; atualize a lista antes de tentar novamente.',409);
          await db.query('COMMIT');return {item:dto(existing,true)};
        }
        if(body.action!=='create' && !existing) throw new FoodError('Alimento não encontrado.',404);
        if(['update','cancel'].includes(body.action) && existing.owner_id!==userId) throw new FoodError('Alimento não encontrado.',404);
        if(['update','cancel','review'].includes(body.action) && existing.version!==body.version) throw new FoodError('Este alimento mudou em outro dispositivo. Atualize a lista antes de editar.',409);
        if(['create','update'].includes(body.action)) {
          const total=await db.query('SELECT count(*)::int AS n FROM leve_community_foods WHERE owner_id=$1',[userId]);
          if(body.action==='create' && total.rows[0].n>=200) throw new FoodError('Limite de 200 alimentos por conta atingido.',429);
          const count=await db.query("SELECT count(*)::int AS n FROM leve_food_events WHERE actor_id=$1 AND action IN ('create','update') AND created_at>=date_trunc('day',now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'",[userId]);
          if(count.rows[0].n>=20) throw new FoodError('Limite de 20 cadastros/edições por dia atingido. Tente amanhã.',429);
          const duplicate=await db.query("SELECT id FROM leve_community_foods WHERE normalized_key=$1 AND id<>$2 AND (owner_id=$3 OR status='published') LIMIT 1",[foodKey(food),body.id,userId]);
          if(duplicate.rows.length) throw new FoodError('Já existe um alimento com esse nome, marca e preparo. Procure-o na lista.',409);
        }
        let updated;
        if(body.action==='create') {
          updated=await db.query('INSERT INTO leve_community_foods(id,owner_id,food,normalized_key,status,flags,creation_payload) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[body.id,userId,JSON.stringify(food),foodKey(food),body.share?'pending':'private',JSON.stringify(nutritionFlags(food)),JSON.stringify({food,share:body.share})]);
        } else if(body.action==='update') {
          updated=await db.query("UPDATE leve_community_foods SET food=$2,normalized_key=$3,status=$4,flags=$5,reason='',version=version+1,updated_at=now() WHERE id=$1 RETURNING *",[body.id,JSON.stringify(food),foodKey(food),body.share?'pending':'private',JSON.stringify(nutritionFlags(food))]);
        } else if(body.action==='cancel') {
          if(existing.status!=='pending') throw new FoodError('Somente uma sugestão pendente pode ser cancelada.',409);
          updated=await db.query("UPDATE leve_community_foods SET status='private',reason='',version=version+1,updated_at=now() WHERE id=$1 RETURNING *",[body.id]);
        } else if(body.action==='review') {
          if(body.status==='hidden' ? existing.status!=='published' : existing.status!=='pending') throw new FoodError('O status mudou; atualize a fila.',409);
          if(body.status==='published') {try{validateCommunityFood(existing.food);}catch(error){throw new FoodError(`Corrija o cadastro antes de publicar: ${error.message}`);}}
          updated=await db.query('UPDATE leve_community_foods SET status=$2,reason=$3,version=version+1,updated_at=now() WHERE id=$1 RETURNING *',[body.id,body.status,body.reason]);
          if(body.status==='hidden') await db.query('UPDATE leve_food_reports SET resolved=true WHERE food_id=$1',[body.id]);
        } else if(body.action==='report') {
          if(existing.status!=='published') throw new FoodError('Alimento não disponível.',404);
          const count=await db.query("SELECT count(*)::int AS n FROM leve_food_reports WHERE reporter_id=$1 AND created_at>now()-interval '24 hours'",[userId]);
          if(count.rows[0].n>=10) throw new FoodError('Limite de denúncias do dia atingido.',429);
          await db.query('INSERT INTO leve_food_reports(food_id,reporter_id,category,message) VALUES($1,$2,$3,$4) ON CONFLICT(food_id,reporter_id) DO NOTHING',[body.id,userId,body.category,body.message]);
          await db.query('COMMIT');return {ok:true};
        }
        await db.query('INSERT INTO leve_food_events(food_id,actor_id,action,reason) VALUES($1,$2,$3,$4)',[body.id,userId,body.action,body.reason||'']);
        await db.query('COMMIT');return {item:dto(updated.rows[0],true)};
      } catch(error) {
        await db.query('ROLLBACK').catch(()=>{});
        if(error.code==='23505') throw new FoodError('Já existe um alimento equivalente. Atualize a lista antes de publicar.',409);
        throw error;
      } finally {db.release();}
    },
  };
}
