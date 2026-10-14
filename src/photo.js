import { foods } from './foods.js';
import { numeric, portionCalories } from './domain.js';

export const PHOTO_MAX_BYTES = 1500000;
export const PHOTO_MODEL = 'google/gemini-3.5-flash-lite';
export const PHOTO_NOTICE = 'Foto não mede peso: porções, preparo e calorias são aproximações. Confira também óleo, molhos e acompanhamentos.';

export function normalizePhotoResult(raw) {
  if (!raw || typeof raw.hasFood !== 'boolean' || !Array.isArray(raw.items) || raw.items.length > 15 || typeof raw.message !== 'string' || raw.message.length > 600) throw new Error('A análise retornou um formato inválido.');
  if (!raw.hasFood && raw.items.length) throw new Error('A análise da imagem está inconsistente.');
  const items = raw.items.map((item, index) => {
    if (!item || typeof item.label !== 'string' || !item.label.trim() || item.label.length > 150 || typeof item.note !== 'string' || item.note.length > 500) throw new Error('Alimento inválido na análise.');
    const food = foods.find(f => f.id === item.foodId);
    if (item.foodId !== null && !food) throw new Error('A análise sugeriu uma referência desconhecida.');
    return {
      id: index, label: item.label.trim(), foodId: food?.id || '',
      grams: item.gramsEstimate == null ? '' : numeric(item.gramsEstimate, 0.1, 10000, 'Porção sugerida'),
      kcalPer100: food?.kcal ?? (item.kcalPer100Estimate == null ? '' : numeric(item.kcalPer100Estimate, 0, 1000, 'Calorias sugeridas')),
      note: item.note,
    };
  });
  return { hasFood: raw.hasFood, message: raw.message, items };
}

export function photoItemsForJournal(rows, confirmed) {
  if (!confirmed) throw new Error('Confirme a revisão dos alimentos e das porções.');
  if (!rows.length || rows.length > 15) throw new Error('Revise pelo menos um alimento.');
  return rows.map(row => {
    const food = foods.find(f => f.id === row.foodId);
    const name = food?.name || row.label.trim();
    if (!name || name.length > 150) throw new Error('Informe o nome do alimento.');
    const grams = numeric(row.grams, 0.1, 10000, 'Quantidade');
    const kcalPer100 = food?.kcal ?? numeric(row.kcalPer100, 0, 1000, 'kcal por 100 g');
    return {
      food: name, quantity: `${grams} g`, grams, kcalPer100,
      calories: portionCalories(grams, kcalPer100), entryMethod: 'reviewed-photo',
      source: food ? food.sourceUrl || food.referenceId || food.id : 'Estimativa de IA revisada pelo usuário',
      referenceNote: [PHOTO_NOTICE, food?.note, row.note].filter(Boolean).join(' '),
    };
  });
}

// Redrawing exports only pixels, omitting the original image's EXIF metadata.
export async function preparePhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Use uma foto JPG, PNG ou WebP. Se precisar, exporte a foto do celular como JPG.');
  if (file.size > 15 * 1024 * 1024 || !file.size) throw new Error('Escolha uma foto de até 15 MB.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    try { await image.decode(); } catch { throw new Error('Não consegui abrir essa foto. Tente outra imagem JPG.'); }
    if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 50000000) throw new Error('A imagem é grande demais. Escolha uma versão menor.');
    const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Seu navegador não conseguiu preparar a foto.');
    context.fillStyle = '#fff'; context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', .82);
    if (dataUrl.length * .75 > PHOTO_MAX_BYTES) throw new Error('A foto ainda está grande. Escolha uma versão menor.');
    return dataUrl;
  } finally { URL.revokeObjectURL(url); }
}
