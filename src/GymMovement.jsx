import React from 'react';
import {t} from './i18n.js';

// Original schematic poses, not photographs copied from the reference sites.
// Coordinates describe head, shoulder, hip, knee/foot and elbow/hand, in side view.
const standing={head:[65,23],shoulder:[65,43],hip:[65,85],knee:[67,111],foot:[67,140],elbow:[83,63],hand:[102,63]};
const poses={
  'sit-stand':[
    {...standing,head:[63,41],shoulder:[62,61],hip:[49,97],knee:[84,97],foot:[85,140],elbow:[79,75],hand:[88,93]},
    {...standing,elbow:[66,68],hand:[68,89]}],
  'mini-squat':[standing,{...standing,head:[63,34],shoulder:[61,54],hip:[48,91],knee:[76,110],foot:[67,140],elbow:[82,64],hand:[102,63]}],
  'wall-push':[
    {...standing,head:[70,26],shoulder:[70,46],hip:[55,89],knee:[48,113],foot:[41,140],elbow:[95,46],hand:[120,46]},
    {...standing,head:[94,32],shoulder:[91,52],hip:[68,91],knee:[54,114],foot:[41,140],elbow:[106,71],hand:[120,46]}],
  'db-row':[
    {head:[98,32],shoulder:[86,49],hip:[41,74],knee:[45,109],foot:[36,140],elbow:[88,76],hand:[89,107]},
    {head:[98,32],shoulder:[86,49],hip:[41,74],knee:[45,109],foot:[36,140],elbow:[53,48],hand:[63,75]}],
  'station-row':[
    {...standing,head:[51,32],shoulder:[51,52],hip:[51,95],knee:[81,108],foot:[99,136],elbow:[80,64],hand:[110,75]},
    {...standing,head:[51,32],shoulder:[51,52],hip:[51,95],knee:[81,108],foot:[99,136],elbow:[29,78],hand:[65,83]}],
  'hip-extension':[standing,standing],
  'calf-raise':[standing,{...standing,head:[65,15],shoulder:[65,35],hip:[65,77],knee:[67,103],foot:[67,132],elbow:[83,59],hand:[102,63]}],
  'db-curl':[
    {...standing,elbow:[70,72],hand:[75,103]},
    {...standing,elbow:[70,72],hand:[99,51]}],
};
const points=items=>items.map(p=>p.join(',')).join(' ');
function Pose({id,stage}){
  const p=poses[id][stage];
  return <g fill="none" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 148H135" stroke="#cfdbd2" strokeWidth="2"/>
    {['sit-stand','db-row','station-row'].includes(id)&&<path d={id==='db-row'?'M85 84H131M94 84V143M126 84V143':id==='station-row'?'M26 102H67M34 102V143M62 102V143':'M22 103H66M28 103V143M61 103V143'} stroke="#9cab9f" strokeWidth="5"/>}
    {['mini-squat','hip-extension','calf-raise'].includes(id)&&<path d="M101 62H130M120 62V143" stroke="#9cab9f" strokeWidth="5"/>}
    {id==='wall-push'&&<path d="M123 13V148" stroke="#9cab9f" strokeWidth="5"/>}
    {id==='station-row'&&<path d={`M${p.hand.join(' ')}L139 80M139 35V144`} stroke="#9cab9f" strokeWidth="2"/>}
    <g stroke="#204d3b" strokeWidth="7">
      <circle cx={p.head[0]} cy={p.head[1]} r="10" fill="#d5eac5" strokeWidth="3"/>
      <polyline points={points([p.shoulder,p.hip,p.knee,p.foot])}/>
      <polyline points={points([p.shoulder,p.elbow,p.hand])}/>
      <path d={id==='calf-raise'&&stage?`M${p.foot[0]} ${p.foot[1]}L80 143`:`M${p.foot[0]} ${p.foot[1]}l12 2`}/>
      {id==='db-row'&&<polyline points="86,49 108,66 114,83" stroke="#718f7e" strokeWidth="5"/>}
      {id==='hip-extension'&&<polyline points={stage?'65,85 40,107 20,132':'65,85 56,113 56,140'} stroke="#718f7e" strokeWidth="5"/>}
    </g>
    {['db-curl','db-row'].includes(id)&&<path d={`M${p.hand[0]-8} ${p.hand[1]}h16m-16 -5v10m16 -10v10`} stroke="#db8c43" strokeWidth="5"/>}
  </g>;
}
export default function GymMovement({exercise}){
  return <details className="gym-movement"><summary>{t('Como fazer · ver movimento')}</summary>
    <figure><div className="gym-movement-poses">{[0,1].map(stage=><div key={stage}><span>{stage===0?t('1 · Início'):t('2 · Movimento')}</span><svg viewBox="0 0 155 160" role="img" aria-label={`${t(exercise.name)} · ${stage===0?t('Início'):t('Movimento')}`}><Pose id={exercise.id} stage={stage}/></svg></div>)}<span className="gym-movement-arrow" aria-hidden="true">→</span></div>
      <figcaption>{t('Volte devagar à posição inicial. A ida e a volta completam uma repetição.')}</figcaption>
    </figure>
    <p>{t(exercise.cue)}</p>{exercise.unilateral&&<p>{t('Faça dos dois lados. O número de repetições é para cada lado.')}</p>}
    <small>{t('Diagrama simplificado do movimento. Confira a execução e os ajustes do equipamento com um profissional.')}</small>
    <a className="gym-reference" href={exercise.source} target="_blank" rel="noreferrer">{t('Abrir referência de execução')} ↗</a>
  </details>;
}
