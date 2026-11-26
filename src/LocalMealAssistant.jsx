import React,{useEffect,useRef,useState} from 'react';
import {t,getLanguage,getLocale} from './i18n.js';
import {foods} from './foods.js';
import {foodName,foodNote} from './foodLabels.js';
import {portionCalories} from './domain.js';
import {mealMessages,parseLocalMeal,portionFor,localMealItems} from './localMeal.js';
import {createLocalMealEngine} from './localMealEngine.js';

export default function LocalMealAssistant({catalog=foods,onAdd,onDirty,fixedMeal}){
  const [supported,setSupported]=useState(null),[phase,setPhase]=useState('idle');
  const [loaded,setLoaded]=useState(false),[progress,setProgress]=useState(0);
  const [text,setText]=useState(''),[rows,setRows]=useState(null),[meal,setMeal]=useState('Almoço');
  const [error,setError]=useState(''),[message,setMessage]=useState('');
  const engine=useRef(null),session=useRef(0);
  const busy=['loading','generating','clearing'].includes(phase);
  useEffect(()=>{let disposed=false;
    async function check(){try{const adapter=window.isSecureContext&&navigator.gpu?await navigator.gpu.requestAdapter():null;if(!disposed)setSupported(Boolean(adapter));}catch{if(!disposed)setSupported(false);}}
    check();return()=>{disposed=true;session.current++;engine.current?.stop();};
  },[]);
  useEffect(()=>{onDirty(Boolean(text.trim()||rows?.length||busy));},[text,rows,busy,onDirty]);
  function client(){if(!engine.current)engine.current=createLocalMealEngine();return engine.current;}
  function cancel(){session.current++;engine.current?.stop();setLoaded(false);setPhase('idle');setProgress(0);setMessage('Processamento interrompido. Seu texto continua aqui.');}
  async function load(){
    const current=++session.current;setError('');setMessage('');setPhase('loading');setProgress(0);
    try{await client().load(value=>{if(current===session.current)setProgress(value);});if(current!==session.current)return;setLoaded(true);setPhase('ready');}
    catch{if(current!==session.current)return;engine.current?.stop();setLoaded(false);setPhase('idle');setError('Não foi possível carregar a IA local. Confira conexão, espaço e memória da GPU. O relato por regras continua disponível abaixo.');}
  }
  async function analyze(){
    const current=++session.current;setError('');setMessage('');
    try{
      const messages=mealMessages(text,catalog,getLanguage());setPhase('generating');
      const output=await client().generate(messages);if(current!==session.current)return;
      setRows(parseLocalMeal(output,catalog));setPhase('ready');
    }catch(e){if(current!==session.current)return;engine.current?.stop();setLoaded(false);setPhase('idle');setError(e.code?'A interpretação não terminou. Seu texto foi preservado. Carregue o modelo novamente ou use o relato por regras.':e.message);}
  }
  async function clear(){
    const current=++session.current;setError('');setPhase('clearing');
    try{await client().clear();if(current!==session.current)return;engine.current?.stop();setLoaded(false);setPhase('idle');setMessage('Modelo removido do armazenamento deste navegador. Seus registros foram preservados.');}
    catch{if(current!==session.current)return;engine.current?.stop();setLoaded(false);setPhase('idle');setError('Não foi possível remover todos os arquivos do modelo. Tente novamente.');}
  }
  function update(index,patch){setRows(previous=>previous.map((row,i)=>i===index?{...row,...patch,confirmed:false}:row));setError('');}
  let total=null;try{total=localMealItems(rows,catalog).reduce((sum,i)=>sum+i.calories,0);}catch{/* Every item must be reviewed. */}
  return <section className="local-ai" aria-label={t('Assistente local de refeições')}>
    <header className="local-ai-header"><div><span className="local-ai-badge">{t('EXPERIMENTAL · PC')}</span><h4>{t('Escreve do teu jeito')}</h4></div><span className="local-ai-device">{t('No teu navegador')}</span></header>
    <p>{t('Conte o que comeu. A IA organiza os itens; as calorias vêm do catálogo. Você revisa tudo antes de adicionar.')}</p>
    <div className="local-ai-setup">
      <strong>{t('Qwen 2.5 · modelo local de 1,5 bilhão de parâmetros')}</strong>
      <p>{t('O primeiro uso baixa cerca de 1 GB de arquivos do Hugging Face e do projeto MLC. Reserve cerca de 2 GB de memória de GPU ou mais. O navegador pode guardar o modelo para outros usos; a disponibilidade offline depende desse armazenamento.')}</p>
      <p>{t('Seu relato é processado neste PC, sem API de IA paga. Somente os alimentos que você confirmar entram no diário e na sincronização da conta. O ditado do navegador abaixo tem suas próprias permissões.')}</p>
      {supported===null&&<p role="status">{t('Conferindo compatibilidade da GPU…')}</p>}
      {supported===false&&<p className="voice-help" role="status">{t('WebGPU não está disponível aqui. Tente Chrome ou Edge atualizado no PC com aceleração gráfica disponível. Você pode continuar usando o relato por regras abaixo.')}</p>}
      <div className="local-ai-actions">
        {!loaded&&<button type="button" className="primary" disabled={supported!==true||busy} onClick={load}>{t('Baixar ou carregar IA local')}</button>}
        {loaded&&!busy&&<span className="local-ai-ready" role="status">{t('IA carregada neste navegador')}</span>}
        {loaded&&!busy&&<button type="button" className="outline" onClick={()=>{engine.current?.stop();setLoaded(false);setPhase('idle');}}>{t('Liberar memória')}</button>}
        {!busy&&<button type="button" className="outline" onClick={clear}>{t('Remover modelo baixado')}</button>}
        {busy&&<button type="button" className="outline" onClick={cancel}>{t('Cancelar processamento')}</button>}
      </div>
      {phase==='loading'&&<div className="local-ai-progress" role="status"><label>{t('Baixando ou preparando modelo… {0}%',[Math.round(progress*100)])}<progress value={progress} max="1"/></label><small>{t('O primeiro carregamento pode levar vários minutos. Você pode cancelar sem perder o relato.')}</small></div>}
      {phase==='clearing'&&<p role="status">{t('Removendo arquivos do modelo…')}</p>}
    </div>
    <label>{t('Minha refeição em texto livre')}<textarea rows="5" maxLength={2500} disabled={busy} value={text} placeholder={t('Jantei 150 g de arroz branco, duas bananas prata e uma xícara de café com leite sem açúcar.')} onChange={e=>{setText(e.target.value);setRows(null);setMessage('');setError('');}}/></label>
    <p className="form-note">{t('Para corrigir, edite o relato e interprete novamente. Exemplo: “Os pastéis eram médios, feitos em casa”. Tamanhos sem peso precisam de uma estimativa sua ou de uma porção de referência.')}</p>
    <div className="local-ai-actions"><button type="button" className="primary" disabled={!loaded||busy||!text.trim()} onClick={analyze}>{phase==='generating'?t('Organizando a refeição no PC…'):t('Interpretar com IA local')}</button>{(text||rows)&&<button type="button" className="outline" disabled={busy} onClick={()=>{setText('');setRows(null);setError('');setMessage('');}}>{t('Descartar relato da IA')}</button>}</div>
    {error&&<p className="error-box" role="alert">{t(error)}</p>}{message&&<p className="voice-help" role="status">{t(message)}</p>}
    {rows&&<section className="local-ai-review" aria-label={t('Revisar interpretação da IA')}>
      <h4>{t('Confere antes de registrar')}</h4><p>{t('A IA pode confundir alimentos e números. Nenhum item foi salvo. Confirme o preparo e o peso de cada um; remova o que não comeu.')}</p>
      {!fixedMeal&&<label>{t('Refeição')}<select value={meal} onChange={e=>setMeal(e.target.value)}>{['Café da manhã','Almoço','Lanche','Jantar','Ceia'].map(name=><option key={name} value={name}>{t(name)}</option>)}</select></label>}
      {rows.map((row,index)=>{
        const food=catalog.find(f=>f.id===row.foodId),unit=food?.unit==='ml'?'ml':'g';let calories=null;try{calories=food?portionCalories(row.amount,food.kcal):null;}catch{/* Quantity still pending. */}
        return <article className="local-ai-item" key={row.id}><div className="local-ai-item-heading"><strong>{row.description}</strong><button type="button" className="outline" onClick={()=>setRows(previous=>previous.filter((_,i)=>i!==index))} aria-label={t('Remover item {0}',[index+1])}>×</button></div>
          {row.question&&<p className="voice-help">{row.question}</p>}
          {!food&&<p className="voice-help">{t('Sem referência no catálogo. Escolha um alimento equivalente apenas se o preparo corresponder. Você também pode remover este item e cadastrá-lo pelo rótulo no formulário manual.')}</p>}
          <label>{t('Referência para este alimento')}<select value={row.foodId} onChange={e=>{const next=catalog.find(f=>f.id===e.target.value);update(index,{foodId:e.target.value,amount:portionFor(row,next),estimated:!['g','ml'].includes(row.unit)});}}><option value="">{t('Selecione um alimento')}</option>{catalog.map(f=><option key={f.id} value={f.id}>{foodName(f)}</option>)}</select></label>
          <div className="local-ai-measure"><label>{unit==='ml'?t('Volume consumido (ml)'):t('Quantidade consumida (g)')}<input type="number" min="0.1" max="10000" step="0.1" value={row.amount} onChange={e=>update(index,{amount:e.target.value})}/></label><strong>{calories===null?'—':calories.toLocaleString(getLocale())} kcal</strong></div>
          {food&&(food.portion||food.defaultAmount)&&<button type="button" className="outline" onClick={()=>update(index,{amount:food.portion?.grams||food.defaultAmount,estimated:true})}>{t('Usar referência: {0}',[food.portion?t(food.portion.label):`${food.defaultAmount} ${unit}`])}</button>}
          <label className="local-ai-check"><input type="checkbox" checked={row.estimated} onChange={e=>update(index,{estimated:e.target.checked})}/><span>{t('Quantidade estimada, não pesada')}</span></label>
          {food?.note&&<small>{foodNote(food)}</small>}
          <label className="local-ai-check"><input type="checkbox" disabled={!food||calories===null} checked={row.confirmed} onChange={e=>setRows(previous=>previous.map((r,i)=>i===index?{...r,confirmed:e.target.checked}:r))}/><span>{t('Conferi o alimento, o preparo e a quantidade deste item')}</span></label>
        </article>;
      })}
      <div className="local-ai-save"><strong>{total===null?t('Revise os itens pendentes'):t('Total revisado: {0} kcal',[total.toLocaleString(getLocale())])}</strong><button type="button" className="primary" disabled={total===null||busy} onClick={()=>{try{onAdd(fixedMeal||meal,localMealItems(rows,catalog));setRows(null);setText('');setMessage('Itens adicionados à revisão da refeição. Salve a refeição para guardar.');}catch(e){setError(e.message);}}}>{t('Adicionar itens confirmados')}</button></div>
    </section>}
  </section>;
}
