// General routines for a small gym; no remote model, prescribed loads or
// automatic calorie target. IDs are stable so historical sessions survive edits.
export const GYM_SOURCES={activity:'https://www.niddk.nih.gov/health-information/weight-management/tips-get-active/tips-starting-physical-activity',strength:'https://www.nhs.uk/live-well/exercise/strength-exercises/',row:'https://www.mayoclinic.org/healthy-lifestyle/fitness/multimedia/bent-over-row/vid-20084680'};
export const gymEquipment=[{id:'treadmill',name:'Esteira'},{id:'bike',name:'Bicicleta ergométrica'},{id:'dumbbells',name:'Halteres'},{id:'bench',name:'Banco firme'},{id:'station',name:'Estação de musculação'}];
export const gymExercises=[
  {id:'sit-stand',group:'legs',name:'Sentar e levantar do banco',requires:['bench'],cue:'Use um banco firme. Levante e sente devagar, com os pés apoiados. Use as mãos como apoio se precisar.',source:GYM_SOURCES.strength},
  {id:'mini-squat',group:'legs',name:'Agachamento curto com apoio',requires:[],cue:'Use um apoio fixo para equilíbrio. Dobre um pouco joelhos e quadris e retorne com controle, sem forçar a amplitude.',source:GYM_SOURCES.strength},
  {id:'wall-push',group:'push',name:'Flexão na parede',requires:[],cue:'Apoie as mãos na parede à altura do peito. Aproxime o corpo e empurre devagar, mantendo o tronco alinhado.',source:GYM_SOURCES.strength},
  {id:'db-row',group:'pull',name:'Remada com halter apoiada',requires:['dumbbells','bench'],weighted:true,unilateral:true,cue:'Apoie-se em banco firme e mantenha a coluna alinhada. Puxe o halter ao lado do tronco sem girar o corpo. Faça os dois lados.',source:GYM_SOURCES.row},
  {id:'station-row',group:'pull',name:'Remada baixa na estação',requires:['station'],weighted:true,cue:'Use esta opção apenas se houver remada baixa e você conhecer o ajuste. Sente com apoio estável e puxe sem dar impulso. Confira a execução com um profissional.'},
  {id:'hip-extension',group:'hips',name:'Extensão de quadril em pé com apoio',requires:[],unilateral:true,cue:'Segure um apoio fixo. Leve uma perna um pouco para trás sem arquear a lombar. Volte devagar e faça os dois lados.',source:GYM_SOURCES.strength},
  {id:'calf-raise',group:'calves',name:'Elevação de panturrilhas com apoio',requires:[],cue:'Segure um apoio fixo, suba os calcanhares lentamente e desça com controle. Evite balançar o corpo.',source:GYM_SOURCES.strength},
  {id:'db-curl',group:'arms',name:'Rosca com halteres',requires:['dumbbells'],weighted:true,cue:'Mantenha os cotovelos ao lado do corpo. Dobre e estenda os braços sem embalo, com uma carga confortável.'},
];
const groups={A:['legs','push','pull','hips','calves'],B:['legs','pull','push','hips','arms']};
const fail=()=>{throw new Error('Confira os dados do treino da academia.');};
function bounded(value,min,max){if(value==null||value===''||!Number.isFinite(Number(value))||Number(value)<min||Number(value)>max)fail();return Number(value);}
export function normalizeGymPlan(plan){
  if(plan==null)return null;
  if(!Array.isArray(plan.equipment)||plan.equipment.length>5||plan.equipment.some(id=>!gymEquipment.some(e=>e.id===id))||![2,3,4,5].includes(plan.daysPerWeek)||![1,2,3].includes(plan.sets))fail();
  return {equipment:[...new Set(plan.equipment)],daysPerWeek:plan.daysPerWeek,sets:plan.sets};
}
export function gymOptions(group,plan){return gymExercises.filter(ex=>ex.group===group&&ex.requires.every(id=>plan.equipment.includes(id)));}
export function suggestedGymExercises(plan,template){
  const valid=normalizeGymPlan(plan);if(!valid||!groups[template])fail();
  return groups[template].map(group=>gymOptions(group,valid)[0]).filter(Boolean);
}
export function normalizeGymSession(session){
  if(!session||typeof session.id!=='string'||!session.id||session.id.length>100||!groups[session.template]||!Array.isArray(session.exercises)||session.exercises.length>8)fail();
  const strengthMinutes=bounded(session.strengthMinutes,0,240),cardioMinutes=bounded(session.cardioMinutes,0,240);
  if(!['walk','treadmill','bike'].includes(session.cardioMode)||typeof session.estimateStrength!=='boolean')fail();
  const exercises=session.exercises.map(item=>{
    const exercise=gymExercises.find(e=>e.id===item?.exerciseId);
    if(!exercise||!Array.isArray(item.sets)||!item.sets.length||item.sets.length>10)fail();
    const sets=item.sets.map(set=>({reps:bounded(set.reps,1,100),weightKg:set.weightKg==null||set.weightKg===''?null:bounded(set.weightKg,0,300)}));
    if(sets.some(set=>!Number.isInteger(set.reps)||(!exercise.weighted&&set.weightKg!=null)))fail();
    return {exerciseId:exercise.id,sets};
  });
  if(!Number.isInteger(strengthMinutes)||!Number.isInteger(cardioMinutes)||new Set(exercises.map(ex=>ex.exerciseId)).size!==exercises.length||(!exercises.length&&!cardioMinutes)||(exercises.length&&!strengthMinutes)||(!exercises.length&&strengthMinutes)||strengthMinutes+cardioMinutes<1)fail();
  return {id:session.id,template:session.template,exercises,strengthMinutes,cardioMinutes,cardioMode:session.cardioMode,estimateStrength:exercises.length>0&&session.estimateStrength};
}
export function gymHistory(days,today){return days.filter(day=>day.date<=today).flatMap(day=>day.exercise.activities.filter(activity=>activity.gymSession).toReversed().map(activity=>({date:day.date,activity,session:activity.gymSession}))).sort((a,b)=>b.date.localeCompare(a.date));}
export function nextGymTemplate(days,today){const history=gymHistory(days,today).filter(item=>item.session.exercises.length);return history[0]?.session.template==='A'?'B':'A';}
