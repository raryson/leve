import {foodName,foodNote} from './foodLabels.js';
import { t, getLocale, getLanguage } from './i18n.js';
import React, { useEffect, useRef, useState } from 'react';
import { foods } from './foods.js';
import { parseMealText, reviewedItems, resolveGrams } from './mealText.js';
import { createDictation } from './speech.js';
import { portionCalories } from './domain.js';

export default function VoiceMeal({ onAdd, onDirty }) {
  const [transcript, setTranscript] = useState('');
  const [interim, setInterim] = useState('');
  const [mode, setMode] = useState('browser');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [rows, setRows] = useState(null);
  const [meal, setMeal] = useState('Almoço');
  const speechRef = useRef(null);
  const timerRef = useRef(null);
  const sessionRef = useRef(0);
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  const secure = window.isSecureContext;
  const active = status !== 'idle';
  useEffect(() => { onDirty(Boolean(transcript.trim() || active)); }, [transcript, active, onDirty]);

  useEffect(() => {
    function stopWhenHidden() {
      if (document.hidden && speechRef.current) {
        try { speechRef.current.stop(); } catch { /* Already stopped. */ }
      }
    }
    document.addEventListener('visibilitychange', stopWhenHidden);
    return () => {
      sessionRef.current++;
      clearTimeout(timerRef.current);
      speechRef.current?.dispose();
      document.removeEventListener('visibilitychange', stopWhenHidden);
    };
  }, []);

  async function start() {
    if (active) return;
    setError(''); setMessage('');
    if (!secure || !Recognition) return;
    if (mode === 'browser' && !consent) { setError('Autorize o serviço de voz do navegador antes de iniciar.'); return; }
    const session = ++sessionRef.current;
    setStatus('checking');
    try {
      if (mode === 'local' && Recognition.available) {
        const available = await Recognition.available({ langs: [getLocale()], processLocally: true });
        if (session !== sessionRef.current) return;
        if (available !== 'available') throw new Error('O pacote de português para voz local não está pronto neste navegador. Use o serviço do navegador ou o ditado do teclado.');
      }
      const prefix = transcript.trim();
      const current = () => session === sessionRef.current;
      speechRef.current = createDictation(Recognition, {
        local: mode === 'local', lang:getLocale(),
        onText: result => {
          if (!current()) return;
          setTranscript([prefix, result.final].filter(Boolean).join(' '));
          setInterim(result.interim); setRows(null);
        },
        onStart: () => {
          if (!current()) return;
          setStatus('listening');
          timerRef.current = setTimeout(() => {
            try { speechRef.current?.stop(); } catch { /* Already stopped. */ }
            setMessage('Ditado limitado a 1 minuto por vez. Você pode continuar com outro trecho.');
          }, 60000);
        },
        onEnd: () => {
          if (!current()) return;
          clearTimeout(timerRef.current);
          speechRef.current?.dispose(); speechRef.current = null;
          setStatus('idle'); setInterim('');
        },
        onError: text => {
          if (!current()) return;
          clearTimeout(timerRef.current);
          speechRef.current?.dispose(); speechRef.current = null;
          sessionRef.current++; setStatus('idle'); setInterim(''); setError(text);
        },
      });
      setStatus('starting');
      speechRef.current.start();
    } catch (e) {
      if (session !== sessionRef.current) return;
      speechRef.current?.dispose(); speechRef.current = null;
      setStatus('idle'); setError(e.message || 'Não foi possível iniciar o ditado.');
    }
  }
  function stop() {
    if (!speechRef.current) { sessionRef.current++; setStatus('idle'); return; }
    try { setStatus('stopping'); speechRef.current.stop(); }
    catch { speechRef.current.dispose(); speechRef.current = null; sessionRef.current++; setStatus('idle'); }
  }
  function analyze() {
    try { const result = parseMealText(transcript,getLanguage()); setRows(result.rows); setMeal(result.meal); setError(''); setMessage('Confira cada alimento e a quantidade antes de adicionar.'); }
    catch (e) { setError(e.message); }
  }
  function changeRow(index, values) { setRows(previous => previous.map((row, i) => i === index ? { ...row, ...values } : row)); }
  let total = 0, ready = false;
  if (rows?.length) {
    try { total = reviewedItems(rows).reduce((sum, item) => sum + item.calories, 0); ready = true; } catch { /* Missing selections stay visible for review. */ }
  }
  return <section className="voice-meal" aria-label={t("Registro por voz ou relato")}>
    <h4>{t("🎙 Conte sua refeição")}</h4>
    <p>{t("Fale ou digite: “No almoço comi 150 gramas de arroz branco e 100 gramas de feijão preto”.")}</p>
    {!secure ? <p className="voice-help">{t("O microfone precisa de HTTPS ou localhost. Nesta prévia por IP, digite o relato ou use o microfone do teclado do celular.")}</p> : !Recognition ? <p className="voice-help">{t("Este navegador não oferece ditado para o app. Você pode usar o microfone do teclado do celular neste campo.")}</p> : <>
      <label className="standalone-label">{t("Transcrição")}<select disabled={active} value={mode} onChange={e => { setMode(e.target.value); setConsent(false); setError(''); }}><option value="browser">{t("Serviço de voz do navegador")}</option><option value="local">{t("Somente no dispositivo (se disponível)")}</option></select></label>
      {mode === 'browser' ? <label className="voice-consent"><input type="checkbox" disabled={active} checked={consent} onChange={e => setConsent(e.target.checked)}/><span>{t("Permito o ditado pelo serviço do navegador, que pode enviar minha voz ao provedor para transcrever e precisar de internet.")}</span></label> : <p className="voice-help">{t("Este modo exige suporte e português instalado no navegador. O app não troca automaticamente para um serviço online.")}</p>}
    </>}
    <div className="voice-actions"><button type="button" className="primary" disabled={!secure || !Recognition || (!active && mode === 'browser' && !consent) || status === 'stopping'} onClick={active ? stop : start}>{active ? (status === 'stopping' ? t("Finalizando…") : t("■ Parar ditado")) : t("🎙 Iniciar ditado")}</button><span role="status">{status === 'listening' ? t("Ouvindo em português…") : status === 'starting' || status === 'checking' ? t("Preparando microfone…") : t("Microfone desligado")}</span></div>
    {interim && <p className="voice-interim" aria-live="polite">{t("Ouvindo: ")}{interim}</p>}
    <label className="standalone-label">{t("Relato da refeição")}<textarea maxLength={5000} rows="4" disabled={active} value={transcript} onChange={e => { setTranscript(e.target.value); setRows(null); setMessage(''); }} placeholder={t("150 g de arroz branco e uma colher de pasta de amendoim")}/></label>
    <button type="button" className="outline" disabled={active || !transcript.trim()} onClick={analyze}>{t("Interpretar e revisar alimentos")}</button>
    {error && <p className="error-box" role="alert">{t(error)}</p>}{message && <p className="voice-help" role="status">{t(message)}</p>}
    {rows && <div className="voice-review"><label className="standalone-label">{t("Refeição identificada")}<select value={meal} onChange={e => setMeal(e.target.value)}>{['Café da manhã', 'Almoço', 'Lanche', 'Jantar', 'Ceia'].map(name => <option key={name} value={name}>{t(name)}</option>)}</select></label>
      {rows.map((row, index) => {
        const food = foods.find(f => f.id === row.foodId);
        let calories = '—'; try { calories = portionCalories(row.grams, food?.kcal); } catch { /* Review needed. */ }
        return <div className="voice-item" key={row.id}><p>{t("Trecho: “")}{row.text}”</p>
          <label>{t("Alimento do trecho ")}{index + 1}<select value={row.foodId} onChange={e => { const foodId = e.target.value; changeRow(index, { foodId, grams: row.measure === 'spoon' ? resolveGrams(row, foodId) : row.grams }); }}><option value="">{row.candidates.length > 1 ? t("Escolha o tipo ou preparo") : t("Selecione um alimento")}</option>{foods.map(f => <option value={f.id} key={f.id}>{row.candidates.includes(f.id) ? t("Sugestão: ") : ''}{foodName(f)}</option>)}</select></label>
          <label>{t("Gramas do trecho ")}{index + 1}<input type="number" min="0.1" max="10000" step="0.1" value={row.grams} onChange={e => changeRow(index, { grams: e.target.value })}/></label>
          <span>{calories}{t(" kcal")}</span><button type="button" className="outline" onClick={() => setRows(previous => previous.filter((_, i) => i !== index))}>{t("Remover trecho ")}{index + 1}</button>
          {!row.foodId && <small>{row.candidates.length > 1 ? t("Há mais de uma referência possível. Confirme corte, tipo ou preparo.") : t("Não encontrei uma referência única. Escolha o alimento ou use o formulário por rótulo.")}</small>}
          {row.needsSplit && <small>{t("Este trecho tem vários alimentos ou quantidades. Separe cada alimento por “e” ou vírgula no relato e interprete novamente.")}</small>}
          {row.measure === 'spoon' && <small>{t("Colher é uma estimativa, e o peso depende do alimento. Confira os gramas.")}</small>}
          {row.grams === '' && <small>{t("Quantidade em gramas não definida. Unidades, fatias e pratos precisam ser pesados ou estimados por você.")}</small>}
          {food?.note && <small>{foodNote(food)}</small>}
        </div>;
      })}
      <p>{ready ? t("Total revisado: {0} kcal",[total]) : t("Complete ou remova os trechos pendentes para continuar.")}</p>
      <button type="button" className="primary" disabled={!ready || active} onClick={() => { try { onAdd(meal, reviewedItems(rows)); setTranscript(''); setRows(null); setMessage('Refeição adicionada ao rascunho. Toque em Salvar dia para guardar.'); setError(''); } catch (e) { setError(e.message); } }}>{t("Adicionar refeição revisada ao dia")}</button>
    </div>}
    <p className="local-note">{t("A interpretação usa regras e o catálogo local; não reconhece qualquer prato ou receita. A transcrição só fica no relato; o diário recebe os alimentos que você confirmar.")}</p>
  </section>;
}
