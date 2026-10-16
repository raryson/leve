import React,{useState} from 'react';
import {t,getLocale} from './i18n.js';
import {registrationStreak,weeklySummary} from './routineSummary.js';

const number=value=>value.toLocaleString(getLocale(),{maximumFractionDigits:0});
const label=date=>new Date(`${date}T12:00:00`).toLocaleDateString(getLocale(),{day:'numeric',month:'short'});
export function RegistrationStreak({state,today,onRegister}){
  const streak=registrationStreak(state,today);
  return <section className="streak-card" aria-label={t('Sua constância')}>
    <span className="streak-symbol" aria-hidden="true">✳</span><div className="streak-copy"><h3>{streak.current===0?t('Cada registro conta'):streak.current===1?t('1 dia de registros'):t('{0} dias seguidos',[streak.current])}</h3>
    <p>{streak.recordedToday?t('Hoje já contou. Cada registro ajuda a construir tua rotina.'):streak.current?t('Tua sequência segue viva. Um registro hoje já conta.'):t('Bora começar ou retomar? Um registro já é um passo.')}</p>
    <small>{t('Maior sequência: {0} dias',[streak.best])} · {t('Refeição, água, treino, pesagem ou anotação contam.')}</small></div>
    {!streak.recordedToday&&<button className="outline" onClick={onRegister}>{t('Registrar hoje')}</button>}
  </section>;
}
export default function WeeklySummary({state,today}){
  const [offset,setOffset]=useState(0),week=weeklySummary(state,today,offset);
  return <section className="weekly-recap" aria-labelledby="weekly-recap-title">
    <div className="recap-heading"><div><span className="eyebrow">{t('UM OLHAR NA ROTINA')}</span><h3 id="weekly-recap-title">{t('Teu resumo semanal')}</h3></div>
    <div className="recap-navigation"><button className="outline" aria-label={t('Semana anterior')} disabled={offset<=-1200} onClick={()=>setOffset(n=>n-1)}>←</button><span>{label(week.start)} – {label(week.end)}</span><button className="outline" aria-label={t('Próxima semana')} disabled={offset===0} onClick={()=>setOffset(n=>n+1)}>→</button></div></div>
    {offset<0&&<button className="link recap-current" onClick={()=>setOffset(0)}>{t('Voltar à semana atual')}</button>}
    <div className="recap-days" aria-label={t('Dias com registros na semana')}>{week.calendar.map(day=><div key={day.date} className={`${day.recorded?'recorded':''} ${day.future?'future':''}`}><span>{new Date(`${day.date}T12:00:00`).toLocaleDateString(getLocale(),{weekday:'short'})}</span><b aria-label={t('{0}: {1}',[label(day.date),day.future?t('Dia futuro'):day.recorded?t('Com registro'):t('Sem registro')])}>{day.recorded?'✓':day.date.slice(-2)}</b></div>)}</div>
    <p className="recap-coverage">{t('{0} de {1} dias com registros',[week.recorded,week.dates.length])}{offset===0?t(' · semana em andamento'):''}</p>
    <div className="recap-stats">
      <div><span>{t('Alimentação registrada')}</span><strong>{week.consumed===null?'—':number(week.consumed)} <small>kcal</small></strong><p>{t('Média em {0} dias com alimentos',[week.foodDays])}</p></div>
      <div><span>{t('Água registrada')}</span><strong>{week.water===null?'—':number(week.water)} <small>ml</small></strong><p>{t('Média em {0} dias com água',[week.waterDays])}</p></div>
      <div><span>{t('Dias de treino')}</span><strong>{week.trainingDays}</strong><p>{t('{0} refeições registradas',[week.meals])}</p></div>
      <div><span>{t('Variação observada do peso')}</span><strong>{week.weightChange===null?'—':`${week.weightChange>0?'+':''}${week.weightChange.toLocaleString(getLocale(),{maximumFractionDigits:1})}`} <small>kg</small></strong><p>{week.weightChange===null?t('Registre duas pesagens nesta semana'):t('Entre a primeira e a última pesagem da semana')}</p></div>
    </div>
    <p className="recap-note">{week.recorded?t('Cada dia registrado ajuda a enxergar tua rotina. Continua no teu ritmo.'):t('Ainda sem registros nesta semana. Tudo bem retomar de onde tu está.')} {t('Dias sem dados ficam de fora das médias; os registros podem estar incompletos.')}</p>
  </section>;
}
