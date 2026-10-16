import test from 'node:test';
import assert from 'node:assert/strict';
import {newDay,appendFood} from '../src/domain.js';
import {registrationStreak,weeklySummary,streakIncentive} from '../src/routineSummary.js';
const water=date=>({...newDay(date),waterMl:250});
const state=(days=[],weights=[])=>({days,weights});
test('marcos celebram o dia alcançado e mantêm conquistas do histórico após pausa',()=>{
  const s=state(['2026-10-12','2026-10-13','2026-10-14'].map(water));
  const achieved=streakIncentive(s,'2026-10-14');
  assert.deepEqual(achieved.achieved,[1,3]);assert.equal(achieved.milestoneToday,true);assert.equal(achieved.next,7);assert.equal(achieved.remaining,4);
  const tomorrow=streakIncentive(s,'2026-10-15');assert.equal(tomorrow.milestoneToday,false);assert.equal(tomorrow.current,3);
  const paused=streakIncentive(s,'2026-10-16');assert.equal(paused.returning,true);assert.equal(paused.next,1);assert.deepEqual(paused.achieved,[1,3]);
  s.days.push(water('2026-10-16'));const resumed=streakIncentive(s,'2026-10-16');assert.equal(resumed.current,1);assert.equal(resumed.next,3);assert.deepEqual(resumed.achieved,[1,3]);
});
test('início tem missão de um dia; grandes sequências continuam tendo próximo marco',()=>{
  const initial=streakIncentive(state(),'2026-10-16');assert.equal(initial.next,1);assert.equal(initial.returning,false);assert.deepEqual(initial.achieved,[]);
  const days=[];for(let i=0;i<400;i++){const d=new Date('2025-01-01T12:00:00Z');d.setUTCDate(d.getUTCDate()+i);days.push(water(d.toISOString().slice(0,10)));}
  const long=streakIncentive(state(days),days.at(-1).date);assert.equal(long.current,400);assert.equal(long.next,500);assert.equal(long.remaining,100);
});
test('sequência dá até o fim do dia para continuar, reinicia após pausa e preserva recorde',()=>{
  const s=state(['2026-10-12','2026-10-13','2026-10-14'].map(water));
  assert.deepEqual(registrationStreak(s,'2026-10-15'),{current:3,best:3,recordedToday:false,total:3});
  assert.equal(registrationStreak(s,'2026-10-16').current,0);
  s.days.push(water('2026-10-16'));
  assert.deepEqual(registrationStreak(s,'2026-10-16'),{current:1,best:3,recordedToday:true,total:4});
});
test('datas locais de calendário cruzam mês/ano; dias vazios, sem data e futuros não contam',()=>{
  const s=state([water('2025-12-31'),newDay('2026-01-02'),water('2026-01-03'),{...newDay('2026-01-04'),date:null}],
    [{date:'2026-01-01',value:90},{date:null,value:89},{date:'2026-01-01',value:90}]);
  assert.deepEqual(registrationStreak(s,'2026-01-02'),{current:2,best:2,recordedToday:false,total:2});
  assert.equal(registrationStreak(state(),'2026-01-02').best,0);
});
test('treino sem calorias e anotação contam, sem exigir meta calórica ou emagrecimento',()=>{
  const s=state([{...newDay('2026-10-15'),notes:'Retomando'}, {...newDay('2026-10-16'),exercise:{performed:true,activities:[]}}]);
  assert.equal(registrationStreak(s,'2026-10-16').current,2);
  assert.equal(weeklySummary(s,'2026-10-16').trainingDays,1);
});
test('resumo exclui dados ausentes de médias e conta pesagens na cobertura sem inventar calorias',()=>{
  const meal=appendFood(newDay('2026-10-14'),'Almoço',{food:'Arroz',calories:200});
  const s=state([meal,water('2026-10-15'),newDay('2026-10-16')],[{date:'2026-10-12',value:90},{date:'2026-10-16',value:89.5}]);
  const before=JSON.stringify(s),week=weeklySummary(s,'2026-10-16');
  assert.equal(week.recorded,4);assert.equal(week.dates.length,5);
  assert.equal(week.consumed,200);assert.equal(week.foodDays,1);assert.equal(week.water,250);assert.equal(week.waterDays,1);
  assert.equal(week.weightChange,-.5);assert.equal(week.meals,1);assert.equal(week.calendar.filter(d=>d.future).length,2);
  assert.equal(JSON.stringify(s),before);
});
test('semana anterior tem sete dias e peso exige duas pesagens do próprio período',()=>{
  const s=state([water('2026-10-11'),water('2026-10-12')],[{date:'2026-10-11',value:90},{date:'2026-10-12',value:89}]);
  const previous=weeklySummary(s,'2026-10-16',-1),current=weeklySummary(s,'2026-10-16');
  assert.equal(previous.dates.length,7);assert.equal(previous.recorded,1);assert.equal(previous.weightChange,null);
  assert.equal(current.weightChange,null);assert.equal(previous.consumed,null);
});
