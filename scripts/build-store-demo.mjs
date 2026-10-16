// Synthetic journal for screenshots. Import through the UI in an empty LOCAL origin only.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {foods} from '../src/foods.js';
import {normalizeState,newDay,appendFood,appendActivity,normalizeSavedMeal} from '../src/domain.js';
import {createWorkout} from '../src/energy.js';
const end=process.argv[2]||'2026-10-16';
const profile={name:'Alex',age:29,height:175,weight:80.8,sex:'male',activityFactor:1.4,waterGoal:2500,weeklyWorkouts:3,calorieGoal:null};
const food=(id,amount)=>{
  const f=foods.find(f=>f.id===id);if(!f)throw Error(id);
  return {foodId:id,food:f.name,...(f.unit==='ml'?{unit:'ml',milliliters:amount,kcalPer100Ml:f.kcal}:{grams:amount,kcalPer100:f.kcal}),calories:Math.round(amount*f.kcal)/100,source:f.source||'',quantity:`${amount} ${f.unit==='ml'?'ml':'g'}`};
};
const veggie=foods.find(f=>/Mix de legumes grelhados.*sem/i.test(f.name))||foods.find(f=>/Brócolis/i.test(f.name));
if(!veggie)throw Error('Vegetable not found');
const days=[],weights=[];
for(let i=0;i<28;i++){
  const d=new Date(end+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-27+i);const date=d.toISOString().slice(0,10);
  let day={...newDay(date),waterMl:[2000,2500,2250,2750,2500,3000,2250][i%7]};
  const meals=[
    ['Café da manhã','08:00',[food('taco-52',75),food('sbd-power-one-integral',15),food('coffee-milk-half',200)]],
    ['Almoço','12:30',[food('taco-1',200+i%3*20),food('taco-567',150),food('taco-413',150),food(veggie.id,150)]],
    ['Lanche','16:00',[food('sbd-yogurt-whole',170),food('sbd-granola',35),food('taco-179',100)]]
  ];
  if(i<27)meals.push(['Jantar','19:30',[food('taco-1',150),food('taco-577',150),food('taco-413',100),food(veggie.id,200)]]);
  for(const [name,time,items]of meals){for(const item of items)day=appendFood(day,name,item);day.meals.find(m=>m.name===name).time=time;}
  if([1,3,5].includes(d.getUTCDay()))day=appendActivity(day,createWorkout({referenceId:d.getUTCDay()===5?'walk-48':'strength-35',durationMinutes:d.getUTCDay()===5?35:50},profile));
  days.push(day);if(i%3===0||i===27)weights.push({id:'demo-weight-'+i,date,value:Math.round((82.1-i*.047+[0,.1,-.1][i%3])*10)/10});
}
profile.weight=weights.at(-1).value;
const savedMeals=[
  normalizeSavedMeal({id:'demo-lunch',name:'Everyday lunch',items:[food('taco-1',200),food('taco-567',150),food('taco-413',150),food(veggie.id,150)]}),
  normalizeSavedMeal({id:'demo-breakfast',name:'Quick breakfast',items:[food('taco-52',75),food('sbd-power-one-integral',15),food('coffee-milk-half',200)]})
];
const state=normalizeState({version:6,profile,days,weights,savedMeals,favoriteFoods:['taco-1','taco-567','sbd-yogurt-whole','taco-52'],recentFoods:['taco-1','sbd-yogurt-whole','sbd-granola']});
const path=process.argv[3]||join(tmpdir(),'leve-store-demo.json');await writeFile(path,JSON.stringify(state,null,2));
console.log(JSON.stringify({path,days:days.length,weights:weights.length,todayCalories:state.days.at(-1).totalCalories}));
