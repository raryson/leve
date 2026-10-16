import React,{useState} from 'react';
import {t,getLocale} from './i18n.js';
import {streakIncentive,streakMilestones,weeklySummary} from './routineSummary.js';

const number=value=>value.toLocaleString(getLocale(),{maximumFractionDigits:0});
const label=date=>new Date(`${date}T12:00:00`).toLocaleDateString(getLocale(),{day:'numeric',month:'short'});
export function RegistrationStreak({state,today,onRegister}){
  const streak=streakIncentive(state,today);
  return <section className={`streak-card streak-game ${streak.recordedToday?'is-complete':''}`} aria-label={t('Sua constância')}>
    <div className="streak-overview"><span className="streak-flame" aria-hidden="true"><svg viewBox="0 0 64 76" fill="none"><path d="M35 3C42 21 22 24 34 38c6-4 9-10 9-17 14 13 18 25 12 38C46 79 13 78 7 56 2 39 14 30 16 19c3 9 6 13 10 15C18 17 28 12 35 3Z" fill="currentColor"/><path d="M31 39c4 10-6 14-3 21 3-1 6-5 6-9 10 11 5 20-3 20-12 0-15-13 0-32Z" fill="#ffe3a0"/></svg></span>
      <div><span className="eyebrow">{t('TUA OFENSIVA')}</span><h3><strong>{number(streak.current)}</strong> {streak.current===1?t('dia seguido'):t('dias seguidos')}</h3><p>{t('Maior sequência: {0} dias',[streak.best])}</p></div>
      <span className={`streak-today ${streak.recordedToday?'done':''}`}>{streak.recordedToday?t('✓ Hoje tá feito!'):t('Hoje ainda conta')}</span>
    </div>
    <div className="streak-mission"><p role="status">{streak.milestoneToday?t('Marco alcançado! {0} dias cuidando da tua rotina.',[streak.current]):streak.recordedToday?t('Mais um dia na conta. Amanhã tem outro pequeno passo.'):streak.current?t('Um registro hoje mantém tua ofensiva acesa.'):streak.returning?t('Bora reacender? Tua próxima sequência começa hoje.'):t('Acende tua ofensiva com o primeiro registro de hoje.')}</p>
      <div className="streak-goal"><b>{t('Próximo marco: {0} dias',[streak.next])}</b><span>{streak.remaining===1?t('Falta 1 dia'):t('Faltam {0} dias',[streak.remaining])}</span></div>
      <div className="streak-meter" role="progressbar" aria-label={t('Progresso até o próximo marco')} aria-valuemin={0} aria-valuemax={streak.next} aria-valuenow={streak.current}><span style={{width:`${streak.current/streak.next*100}%`}}/></div>
      {!streak.recordedToday&&<button className="primary" onClick={onRegister}>{streak.returning?t('Bora retomar'):t('Registrar hoje')}</button>}
    </div>
    <div className="streak-achievements"><span>{t('TEUS MARCOS')}</span><ul>{streakMilestones.slice(0,5).map(days=><li key={days} className={streak.achieved.includes(days)?'earned':''}><span aria-hidden="true">{streak.achieved.includes(days)?'★':'☆'}</span><b>{days}</b><small>{days===1?t('dia'):t('dias')}</small><span className="sr-only">{streak.achieved.includes(days)?t('Alcançado'):t('Ainda não alcançado')}</span></li>)}</ul></div>
    <details className="streak-rules"><summary>{t('Como funciona a ofensiva?')}</summary><p>{t('Refeição, água, treino, pesagem ou anotação contam.')} {t('Vários registros no mesmo dia contam uma vez. Tu tem até o fim do dia para continuar a sequência de ontem.')}</p><p>{t('Pausou? A sequência recomeça, mas os marcos do teu histórico continuam aqui. Não precisa comer menos nem treinar todos os dias para contar.')}</p><p>{t('Registros adicionados no histórico também contam. Editar ou excluir dados recalcula a ofensiva e os marcos.')}</p><ul className="streak-long-goals">{streakMilestones.slice(5).map(days=><li key={days}>{streak.achieved.includes(days)?'★':'☆'} {t('{0} dias',[days])} — {streak.achieved.includes(days)?t('Alcançado'):t('Ainda não alcançado')}</li>)}</ul></details>
  </section>;
}
export default function WeeklySummary({state,today}){
  const [offset,setOffset]=useState(0),week=weeklySummary(state,today,offset);
  return <section className="weekly-recap" aria-labelledby="weekly-recap-title">
    <div className="recap-heading"><div><h3 id="weekly-recap-title">{t('Teu resumo semanal')}</h3><p>{t('{0} refeições registradas',[week.meals])}</p></div>
    <div className="recap-navigation"><button className="outline" aria-label={t('Semana anterior')} disabled={offset<=-1200} onClick={()=>setOffset(n=>n-1)}>←</button><span>{label(week.start)} – {label(week.end)}</span><button className="outline" aria-label={t('Próxima semana')} disabled={offset===0} onClick={()=>setOffset(n=>n+1)}>→</button></div></div>
    {offset<0&&<button className="link recap-current" onClick={()=>setOffset(0)}>{t('Voltar à semana atual')}</button>}
    <div className="recap-calendar"><div className="recap-days" aria-label={t('Dias com registros na semana')}>{week.calendar.map(day=><div key={day.date} className={`${day.recorded?'recorded':''} ${day.future?'future':''}`}><span>{new Date(`${day.date}T12:00:00`).toLocaleDateString(getLocale(),{weekday:'short'})}</span><b aria-label={t('{0}: {1}',[label(day.date),day.future?t('Dia futuro'):day.recorded?t('Com registro'):t('Sem registro')])}>{day.recorded?'✓':day.date.slice(-2)}</b></div>)}</div>
    <div className="recap-coverage"><strong>{week.recorded}<small> / {week.dates.length}</small></strong><span>{t('dias com registros')}</span>{offset===0&&<small>{t('Semana em andamento')}</small>}</div></div>
    <div className="recap-stats">
      <div><span>{t('Alimentação')}</span><strong>{week.consumed===null?'—':number(week.consumed)} <small>{t('kcal/dia')}</small></strong><p>{t('Média em {0} dias com alimentos',[week.foodDays])}</p></div>
      <div><span>{t('Água')}</span><strong>{week.water===null?'—':number(week.water)} <small>{t('ml/dia')}</small></strong><p>{t('Média em {0} dias com água',[week.waterDays])}</p></div>
      <div><span>{t('Treinos')}</span><strong>{week.trainingDays} <small>{week.trainingDays===1?t('dia'):t('dias')}</small></strong><p>{t('Dias com treino na semana')}</p></div>
      <div><span>{t('Variação do peso')}</span><strong>{week.weightChange===null?'—':`${week.weightChange>0?'+':''}${week.weightChange.toLocaleString(getLocale(),{maximumFractionDigits:1})}`} <small>kg</small></strong><p>{week.weightChange===null?t('Precisa de duas pesagens no período'):t('Da primeira à última pesagem')}</p></div>
    </div>
    <details className="recap-note"><summary>{t('Como calculamos o resumo')}</summary><p>{t('Dias sem dados ficam de fora das médias; os registros podem estar incompletos.')} {t('O peso compara a primeira e a última pesagem da semana, sem indicar uma tendência sozinho.')}</p></details>
  </section>;
}
