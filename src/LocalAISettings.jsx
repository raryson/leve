import React,{useSyncExternalStore} from 'react';
import {t} from './i18n.js';
import {mealRuntime} from './localMealRuntime.js';

export function useMealRuntime(){return useSyncExternalStore(mealRuntime.subscribe,mealRuntime.getSnapshot);}
export function AIStatus(){
  const state=useMealRuntime();
  return <span className={'assistant-status '+(state.phase==='ready'?'is-ready':'')} role="status">{state.phase==='ready'?t('IA local pronta'):state.phase==='loading'?t('Preparando IA · {0}%',[Math.round(state.progress*100)]):state.phase==='generating'?t('Interpretando no dispositivo…'):t('Texto e voz disponíveis')}</span>;
}
export default function LocalAISettings(){
  const state=useMealRuntime(),busy=['loading','generating','checking','clearing'].includes(state.phase);
  return <section className="assistant-settings"><div><h3>{t('Assistente de refeições')}</h3><AIStatus/></div><p>{t('O modelo baixado pode ser preparado em segundo plano ao abrir o app. O primeiro download é opcional e tem aproximadamente 1 GB; a interpretação dos alimentos conhecidos funciona sem ele.')}</p>
    <label className="assistant-checkbox"><input type="checkbox" checked={state.automatic} onChange={e=>mealRuntime.setAutomatic(e.target.checked)}/><span>{t('Preparar automaticamente a IA já baixada')}</span></label>
    <div className="account-actions"><button type="button" className="outline" disabled={busy||state.phase==='ready'} onClick={()=>void mealRuntime.load()}>{t('Baixar ou carregar IA local')}</button><button type="button" className="outline" disabled={state.phase==='clearing'} onClick={mealRuntime.release}>{t('Liberar memória')}</button><button type="button" className="outline" disabled={busy} onClick={()=>void mealRuntime.clear()}>{t('Remover modelo baixado')}</button></div>
    {state.phase==='loading'&&<progress max="1" value={state.progress} aria-label={t('Carregamento da IA local')}/>}
    {state.phase==='unsupported'&&<p>{t('WebGPU indisponível. O texto, a voz compatível e o registro manual continuam disponíveis.')}</p>}
    {state.error&&<p role="alert">{t(state.error)}</p>}
  </section>;
}
