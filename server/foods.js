import { validateCommunityFood, cleanFoodText } from '../src/communityFood.js';
import { FoodError } from './foods-db.js';

const uuid=value=>typeof value==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const json=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store',Vary:'Authorization'}});
async function readBody(request) {
  if(!request.headers.get('content-type')?.startsWith('application/json')) throw new FoodError('Envie JSON.',415);
  if(Number(request.headers.get('content-length'))>16000) throw new FoodError('Cadastro grande demais.',413);
  const reader=request.body?.getReader();if(!reader) throw new FoodError('Envio vazio.');
  const chunks=[];let length=0;
  try {while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>16000){await reader.cancel();throw new FoodError('Cadastro grande demais.',413);}chunks.push(value);}}finally{reader.releaseLock();}
  try{return JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new FoodError('JSON inválido.');}
}
export function createFoodsHandler({authenticate,repository,isModerator}) {
  return async request=>{
    if(!['GET','POST'].includes(request.method)) return json({error:'Método não permitido.'},405);
    try {
      const userId=await authenticate(request);
      if(request.headers.has('authorization')&&!userId) return json({error:'Sua sessão expirou. Entre novamente.'},401);
      const moderator=Boolean(userId&&isModerator(userId));
      if(request.method==='GET') {
        const url=new URL(request.url);
        const offset=Number(url.searchParams.get('offset')||0),modOffset=Number(url.searchParams.get('moderationOffset')||0);
        if(![offset,modOffset].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=100000)) throw new FoodError('Página inválida.');
        return json(await repository.list(userId,moderator,offset,modOffset));
      }
      if(!userId) return json({error:'Entre na conta para cadastrar ou compartilhar alimentos.'},401);
      const body=await readBody(request);
      let food;
      try {
        if(!body || !['create','update','cancel','review','report','resolve-report'].includes(body.action) || !uuid(body.id)) throw new Error('Ação ou identificador inválido.');
        if(['review','resolve-report'].includes(body.action)&&!moderator) return json({error:'Apenas moderadores podem fazer isso.'},403);
        if(['create','update'].includes(body.action)) {if(typeof body.share!=='boolean')throw new Error('Escolha se deseja compartilhar.');food=validateCommunityFood(body.food);}
        if(['update','cancel','review'].includes(body.action)&&(!Number.isSafeInteger(body.version)||body.version<1))throw new Error('Versão inválida.');
        if(body.action==='review') {
          if(!['published','rejected','hidden'].includes(body.status))throw new Error('Decisão inválida.');
          if(body.status==='published'&&body.reviewed!==true)throw new Error('Confira a fonte, o preparo e as calorias antes de aprovar.');
        }
        if(['review','resolve-report'].includes(body.action))body.reason=cleanFoodText(body.reason,'Motivo da revisão',12,500);
        if(body.action==='report') {
          if(typeof body.message==='string')body.message=body.message.replace(/[\r\n\t]+/g,' ');
          if(!['nutrition','name','source','other'].includes(body.category))throw new Error('Escolha o motivo da denúncia.');
          if(typeof body.message!=='string'||body.message.trim().length<5||body.message.length>500||/[\p{Cc}\p{Cf}]/u.test(body.message))throw new Error('Descreva o problema em 5 a 500 caracteres.');
          body.message=body.message.trim();
        }
      }catch(error){throw new FoodError(error.message);}
      return json(await repository.mutate(userId,moderator,body,food));
    }catch(error){return json({error:error instanceof FoodError?error.message:'Não foi possível acessar o catálogo agora. Seu diário foi preservado.'},error instanceof FoodError?error.status:503);}
  };
}
