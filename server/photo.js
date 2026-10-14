import { PHOTO_MAX_BYTES, normalizePhotoResult } from '../src/photo.js';

const MAX_BODY = 2100000;
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Authorization', ...(status === 429 ? { 'Retry-After': '60' } : {}) } });
async function readLimited(request) {
  if (Number(request.headers.get('content-length')) > MAX_BODY) throw new Error('large');
  const reader = request.body?.getReader();
  if (!reader) throw new Error('invalid');
  const chunks = []; let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read(); if (done) break;
      length += value.byteLength;
      if (length > MAX_BODY) { await reader.cancel(); throw new Error('large'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function validatePhotoRequest(body) {
  if (body?.consent !== true) throw new Error('Confirme o envio da foto para análise.');
  if (typeof body.context !== 'string' || body.context.length > 500) throw new Error('Use até 500 caracteres no contexto.');
  if (typeof body.image !== 'string' || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(body.image)) throw new Error('Envie uma foto JPG preparada pelo app.');
  const bytes = Buffer.from(body.image.slice(body.image.indexOf(',') + 1), 'base64');
  if (bytes.length > PHOTO_MAX_BYTES || bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216 || bytes[2] !== 255 || bytes.at(-2) !== 255 || bytes.at(-1) !== 217) throw new Error('Foto inválida ou acima de 1,5 MB.');
  return { bytes, context: body.context.trim() };
}

export function createPhotoHandler({ authenticate, available, reserve, analyze }) {
  return async request => {
    if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Método não permitido.' }, 405);
    try {
      const userId = await authenticate(request);
      if (!userId) return json({ error: 'Entre na sua conta para analisar fotos.' }, 401);
      if (request.method === 'GET') return json({ available: await available() });
      if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Envie JSON.' }, 415);
      let input;
      try { input = validatePhotoRequest(await readLimited(request)); }
      catch (error) { return json({ error: error.message === 'large' ? 'A foto excede o limite de envio.' : error instanceof SyntaxError ? 'Envio inválido.' : error.message }, error.message === 'large' ? 413 : 400); }
      if (!await available()) return json({ error: 'A análise de fotos ainda não está disponível. Use o registro manual por enquanto.', code: 'PHOTO_UNAVAILABLE' }, 503);
      const quota = await reserve(userId);
      if (!quota.allowed) return json({ error: quota.message }, 429);
      const raw = await analyze({ ...input, signal: request.signal });
      // Return only a validated suggestion; this endpoint never writes a meal or photo.
      const result = normalizePhotoResult(raw);
      return json({ result, remaining: quota.remaining });
    } catch {
      // Provider errors may contain image data. Never log raw errors or requests.
      return json({ error: 'Não consegui analisar a foto agora. Tente novamente mais tarde ou registre os alimentos manualmente.' }, 503);
    }
  };
}
