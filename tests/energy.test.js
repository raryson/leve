import test from 'node:test';
import assert from 'node:assert/strict';
import {restingEnergy,routineEnergy,workoutEstimate,dailyEnergy,createWorkout,displayWorkoutEstimate} from '../src/energy.js';
import {normalizeState,newDay,appendActivity} from '../src/domain.js';
import {applyEntry} from '../src/entries.js';
import {createJournalHandler} from '../server/journal.js';
const profile={name:'Teste',age:30,height:175,weight:90,sex:'male',activityFactor:1.4};
const initial=()=>normalizeState({profile,weights:[90],days:[]});

test('treinos legados reconhecidos estimam extra sem regravar histórico ou sobrescrever escolhas explícitas',()=>{
  const day=appendActivity(newDay('2026-10-15'),{type:'Academia',durationMinutes:45,caloriesBurned:0});
  const before=JSON.stringify(day),energy=dailyEnergy(profile,day);
  assert.equal(energy.exercise,167);assert.equal(energy.unestimated,0);assert.equal(energy.retroactive.length,1);
  assert.equal(JSON.stringify(day),before);assert.equal(day.exercise.totalCaloriesBurned,0);
  const walk={type:'Caminhada',durationMinutes:30,caloriesBurned:0};
  assert.equal(displayWorkoutEstimate(walk,profile).estimate.referenceId,'walk-38');
  for(const patch of [{type:'Outra atividade'},{durationMinutes:0},{durationMinutes:''},{referenceId:''}])assert.equal(displayWorkoutEstimate({...walk,...patch},profile).estimate,null);
  const saved=createWorkout({referenceId:'walk-48',durationMinutes:30},profile);
  assert.equal(displayWorkoutEstimate(saved,{...profile,weight:80}).retroactive,false);
  assert.deepEqual(displayWorkoutEstimate(saved,{...profile,weight:80}).estimate,saved.energyEstimate);
});
test('repouso considera peso, altura, idade e coeficiente; rotina inclui repouso uma vez',()=>{
  assert.equal(restingEnergy(profile),1849);assert.equal(restingEnergy({...profile,sex:'female'}),1683);assert.equal(routineEnergy(profile),2589);
  assert.equal(restingEnergy({...profile,weight:80}),1749);assert.equal(routineEnergy({...profile,activityFactor:1.6}),2958);
  for(const patch of [{weight:Infinity},{height:''},{age:0},{sex:'unknown'},{height:80,weight:20,age:120,sex:'female'}])assert.throws(()=>restingEnergy({...profile,...patch}));
  assert.throws(()=>routineEnergy({...profile,activityFactor:7}));
});
test('MET mostra gasto bruto e acrescenta só o excedente à rotina naquele intervalo',()=>{
  const e=workoutEstimate('strength-35',45,profile);assert.equal(e.gross,248);assert.equal(e.additional,167);assert.equal(e.weightKg,90);assert.equal(e.baselineDaily,2589);
  const day=appendActivity(newDay('2026-10-15'),createWorkout({referenceId:'strength-35',durationMinutes:45},profile));
  const energy=dailyEnergy(profile,day);assert.equal(energy.total,2756);assert.equal(energy.exercise,167);assert.equal(energy.resting,1849);assert.notEqual(energy.total,1849+2589+248);
  assert.equal(dailyEnergy({...profile,activityFactor:1.6},day).exercise,156);assert.equal(day.exercise.activities[0].caloriesBurned,167);
  for(const [reference,minutes] of [['unknown',30],['walk-38',0],['walk-38',Infinity]])assert.throws(()=>workoutEstimate(reference,minutes,profile));
});
test('saldo tem sinal de consumo menos gasto, sem criar meta de dieta',()=>{
  const day={...newDay('2026-10-15'),totalCalories:2000};assert.equal(dailyEnergy(profile,day).balance,-589);
  assert.equal(dailyEnergy(profile,{...day,totalCalories:3000}).balance,411);assert.equal(profile.calorieGoal,undefined);
});
test('histórico sem referência não ganha calorias retroativas; snapshots sobrevivem ao backup e mudança de peso',()=>{
  const state=initial(),next=applyEntry(state,{type:'workout',date:'2026-10-15',activity:{referenceId:'walk-38',type:'Caminhada',durationMinutes:30}});
  const snapshot=next.days[0].exercise.activities[0].energyEstimate;
  const roundtrip=normalizeState(JSON.parse(JSON.stringify({...next,profile:{...next.profile,weight:80}})));
  assert.deepEqual(roundtrip.days[0].exercise.activities[0].energyEstimate,snapshot);
  const old=appendActivity(newDay('2026-10-14'),{type:'Antigo',durationMinutes:30,caloriesBurned:120});
  assert.equal(dailyEnergy(profile,old).exercise,0);assert.equal(dailyEnergy(profile,old).unestimated,1);assert.equal(old.exercise.totalCaloriesBurned,120);
  assert.equal(createWorkout({type:'Outra',durationMinutes:30,caloriesBurned:999},profile).caloriesBurned,0);
});
test('normalização recalcula snapshot válido e recusa MET adulterado ou peso não finito',()=>{
  const activity=createWorkout({referenceId:'strength-60',durationMinutes:30},profile);
  const day={...newDay('2026-10-15'),exercise:{activities:[{...activity,caloriesBurned:999,energyEstimate:{...activity.energyEstimate,gross:999,additional:999}}]}};
  const state=normalizeState({...initial(),days:[day]});assert.equal(state.days[0].exercise.totalCaloriesBurned,activity.caloriesBurned);
  for(const patch of [{met:99},{weightKg:Infinity},{referenceId:'fake'},{durationMinutes:999}])assert.throws(()=>normalizeState({...initial(),days:[{...day,exercise:{activities:[{...activity,energyEstimate:{...activity.energyEstimate,...patch}}]}}]}));
});
test('API valida e preserva estimativa de exercício e fator de rotina na conta',async()=>{
  let stored;const handler=createJournalHandler({authenticate:async()=>'synthetic',repository:{put:async(_owner,state)=>{stored=state;return {state,revision:1};}}});
  const state=applyEntry(initial(),{type:'workout',date:'2026-10-15',activity:{referenceId:'strength-35',durationMinutes:45,type:'Treino'}});
  const r=await handler(new Request('https://leve.test/api/journal',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({baseRevision:0,operationId:'energy-test-operation-12345',state})}));
  assert.equal(r.status,200);assert.equal(stored.profile.activityFactor,1.4);assert.equal(stored.days[0].exercise.activities[0].energyEstimate.gross,248);assert.equal(stored.days[0].exercise.totalCaloriesBurned,167);
});
