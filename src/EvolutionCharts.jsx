import React,{useEffect,useRef,useState} from 'react';
import {t,getLocale} from './i18n.js';
import {evolutionPeriod,evolutionRows,seriesSummary} from './evolutionData.js';
const metrics=[
  {key:'water',label:'Água registrada',unit:'ml',color:'#2475a8'},
  {key:'consumed',label:'Calorias consumidas',unit:'kcal',color:'#b64d3d'},
  {key:'resting',label:'Basal / repouso',unit:'kcal',color:'#8060a5'},
  {key:'exercise',label:'Extra dos treinos',unit:'kcal',color:'#b07119'},
  {key:'expenditure',label:'Gasto total estimado',unit:'kcal',color:'#237a56'},
];
const trainingMetric={key:'training',label:'Treinos registrados',unit:'dia com treino',color:'#376d56'};
const tableMetrics=[trainingMetric,...metrics];
const fmt=value=>Number(value).toLocaleString(getLocale(),{maximumFractionDigits:0});
const dateLabel=date=>new Date(date+'T12:00:00Z').toLocaleDateString(getLocale(),{day:'2-digit',month:'2-digit',timeZone:'UTC'});
function scaleMax(values){const max=Math.max(1,...values.filter(Number.isFinite));const step=10**Math.floor(Math.log10(max));return Math.ceil(max/step)*step;}
function TrendChart({rows,series,combined=false,compact=false}){
  const ref=useRef(null),[width,setWidth]=useState(500);
  useEffect(()=>{const element=ref.current;if(!element)return;const update=()=>setWidth(Math.max(280,Math.round(element.getBoundingClientRect().width)));update();if(typeof ResizeObserver==='undefined')return;const observer=new ResizeObserver(update);observer.observe(element);return()=>observer.disconnect();},[]);
  const left=48,right=combined?52:20,top=20,bottom=compact?72:177,plot=width-left-right;
  const max=scaleMax(rows.flatMap(row=>series.filter(s=>!combined||s.unit==='kcal').map(s=>row[s.key])));
  const waterMax=scaleMax(rows.map(row=>row.water));
  const x=i=>left+(i+.5)*plot/rows.length;
  const y=(value,metric)=>bottom-value/(combined&&metric.unit==='ml'?waterMax:max)*(bottom-top);
  const axis=series[0].unit;
  const ticks=series[0].key==='training'?[0,1]:Array.from({length:5},(_,i)=>i/4);
  const labelStep=Math.max(1,Math.ceil(rows.length/(width<400?4:width<650?6:9)));
  const hasData=rows.some(row=>series.some(metric=>row[metric.key]!==null));
  return <>
    <svg ref={ref} className="evolution-plot" viewBox={`0 0 ${width} ${compact?110:215}`} role="img" aria-label={combined?t('Comparação diária de calorias e água, em escalas separadas. Valores na tabela abaixo.'):t('Gráfico diário de {0}, em {1}. Valores na tabela abaixo.',[t(series[0].label),t(axis)])}>
      {ticks.map(tick=><g key={tick}><line x1={left} x2={width-right} y1={bottom-tick*(bottom-top)} y2={bottom-tick*(bottom-top)} stroke="#e2e9e4"/><text x={left-7} y={bottom-tick*(bottom-top)+4} textAnchor="end">{fmt(max*tick)}</text>{combined&&<text x={width-right+7} y={bottom-tick*(bottom-top)+4} fill="#2475a8">{fmt(waterMax*tick)}</text>}</g>)}
      <text x={left} y="11">{combined?'kcal':t(axis)}</text>{combined&&<text x={width-right} y="11" textAnchor="end" fill="#2475a8">ml</text>}
      {rows.map((row,i)=>(i%labelStep===0||i===rows.length-1)&&<text key={row.date} x={x(i)} y={compact?98:201} textAnchor="middle">{dateLabel(row.date)}</text>)}
      {combined&&rows.map((row,i)=>row.trained&&<path key={row.date} d={`M${x(i)-4},187 L${x(i)+4},187 L${x(i)},180 Z`} fill="#376d56"><title>{t('Treino registrado em {0}, mesmo sem estimativa de calorias.',[dateLabel(row.date)])}</title></path>)}
      {series.map(metric=>{
        const line=combined||metric.key==='resting';
        let previous=false;
        const path=rows.map((row,i)=>{const value=row[metric.key];if(value===null){previous=false;return '';}const command=previous?'L':'M';previous=true;return `${command}${x(i)},${y(value,metric)}`;}).join(' ');
        return <g key={metric.key}>
          {line&&<path d={path} fill="none" stroke={metric.color} strokeWidth="2.5" strokeDasharray={metric.key==='resting'?'5 4':metric.key==='water'&&combined?'2 3':undefined}/>}
          {rows.map((row,i)=>row[metric.key]!==null&&(line?<circle key={row.date} cx={x(i)} cy={y(row[metric.key],metric)} r={rows.length>10?2:3.5} fill={metric.color}><title>{[dateLabel(row.date),t(metric.label),fmt(row[metric.key]),metric.unit].join(' · ')}</title></circle>:<rect key={row.date} x={x(i)-Math.min(14,plot/rows.length*.28)} y={y(row[metric.key],metric)} width={Math.min(28,plot/rows.length*.56)} height={Math.max(1,bottom-y(row[metric.key],metric))} rx="3" fill={metric.color}><title>{[dateLabel(row.date),t(metric.label),fmt(row[metric.key]),metric.unit].join(' · ')}</title></rect>))}
        </g>;
      })}
    </svg>
    {!hasData&&<p className="local-note">{t(series[0].key==='exercise'&&rows.some(row=>row.trained)?'Há treinos registrados, mas sem estimativa calórica disponível. Veja os treinos acima.':'Sem dados registrados neste período.')}</p>}
  </>;
}
export default function EvolutionCharts({state,today}){
  const [period,setPeriod]=useState('week'),[offset,setOffset]=useState(0);
  const [visible,setVisible]=useState(metrics.map(m=>m.key));
  const range=evolutionPeriod(today,period,offset),rows=evolutionRows(state,range.dates);
  const shown=metrics.filter(m=>visible.includes(m.key));
  const recorded=rows.filter(row=>row.recorded).length;
  const partial=rows.filter(row=>row.partialExercise).length;
  const trainedDays=rows.filter(row=>row.trained);
  const unestimatedDays=trainedDays.filter(row=>row.unknownExercise).length;
  const retroactiveCount=rows.reduce((sum,row)=>sum+row.retroactive.length,0);
  return <section className="evolution-trends" aria-label={t('Acompanhamento de hábitos e energia')}>
    <div className="head"><div><small className="eyebrow">{t('SUA EVOLUÇÃO ALÉM DO PESO')}</small><h3>{t('Água, comida e movimento')}</h3><p className="local-note">{t('Veja os registros diários e compare com suas referências estimadas.')}</p></div><div className="period-filter" aria-label={t('Período dos gráficos')}>{[['week','Semana'],['month','Mês']].map(([value,label])=><button type="button" className="outline" key={value} aria-pressed={period===value} onClick={()=>{setPeriod(value);setOffset(0);}}>{t(label)}</button>)}</div></div>
    <div className="period-navigation"><button type="button" className="outline" disabled={offset<=-1200} aria-label={t('Período anterior')} onClick={()=>setOffset(n=>n-1)}>←</button><div aria-live="polite"><strong>{new Date(range.start+'T12:00:00Z').toLocaleDateString(getLocale(),{timeZone:'UTC'})} – {new Date(range.end+'T12:00:00Z').toLocaleDateString(getLocale(),{timeZone:'UTC'})}</strong><small>{t('{0} de {1} dias com algum registro',[recorded,rows.length])}</small></div><button type="button" className="outline" aria-label={t('Próximo período')} disabled={offset===0} onClick={()=>setOffset(n=>n+1)}>→</button>{offset!==0&&<button className="link" type="button" onClick={()=>setOffset(0)}>{t('Voltar ao período atual')}</button>}</div>
    <p className="local-note">{t('Sem registro não significa zero. Hoje pode estar incompleto. Semanas começam na segunda-feira; o mês segue o calendário. Dias futuros não entram nos gráficos.')}</p>
    <div className="evolution-summary" aria-label={t('Resumo do período')}>{[
      ['Água por dia registrado',seriesSummary(rows,'water').average,'ml'],
      ['Consumo por dia registrado',seriesSummary(rows,'consumed').average,'kcal'],
      ['Dias com treino',trainedDays.length,'dias'],
      ['Extra no período',seriesSummary(rows,'exercise').count?seriesSummary(rows,'exercise').total:null,'kcal'],
    ].map(([label,value,unit])=><div key={label}><span>{t(label)}</span><strong>{value===null?'—':fmt(value)} <small>{t(unit)}</small></strong></div>)}</div>
    <article className="evolution-chart-card combined-chart">{retroactiveCount>0&&<span className="chart-estimate-tag">{t("Inclui estimativas retroativas")}</span>}<h4>{t('Visão combinada')}</h4><p className="local-note">{t('Calorias no eixo esquerdo, água no direito. Use a legenda para escolher o que comparar.')}</p><p className="local-note training-marker-note">{t('▲ Dia com treino registrado, mesmo sem calorias estimadas.')}</p><div className="chart-legend" aria-label={t('Séries do gráfico combinado')}>{metrics.map(metric=><button type="button" className="outline" key={metric.key} aria-pressed={visible.includes(metric.key)} onClick={()=>setVisible(current=>current.includes(metric.key)?current.filter(key=>key!==metric.key):[...current,metric.key])}><i style={{background:metric.color}}/>{t(metric.label)} · {metric.unit}</button>)}</div>{shown.length?<TrendChart rows={rows} series={shown} combined/>:<p className="empty-day">{t('Selecione uma série na legenda.')}</p>}</article>
    <div className="evolution-chart-grid">{metrics.slice(0,4).map(metric=>{const summary=seriesSummary(rows,metric.key);return <article className="evolution-chart-card" key={metric.key}><div className="chart-card-heading"><h4><i style={{background:metric.color}}/>{t(metric.label)}</h4><strong>{summary.average===null?'—':fmt(summary.average)} <small>{metric.unit}{t('/dia')}</small></strong></div><p className="local-note">{t('Média dos {0} dias com valor disponível.',[summary.count])}{metric.key==='exercise'&&[' ',t('Apenas o gasto adicional acima da rotina já prevista.')].join('')}</p><TrendChart rows={rows} series={[metric]}/>{metric.key!=='resting'&&<p className="local-note">{t('Total registrado no período: {0} {1}.',[summary.count?fmt(summary.total):'—',metric.unit])}</p>}</article>;})}</div>
    <article className="evolution-chart-card training-history"><div className="chart-card-heading"><h4><i style={{background:trainingMetric.color}}/>{t('Treinos registrados')}</h4><strong>{t('{0} dias com treino',[trainedDays.length])}</strong></div><p className="local-note">{t('Todo treino registrado aparece aqui, mesmo quando não tem calorias estimadas. A barra marca o dia em que você treinou.')}</p><TrendChart rows={rows} series={[trainingMetric]} compact/>{trainedDays.length>0&&<details className="training-details"><summary>{t("Ver treinos do período")}</summary><div className="training-day-list">{trainedDays.map(row=><div className="training-day" key={row.date}><strong>{dateLabel(row.date)}</strong><div>{row.activities.length?row.activities.map((a,i)=><p key={i}>{t(a.type)}{a.durationMinutes>0&&[' · ',fmt(a.durationMinutes),' min'].join('')}</p>):<p>{t('Treino registrado sem detalhes')}</p>}{row.retroactive.length>0&&<small>{t('Estimativa retroativa com o Perfil atual: {0}.',[row.retroactive.map(a=>t(a.reference)).join(' / ')])}</small>}{row.unknownExercise&&<small>{t('Há treino sem estimativa de calorias; ele continua contando para sua constância.')}</small>}</div></div>)}</div></details>}{unestimatedDays>0&&<p className="local-note">{t('{0} dia(s) com treino sem referência calórica. Isso não significa que você não treinou.',[unestimatedDays])}</p>}</article>

    <details className="evolution-help"><summary>{t("Como ler as estimativas")}</summary><p className="local-note">{t("Os eixos de kcal e ml têm escalas independentes. Alturas iguais não representam quantidades equivalentes.")}</p>
    <p className="local-note">{t('Basal e rotina usam o Perfil atual em todos os dias, como referência recalculada, não uma medição histórica. Gasto total = rotina (já inclui basal) + extra dos treinos. A basal não é uma meta de consumo nem deve ser somada novamente.')}</p>
    {retroactiveCount>0&&<p className="local-note">{t('{0} treino(s) antigos receberam estimativa apenas nesta visualização, usando duração registrada, peso atual e a intensidade de referência indicada na lista. Os registros originais permanecem intactos.',[retroactiveCount])}</p>}
    {partial>0&&<p className="local-note">{t('{0} dia(s) têm estimativa parcial de exercício: só os treinos com referência entram no gasto. A tabela marca esses valores com *.',[partial])}</p>}
    <p className="local-note">{t('Se nenhum treino do dia tiver referência compatível, o extra e o gasto total ficam em branco. Quando há treinos com e sem referência, mostramos o gasto parcial conhecido. Zero de exercício significa nenhum treino registrado. Alimentação e água refletem apenas o que foi anotado.')}</p>
    </details>
    <details className="evolution-data"><summary>{t('Ver valores por dia')}</summary><div className="evolution-table-scroll"><table><caption>{t('Registros do período; — indica valor indisponível.')}</caption><thead><tr><th scope="col">{t('Data')}</th>{tableMetrics.map(m=><th scope="col" key={m.key}>{t(m.label)} ({t(m.unit)})</th>)}</tr></thead><tbody>{rows.map(row=><tr key={row.date}><th scope="row">{dateLabel(row.date)}</th>{tableMetrics.map(m=><td key={m.key}>{row[m.key]===null?'—':fmt(row[m.key])}{row.partialExercise&&['exercise','expenditure'].includes(m.key)&&' *'}</td>)}</tr>)}</tbody></table></div></details>
  </section>;
}
