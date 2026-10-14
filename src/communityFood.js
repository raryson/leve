import { foods } from './foods.js';

export const COMMUNITY_CATEGORIES = ['Grãos e pães','Feijões','Frutas','Frango','Carnes','Doces e pastas','Bebidas','Laticínios','Verduras e legumes','Outros'];
export const normalizedText = value => value.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const badWords = new Set(['porra','caralho','merda','bosta','puta','puto','foder','foda','buceta','viadinho','viado','retardado','nazista']);
export function cleanFoodText(value,label,min,max,multiline=false) {
  if(multiline&&typeof value==='string') value=value.replace(/[\r\n\t]+/g,' ');
  if(typeof value!=='string' || /[\p{Cc}\p{Cf}]/u.test(value)) throw new Error(`${label}: use texto sem caracteres invisíveis ou de controle.`);
  const text=value.normalize('NFKC').trim().replace(/\s+/g,' ');
  if(text.length<min || text.length>max) throw new Error(`${label}: use de ${min} a ${max} caracteres.`);
  const tokens=normalizedText(text).replace(/[013457@]/g,c=>({'0':'o','1':'i','3':'e','4':'a','5':'s','7':'t','@':'a'}[c])).split(/[^a-z]+/).filter(Boolean);
  const joined=normalizedText(text).replace(/\b(?:[a-z][ ._-]+){2,}[a-z]\b/g,s=>s.replace(/[^a-z]/g,''));
  if(tokens.some(t=>badWords.has(t.replace(/(.)\1{2,}/g,'$1'))) || joined.split(/[^a-z]+/).some(t=>badWords.has(t))) throw new Error(`${label}: revise o termo inadequado. Se for um nome legítimo, use uma descrição alternativa para revisão.`);
  return text;
}
function finite(value,min,max,label) {
  if(typeof value!=='number' || !Number.isFinite(value) || value<min || value>max) throw new Error(`${label}: informe um número finito entre ${min} e ${max}.`);
  return Math.round(value*100)/100;
}
export function validateCommunityFood(raw) {
  if(!raw || typeof raw!=='object') throw new Error('Alimento inválido.');
  const name=cleanFoodText(raw.name,'Nome',2,120);
  if(!/\p{L}{2}/u.test(name) || /https?:|www\.|[<>]/i.test(name)) throw new Error('Use um nome de alimento, sem links ou marcação.');
  const brand=cleanFoodText(raw.brand??'','Marca',0,80);
  const preparation=cleanFoodText(raw.preparation,'Preparo',2,100);
  if(!COMMUNITY_CATEGORIES.includes(raw.category)) throw new Error('Escolha uma categoria.');
  const kcal=finite(raw.kcal,0,1000,'kcal por 100 g');
  const sourceText=cleanFoodText(raw.sourceText,'Referência nutricional',12,800,true);
  let sourceUrl='';
  if(raw.sourceUrl) {
    try {
      const url=new URL(raw.sourceUrl);
      if(url.protocol!=='https:' || url.username || url.password || url.href.length>1000 || /^(localhost|\[|\d+\.|.*\.local$)/i.test(url.hostname)) throw new Error();
      sourceUrl=url.href;
    } catch { throw new Error('Use uma referência HTTPS pública, sem credenciais ou endereço interno.'); }
  }
  let portion=null;
  if(raw.portion!=null) {
    const grams=finite(raw.portion.grams,.1,10000,'Peso da porção');
    const calories=finite(raw.portion.calories,0,100000,'Calorias da porção');
    const converted=calories/grams*100;
    if(converted>1000 || Math.abs(converted-kcal)>Math.max(1,kcal*.01)) throw new Error('As calorias por porção não correspondem ao valor por 100 g. Confira peso e unidades.');
    portion={grams,calories};
  }
  return {name,brand,preparation,category:raw.category,kcal,sourceText,sourceUrl,portion};
}
export const foodKey = food => [food.name,food.brand,food.preparation].map(value=>normalizedText(value).replace(/[^\p{L}\p{N}]+/gu,' ').trim()).join('|');
export function nutritionFlags(food) {
  const flags=[];const name=normalizedText(food.name);
  if(food.kcal===0) flags.push('Zero kcal exige conferência da referência e do arredondamento.');
  if(/\bagua\b/.test(name) && !/coco|sabor|tonica/.test(name) && food.kcal>1) flags.push('Água com valor energético: conferir composição.');
  if(/\b(oleo|azeite)\b/.test(name) && food.kcal<700) flags.push('Óleo/azeite com valor muito baixo: conferir a unidade.');
  const official=foods.find(f=>normalizedText(f.name)===name);
  if(official && Math.abs(official.kcal-food.kcal)>Math.max(20,official.kcal*.2)) flags.push('Valor divergente da referência já existente no catálogo.');
  if(!food.sourceUrl) flags.push('Referência sem link: conferir o rótulo descrito manualmente.');
  flags.push('A faixa numérica não confirma a composição. Conferir nome, preparo, porção e fonte antes de publicar.');
  return flags;
}
export function asCatalogFood(record) {
  const f=record.food;
  return {id:`community:${record.id}`,name:`${f.name}${f.brand?` · ${f.brand}`:''} · ${f.preparation}`,kcal:f.kcal,category:f.category,sourceLabel:record.status==='published'?'Comunidade · referência revisada':'Meu alimento · referência informada',sourceUrl:f.sourceUrl||'',source:`Rótulo: ${f.sourceText}`,referenceText:f.sourceText,note:`${f.sourceText} ${record.status==='published'?'Contribuição comunitária revisada; confira sua porção.':'Cadastro particular; ainda não publicado para a comunidade.'}`,communityStatus:record.status};
}
