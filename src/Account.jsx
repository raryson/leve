import React, { useState } from 'react';
import { ClerkProvider, SignInButton, SignUpButton, UserButton, useAuth } from '@clerk/react';
import { ptBR } from '@clerk/localizations';
import { readState } from './domain.js';

function AccountApp({ App }) {
  const { isLoaded, userId, getToken } = useAuth();
  const [localOnly, setLocalOnly] = useState(false);
  if (localOnly) return <App account={null} accountControls={<button className="outline" onClick={() => setLocalOnly(false)}>Conectar conta</button>}/>;
  if (!isLoaded) return <div className="account-bar"><p role="status">Conectando à sua conta… Se estiver offline, você pode continuar com os registros de visitante deste navegador.</p><button className="outline" onClick={() => setLocalOnly(true)}>Continuar localmente</button></div>;
  const controls = <div className="account-actions">{userId ? <UserButton/> : <><SignInButton mode="modal"><button className="outline">Entrar</button></SignInButton><SignUpButton mode="modal"><button className="primary">Criar conta</button></SignUpButton></>}</div>;
  return <App key={userId || 'guest'} account={userId ? { userId, getToken } : null} accountControls={controls}/>;
}
export function AccountRoot({ App }) {
  const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
  return key ? <ClerkProvider publishableKey={key} localization={ptBR}><AccountApp App={App}/></ClerkProvider> : <App account={null}/>;
}
export function SyncPanel({ account, journal, onExport }) {
  if (!account) return null;
  const { sync, synchronize, resolveConflict, commit } = journal;
  let guest;
  try { guest = readState(localStorage); } catch { guest = null; }
  const canImport = !journal.state.profile && guest?.state.profile;
  return <section className="sync-panel" aria-label="Sincronização"><div><b>{sync.phase === 'syncing' ? 'Sincronizando…' : sync.phase === 'conflict' ? 'Conflito entre dispositivos' : sync.phase === 'synced' ? 'Salvo na sua conta' : 'Sincronização da conta'}</b><p role="status">{sync.message || 'Buscando seus registros…'}</p></div><div className="account-actions"><button className="outline" disabled={sync.phase === 'syncing'} onClick={synchronize}>Sincronizar agora</button>
    {canImport && journal.ready && <button className="primary" onClick={() => { if (window.confirm('Importar os registros locais deste navegador para esta conta e sincronizá-los? A cópia local original será preservada.')) commit(guest.state); }}>Importar dados deste dispositivo</button>}
    {sync.conflict && <><button className="outline" onClick={onExport}>Exportar minha versão local</button><button className="outline" onClick={() => { if (window.confirm('Usar o diário da nuvem no lugar desta versão local? Exporte sua versão antes para guardar os dois.')) resolveConflict('remote'); }}>Usar versão da nuvem</button><button className="outline" onClick={() => { if (window.confirm('Substituir o diário da conta pela versão deste dispositivo? Isso troca o diário completo, sem mesclar.')) resolveConflict('local'); }}>Enviar versão deste dispositivo</button></>}
  </div>{sync.conflict && <small>Conflitos são resolvidos por versão completa. Exporte um backup antes de escolher; mesclagem de registros ainda não está disponível.</small>}</section>;
}
