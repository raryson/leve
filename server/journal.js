import { normalizeState } from '../src/domain.js';

export const MAX_BYTES = 1024 * 1024;
const json = (body, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store', Vary: 'Authorization' } });
export function createJournalHandler({ authenticate, repository }) {
  return async function handle(request) {
    if (!['GET', 'PUT'].includes(request.method)) return json({ error: 'Método não permitido.' }, 405);
    try {
      const userId = await authenticate(request);
      if (!userId) return json({ error: 'Entre na sua conta para sincronizar.' }, 401);
      if (request.method === 'GET') return json(await repository.get(userId));
      if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'Envie JSON.' }, 415);
      if (Number(request.headers.get('content-length')) > MAX_BYTES) return json({ error: 'O diário excede o limite de 1 MB.' }, 413);
      const raw = await request.text();
      if (new TextEncoder().encode(raw).length > MAX_BYTES) return json({ error: 'O diário excede o limite de 1 MB.' }, 413);
      let body, state;
      try {
        body = JSON.parse(raw);
        if (!Number.isSafeInteger(body.baseRevision) || body.baseRevision < 0 || !/^[a-zA-Z0-9-]{16,80}$/.test(body.operationId || '')) throw new Error('Versão ou identificador inválido.');
        state = normalizeState(body.state);
      } catch (error) { return json({ error: error.message || 'Dados inválidos.' }, 400); }
      // user_id is always derived from the verified session, never the body.
      const result = await repository.put(userId, state, body.baseRevision, body.operationId);
      return json(result, result.conflict ? 409 : 200);
    } catch (error) {
      console.error('journal_request_failed', { code: error.code || 'internal' });
      return json({ error: 'A sincronização falhou. Os dados locais foram mantidos.' }, 503);
    }
  };
}
