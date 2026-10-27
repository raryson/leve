import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeGymPlan,normalizeGymSession,suggestedGymExercises,nextGymTemplate,gymHistory,suggestedGymCardio} from '../src/gym.js';
import {saveGymSession,removeGymActivity} from '../src/gymEntries.js';
import {normalizeState,newDay,normalizeDay,trainingDays} from '../src/domain.js';
import {dailyEnergy} from '../src/energy.js';
import {createJournalHandler} from '../server/journal.js';

const today='2026-10-27';
const plan={equipment:['dumbbells','bench','treadmill','bike','station'],daysPerWeek:2,sets:1,goal:'weight-loss',cardioMinutes:10};
const initial=()=>normalizeState({version:6,profile:{name:'Teste',age:30,height:175,weight:90,sex:'male'},weights:[90],days:[{...newDay(today),waterMl:750,notes:'Preservar',meals:[{name:'Almoço',items:[{food:'Arroz',calories:200}]}]}]});
const session=(id='gym-1')=>({id,template:'A',exercises:[{exerciseId:'sit-stand',sets:[{reps:10,weightKg:null}]},{exerciseId:'db-row',sets:[{reps:8,weightKg:5},{reps:9,weightKg:5}]}],strengthMinutes:20,cardioMinutes:10,cardioMode:'treadmill',estimateStrength:true});

test('migração v6 preserva dados e plano respeita apenas os equipamentos selecionados',()=>{
  const state=initial();assert.equal(state.version,7);assert.equal(state.gymPlan,null);assert.equal(state.days[0].waterMl,750);
  assert.throws(()=>normalizeGymPlan({...plan,equipment:['invented']}));
  assert.throws(()=>normalizeGymPlan({...plan,daysPerWeek:7}));
  for(const daysPerWeek of [2,3,4,5])assert.equal(normalizeState({...state,gymPlan:{...plan,daysPerWeek}}).gymPlan.daysPerWeek,daysPerWeek);
  for(const template of ['A','B']){
    const bodyOnly=suggestedGymExercises({...plan,equipment:[]},template);assert.ok(bodyOnly.length>=3);assert.ok(bodyOnly.every(ex=>ex.requires.length===0));
    assert.ok(suggestedGymExercises(plan,template).some(ex=>ex.id==='db-row'));
  }
});
test('séries, repetições, carga e tempos inválidos são rejeitados sem converter ausências em treino',()=>{
  for(const change of [{strengthMinutes:0},{strengthMinutes:Infinity},{cardioMinutes:-1},{strengthMinutes:.5},{exercises:[] ,cardioMinutes:0},{exercises:[{exerciseId:'db-row',sets:[{reps:0,weightKg:5}]}]},{exercises:[{exerciseId:'db-row',sets:[{reps:10,weightKg:NaN}]}]},{exercises:[{exerciseId:'sit-stand',sets:[{reps:10,weightKg:5}]}]}])assert.throws(()=>normalizeGymSession({...session(),...change}));
  assert.equal(normalizeGymSession(session()).exercises[0].sets[0].weightKg,null);
});
test('sessão soma força e cardio uma vez, preserva diário e não atribui calorias ao cardio sem referência',()=>{
  const state=initial(),before=structuredClone(state),next=saveGymSession(state,today,session()),day=next.days[0];
  assert.deepEqual(state,before);assert.equal(day.exercise.activities.length,2);
  assert.deepEqual(day.meals,state.days[0].meals);assert.equal(day.waterMl,750);assert.equal(day.notes,'Preservar');
  assert.equal(day.exercise.activities.reduce((sum,a)=>sum+a.durationMinutes,0),30);
  assert.equal(day.exercise.activities[1].caloriesBurned,0);assert.equal(day.exercise.activities[1].referenceId,'');
  assert.equal(dailyEnergy(next.profile,day).exercise,day.exercise.activities[0].caloriesBurned);
  assert.equal(trainingDays(next.days,today),1);assert.equal(gymHistory(next.days,today).length,1);
  assert.equal(saveGymSession(next,today,session()),next);
});
test('sem opção de estimar ou apenas cardio, não inventa calorias nem avança a ficha de força',()=>{
  const noEstimate=saveGymSession(initial(),today,{...session(),estimateStrength:false});assert.equal(dailyEnergy(noEstimate.profile,noEstimate.days[0]).exercise,0);
  const cardio=saveGymSession(initial(),today,{...session(),exercises:[],strengthMinutes:0,estimateStrength:false});
  assert.equal(cardio.days[0].exercise.activities.length,1);assert.equal(cardio.days[0].exercise.activities[0].durationMinutes,10);assert.equal(nextGymTemplate(cardio.days,today),'A');
});
test('backup mantém ficha, séries e cargas; histórico ignora dias futuros e apagar sessão remove os dois blocos',()=>{
  const state=saveGymSession({...initial(),gymPlan:plan},today,session());
  const restored=normalizeState(JSON.parse(JSON.stringify(state)));assert.deepEqual(restored,state);assert.equal(nextGymTemplate(state.days,today),'B');
  assert.equal(nextGymTemplate(state.days,'2026-10-26'),'A');
  const day=state.days[0];for(const index of [0,1]){const activities=removeGymActivity(day,index);assert.equal(activities.length,0);assert.equal(normalizeDay({...day,exercise:{activities,performed:false,totalCaloriesBurned:0}}).exercise.performed,false);}
  const future=saveGymSession(state,'2026-10-28',{...session('future'),template:'B'});assert.equal(gymHistory(future.days,today).length,1);
  assert.throws(()=>normalizeState({...state,days:[...state.days,{...day,date:'2026-10-26'}]}));
});
test('API normaliza e sincroniza séries e equipamentos com o dono autenticado',async()=>{
  let written;
  const state=saveGymSession({...initial(),gymPlan:plan},today,session());
  const handler=createJournalHandler({authenticate:async()=>'owner',repository:{put:async(userId,value)=>{written={userId,value};return {revision:1,state:value};}}});
  const response=await handler(new Request('https://leve.test/api/journal',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({state,baseRevision:0,operationId:'gym-operation-000001'})}));
  assert.equal(response.status,200);assert.equal(written.userId,'owner');assert.equal(written.value.gymPlan.daysPerWeek,2);assert.equal(written.value.days[0].exercise.activities[0].gymSession.exercises[1].sets[0].weightKg,5);
});

