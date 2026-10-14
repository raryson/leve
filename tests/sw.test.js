import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

function worker() {
  const handlers = {}, store = new Map(), deleted = [];
  const key = request => typeof request === 'string' ? request : new URL(request.url).pathname;
  let network = async () => new Response('online');
  const cache = { addAll: async paths => { for (const path of paths) store.set(path, new Response(`cached ${path}`)); }, put: async (request, response) => store.set(key(request), response) };
  const self = { location: { origin: 'https://leve.test' }, addEventListener: (name, handler) => { handlers[name] = handler; }, skipWaiting: async () => {}, clients: { claim: async () => {} } };
  const caches = { open: async () => cache, keys: async () => ['leve-v6', 'unrelated-app'], delete: async name => { deleted.push(name); }, match: async request => store.get(key(request))?.clone() };
  const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8').replace('/* BUILD_ASSETS */ []', '["/assets/app.js"]');
  vm.runInNewContext(source, { self, caches, URL, Response, fetch: (...args) => network(...args) });
  async function lifecycle(name) { const waits = []; handlers[name]({ waitUntil: p => waits.push(p) }); await Promise.all(waits); }
  async function request(path, mode = 'cors', method = 'GET', origin = self.location.origin) {
    let result; const waits = [];
    handlers.fetch({ request: { url: origin + path, mode, method }, respondWith: response => { result = response; }, waitUntil: p => waits.push(p) });
    const response = await result; await Promise.all(waits); return response;
  }
  return { lifecycle, request, deleted, store, offline: () => { network = async () => { throw new Error('offline'); }; } };
}
test('instala shell e assets antes do uso offline e preserva caches de outros apps', async () => {
  const w = worker(); await w.lifecycle('install'); await w.lifecycle('activate');
  assert.ok(w.store.has('/assets/app.js')); assert.deepEqual(w.deleted, ['leve-v6']);
});
test('navegação usa rede e reabre shell em falha de conexão', async () => {
  const w = worker(); await w.lifecycle('install');
  assert.equal(await (await w.request('/', 'navigate')).text(), 'online');
  w.offline(); assert.equal(await (await w.request('/alguma-rota', 'navigate')).text(), 'online');
  assert.equal(await (await w.request('/assets/app.js')).text(), 'cached /assets/app.js');
});
test('não intercepta API, outros domínios, POST nem responde HTML para asset ausente', async () => {
  const w = worker(); await w.lifecycle('install'); w.offline();
  assert.equal(await w.request('/api/sync'), undefined);
  assert.equal(await w.request('/assets/missing.js'), undefined);
  assert.equal(await w.request('/assets/app.js', 'cors', 'POST'), undefined);
  assert.equal(await w.request('/assets/app.js', 'cors', 'GET', 'https://external.test'), undefined);
});
