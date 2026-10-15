import test from 'node:test';
import assert from 'node:assert/strict';
import { KEY, localDate, normalizeState, normalizeDay, readState, saveState, portionCalories, parseDay, trainingDays, upsertDay, appendFood, appendActivity } from '../src/domain.js';

const legacy = () => ({ profile: { name: 'Teste', age: '30', height: '175', weight: '90', sex: 'male' }, weights: [95, 93, 90], days: [{ date: '2026-10-14', meals: [{ name: 'Almoço', calories: 999, items: [{ food: 'Arroz', calories: '128' }, { food: 'Feijão', calories: 76 }] }], totalCalories: 9999, netCalories: 0, exercise: { performed: true, activities: [{ type: 'Caminhada', durationMinutes: '30', caloriesBurned: '100' }], totalCaloriesBurned: 999 } }] });
function storage(value) {
  const data = new Map(value ? [[KEY, value]] : []);
  return { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v) };
}
test('migra números e pesagens antigas sem inventar datas e recalcula os totais', () => {
  const s = normalizeState(legacy());
  assert.equal(s.version, 6); assert.equal(s.profile.weight, 90);
  assert.deepEqual(s.weights.map(w => w.value), [95, 93, 90]);
  assert.ok(s.weights.every(w => w.date === null));
  assert.equal(s.days[0].totalCalories, 204); assert.equal(s.days[0].netCalories, 104);
  assert.equal(s.days[0].exercise.totalCaloriesBurned, 100);
  assert.deepEqual(normalizeState(s), s);
});
test('calcula porção local incluindo decimal brasileiro e zero kcal', () => {
  assert.equal(portionCalories(150, 128), 192);
  assert.equal(portionCalories('62,5', 128), 80);
  assert.equal(portionCalories(100, 0), 0);
  for (const [g, k] of [[-1, 100], [NaN, 100], [100, Infinity], ['', 100]]) assert.throws(() => portionCalories(g, k));
});
test('datas impossíveis e estruturas malformadas não substituem os dados', () => {
  for (const date of ['2026-02-30', '2026-13-01', 'x', null]) assert.throws(() => normalizeDay({ date, meals: [] }));
  for (const day of [{ date: '2026-10-14' }, { date: '2026-10-14', meals: [null] }, { date: '2026-10-14', meals: [], exercise: { activities: {} } }]) assert.throws(() => normalizeDay(day));
  const raw = '{broken'; const db = storage(raw); const result = readState(db);
  assert.ok(result.error); assert.equal(result.raw, raw); assert.equal(db.getItem(KEY), raw);
});
test('normaliza campos opcionais ausentes em dias antigos', () => {
  const d = normalizeDay({ date: '2026-10-14', meals: [{ name: 'Almoço', calories: 300 }] });
  assert.equal(d.totalCalories, 300); assert.equal(d.waterMl, 0); assert.deepEqual(d.meals[0].items, []);
  assert.equal(d.exercise.performed, false);
});
test('mantém cópia anterior e propaga falha de armazenamento', () => {
  const raw = JSON.stringify(legacy()); const db = storage(raw); const s = normalizeState(legacy());
  saveState(db, s); assert.equal(db.getItem(`${KEY}-previous`), raw);
  saveState(db, s); assert.equal(db.getItem(`${KEY}-original`), raw);
  assert.deepEqual(readState(db).state, s);
  const failing = { getItem: () => raw, setItem: () => { throw new Error('Quota'); } };
  assert.throws(() => saveState(failing, s), /Quota/);
});
test('acrescenta registros sem apagar totais antigos sem detalhamento', () => {
  const day = normalizeDay({ date: '2026-10-14', meals: [{ name: 'Almoço', calories: 300 }], exercise: { performed: true, totalCaloriesBurned: 200 } });
  const withFood = appendFood(day, 'Almoço', { food: 'Arroz', calories: 128 });
  assert.equal(withFood.totalCalories, 428);
  const withActivity = appendActivity(withFood, { type: 'Academia', durationMinutes: 45, caloriesBurned: 0 });
  assert.equal(withActivity.exercise.totalCaloriesBurned, 200);
  assert.equal(day.totalCalories, 300);
});
test('importa JSON com cercas e rejeita totais negativos e versões futuras', () => {
  assert.equal(parseDay('```json\n' + JSON.stringify(legacy().days[0]) + '\n```').totalCalories, 204);
  assert.throws(() => normalizeDay({ date: '2026-10-14', meals: [{ calories: -1 }] }));
  assert.throws(() => normalizeState({ ...legacy(), version: 999 }));
  assert.throws(() => normalizeState({ ...legacy(), days: [...legacy().days, ...legacy().days] }));
});
test('treino sem gasto estimado conta para constância e filtra semana e futuro', () => {
  const days = ['2026-10-11', '2026-10-12', '2026-10-14', '2026-10-15'].map(date => normalizeDay({ date, meals: [], exercise: { activities: [{ type: 'Academia', durationMinutes: 45 }] } }));
  assert.equal(trainingDays(days, '2026-10-14'), 2);
  assert.equal(days[0].exercise.totalCaloriesBurned, 0);
});
test('água é preservada ao atualizar dia e datas usam componentes locais', () => {
  const s = normalizeState(legacy()); const d = { ...s.days[0], waterMl: 750 };
  const updated = upsertDay(s, d); assert.equal(updated.days.length, 1); assert.equal(updated.days[0].waterMl, 750);
  assert.equal(localDate(new Date(2026, 9, 14, 23, 59)), '2026-10-14');
});
