import { useCallback, useEffect, useRef, useState } from 'react';
import { KEY, normalizeState, readState, saveState } from './domain.js';
import { accountKey, cloudCache, normalizeCache, normalizeRemote, writeAccountCache, acknowledge, operationId } from './cloud.js';

export default function useJournal(account, editing) {
  const key = account ? accountKey(account.userId) : KEY;
  const [loaded] = useState(() => {
    if (!account) return readState(localStorage);
    let raw;
    try {
      raw = localStorage.getItem(key);
      const cache = raw ? normalizeCache(JSON.parse(raw)) : cloudCache();
      return { cache, state: cache.state, raw, error: '', exists: Boolean(raw) };
    } catch (e) { return { cache: cloudCache(), state: cloudCache().state, raw, error: e.message, exists: Boolean(raw) }; }
  });
  const [state, setState] = useState(loaded.state);
  const [loadError, setLoadError] = useState(loaded.error);
  const loadErrorRef = useRef(loadError); loadErrorRef.current = loadError;
  const [error, setError] = useState('');
  const [ready, setReady] = useState(!account || loaded.exists);
  const [sync, setSync] = useState({ phase: account ? 'pending' : 'guest', message: '', conflict: null });
  const cacheRef = useRef(loaded.cache || cloudCache(loaded.state));
  const editingRef = useRef(editing); editingRef.current = editing;
  const authRef = useRef(account); authRef.current = account;
  const busy = useRef(false);
  const alive = useRef(true);
  const controller = useRef(null);
  const serialized = useRef(loaded.raw || null);

  const persist = useCallback(cache => {
    serialized.current = writeAccountCache(localStorage, key, cache);
    cacheRef.current = cache; setState(cache.state);
  }, [key]);

  const synchronize = useCallback(async () => {
    if (!authRef.current || busy.current || loadErrorRef.current || editingRef.current) return;
    busy.current = true;
    setSync(current => ({ ...current, phase: 'syncing', message: 'Sincronizando…' }));
    const abort = new AbortController(); controller.current = abort;
    const timeout = setTimeout(() => abort.abort(), 20000);
    const sent = cacheRef.current;
    try {
      const token = await authRef.current.getToken();
      if (!token) throw new Error('Sua sessão terminou. Entre novamente; os dados locais foram mantidos.');
      const response = await fetch('/api/journal', {
        method: sent.dirty ? 'PUT' : 'GET', cache: 'no-store', signal: abort.signal,
        headers: { Authorization: `Bearer ${token}`, ...(sent.dirty ? { 'Content-Type': 'application/json' } : {}) },
        ...(sent.dirty ? { body: JSON.stringify({ state: sent.state, baseRevision: sent.revision, operationId: sent.operationId }) } : {}),
      });
      if (!alive.current) return;
      if (response.status === 409) {
        const remote = normalizeRemote(await response.json());
        setSync({ phase: 'conflict', message: 'Outro dispositivo também alterou o diário. Escolha qual versão manter.', conflict: remote });
        return;
      }
      if (!response.ok) throw new Error(response.status === 401 ? 'Entre novamente na conta para sincronizar.' : 'Não foi possível sincronizar. Seus registros continuam neste navegador.');
      const remote = normalizeRemote(await response.json());
      if (!alive.current) return;
      if (remote.revision < cacheRef.current.revision) {
        setSync(current => ({ ...current, phase: 'pending', message: 'Uma versão mais recente foi recebida por outra aba. Sincronize novamente.' }));
        return;
      }
      if (!sent.dirty && editingRef.current) {
        setSync(current => ({ ...current, phase: 'pending', message: 'Feche o registro para atualizar os dados da conta.' }));
        return;
      }
      if (localStorage.getItem(key) !== serialized.current) throw new Error('Outra aba alterou o diário. Recarregue a página antes de sincronizar novamente.');
      if (sent.dirty) persist(acknowledge(cacheRef.current, sent, remote));
      else if (!cacheRef.current.dirty && !editingRef.current) persist({ ...cloudCache(remote.state, remote.revision), updatedAt: remote.updatedAt });
      setReady(true);
      setSync({ phase: cacheRef.current.dirty ? 'pending' : 'synced', message: cacheRef.current.dirty ? 'Há alterações locais aguardando envio.' : 'Sincronizado com sua conta.', conflict: null });
    } catch (e) {
      if (alive.current) setSync(current => ({ ...current, phase: 'error', message: e.name === 'AbortError' ? 'Sem resposta da nuvem. Seus dados locais foram mantidos.' : e.message }));
    } finally { clearTimeout(timeout); busy.current = false; }
  }, [key, persist]);

  useEffect(() => {
    alive.current = true;
    if (account) synchronize();
    const refresh = () => { if (!document.hidden) synchronize(); };
    window.addEventListener('online', refresh); window.addEventListener('focus', refresh);
    const timer = setInterval(refresh, 60000);
    return () => { alive.current = false; controller.current?.abort(); clearInterval(timer); window.removeEventListener('online', refresh); window.removeEventListener('focus', refresh); };
  }, [Boolean(account), synchronize]);
  useEffect(() => {
    if (!account || !cacheRef.current.dirty || editing || sync.phase === 'conflict' || sync.phase === 'error') return;
    const timer = setTimeout(synchronize, 1200);
    return () => clearTimeout(timer);
  }, [state, editing, sync.phase, synchronize, Boolean(account)]);
  useEffect(() => {
    const update = e => {
      if (e.key !== key || editingRef.current) return;
      try {
        const raw = localStorage.getItem(key);
        if (account) { const cache = raw ? normalizeCache(JSON.parse(raw)) : cloudCache(); cacheRef.current = cache; setState(cache.state); }
        else { const incoming = readState(localStorage); if (incoming.error) throw new Error(incoming.error); cacheRef.current = cloudCache(incoming.state); setState(incoming.state); }
        serialized.current = raw;
      } catch (e) { setError(e.message); }
    };
    window.addEventListener('storage', update); return () => window.removeEventListener('storage', update);
  }, [key, Boolean(account)]);

  function commit(change) {
    try {
      if (localStorage.getItem(key) !== serialized.current) throw new Error('Outra aba alterou os dados. Recarregue antes de salvar para não sobrescrever os registros.');
      const next = normalizeState(typeof change === 'function' ? change(cacheRef.current.state) : change);
      if (account) persist({ ...cacheRef.current, state: next, dirty: true, operationId: operationId() });
      else { saveState(localStorage, next); serialized.current = localStorage.getItem(key); cacheRef.current = cloudCache(next); setState(next); }
      setError(''); setLoadError('');
      if (account) setSync(current => current.phase === 'conflict' ? current : { phase: 'pending', message: 'Salvo aqui. Aguardando envio para sua conta.', conflict: null });
      return true;
    } catch (e) { setError(`Não foi salvo: ${e.message}`); return false; }
  }
  function resolveConflict(choice) {
    const remote = sync.conflict;
    if (!remote || busy.current) return;
    try {
      if (choice === 'remote') persist({ ...cloudCache(remote.state, remote.revision), updatedAt: remote.updatedAt });
      else persist({ ...cacheRef.current, revision: remote.revision, dirty: true, operationId: operationId() });
      setSync({ phase: choice === 'remote' ? 'synced' : 'pending', message: choice === 'remote' ? 'Versão da conta carregada.' : 'Aguardando envio da versão local.', conflict: null });
    } catch (e) { setError(e.message); }
  }
  return { state, loaded, loadError, error, ready, sync, commit, synchronize, resolveConflict };
}
