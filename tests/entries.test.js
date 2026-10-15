import test from 'node:test';
import assert from 'node:assert/strict';
import {applyEntry} from '../src/entries.js';
import {normalizeState,newDay,appendFood,appendActivity} from '../src/domain.js';

const initial=()=>normalizeState({profile:{name:'Teste',age:30,height:175,weight:90},weights:[90],days:[{...appendActivity(appendFood(newDay('2026-10-15'),'Lanche',{food:'Antigo',calories:100}),{type:'Caminhada',durationMinutes:20,caloriesBurned:70}),waterMl:500,notes:'Preservar'}]});
const meal={type:'meal',id:'new-meal',date:'2026-10-15',name:'Lanche',time:'16:30',items:[{food:'Pão',grams:25,kcalPer100:253,calories:63}]};
test('nova refeição é um momento separado e preserva refeições, água, notas e treino',()=>{
  const state=initial(),before=structuredClone(state),next=applyEntry(state,meal),day=next.days[0];
  assert.equal(day.meals.length,2);assert.equal(day.meals[0].items[0].food,'Antigo');assert.equal(day.meals[1].time,'16:30');assert.equal(day.meals[1].items.length,1);assert.equal(day.totalCalories,163);assert.equal(day.waterMl,500);assert.equal(day.notes,'Preservar');assert.deepEqual(day.exercise,state.days[0].exercise);assert.deepEqual(state,before);
  assert.equal(applyEntry(next,{...meal,id:'another-meal',time:'18:00'}).days[0].meals.length,3);
});
test('salvar refeição em outra data preserva o dia atual e usa estado mais recente',()=>{
  const state=initial(),updated=applyEntry(state,{type:'water',date:meal.date,amount:250});
  assert.equal(applyEntry(updated,meal).days[0].waterMl,750);
  const next=applyEntry(state,{...meal,date:'2026-10-14'});assert.deepEqual(next.days[1],state.days[0]);assert.equal(next.days[0].totalCalories,63);
});
test('treino acrescenta somente atividade sem zerar gasto antigo nem mudar alimentação',()=>{
  const state=initial(),next=applyEntry(state,{type:'workout',date:meal.date,activity:{type:'Academia',durationMinutes:45,caloriesBurned:999}});
  assert.deepEqual(next.days[0].meals,state.days[0].meals);assert.equal(next.days[0].exercise.activities.length,2);assert.equal(next.days[0].exercise.totalCaloriesBurned,70);assert.equal(next.days[0].waterMl,500);assert.equal(next.days[0].notes,'Preservar');
});
test('água soma ao dia e pesagem não cria ou altera um dia',()=>{
  const state=initial();assert.equal(applyEntry(state,{type:'water',date:meal.date,amount:250}).days[0].waterMl,750);
  const next=applyEntry(state,{type:'weight',date:meal.date,id:'weight-test',value:89.5});assert.equal(next.profile.weight,89.5);assert.deepEqual(next.days,state.days);
});
test('entradas inválidas são recusadas antes de substituir os registros',()=>{
  for(const entry of [{...meal,items:[]},{...meal,time:'25:30'},{...meal,name:'Outro'},{...meal,date:'2026-02-30'},{type:'workout',date:meal.date,activity:{type:'Teste',durationMinutes:0}},{type:'water',date:meal.date,amount:Infinity},{type:'weight',date:meal.date,value:0},{type:'unknown',date:meal.date}])assert.throws(()=>applyEntry(initial(),entry));
});
