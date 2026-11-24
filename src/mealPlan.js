const definitions=[
  {id:'breakfast',name:'Café da manhã',time:'07:00',match:/CAF[EÉ] DA MANH[AÃ]|BREAKFAST/i},
  {id:'lunch',name:'Almoço',time:'12:00',match:/^ALMO[ÇC]O$|^LUNCH$/i},
  {id:'snack',name:'Lanche',time:'16:00',match:/LANCHE(?: DA TARDE)?|AFTERNOON SNACK/i},
  {id:'dinner',name:'Jantar',time:'19:00',match:/^JANTAR$|^DINNER$/i},
];
const fail=()=>{throw new Error('Confira o formato e os limites do plano alimentar.');};
const text=(value,max)=>{if(typeof value!=='string'||!value.trim()||value.length>max)fail();return value.trim();};
export const planTime=value=>typeof value==='string'&&/^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export function normalizeMealPlan(value){
  if(value==null)return null;
  if(!Array.isArray(value.slots)||!value.slots.length||value.slots.length>8)fail();
  if(value.notes!=null&&(typeof value.notes!=='string'||value.notes.length>12000))fail();
  const slots=value.slots.map(slot=>{
    if(!planTime(slot.time)||!definitions.some(d=>d.id===slot.id)||!Array.isArray(slot.options)||!slot.options.length||slot.options.length>30)fail();
    const options=slot.options.map((option,index)=>{
      if(!Array.isArray(option.lines)||!option.lines.length||option.lines.length>30)fail();
      const lines=option.lines.map(line=>{if(typeof line!=='string'||line.length>500)fail();return line.trim();}).filter(Boolean);if(!lines.length)fail();
      return {id:`${slot.id}-${index+1}`,title:text(option.title,120),lines};
    });
    return {id:slot.id,name:definitions.find(d=>d.id===slot.id).name,time:slot.time,options};
  });
  if(new Set(slots.map(s=>s.id)).size!==slots.length)fail();
  return {title:text(value.title,120),notes:typeof value.notes==='string'?value.notes.slice(0,12000):'',slots};
}
export function parseMealPlan(input){
  if(typeof input!=='string'||input.length>60000)fail();
  const clean=line=>line.replace(/^[\s#>*_\-]+/u,'').replace(/[*_\\]/g,'').replace(/^[^\p{L}\p{N}]+/u,'').trim();
  const lines=input.split(/\r?\n/).map(clean).filter(Boolean);
  const slots=[],notes=[];let slot=null,option=null;
  for(const line of lines){
    const definition=definitions.find(d=>d.match.test(line));
    if(definition){slot={id:definition.id,name:definition.name,time:definition.time,options:[]};slots.push(slot);option=null;continue;}
    if(/^(METAS DI[AÁ]RIAS|OBJETIVO|DAILY GOALS|GOALS)\b/i.test(line)){slot=null;option=null;notes.push(line);continue;}
    if(slot&&/^(Op[çc][aã]o|Option)\s*\d+/i.test(line)){option={title:line.replace(/:$/,'').trim(),lines:[]};slot.options.push(option);continue;}
    if(option){
      if(/^(Todos os pesos|Controlar|Caf[eé] sem|Escolher uma)/i.test(line)){notes.push(line);continue;}
      option.lines.push(line);
    }else notes.push(line);
  }
  return normalizeMealPlan({title:'Meu plano alimentar',notes:notes.join('\n'),slots});
}
export function mealPlanSlot(plan,clock){
  if(!plan||!planTime(clock))return null;
  const slots=[...plan.slots].sort((a,b)=>a.time.localeCompare(b.time));
  return [...slots].reverse().find(slot=>slot.time<=clock)||slots[0];
}
