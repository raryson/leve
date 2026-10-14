import { t } from './i18n.js';
import React, { useEffect, useState } from 'react';
import { trackUsage } from './analytics.js';

export default function InstallBanner({ mode='notice' }) {
  const [prompt,setPrompt]=useState(null),[installed,setInstalled]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [dismissed,setDismissed]=useState(()=>{try{return localStorage.getItem('leve-install-dismissed')==='1';}catch{return false;}});
  useEffect(()=>{
    const media=window.matchMedia('(display-mode: standalone)');
    const update=()=>setInstalled(media.matches||navigator.standalone===true);
    const available=e=>{e.preventDefault();setPrompt(e);};
    const completed=()=>{setInstalled(true);setPrompt(null);trackUsage('pwa_installed');};
    update();media.addEventListener?.('change',update);
    window.addEventListener('beforeinstallprompt',available);window.addEventListener('appinstalled',completed);
    return ()=>{media.removeEventListener?.('change',update);window.removeEventListener('beforeinstallprompt',available);window.removeEventListener('appinstalled',completed);};
  },[]);
  const dismiss=()=>{setDismissed(true);try{localStorage.setItem('leve-install-dismissed','1');}catch{/* Session dismissal still works. */}};
  async function install(){if(!prompt||busy)return;setBusy(true);setError('');try{await prompt.prompt();await prompt.userChoice;setPrompt(null);}catch{setPrompt(null);setError('Use as instruções abaixo para adicionar o Leve à tela inicial.');}finally{setBusy(false);}}
  if(mode==='hidden'||(mode!=='help'&&(installed||dismissed)))return null;
  return <section className="install-guide" aria-label={t("Instalar o Leve")}>
    <div className="install-guide-head"><img src="/icon.svg" alt=""/><div><h3>{installed?t("Leve instalado"):t("Leve com você, como um app")}</h3><p>{installed?t("Você já está usando o modo de aplicativo."):t("O Leve é uma PWA: dá para adicionar à tela inicial e abrir como um app, sem loja.")}</p></div>{mode!=='help'&&<button type="button" className="outline" onClick={dismiss} aria-label={t("Dispensar aviso de instalação")}>{t("Agora não")}</button>}</div>
    {!installed&&prompt&&<button type="button" className="primary" disabled={busy} onClick={install}>{busy?t("Abrindo instalação…"):t("Instalar Leve")}</button>}
    {!installed&&<details><summary>{t("Como instalar no meu dispositivo")}</summary><ul><li><b>{t("iPhone ou iPad:")}</b>{t(" abra no Safari, toque em Compartilhar e em Adicionar à Tela de Início. Ative Abrir como App, se aparecer.")}</li><li><b>{t("Android:")}</b>{t(" abra no Chrome e use o menu ⋮ → Instalar app ou Adicionar à tela inicial.")}</li><li><b>{t("Computador:")}</b>{t(" no Chrome ou Edge, procure o ícone de instalação na barra de endereço ou a opção de instalar no menu do navegador.")}</li></ul><p>{t("Os nomes das opções variam por navegador. Se não houver instalação, você pode continuar usando o site.")}</p></details>}
    <p className="local-note">{t("Após o primeiro acesso, registros e cálculos locais podem funcionar offline. Login, sincronização e atualização do catálogo precisam de internet. Instalar não substitui o backup; o navegador ainda pode limpar o armazenamento.")}</p>
    {mode!=='help'&&<small>{t("Você encontra estas instruções novamente em Perfil.")}</small>}{error&&<p role="status">{t(error)}</p>}
  </section>;
}
