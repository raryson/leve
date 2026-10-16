import {evolutionPeriod} from './evolutionData.js';

const shiftDate=(date,delta)=>{const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+delta);return d.toISOString().slice(0,10);};
export function recordedDates(state,today){
  const dates=new Set();
  for(const day of state.days){
    if(day.date&&day.date<=today&&(day.meals.some(m=>m.items.length)||day.totalCalories>0||day.waterMl>0||day.exercise.performed||day.exercise.activities.length||day.notes?.trim()))dates.add(day.date);
  }
  for(const weight of state.weights)if(weight.date&&weight.date<=today)dates.add(weight.date);
  return dates;
}
export function registrationStreak(state,today){
  const dates=recordedDates(state,today),ordered=[...dates].sort();
  let best=0,run=0,previous=null;
  for(const date of ordered){run=previous&&shiftDate(previous,1)===date?run+1:1;best=Math.max(best,run);previous=date;}
  const recordedToday=dates.has(today);
  let cursor=recordedToday?today:shiftDate(today,-1),current=0;
  while(dates.has(cursor)){current++;cursor=shiftDate(cursor,-1);}
  return {current,best,recordedToday,total:dates.size};
}
export const streakMilestones=[1,3,7,14,30,60,100,200,365];
export function streakIncentive(state,today){
  const streak=registrationStreak(state,today);
  const next=streakMilestones.find(days=>days>streak.current)??(Math.floor(streak.current/100)+1)*100;
  const achieved=streakMilestones.filter(days=>days<=streak.best);
  return {...streak,next,remaining:next-streak.current,achieved,
    milestoneToday:streak.recordedToday&&streakMilestones.includes(streak.current),
    returning:streak.current===0&&streak.total>0};
}
export function weeklySummary(state,today,offset=0){
  const period=evolutionPeriod(today,'week',offset),dates=recordedDates(state,today);
  const days=state.days.filter(d=>period.dates.includes(d.date));
  const foodDays=days.filter(d=>d.meals.some(m=>m.items.length)||d.totalCalories>0);
  const waterDays=days.filter(d=>d.waterMl>0);
  const weights=state.weights.filter(w=>period.dates.includes(w.date)).sort((a,b)=>a.date.localeCompare(b.date));
  const average=(entries,key)=>entries.length?entries.reduce((sum,d)=>sum+d[key],0)/entries.length:null;
  return {...period,calendar:Array.from({length:7},(_,i)=>{const date=shiftDate(period.start,i);return {date,recorded:dates.has(date),future:date>today};}),
    recorded:period.dates.filter(d=>dates.has(d)).length,foodDays:foodDays.length,waterDays:waterDays.length,
    meals:foodDays.reduce((sum,d)=>sum+d.meals.filter(m=>m.items.length).length,0),
    consumed:average(foodDays,'totalCalories'),water:average(waterDays,'waterMl'),
    trainingDays:days.filter(d=>d.exercise.performed||d.exercise.activities.length).length,
    weightChange:weights.length>=2?weights.at(-1).value-weights[0].value:null,weightCount:weights.length};
}
