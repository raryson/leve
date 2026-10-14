import en from './locales/en.json' with {type:'json'};

export const LANGUAGE_KEY='leve-language-v1';
export function detectLanguage(languages=[]){
  for(const value of languages){if(/^pt(?:-|$)/i.test(value))return 'pt';if(/^en(?:-|$)/i.test(value))return 'en';}
  return 'en';
}
export function initialLanguage(storage,languages){try{const saved=storage?.getItem(LANGUAGE_KEY);if(['pt','en'].includes(saved))return saved;}catch{/* Detection works without storage. */}return detectLanguage(languages);}
function browserLanguage(){if(typeof window==='undefined')return 'pt';let storage;try{storage=globalThis.localStorage;}catch{/* Restricted browsers still detect language. */}return initialLanguage(storage,navigator.languages?.length?navigator.languages:[navigator.language]);}
let language=browserLanguage();
const listeners=new Set();
export const getLanguage=()=>language;
export const getLocale=()=>language==='en'?'en-US':'pt-BR';
export function subscribeLanguage(listener){listeners.add(listener);return()=>listeners.delete(listener);}
export function setLanguage(value){if(!['pt','en'].includes(value))return;language=value;try{localStorage.setItem(LANGUAGE_KEY,value);}catch{/* The choice still applies for this session. */}applyDocumentLanguage();listeners.forEach(fn=>fn());}
const patterns=Object.entries(en).filter(([key])=>/\{\d+\}/.test(key)).map(([key,value])=>({key,value,regex:new RegExp('^'+key.split(/\{\d+\}/).map(part=>part.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')).join('(.*?)')+'$')}));
export function translate(text,values=[],lang=language){
  if(typeof text!=='string')return text;
  const lead=text.match(/^\s*/)[0],tail=text.match(/\s*$/)[0],key=text.trim();
  let result=lang==='en'?(en[key]??key):key;
  if(lang==='en'&&!Object.hasOwn(en,key)&&!values.length){for(const item of patterns){const match=item.regex.exec(key);if(match){result=item.value.replace(/\{(\d+)\}/g,(_,i)=>((item.key.startsWith('{0}:')||item.key.includes('deve ser uma lista')||item.key==='Não foi salvo: {0}'||item.key==='Não foi possível abrir os dados: {0}'||item.key==='Corrija o cadastro antes de publicar: {0}')?translate(match[Number(i)+1],[],lang):match[Number(i)+1])??'');break;}}}
  return lead+result.replace(/\{(\d+)\}/g,(_,i)=>String(values[Number(i)]??`{${i}}`))+tail;
}
export const t=translate;
export function applyDocumentLanguage(){
  if(typeof document==='undefined')return;
  document.documentElement.lang=getLocale();
  document.title=language==='en'?'Leve — food, water and movement':'Leve — comida, água e movimento';
  const manifest=document.querySelector('link[rel="manifest"]');if(manifest)manifest.href=language==='en'?'/manifest.en.webmanifest':'/manifest.webmanifest';
  const description=document.querySelector('meta[name="description"]');if(description)description.content=language==='en'?'Your food, water, weight and movement journal. Save meals and take it one day at a time.':'Teu diário de alimentação, água, peso e movimento. Salve refeições, acompanhe a rotina e avance um dia de cada vez.';
}
applyDocumentLanguage();
if(typeof window!=='undefined')window.addEventListener('storage',event=>{if(event.key===LANGUAGE_KEY){language=['pt','en'].includes(event.newValue)?event.newValue:browserLanguage();applyDocumentLanguage();listeners.forEach(fn=>fn());}});
