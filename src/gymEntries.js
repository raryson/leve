import {normalizeGymSession} from './gym.js';
import {appendActivity,newDay,upsertDay,validDate} from './domain.js';
import {createWorkout} from './energy.js';

export function saveGymSession(state,date,raw){
  validDate(date);const session=normalizeGymSession(raw);
  // A retry or double tap uses the same session ID; never add the cardio twice.
  if(state.days.some(day=>day.exercise.activities.some(activity=>activity.gymSession?.id===session.id)))return state;
  let day=state.days.find(day=>day.date===date)||newDay(date);
  const strength=createWorkout({type:`Treino ${session.template} — academia do condomínio`,referenceId:session.estimateStrength?'strength-35':'',durationMinutes:session.strengthMinutes||session.cardioMinutes},state.profile);
  // Without a strength block, this parent record carries cardio time directly.
  if(!session.strengthMinutes)strength.type='Cardio — academia do condomínio';
  day=appendActivity(day,{...strength,type:session.strengthMinutes?`Treino ${session.template} — academia do condomínio`:'Cardio — academia do condomínio',id:session.id,gymSession:session});
  if(session.strengthMinutes&&session.cardioMinutes)day=appendActivity(day,{id:`${session.id}-cardio`,gymParentId:session.id,type:session.cardioMode==='bike'?'Bicicleta ergométrica':'Caminhada',referenceId:'',durationMinutes:session.cardioMinutes,caloriesBurned:0});
  return upsertDay(state,day);
}

export function removeGymActivity(day,index){
  const selected=day.exercise.activities[index],parent=selected.gymSession?.id||selected.gymParentId;
  return day.exercise.activities.filter((activity,i)=>parent?activity.gymSession?.id!==parent&&activity.gymParentId!==parent:i!==index);
}
