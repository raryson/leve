import { t } from './i18n.js';
import React, { useEffect, useState } from 'react';
import { CONSENT_KEY, readConsent, applyConsent, trackUsage, analyticsEnabled } from './analytics.js';

export default function PrivacyControls({ settings=false, screen }) {
  const [consent,setConsent]=useState(readConsent),[storageError,setStorageError]=useState(false);
  useEffect(()=>{applyConsent(consent);const update=e=>{if(e.key===CONSENT_KEY)setConsent(readConsent());};window.addEventListener('storage',update);return()=>window.removeEventListener('storage',update);},[consent]);
  useEffect(()=>{trackUsage('navigation',screen);},[screen,consent]);
  function choose(value){setConsent(value);applyConsent(value);try{localStorage.setItem(CONSENT_KEY,value);setStorageError(false);}catch{setStorageError(true);}}
  if(!settings&&(consent!==null||!analyticsEnabled))return null;
  return <section className="privacy-controls" aria-label={t("Privacidade e estatísticas")}>
    <h3>{settings?t("Privacidade e estatísticas"):t("Ajuda a melhorar o Leve?")}</h3>
    <p>{t("Estatísticas opcionais pelo Google Analytics contam abertura do app, navegação entre telas e instalação. O Google recebe dados técnicos, como IP e identificadores de cookies. Não enviamos peso, calorias, nomes de alimentos, relatos, e-mail ou ID da tua conta.")}</p>
    <p>{t("Você pode recusar e continuar usando tudo. Sua escolha vale neste navegador e pode ser alterada aqui no Perfil.")}</p>
    <div className="account-actions"><button type="button" className="outline" onClick={()=>choose('denied')}>{t("Recusar estatísticas")}</button><button type="button" className="outline" onClick={()=>choose('granted')}>{t("Permitir estatísticas")}</button></div>
    <p className="local-note" role="status">{!analyticsEnabled?t("A coleta está desativada neste ambiente. "):''}{consent==='granted'?t("Preferência: permitir."):consent==='denied'?t("Preferência: recusar."):t("Nenhuma coleta opcional foi autorizada.")}{storageError?t(" A escolha vale só nesta sessão porque não foi possível guardá-la."):''}</p>
    <details><summary>{t("Como teus dados são usados")}</summary><p>{t("O diário de visitante fica neste navegador. Ao entrar na conta, o diário é sincronizado pelo servidor do Leve com Clerk para login e Neon para armazenamento. Compartilhar um alimento envia somente o cadastro para revisão; o diário não é publicado. Exporte backups pelo Perfil para guardar uma cópia.")}</p><p>{t("As estatísticas são independentes do login e do diário. Ao recusar, a tag fica bloqueada e os cookies de estatísticas criados por esta integração são removidos; isso não apaga dados já recebidos pelo Google. Falhas ou bloqueadores não impedem registros ou sincronização.")}</p><a href="https://policies.google.com/privacy?hl=pt-BR" target="_blank" rel="noreferrer">{t("Privacidade do Google ↗")}</a></details>
  </section>;
}
