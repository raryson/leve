import {createWorkout} from './energy.js';
import {newDay,normalizeDay,upsertDay,appendActivity,numeric,validDate} from './domain.js';

export function applyEntry(state, entry) {
  const date=validDate(entry.date);
  const day=state.days.find(d=>d.date===date)||newDay(date);
  if(entry.type==='meal') {
    if(!entry.items?.length)throw new Error('Adicione pelo menos um alimento à refeição.');
    if(!['Café da manhã','Almoço','Lanche','Jantar','Ceia'].includes(entry.name))throw new Error('Escolha a refeição.');
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(entry.time||''))throw new Error('Informe um horário válido.');
    return upsertDay(state,normalizeDay({...day,meals:[...day.meals,{id:entry.id,name:entry.name,time:entry.time,items:entry.items}]}));
  }
  if(entry.type==='workout') {
    if(!entry.activity?.type?.trim())throw new Error('Informe a atividade.');
    const activity=createWorkout(entry.activity,state.profile);
    return upsertDay(state,appendActivity(day,activity));
  }
  if(entry.type==='water')return upsertDay(state,{...day,waterMl:day.waterMl+numeric(entry.amount,1,10000,'Água')});
  if(entry.type==='weight') {
    const value=numeric(entry.value,20,500,'Pesagem');
    const weights=[...state.weights,{id:entry.id,date,value}].sort((a,b)=>(a.date||'').localeCompare(b.date||''));
    return {...state,weights,profile:{...state.profile,weight:weights.at(-1).value}};
  }
  throw new Error('Tipo de registro inválido.');
}
