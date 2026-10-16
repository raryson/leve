import React,{useEffect,useRef,useState} from 'react';
import {t,getLocale} from './i18n.js';
import {pixPayload,supportRecipient,supporters,publishedSupporters} from './support.js';
import qr from './assets/support-pix.svg';

export default function SupportModal({close,fromWeight=false}){
  const ref=useRef(null),[hide,setHide]=useState(false),[copied,setCopied]=useState(false),[copyError,setCopyError]=useState(false);
  const code=pixPayload(),people=publishedSupporters(supporters);
  const leave=()=>close(hide);
  useEffect(()=>{const dialog=ref.current;dialog.showModal();return()=>dialog.close();},[]);
  async function copy(){try{await navigator.clipboard.writeText(code);setCopied(true);setCopyError(false);}catch{setCopyError(true);}}
  return <dialog className="modal native-dialog support-dialog" ref={ref} aria-labelledby="support-title" onCancel={e=>{e.preventDefault();leave();}} onClick={e=>{if(e.target===e.currentTarget)leave();}}>
    <div className="dialog-header"><h3 id="support-title">{t('Bora manter o Leve vivo?')}</h3><button autoFocus type="button" className="outline" aria-label={t('Fechar janela')} onClick={leave}>×</button></div>
    <p className="support-intro">{fromWeight?t('Tua pesagem foi salva. Se o Leve está te ajudando na rotina, tu pode apoiar o projeto com qualquer valor.'):t('O Leve é um projeto independente. Se ele te ajuda no dia a dia, uma contribuição ajuda a manter tudo funcionando.')}</p>
    <p className="support-optional">{t('Apoiar é opcional. Todos os recursos continuam disponíveis sem doar.')}</p>
    <div className="support-payment"><img src={qr} alt={t('QR Code Pix para apoiar o Leve')} width="256" height="256"/><div><span className="eyebrow">{t('APOIO VIA PIX')}</span><b>{supportRecipient.name}</b><p>{supportRecipient.city} · {t('Valor livre')}</p><small>{t('Confira o nome do recebedor no teu banco antes de confirmar.')}</small></div></div>
    <label className="support-code">{t('Pix Copia e Cola')}<textarea readOnly value={code} rows={3} onFocus={e=>e.currentTarget.select()}/></label>
    <button type="button" className="primary support-copy" onClick={copy}>{copied?t('Código copiado!'):t('Copiar código Pix')}</button>
    <p className="support-status" role="status">{copyError?t('Não foi possível copiar automaticamente. Selecione o código acima e copie manualmente.'):copied?t('Cole no Pix Copia e Cola do teu banco. O pagamento é confirmado por lá.'):t('No mesmo celular, use o Copia e Cola. Não precisa escanear a própria tela.')}</p>
    <section className="support-thanks" aria-labelledby="support-thanks-title"><h4 id="support-thanks-title">{t('Quem fortalece o Leve')}</h4><p>{t('Valeu a quem apoia o projeto! Só mostramos nomes autorizados após conferir o recebimento.')}</p>{people.length?<ul>{people.map(person=><li key={person.id}><b>{person.displayName}</b><time dateTime={person.date}>{new Date(`${person.date}T12:00:00`).toLocaleDateString(getLocale())}</time></li>)}</ul>:<p className="support-empty">{t('Ainda não há agradecimentos públicos cadastrados.')}</p>}<small>{t('O app não recebe confirmação automática do Pix. Tu também pode apoiar sem aparecer nesta lista.')}</small></section>
    <label className="support-dismiss"><input type="checkbox" checked={hide} onChange={e=>setHide(e.target.checked)}/><span>{t('Não mostrar este convite após pesagens neste dispositivo')}</span></label>
    <button type="button" className="outline support-later" onClick={leave}>{t('Agora não')}</button>
  </dialog>;
}
