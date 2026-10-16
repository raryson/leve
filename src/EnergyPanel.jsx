import React,{useState} from 'react';
import {t,getLocale} from './i18n.js';
import {dailyEnergy,ENERGY_SOURCE,ACTIVITY_SOURCE,EXERCISE_SOURCE} from './energy.js';
const fmt=n=>Math.round(n).toLocaleString(getLocale());
function EnergyDetails({energy,day}) {
  const hasFood=day.meals.length>0;
  return <section className="energy-panel" aria-label={t('Estimativa de energia')}>
    <div className="head"><div><small>{t('UMA REFERÊNCIA PARA O DIA')}</small><h3>{t('Consumo e gasto estimado')}</h3></div><span className="energy-tag">{t('Estimativa, não medição')}</span></div>
    <div className="energy-grid">{[['Basal / repouso',energy.resting],['Rotina sem treino',energy.routine],['Extra dos treinos',energy.exercise],['Gasto total estimado',energy.total],['Consumo registrado',energy.consumed]].map(([label,value])=><div key={label}><span>{t(label)}</span><strong>{fmt(value)} <small>kcal</small></strong></div>)}</div>
    <p className="energy-equation">{t('Gasto total = rotina (já inclui repouso) + extra dos treinos. A basal não é somada de novo.')}</p>
    <div className="energy-balance"><b>{t('Saldo parcial: consumo − gasto estimado')}</b><strong>{hasFood?(energy.balance>0?'+':'')+fmt(energy.balance)+' kcal':'—'}</strong><p>{t(!hasFood?'Registre suas refeições para comparar.':energy.balance<0?'O consumo registrado está abaixo do gasto estimado. Isso não confirma o déficit real do dia.':energy.balance>0?'O consumo registrado está acima do gasto estimado.':'O consumo registrado está próximo do gasto estimado.')}</p></div>
    <p className="local-note">{t('Comparação com o dia inteiro estimado, usando apenas o que você registrou até agora. A basal não é uma meta para comer abaixo; saldo menor não é sempre melhor. Não definimos restrição calórica automaticamente.')}</p>
    {energy.retroactive.length>0&&<p className="local-note">{t('Estimativa retroativa com o Perfil atual: {0}.',[energy.retroactive.map(a=>t(a.reference)).join(' / ')])}</p>}
    {energy.unestimated>0&&<p className="local-note">{t('{0} treino(s) sem tipo ou duração suficientes não entram nesta estimativa. Os registros originais não foram alterados.',[energy.unestimated])}</p>}
    <details open><summary>{t('Como estimamos')}</summary><p>{t('Treinos novos guardam o peso e o gasto estimado ao salvar. Treinos antigos reconhecidos podem receber uma estimativa visual com peso atual, duração registrada e intensidade de referência indicada. O extra desconta a rotina atual; os registros originais não são alterados.')}</p><p>{t('Repouso: Mifflin–St Jeor, com peso atual, altura, idade e sexo do Perfil. Rotina: repouso × nível de movimento fora dos treinos, ajustável no Perfil. Treino: MET × 3,5 × kg ÷ 200 × minutos. Somamos só o gasto acima da rotina já prevista nesses minutos, para evitar contagem dupla.')}</p><p>{t('São aproximações para adultos, não metas de dieta nem garantia de emagrecimento. Corpo, intensidade, pausas e registro incompleto mudam o resultado. Para definir uma meta de consumo, procure orientação nutricional; gestação, amamentação e condições clínicas exigem avaliação individual.')}</p><p><a href={ENERGY_SOURCE} target="_blank" rel="noreferrer">Mifflin–St Jeor ↗</a> · <a href={ACTIVITY_SOURCE} target="_blank" rel="noreferrer">NIDDK ↗</a> · <a href={EXERCISE_SOURCE} target="_blank" rel="noreferrer">Compendium 2024 ↗</a></p></details>
  </section>;
}

export default function EnergyPanel({profile,day,Modal}) {
  const [details,setDetails]=useState(false);
  let energy;try{energy=dailyEnergy(profile,day);}catch(e){return <section className="energy-panel"><h3>{t('Estimativa de energia')}</h3><p>{t(e.message)}</p></section>;}
  const percentage=energy.consumed/energy.total*100,over=percentage>100;
  const percentLabel=Math.round(percentage).toLocaleString(getLocale());
  return <>
    <section className="energy-overview" aria-label={t('Consumo e gasto estimado')}>
      <div className="energy-donut" role="img" aria-label={t('{0} kcal consumidas de {1} kcal de gasto diário estimado; {2}%.',[fmt(energy.consumed),fmt(energy.total),percentLabel])}>
        <svg viewBox="0 0 200 200" aria-hidden="true"><circle className="energy-donut-track" cx="100" cy="100" r="82"/><circle className={over?'energy-donut-fill over':'energy-donut-fill'} cx="100" cy="100" r="82" pathLength="100" strokeDasharray={Math.min(100,percentage)+' 100'} transform="rotate(-90 100 100)"/></svg>
        <div className="energy-donut-label"><strong>{percentLabel}%</strong><span>{t('do gasto estimado')}</span></div>
      </div>
      <div className="energy-overview-copy"><small className="eyebrow">{t('SEU BALANÇO DE HOJE')}</small><h3>{t('Consumo e gasto estimado')}</h3>
        <div className="energy-overview-values"><div><span><i className={over?'energy-dot over':'energy-dot'}/>{t('Consumo registrado')}</span><b>{fmt(energy.consumed)} <small>kcal</small></b></div><div><span><i className="energy-dot reference"/>{t('Gasto diário estimado')}</span><b>{fmt(energy.total)} <small>kcal</small></b></div></div>
        <p className="local-note">{t(over?'Consumo registrado acima da estimativa diária.':'O círculo compara o consumo registrado com a estimativa do dia inteiro.')} {t('Saldo parcial, não uma meta alimentar.')}</p>
        <button type="button" className="outline" onClick={()=>setDetails(true)}>{t('Ver detalhes')}</button>
      </div>
    </section>
    {details&&<Modal title={t('Detalhes do consumo e gasto')} close={()=>setDetails(false)}><EnergyDetails energy={energy} day={day}/></Modal>}
  </>;
}
