import {foods} from './foods.js';
import {t} from './i18n.js';
const official=new Map(foods.map(food=>[food.id,food]));
export const foodName=food=>food?(official.has(food.id)?t(food.name):food.name):'';
export const foodNote=food=>food?(official.has(food.id)?t(food.note||''):food.communityStatus?`${food.referenceText||''} ${t(food.communityStatus==='published'?'Contribuição comunitária revisada; confira sua porção.':'Cadastro particular; ainda não publicado para a comunidade.')}`:food.note||''):'';
export const itemName=item=>{const food=official.get(item.foodId)||foods.find(food=>food.name===item.food);return food?foodName(food):item.food;};
