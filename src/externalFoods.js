import {cleanFoodText} from './communityFood.js';

export const OFF_LICENSE='https://opendatacommons.org/licenses/odbl/1-0/';
export function foodSearchQuery(value){
  const query=cleanFoodText(value,'Busca',2,70).replace(/\s+/g,' ');
  if(/https?:|www\.|@|[<>]|\d{7}/i.test(query)||query.split(' ').length>8)throw Error('Busque somente o nome do alimento ou a marca, sem relato ou dados pessoais.');
  return query;
}
export function normalizeExternalFood(raw){
  if(!raw||!/^off:\d{8,14}$/.test(raw.id)||!['g','ml'].includes(raw.unit)||typeof raw.kcal!=='number'||!Number.isFinite(raw.kcal)||raw.kcal<0||raw.kcal>1000)throw Error('Referência externa inválida.');
  if(raw.searchAliases!=null&&(!Array.isArray(raw.searchAliases)||raw.searchAliases.length>3))throw Error('Referência externa inválida.');
  const searchAliases=[...new Set((raw.searchAliases||[]).map(foodSearchQuery))];
  const code=raw.id.slice(4),name=cleanFoodText(raw.name,'Nome',2,180),sourceUrl=`https://world.openfoodfacts.org/product/${code}`;
  if(raw.sourceUrl!==sourceUrl)throw Error('Referência externa inválida.');
  return {id:raw.id,name,searchAliases,kcal:Math.round(raw.kcal*100)/100,unit:raw.unit,category:'Outros',sourceUrl,sourceLabel:'Open Food Facts · ODbL',note:raw.unit==='ml'?'Rótulo externo por 100 ml, produto como vendido. Confira marca, preparo e embalagem. Open Food Facts é colaborativo; o resultado não é uma validação nutricional.':'Rótulo externo por 100 g, produto como vendido. Confira marca, preparo e embalagem. Open Food Facts é colaborativo; o resultado não é uma validação nutricional.'};
}
export function offProduct(product){
  try{
    if(!product||product.data_quality_errors_tags?.length||product.no_nutrition_data==='on')return null;
    const basis=product.nutrition_data_per;
    if(!['100g','100ml'].includes(basis))return null;
    const liquid=product.categories_tags?.some(tag=>['en:beverages','en:milks','en:plant-milks','en:alcoholic-beverages'].includes(tag));
    // OFF uses *_100g keys even for volumes. Never infer ml from a bottle's size.
    if(liquid&&basis!=='100ml')return null;
    const n=product.nutriments||{},kcal=n['energy-kcal_100g'],kj=n['energy-kj_100g']??(n.energy_unit==='kJ'?n.energy_100g:undefined);
    const valid=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0;
    const energy=valid(kcal)?kcal:valid(kj)?kj/4.184:null;
    if(energy===null||valid(kcal)&&valid(kj)&&Math.abs(kcal-kj/4.184)>Math.max(10,kcal*.2))return null;
    const name=product.product_name_pt||product.product_name_en||product.product_name;
    if(typeof name!=='string'||name.trim().length<2)return null;
    const brand=typeof product.brands==='string'?product.brands.trim().slice(0,60):'';
    return normalizeExternalFood({id:`off:${product.code}`,name:`${name||''}${brand?' · '+brand:''}`,kcal:energy,unit:basis==='100ml'?'ml':'g',sourceUrl:`https://world.openfoodfacts.org/product/${product.code}`});
  }catch{return null;}
}
export function normalizeExternalFoods(value){
  if(value==null)return [];
  if(!Array.isArray(value)||value.length>200)throw Error('Lista de referências externas inválida.');
  return [...new Map(value.map(raw=>{const food=normalizeExternalFood(raw);return [food.id,food];})).values()];
}
export function addExternalFood(state,raw){
  const food=normalizeExternalFood(raw),previous=normalizeExternalFoods(state.externalFoods);
  return {...state,externalFoods:normalizeExternalFoods([...previous.filter(f=>f.id!==food.id),food])};
}

export function suggestedFoodQuery(description){
  const value=description.trim().replace(/^(?:comi|bebi|tomei|ate|had)\s+/i,'').replace(/^\d+(?:[.,]\d+)?\s*(?:(?:gramas?|grams?|g|ml|fatias?|slices?|colheres?|tablespoons?|unidades?)\b(?:\s+de\s+sopa)?)?\s*(?:de\s+|of\s+)?/i,'').trim();
  try{return foodSearchQuery(value);}catch{return '';}
}
