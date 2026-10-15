export const ENERGY_SOURCE='https://pubmed.ncbi.nlm.nih.gov/2305711/';
export const ACTIVITY_SOURCE='https://www.niddk.nih.gov/bwp';
export const EXERCISE_SOURCE='https://pacompendium.com/';
export const routineLevels=[{factor:1.4,label:'Pouco movimento fora dos treinos'},{factor:1.6,label:'Movimento moderado fora dos treinos'},{factor:1.8,label:'Muito movimento fora dos treinos'}];
export const exerciseReferences=[
  {id:'strength-35',label:'Musculação — exercícios variados, esforço moderado',met:3.5,code:'02054'},
  {id:'strength-60',label:'Musculação — esforço vigoroso',met:6,code:'02050'},
  {id:'walk-38',label:'Caminhada — 4,5 a 5,5 km/h, terreno plano',met:3.8,code:'17190'},
  {id:'walk-48',label:'Caminhada rápida — 5,6 a 6,3 km/h, terreno plano',met:4.8,code:'17200'},
  {id:'elliptical-50',label:'Elíptico — esforço moderado',met:5,code:'02048'},
];
function valid(value,min,max){const n=Number(value);if(value==null||value===''||!Number.isFinite(n)||n<min||n>max)throw new Error('Dados insuficientes para estimar calorias.');return n;}
export function restingEnergy(profile){
  const weight=valid(profile?.weight,20,500),height=valid(profile?.height,80,250),age=valid(profile?.age,18,120);
  if(!['male','female'].includes(profile.sex))throw new Error('Confira o sexo usado na fórmula no Perfil.');
  const result=10*weight+6.25*height-5*age+(profile.sex==='male'?5:-161);
  if(result<=0)throw new Error('Confira idade, altura e peso no Perfil.');
  return Math.round(result);
}
export function routineEnergy(profile){const factor=Number(profile.activityFactor??1.4);if(!routineLevels.some(l=>l.factor===factor))throw new Error('Nível de atividade inválido.');return Math.round(restingEnergy(profile)*factor);}
export function workoutEstimate(referenceId,minutes,profile){
  const reference=exerciseReferences.find(r=>r.id===referenceId);if(!reference)throw new Error('Escolha uma referência de exercício válida.');
  const duration=valid(minutes,1,1440),weightKg=valid(profile?.weight,20,500),baselineDaily=routineEnergy(profile);
  const gross=Math.round(reference.met*3.5*weightKg/200*duration);
  // Replace the baseline expenditure for these minutes instead of adding it twice.
  const additional=Math.max(0,Math.round(gross-baselineDaily/1440*duration));
  return {method:'met-baseline-v1',referenceId,met:reference.met,weightKg,durationMinutes:duration,baselineDaily,gross,additional,source:EXERCISE_SOURCE,code:reference.code};
}
export function validateWorkoutEstimate(estimate,duration){
  if(!estimate||estimate.method!=='met-baseline-v1')throw new Error('Estimativa de exercício inválida.');
  const reference=exerciseReferences.find(r=>r.id===estimate.referenceId);
  const minutes=valid(duration,1,1440),weightKg=valid(estimate.weightKg,20,500),baselineDaily=valid(estimate.baselineDaily,1,20000);
  if(!reference||estimate.met!==reference.met||estimate.durationMinutes!==minutes)throw new Error('Estimativa de exercício inválida.');
  const gross=Math.round(reference.met*3.5*weightKg/200*minutes),additional=Math.max(0,Math.round(gross-baselineDaily/1440*minutes));
  return {...estimate,gross,additional,source:EXERCISE_SOURCE,code:reference.code};
}
export function createWorkout(activity,profile){
  const durationMinutes=valid(activity.durationMinutes,1,1440);
  if(!activity.referenceId)return {...activity,durationMinutes,caloriesBurned:0,energyEstimate:undefined};
  const energyEstimate=workoutEstimate(activity.referenceId,durationMinutes,profile);
  return {...activity,type:exerciseReferences.find(r=>r.id===activity.referenceId).label,durationMinutes,caloriesBurned:energyEstimate.additional,energyEstimate};
}
export function dailyEnergy(profile,day){
  const resting=restingEnergy(profile),routine=routineEnergy(profile);
  const estimated=day.exercise.activities.filter(a=>a.energyEstimate?.method==='met-baseline-v1');
  const exercise=estimated.reduce((sum,a)=>{const estimate=validateWorkoutEstimate(a.energyEstimate,a.durationMinutes);return sum+Math.max(0,Math.round(estimate.gross-routine/1440*a.durationMinutes));},0);
  return {resting,routine,exercise,total:routine+exercise,consumed:day.totalCalories,balance:day.totalCalories-routine-exercise,unestimated:day.exercise.activities.length-estimated.length};
}
