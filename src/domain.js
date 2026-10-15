import {validateWorkoutEstimate,routineLevels} from './energy.js';
export const KEY = 'leve-state-v3';
export const VERSION = 6;
export const emptyState = () => ({ version: VERSION, profile: null, days: [], weights: [], savedMeals: [], favoriteFoods: [], recentFoods: [] });
export const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export const number = value => Number(typeof value === 'string' ? value.replace(',', '.') : value);
export function numeric(value, min, max, label) {
  const n = number(value);
  if (value === '' || value == null || !Number.isFinite(n) || n < min || n > max) throw new Error(`${label}: informe um número entre ${min} e ${max}.`);
  return n;
}
export const amountUnit=item=>item?.unit==='ml'?'ml':'g';
export const itemAmount=item=>amountUnit(item)==='ml'?item.milliliters:item.grams;
export const itemDensity=item=>amountUnit(item)==='ml'?item.kcalPer100Ml:item.kcalPer100;
export function sliceGrams(slices,gramsPerSlice){return numeric(Math.round(numeric(slices,.01,100,'Quantidade de fatias')*numeric(gramsPerSlice,.1,500,'Peso por fatia')*100)/100,.1,10000,'Quantidade em gramas');}
function sliceDetails(item,grams){
  if(item.servingUnit!=='slice')return {};
  const servings=numeric(item.servings,.01,100,'Quantidade de fatias'),gramsPerSlice=numeric(item.gramsPerSlice,.1,500,'Peso por fatia');
  const mass=numeric(grams,.1,10000,'Quantidade em gramas');
  if(Math.abs(sliceGrams(servings,gramsPerSlice)-mass)>.01)throw new Error('As fatias não correspondem ao peso total. Confira a porção.');
  return {servingUnit:'slice',servings,gramsPerSlice};
}
function volumeDetails(item){
  if(item.servingUnit!=null)throw new Error('Bebidas em ml não usam porções em fatias.');
  const milliliters=numeric(item.milliliters,.1,10000,'Volume em ml'),kcalPer100Ml=numeric(item.kcalPer100Ml,0,1000,'kcal por 100 ml');
  return {unit:'ml',milliliters,kcalPer100Ml,grams:null,kcalPer100:null,quantity:`${milliliters} ml`,calories:portionCalories(milliliters,kcalPer100Ml)};
}
export function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || localDate(new Date(`${value}T12:00:00`)) !== value) throw new Error('Data inválida.');
  return value;
}
const text = (value, fallback = '') => typeof value === 'string' ? value : fallback;
const array = (value, label) => {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error(`${label} deve ser uma lista.`);
  return value;
};
const kcal = value => numeric(value ?? 0, 0, 100000, 'Calorias');
export function normalizeProfile(p) {
  if (!p || !text(p.name).trim()) throw new Error('Informe seu nome.');
  if(!routineLevels.some(level=>level.factor===Number(p.activityFactor??1.4)))throw new Error('Nível de atividade inválido.');
  return { ...p, activityFactor: numeric(p.activityFactor??1.4,1.4,1.8,'Nível de atividade'), name: p.name.trim(), age: numeric(p.age, 18, 120, 'Idade'), height: numeric(p.height, 80, 250, 'Altura'), weight: numeric(p.weight, 20, 500, 'Peso'), sex: p.sex === 'male' ? 'male' : 'female', calorieGoal: p.calorieGoal ? numeric(p.calorieGoal, 1, 10000, 'Referência de calorias') : null, waterGoal: numeric(p.waterGoal ?? 2000, 250, 10000, 'Objetivo de água'), weeklyWorkouts: numeric(p.weeklyWorkouts ?? 3, 1, 7, 'Treinos por semana') };
}
export function normalizeDay(d) {
  if (!d || !Array.isArray(d.meals)) throw new Error('O dia precisa conter uma lista de refeições (meals).');
  const meals = d.meals.map(m => {
    if (!m || typeof m !== 'object') throw new Error('Refeição inválida.');
    const items = array(m.items, 'Itens').map(i => {
      if (!i || typeof i !== 'object') throw new Error('Alimento inválido.');
      return { ...i, food: text(i.food, 'Alimento'), quantity: text(i.quantity), calories: kcal(i.calories),...(i.unit==='ml'?volumeDetails(i):sliceDetails(i,i.grams)) };
    });
    return { ...m, name: text(m.name, 'Refeição'), items, calories: items.length ? items.reduce((sum, i) => sum + i.calories, 0) : kcal(m.calories) };
  });
  const activities = array(d.exercise?.activities, 'Atividades').map(a => {
    if (!a || typeof a !== 'object') throw new Error('Atividade inválida.');
    const energyEstimate=a.energyEstimate?validateWorkoutEstimate(a.energyEstimate,a.durationMinutes):null;
    return { ...a, ...(energyEstimate?{energyEstimate,caloriesBurned:energyEstimate.additional}:{}), type: text(a.type, 'Atividade'), durationMinutes: numeric(a.durationMinutes ?? 0, 0, 1440, 'Duração'), caloriesBurned: energyEstimate?energyEstimate.additional:kcal(a.caloriesBurned) };
  });
  const totalCalories = meals.reduce((sum, m) => sum + m.calories, 0);
  const totalCaloriesBurned = activities.length ? activities.reduce((sum, a) => sum + a.caloriesBurned, 0) : kcal(d.exercise?.totalCaloriesBurned);
  return { ...d, date: validDate(d.date), meals, totalCalories, netCalories: totalCalories - totalCaloriesBurned, exercise: { ...d.exercise, activities, performed: activities.length > 0 || Boolean(d.exercise?.performed), totalCaloriesBurned }, waterMl: numeric(d.waterMl ?? 0, 0, 100000, 'Água'), notes: text(d.notes) };
}
export const newDay = date => normalizeDay({ date, meals: [] });
export const upsertDay = (s, day) => ({ ...s, days: [...s.days.filter(d => d.date !== day.date), normalizeDay(day)].sort((a, b) => a.date.localeCompare(b.date)) });
export function appendFood(day, name, item) {
  const meals = structuredClone(day.meals);
  let meal = meals.find(m => m.name === name);
  if (!meal) { meal = { name, items: [], calories: 0 }; meals.push(meal); }
  if (!meal.items.length && meal.calories > 0) meal.items.push({ food: 'Registro anterior (sem itens detalhados)', quantity: '', calories: meal.calories });
  meal.items.push(item);
  return normalizeDay({ ...day, meals });
}
export function appendActivity(day, activity) {
  const activities = [...day.exercise.activities];
  if (!activities.length && day.exercise.totalCaloriesBurned > 0) activities.push({ type: 'Atividade anterior (sem detalhes)', durationMinutes: 0, caloriesBurned: day.exercise.totalCaloriesBurned });
  activities.push(activity);
  return normalizeDay({ ...day, exercise: { ...day.exercise, activities } });
}
export function normalizeState(raw) {
  const data = raw?.profile?.profile ? raw.profile : raw;
  if (!data || typeof data !== 'object' || !Array.isArray(data.days) || !Array.isArray(data.weights)) throw new Error('Backup Leve inválido.');
  if (data.version > VERSION) throw new Error('Este backup precisa de uma versão mais recente do Leve.');
  const profile = data.profile ? normalizeProfile(data.profile) : null;
  if (!profile && (data.days.length || data.weights.length)) throw new Error('O backup contém registros sem perfil.');
  const weights = data.weights.map((w, i) => typeof w === 'object' && w !== null ? { ...w, id: text(w.id, `legacy-${i}`), date: w.date ? validDate(w.date) : null, value: numeric(w.value, 20, 500, 'Pesagem') } : { id: `legacy-${i}`, date: null, value: numeric(w, 20, 500, 'Pesagem') });
  if (!weights.length && profile) weights.push({ id: 'initial', date: null, value: profile.weight });
  const days = data.days.map(normalizeDay).sort((a, b) => a.date.localeCompare(b.date));
  if (new Set(days.map(d => d.date)).size !== days.length) throw new Error('Há dias duplicados no backup.');
  const savedMeals = array(data.savedMeals, 'Refeições salvas').map(normalizeSavedMeal);
  if (savedMeals.length > 100 || new Set(savedMeals.map(m => m.id)).size !== savedMeals.length) throw new Error('Limite excedido ou refeições salvas duplicadas.');
  const foodIds = (value, limit) => {
    const list = array(value, 'Preferências de alimentos');
    if (list.length > limit || list.some(id => typeof id !== 'string' || !id || id.length > 100)) throw new Error('Preferências de alimentos inválidas.');
    return [...new Set(list)];
  };
  return { ...data, version: VERSION, profile, days, weights, savedMeals, favoriteFoods: foodIds(data.favoriteFoods, 200), recentFoods: foodIds(data.recentFoods, 12) };
}

