import {foods} from './foods.js';
import {t,getLocale} from './i18n.js';
const official=new Map(foods.map(food=>[food.id,food]));
export const foodName=food=>food?(official.has(food.id)?t(food.name):food.name):'';
export const foodNote=food=>food?(official.has(food.id)?t(food.note||''):food.communityStatus?`${food.referenceText||''} ${t(food.communityStatus==='published'?'Contribuição comunitária revisada; confira sua porção.':'Cadastro particular; ainda não publicado para a comunidade.')}`:food.note||''):'';
export const itemName=item=>{const food=official.get(item.foodId)||foods.find(food=>food.name===item.food);return food?foodName(food):item.food;};
const readyQuantity=item=>{const preset=official.get(item.foodId)?.presets?.find(p=>p.grams===Number(item.grams));return preset?t('{0} · {1} g',[t(preset.label),Number(item.grams).toLocaleString(getLocale())]):item.quantity;};
export const itemQuantity=item=>item.servingUnit==='slice'?t(Number(item.servings)===1?'{0} fatia · {1} g':'{0} fatias · {1} g',[Number(item.servings).toLocaleString(getLocale()),Number(item.grams).toLocaleString(getLocale())]):item.unit==='ml'?`${Number(item.milliliters).toLocaleString(getLocale())} ml`:readyQuantity(item);
