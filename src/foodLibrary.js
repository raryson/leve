import { foods } from './foods.js';

export const searchText = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
export function foodCategory(food) {
  const name = searchText(food.name);
  if (/arroz|aveia|pao/.test(name)) return 'Grãos e pães';
  if (/feijao|lentilha/.test(name)) return 'Feijões';
  if (/banana|abacaxi/.test(name)) return 'Frutas';
  if (/frango/.test(name)) return 'Frango';
  if (/carne|bife|bisteca|salsichao/.test(name)) return 'Carnes';
  return 'Doces e pastas';
}
export const categories = [...new Set(foods.map(foodCategory))];
export function searchFoods(query, category, favorites = [], recent = []) {
  const terms = searchText(query).trim().split(/\s+/).filter(Boolean);
  return foods.filter(food => {
    if (category === 'Favoritos' && !favorites.includes(food.id)) return false;
    if (category === 'Recentes' && !recent.includes(food.id)) return false;
    if (categories.includes(category) && foodCategory(food) !== category) return false;
    return terms.every(term => searchText(food.name).includes(term));
  }).sort((a, b) => category === 'Recentes' ? recent.indexOf(a.id) - recent.indexOf(b.id) : Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)));
}
export function trackRecentFoods(state, day) {
  const ids = day.meals.flatMap(meal => meal.items.map(item => item.foodId || foods.find(food => food.name === item.food)?.id)).filter(id => foods.some(food => food.id === id));
  return [...new Set([...ids.reverse(), ...(state.recentFoods || [])])].slice(0, 12);
}