export function normalizeSavedMeal(meal) {
  if (!meal || typeof meal.id !== 'string' || !meal.id || meal.id.length > 100 || typeof meal.name !== 'string' || !meal.name.trim() || meal.name.length > 80 || !Array.isArray(meal.items) || !meal.items.length || meal.items.length > 50) throw new Error('Informe um nome e de 1 a 50 alimentos para a refeição salva.');
  const items = meal.items.map(item => {
    if (!item || typeof item.food !== 'string' || !item.food.trim() || item.food.length > 200) throw new Error('Alimento inválido na refeição salva.');
    if(item.unit!=null&&!['g','ml'].includes(item.unit))throw new Error('Unidade de medida inválida.');
    const measured=item.unit==='ml'?volumeDetails(item):(()=>{const grams=numeric(item.grams,.1,10000,'Quantidade em gramas'),kcalPer100=numeric(item.kcalPer100,0,1000,'kcal por 100 g');return {grams,kcalPer100,quantity:`${grams} g`,calories:portionCalories(grams,kcalPer100),...sliceDetails(item,grams)};})();
    return { food: item.food.trim(), foodId: typeof item.foodId === 'string' ? item.foodId.slice(0, 100) : '', ...measured, source: text(item.source).slice(0, 1000), referenceNote: text(item.referenceNote).slice(0, 2000) };
  });
  return { id: meal.id, name: meal.name.trim(), items };
}

