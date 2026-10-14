import test from 'node:test';
import assert from 'node:assert/strict';
import { accountKey, cloudCache, acknowledge, normalizeRemote, normalizeCache, writeAccountCache } from '../src/cloud.js';
import { emptyState } from '../src/domain.js';
import { createJournalHandler } from '../server/journal.js';

test('cópias locais de contas e visitante usam chaves distintas', () => {
  assert.notEqual(accountKey('user-a'), accountKey('user-b'));
  assert.notEqual(accountKey('user-a'), 'leve-state-v3');
});
test('confirmação de upload não limpa alterações feitas durante a requisição', () => {
  const sent = cloudCache(emptyState(), 2, true);
  const newer = { ...sent, operationId: 'a-new-local-operation' };
  assert.equal(acknowledge(newer, sent, { revision: 3 }).dirty, true);
  assert.equal(acknowledge(sent, sent, { revision: 3 }).dirty, false);
});
test('valida formato remoto e mantém cópia anterior antes de gravar', () => {
  assert.throws(() => normalizeRemote({ revision: 2, state: null }));
  assert.throws(() => normalizeRemote({ revision: 0, state: emptyState() }));
  assert.throws(() => normalizeCache({ revision: -1, state: emptyState() }));
  assert.equal(normalizeRemote({ revision: 0, state: null }).state.profile, null);
  const map = new Map(), storage = { getItem: k => map.get(k) || null, setItem: (k, v) => map.set(k, v) };
  const cache = cloudCache(); const key = accountKey('test');
  writeAccountCache(storage, key, cache); const previous = map.get(key);
  writeAccountCache(storage, key, { ...cache, dirty: true }); assert.equal(map.get(`${key}-previous`), previous);
});
test('API nega acesso sem login antes de consultar o banco', async () => {
  let queried = false;
  const handle = createJournalHandler({ authenticate: async () => null, repository: { get: () => { queried = true; } } });
  const response = await handle(new Request('https://leve.test/api/journal'));
  assert.equal(response.status, 401); assert.equal(queried, false);
  assert.match(response.headers.get('cache-control'), /no-store/);
});
test('API usa proprietário da sessão, valida corpo e propaga conflito', async () => {
  let received;
  const handle = createJournalHandler({ authenticate: async () => 'verified-user', repository: { put: async (...args) => { received = args; return { conflict: true, revision: 2, state: emptyState() }; } } });
  const request = body => new Request('https://leve.test/api/journal', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const response = await handle(request({ userId: 'other-user', baseRevision: 1, operationId: 'test-operation-123456', state: emptyState() }));
  assert.equal(response.status, 409); assert.equal(received[0], 'verified-user');
  assert.equal((await handle(request({ baseRevision: -1 }))).status, 400);
  assert.equal((await handle(new Request('https://leve.test/api/journal', { method: 'PUT', body: '{}' }))).status, 415);
});
test('API limita corpo e não expõe erros internos nem acessa banco com dados inválidos', async () => {
  let wrote = false;
  const handle = createJournalHandler({ authenticate: async () => 'user', repository: { put: () => { wrote = true; } } });
  const response = await handle(new Request('https://leve.test/api/journal', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseRevision: 0, operationId: 'valid-operation-id', state: { days: 'invalid' } }) }));
  assert.equal(response.status, 400); assert.equal(wrote, false);
  const tooLarge = await handle(new Request('https://leve.test/api/journal', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'Content-Length': String(2 * 1024 * 1024) }, body: '{}' }));
  assert.equal(tooLarge.status, 413);
});
