import { KEY, emptyState, normalizeState } from './domain.js';

export const accountKey = userId => `${KEY}:account:${userId}`;
export const operationId = () => crypto.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint8Array(16)), b => b.toString(16).padStart(2, '0')).join('');
export function cloudCache(state = emptyState(), revision = 0, dirty = false) {
  return { state, revision, dirty, operationId: operationId() };
}
export function normalizeCache(raw) {
  if (!raw || !Number.isSafeInteger(raw.revision) || raw.revision < 0 || typeof raw.dirty !== 'boolean' || typeof raw.operationId !== 'string') throw new Error('Cópia local da conta inválida.');
  return { ...raw, state: normalizeState(raw.state) };
}
export function normalizeRemote(data) {
  if (!Number.isSafeInteger(data?.revision) || data.revision < 0 || (data.revision > 0 && !data.state) || (data.revision === 0 && data.state)) throw new Error('Resposta de sincronização inválida.');
  return { ...data, state: data.state ? normalizeState(data.state) : emptyState() };
}
export function writeAccountCache(storage, key, cache) {
  const value = JSON.stringify(cache);
  const previous = storage.getItem(key);
  if (previous) storage.setItem(`${key}-previous`, previous);
  storage.setItem(key, value);
  return value;
}
export function acknowledge(current, sent, remote) {
  return { ...current, revision: remote.revision, dirty: current.operationId !== sent.operationId };
}