export function useSavedMeal(day, destination, meal) {
  const normalized = normalizeSavedMeal(meal);
  return normalized.items.reduce((draft, item) => appendFood(draft, destination, { ...item, entryMethod: 'saved-meal' }), day);
}
export function readState(storage) {
  let raw;
  try {
    raw = storage.getItem(KEY);
    return { state: raw ? normalizeState(JSON.parse(raw)) : emptyState(), error: '', raw };
  } catch (error) { return { state: emptyState(), error: `Não foi possível abrir os dados: ${error.message}`, raw }; }
}
export function saveState(storage, state) {
  // Preserve the previous copy before replacing it. A failed write never reports success.
  const previous = storage.getItem(KEY);
  if (previous) {
    let oldVersion;
    try { oldVersion = JSON.parse(previous).version; } catch { /* Recovery preserves malformed originals too. */ }
    if (oldVersion !== VERSION && !storage.getItem(`${KEY}-original`)) storage.setItem(`${KEY}-original`, previous);
    storage.setItem(`${KEY}-previous`, previous);
  }
  storage.setItem(KEY, JSON.stringify(state));
}
export const portionCalories = (grams, per100) => Math.round(numeric(grams, 0.1, 10000, 'Quantidade') * numeric(per100, 0, 1000, 'kcal por 100 g') / 100);
export function parseDay(raw) {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return normalizeDay(JSON.parse(cleaned));
}
export function weekStart(date) {
  const d = new Date(`${date}T12:00:00`);
  d.setDate(d.getDate() - (d.getDay() + 6) % 7);
  return localDate(d);
}
export const trainingDays = (days, date) => days.filter(d => d.date >= weekStart(date) && d.date <= date && d.exercise.performed).length;
