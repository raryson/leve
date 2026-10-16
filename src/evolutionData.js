import {validDate,newDay} from './domain.js';
import {dailyEnergy} from './energy.js';
const iso=date=>date.toISOString().slice(0,10);
const dateOf=value=>new Date(validDate(value)+'T12:00:00Z');
export function evolutionPeriod(today,period='week',offset=0){
  if(!['week','month'].includes(period)||!Number.isInteger(offset)||offset>0||offset< -1200)throw new Error('Período inválido.');
  const start=dateOf(today);
  let end;
  if(period==='week'){
    start.setUTCDate(start.getUTCDate()-((start.getUTCDay()+6)%7)+offset*7);
    end=new Date(start);end.setUTCDate(end.getUTCDate()+6);
  }else{
    start.setUTCDate(1);start.setUTCMonth(start.getUTCMonth()+offset);
    end=new Date(start);end.setUTCMonth(end.getUTCMonth()+1);end.setUTCDate(0);
  }
  const dates=[];
  for(let day=new Date(start);day<=end&&iso(day)<=today;day.setUTCDate(day.getUTCDate()+1))dates.push(iso(day));
  return {start:iso(start),end:iso(end),dates};
}
export function evolutionRows(state,dates){
  const byDate=new Map(state.days.filter(d=>d.date).map(d=>[d.date,d]));
  return dates.map(date=>{
    const day=byDate.get(date);let energy=null;
    try{energy=dailyEnergy(state.profile,day||newDay(date));}catch{/* Incomplete profile must not fabricate a baseline. */}
    const unknownExercise=Boolean(day?.exercise.performed&&!day.exercise.activities.length)||Boolean(energy?.unestimated);
    const partialExercise=unknownExercise&&Boolean(energy?.estimated);
    const exerciseAvailable=day&&energy&&(!unknownExercise||partialExercise);
    const trained=Boolean(day?.exercise.performed||day?.exercise.activities.length);
    const minutes=trained?day.exercise.activities.reduce((sum,a)=>sum+(Number(a.durationMinutes)||0),0):0;
    return {date,trained,training:day?Number(trained):null,minutes:trained&&minutes===0?null:day?minutes:null,activities:day?.exercise.activities||[],water:day?day.waterMl:null,consumed:day&&(day.meals.length||day.totalCalories>0)?day.totalCalories:null,
      resting:energy?.resting??null,exercise:exerciseAvailable?energy.exercise:null,
      expenditure:exerciseAvailable?energy.total:null,unknownExercise,partialExercise,retroactive:energy?.retroactive||[],
      recorded:Boolean(day)};
  });
}
export function seriesSummary(rows,key){
  const values=rows.map(row=>row[key]).filter(value=>value!==null&&Number.isFinite(value));
  return {count:values.length,total:values.reduce((sum,n)=>sum+n,0),average:values.length?values.reduce((sum,n)=>sum+n,0)/values.length:null};
}