test('alternância considera a última sessão de força mesmo no mesmo dia',()=>{
 const first=saveGymSession(initial(),today,session('first'));
 const second=saveGymSession(first,today,{...session('second'),template:'B'});
 assert.equal(gymHistory(second.days,today)[0].session.id,'second');
 assert.equal(nextGymTemplate(second.days,today),'A');
});

test('plano com foco em peso inclui cardio por equipamento sem registrar atividade fictícia',()=>{
 const migrated=normalizeGymPlan({equipment:[],daysPerWeek:5,sets:1});
 assert.equal(migrated.goal,'weight-loss');assert.equal(suggestedGymCardio(migrated).mode,'walk');
 for(const equipment of [[],['bike'],['bike','treadmill']]){const value={...plan,equipment,cardioMinutes:15};const cardio=suggestedGymCardio(value);assert.equal(cardio.included,true);assert.equal(cardio.minutes,15);assert.equal(cardio.mode,equipment.includes('treadmill')?'treadmill':equipment.includes('bike')?'bike':'walk');}
 assert.equal(suggestedGymCardio({...plan,goal:'fitness'}).included,false);
 assert.throws(()=>normalizeGymPlan({...plan,cardioMinutes:Infinity}));assert.throws(()=>normalizeGymPlan({...plan,goal:'unknown'}));
 const state=normalizeState({...initial(),gymPlan:plan});assert.equal(state.days[0].exercise.activities.length,0);assert.deepEqual(normalizeState(JSON.parse(JSON.stringify(state))),state);
});
