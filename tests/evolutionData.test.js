import test from 'node:test';
import assert from 'node:assert/strict';
import {evolutionPeriod,evolutionRows,seriesSummary} from '../src/evolutionData.js';
import {normalizeState,newDay,appendFood,appendActivity} from '../src/domain.js';
import {createWorkout,dailyEnergy} from '../src/energy.js';
const profile={name:'Teste',weight:90,height:175,age:30,sex:'female',activityFactor:1.6};
test('semana começa segunda; meses respeitam ano bissexto e não incluem futuro',()=>{
  assert.deepEqual(evolutionPeriod('2026-10-16').dates,['2026-10-12','2026-10-13','2026-10-14','2026-10-15','2026-10-16']);
  assert.equal(evolutionPeriod('2026-10-16','week',-1).dates.length,7);
  assert.equal(evolutionPeriod('2024-03-05','month',-1).dates.length,29);
  assert.equal(evolutionPeriod('2026-03-05','month',-1).end,'2026-02-28');
  assert.equal(evolutionPeriod('2026-01-02').start,'2025-12-29');
  assert.equal(evolutionPeriod('2026-10-16','month').dates.length,16);
  assert.throws(()=>evolutionPeriod('2026-10-16','week',1));
});
test('dias ausentes e treino antigo desconhecido não viram zero nem déficit inventado',()=>{
  const day=appendFood({...newDay('2026-10-14'),waterMl:500},'Jantar',{food:'Arroz',calories:128});
  const unknown=appendActivity(newDay('2026-10-15'),{type:'Atividade sem tipo',durationMinutes:20,caloriesBurned:0});
  const state=normalizeState({profile,weights:[90],days:[day,unknown]});
  const before=JSON.stringify(state),rows=evolutionRows(state,['2026-10-13','2026-10-14','2026-10-15']);
  assert.equal(rows[0].water,null);assert.equal(rows[0].consumed,null);assert.equal(rows[0].exercise,null);assert.ok(rows[0].resting>0);
  assert.equal(rows[1].consumed,128);assert.equal(rows[1].exercise,0);assert.equal(rows[1].water,500);
  assert.equal(rows[2].exercise,null);assert.equal(rows[2].expenditure,null);assert.equal(rows[2].consumed,null);
  assert.deepEqual(seriesSummary(rows,'consumed'),{count:1,total:128,average:128});assert.equal(JSON.stringify(state),before);
});
test('gasto combina rotina e extra sem somar basal duas vezes; perfil atual é só referência',()=>{
  const day=appendActivity(newDay('2026-10-16'),createWorkout({referenceId:'walk-38',durationMinutes:30},profile));
  const state=normalizeState({profile,weights:[90],days:[day]}),row=evolutionRows(state,[day.date])[0],energy=dailyEnergy(state.profile,state.days[0]);
  assert.equal(row.exercise,energy.exercise);assert.equal(row.expenditure,energy.routine+energy.exercise);assert.equal(row.resting,energy.resting);
  const mixed=appendActivity(day,{type:'Antigo sem referência',durationMinutes:10,caloriesBurned:0});
  const partial=evolutionRows({...state,days:[mixed]},[day.date])[0];
  assert.equal(partial.partialExercise,true);assert.equal(partial.exercise,row.exercise);assert.equal(partial.expenditure,row.expenditure);
  const changed=evolutionRows({...state,profile:{...state.profile,weight:80}},[day.date])[0];assert.notEqual(changed.resting,row.resting);assert.equal(state.profile.weight,90);
  assert.equal(evolutionRows({...state,profile:null},[day.date])[0].resting,null);
});

test('dois dias de treino continuam visíveis sem referência de calorias ou detalhes antigos',()=>{
  const legacy={...newDay('2026-10-14'),exercise:{performed:true,activities:[],totalCaloriesBurned:0}};
  const workout=appendActivity(newDay('2026-10-15'),{type:'Atividade sem tipo',durationMinutes:45,caloriesBurned:0});
  const state=normalizeState({profile,weights:[90],days:[legacy,workout]}),before=JSON.stringify(state);
  const rows=evolutionRows(state,['2026-10-13','2026-10-14','2026-10-15','2026-10-16']);
  assert.equal(rows.filter(r=>r.trained).length,2);
  assert.deepEqual(rows.map(r=>r.training),[null,1,1,null]);
  assert.equal(rows[1].minutes,null);assert.equal(rows[2].minutes,45);
  assert.equal(rows[1].exercise,null);assert.equal(rows[2].exercise,null);
  assert.equal(rows[2].activities[0].type,'Atividade sem tipo');assert.equal(JSON.stringify(state),before);
});

test('Academia e Caminhada antigas preenchem extra no gráfico com suposições declaradas',()=>{
  const days=[appendActivity(newDay('2026-10-14'),{type:'Academia',durationMinutes:45,caloriesBurned:0}),appendActivity(newDay('2026-10-15'),{type:'Caminhada',durationMinutes:30,caloriesBurned:0})];
  const state=normalizeState({profile,weights:[90],days}),before=JSON.stringify(state),rows=evolutionRows(state,['2026-10-14','2026-10-15']);
  for(const row of rows){assert.ok(row.exercise>0);assert.ok(row.expenditure>row.resting);assert.equal(row.retroactive.length,1);assert.equal(row.unknownExercise,false);}
  assert.equal(JSON.stringify(state),before);
});
