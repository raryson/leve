import React,{useEffect,useRef,useState} from 'react';
import {t,getLocale} from './i18n.js';
import {createDictation} from './speech.js';

const CONSENT='leve-meal-voice-consent-v1';
export default function MealDictation({text,onText,onFinish,onBusy,disabled=false}){
  const [listening,setListening]=useState(false),[asking,setAsking]=useState(false),[mode,setMode]=useState('browser'),[error,setError]=useState(''),[interim,setInterim]=useState('');
  const speech=useRef(null),timer=useRef(null),generation=useRef(0),latest=useRef(text),received=useRef(false);
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  const available=Boolean(window.isSecureContext&&Recognition);
  useEffect(()=>{onBusy(listening);},[listening,onBusy]);
  useEffect(()=>()=>{generation.current++;clearTimeout(timer.current);speech.current?.dispose();},[]);
  useEffect(()=>{function hidden(){if(document.hidden)speech.current?.stop();}document.addEventListener('visibilitychange',hidden);return()=>document.removeEventListener('visibilitychange',hidden);},[]);
  function permitted(){try{return localStorage.getItem(CONSENT)==='yes';}catch{return false;}}
  function stop(){if(speech.current)speech.current.stop();else{generation.current++;setListening(false);}}
  async function start(allow=false){
    if(listening||!available)return;
    if(mode==='browser'&&!allow&&!permitted()){setAsking(true);return;}
    if(allow){try{localStorage.setItem(CONSENT,'yes');}catch{/* Permission applies to this recording. */}setAsking(false);}
    const current=++generation.current,prefix=text.trim();received.current=false;latest.current=prefix;setError('');setListening(true);
    try{
      if(mode==='local'&&Recognition.available){const ready=await Recognition.available({langs:[getLocale()],processLocally:true});if(current!==generation.current)return;if(ready!=='available')throw Error('O pacote de voz local não está disponível. Escolha outro modo ou digite a refeição.');}
      speech.current=createDictation(Recognition,{local:mode==='local',lang:getLocale(),
        onStart:()=>{if(current!==generation.current)return;timer.current=setTimeout(()=>speech.current?.stop(),60000);},
        onText:result=>{if(current!==generation.current)return;setInterim(result.interim);if(result.final){received.current=true;latest.current=[prefix,result.final].filter(Boolean).join(' ');onText(latest.current);}},
        onEnd:()=>{if(current!==generation.current)return;clearTimeout(timer.current);speech.current?.dispose();speech.current=null;setListening(false);setInterim('');if(received.current)onFinish(latest.current);},
        onError:message=>{if(current!==generation.current)return;generation.current++;clearTimeout(timer.current);speech.current?.dispose();speech.current=null;setListening(false);setInterim('');setError(message);},
      });speech.current.start();
    }catch(e){if(current!==generation.current)return;speech.current?.dispose();speech.current=null;setListening(false);setError(e.message);}
  }
  return <div className="meal-dictation"><button type="button" className={listening?'primary recording':'outline'} disabled={disabled||!available} onClick={()=>listening?stop():void start()}>{listening?t('■ Parar e interpretar'):t('🎙 Falar refeição')}</button>
    {listening&&<span role="status">{t('Ouvindo… Toque para terminar.')}</span>}{interim&&<p className="voice-interim" aria-live="polite">{interim}</p>}
    {!available&&<small>{t('Ditado indisponível neste navegador. Você pode digitar ou usar o microfone do teclado.')}</small>}
    {asking&&<div className="voice-permission"><p>{t('O ditado do navegador pode enviar sua voz ao provedor para transcrever. A interpretação da refeição continua neste dispositivo. O microfone só é ligado por você.')}</p><button type="button" className="outline" onClick={()=>void start(true)}>{t('Permitir e iniciar ditado')}</button><button type="button" className="link" onClick={()=>setAsking(false)}>{t('Agora não')}</button></div>}
    <details><summary>{t('Opções de voz')}</summary><label>{t('Transcrição')}<select disabled={listening} value={mode} onChange={e=>{setMode(e.target.value);setAsking(false);setError('');}}><option value="browser">{t('Serviço de voz do navegador')}</option><option value="local">{t('Somente no dispositivo (se disponível)')}</option></select></label><small>{t('A voz local exige suporte e pacote do idioma instalado. Nenhum modo troca automaticamente para um serviço online.')}</small></details>
    {error&&<p className="error-box" role="alert">{t(error)}</p>}
  </div>;
}
