import OnlineFoodSearch from './OnlineFoodSearch.jsx';
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {t,getLanguage,getLocale} from './i18n.js';
import {foods} from './foods.js';
import {foodName,foodNote} from './foodLabels.js';
import {portionCalories} from './domain.js';
import {mealMessages,parseLocalMeal,portionFor,localMealItems,groundLocalMeal} from './localMeal.js';
import {mealRuntime} from './localMealRuntime.js';
import {AIStatus,useMealRuntime} from './LocalAISettings.jsx';
import MealDictation from './MealDictation.jsx';

const riceChoices=[['taco-3','Arroz branco'],['taco-1','Arroz integral']];
const breastChoices=[['usda-05064','Sem pele'],['taco-406','Com pele']];

export default function LocalMealAssistant({catalog:baseCatalog=foods,onAdd,onDirty,onDraft,fixedMeal,onImportFood}){
  const runtime=useMealRuntime();
  const [imported,setImported]=useState([]);
  const catalog=useMemo(()=>[...new Map([...baseCatalog,...imported].map(f=>[f.id,f])).values()],[baseCatalog,imported]);
  const [text,setText]=useState(''),[rows,setRows]=useState(null),[meal,setMeal]=useState('Almoço');
  const [working,setWorking]=useState(false),[listening,setListening]=useState(false),[error,setError]=useState('');
  const session=useRef(0),ownsGeneration=useRef(false);
  useEffect(()=>()=>{session.current++;if(ownsGeneration.current)mealRuntime.release();},[]);
  const draft=useMemo(()=>{
    const items=(rows||[]).flatMap(row=>{try{return localMealItems([{...row,confirmed:true}],catalog);}catch{return [];}});
    return {items,analyzed:rows!==null,pending:rows?rows.length-items.length:0,hasText:Boolean(text.trim()),busy:working||listening};
  },[rows,catalog,text,working,listening]);
  useEffect(()=>{onDirty?.(Boolean(text.trim()||rows?.length||working||listening));},[text,rows,working,listening,onDirty]);
  useEffect(()=>{onDraft?.(draft);},[draft,onDraft]);
  function editText(value){setText(value);setRows(null);setError('');}
  async function analyze(value=text){
    const raw=typeof value==='string'?value:text,current=++session.current;setError('');let fallback=null;
    try{
      const grounded=groundLocalMeal(raw,catalog,getLanguage());
      if(grounded.complete){setRows(grounded.rows);return;}
      fallback=grounded.rows;
      if(!['ready','loading'].includes(mealRuntime.getSnapshot().phase)){setRows(fallback);return;}
      setRows(null);setWorking(true);ownsGeneration.current=true;
      const output=await mealRuntime.generate(mealMessages(raw,catalog,getLanguage()));
      if(current!==session.current)return;
      setRows(parseLocalMeal(output,catalog,raw,getLanguage()));
    }catch(e){if(current===session.current){if(fallback)setRows(fallback);setError(e.code?'A interpretação não terminou. Seu texto foi preservado.':e.message);}}
    finally{if(current===session.current){setWorking(false);ownsGeneration.current=false;}}
  }
  function cancel(){session.current++;ownsGeneration.current=false;mealRuntime.release();setWorking(false);}
  function update(index,patch){setRows(previous=>previous.map((row,i)=>i===index?{...row,...patch,...(patch.foodId!==undefined&&patch.foodId!==row.foodId?{assumption:'',question:''}:{}),confirmed:false}:row));setError('');}
  const ready=Boolean(rows?.length&&!draft.pending),total=draft.items.reduce((sum,item)=>sum+item.calories,0);
  return <section className="meal-assistant" aria-label={t('Assistente local de refeições')}>
    <div className="meal-assistant-heading"><div><p className="eyebrow">{t('TEXTO OU VOZ')}</p><h3>{t('O que teve na tua refeição?')}</h3></div><AIStatus/></div>
    <p className="meal-assistant-copy">{t('Conta do teu jeito. A gente organiza as porções e tu ajusta o que faltar.')}</p>
    <label className="meal-description"><span>{t('Minha refeição em texto livre')}</span><textarea rows="4" maxLength={2500} disabled={working||listening} value={text} placeholder={t('Duas fatias de pão integral, uma colher de pasta de amendoim e dois pêssegos')} onChange={e=>editText(e.target.value)}/></label>
    <div className="meal-input-actions"><MealDictation text={text} onText={editText} onFinish={value=>void analyze(value)} onBusy={setListening} disabled={working}/><button type="button" className="primary" disabled={working||listening||!text.trim()} onClick={()=>void analyze()}>{working?t('Organizando a refeição…'):t('Montar refeição')}</button></div>
    {working&&<button type="button" className="link" onClick={cancel}>{t('Cancelar processamento')}</button>}
    {runtime.phase==='loading'&&<p className="assistant-background" role="status">{t('IA preparando em segundo plano · {0}%. Alimentos conhecidos já podem ser registrados.',[Math.round(runtime.progress*100)])}</p>}
    {runtime.cached&&['idle','error','unsupported'].includes(runtime.phase)&&<button type="button" className="link" onClick={()=>void mealRuntime.load()}>{t('Preparar IA local')}</button>}
    {!runtime.cached&&runtime.phase!=='loading'&&runtime.phase!=='ready'&&<details className="assistant-first-use"><summary>{t('Ativar IA para relatos mais complexos')}</summary><p>{t('Download opcional de aproximadamente 1 GB. Depois de baixada, a IA é preparada automaticamente ao abrir o app. Os alimentos conhecidos já funcionam sem esse download.')}</p><p>{t('Os arquivos vêm do Hugging Face e do projeto MLC. O relato é interpretado neste dispositivo, sem API de IA paga.')}</p><button type="button" className="outline" disabled={['checking','clearing'].includes(runtime.phase)} onClick={()=>void mealRuntime.load()}>{t('Baixar ou carregar IA local')}</button></details>}
    {error&&<p className="error-box" role="alert">{t(error)}</p>}
    {rows&&<section className="meal-result" aria-label={t('Revisar interpretação da IA')}><div className="meal-result-heading"><h4>{t('Tua refeição')}</h4><button type="button" className="link" onClick={()=>{setRows(null);setText('');setError('');}}>{t('Limpar relato')}</button></div>
      <p className="meal-review-hint">{t('Confere os itens abaixo. Medidas caseiras são estimativas editáveis; só falta salvar no final.')}</p>
      {!fixedMeal&&<label>{t('Refeição')}<select value={meal} onChange={e=>setMeal(e.target.value)}>{['Café da manhã','Almoço','Lanche','Jantar','Ceia'].map(name=><option key={name} value={name}>{t(name)}</option>)}</select></label>}
      {rows.map((row,index)=>{
        const choices=['taco-3','taco-1'].includes(row.foodId)?riceChoices:['usda-05064','taco-406'].includes(row.foodId)?breastChoices:[];
        const food=catalog.find(f=>f.id===row.foodId),unit=food?.unit==='ml'?'ml':'g';let calories=null;try{calories=food?portionCalories(row.amount,food.kcal):null;}catch{/* Missing quantity stays pending. */}
        const selector=<label>{t('Referência para este alimento')}<select value={row.foodId} onChange={e=>{const next=catalog.find(f=>f.id===e.target.value);update(index,{foodId:e.target.value,amount:portionFor(row,next),estimated:!['g','ml'].includes(row.unit)});}}><option value="">{t('Selecione um alimento')}</option>{catalog.map(f=><option key={f.id} value={f.id}>{foodName(f)}</option>)}</select></label>;
        return <article className={'meal-result-item'+(!food||calories===null?' needs-portion':'')} key={row.id}>
          <div className="meal-item-top"><div><strong>{food?foodName(food):row.description}</strong><span className="meal-item-meta">{!food?t('Escolha o alimento'):calories===null?t('Falta a quantidade'):row.estimated?t('Porção estimada'):t('Quantidade informada')}</span></div><button type="button" className="outline meal-remove" aria-label={t('Remover item {0}',[index+1])} onClick={()=>setRows(previous=>previous.filter((_,i)=>i!==index))}>×</button></div>
          {row.assumption&&<p className="meal-estimate-note">{t(row.assumption)}</p>}{!food&&<>{selector}<OnlineFoodSearch description={row.description} onImport={onImportFood} onUse={reference=>{setImported(previous=>[...previous.filter(f=>f.id!==reference.id),reference]);update(index,{foodId:reference.id,amount:portionFor(row,reference),estimated:!['g','ml'].includes(row.unit)});}}/></>}
          {choices.length>0&&<div className="meal-portion-shortcuts" aria-label={t('Trocar referência do alimento')}>{choices.filter(([id])=>catalog.some(f=>f.id===id)).map(([id,label])=><button type="button" key={id} className={row.foodId===id?'primary':'outline'} aria-pressed={row.foodId===id} onClick={()=>update(index,{foodId:id,amount:row.amount===''?portionFor(row,catalog.find(f=>f.id===id)):row.amount})}>{t(label)}</button>)}</div>}
          {row.question&&(!food||calories===null)&&<p className="voice-help">{row.question}</p>}
          <div className="meal-item-quantity"><label>{unit==='ml'?t('Volume (ml)'):t('Peso (g)')}<input type="number" min="0.1" max="10000" step="0.1" value={row.amount} onChange={e=>update(index,{amount:e.target.value})}/></label><strong>{calories===null?'—':calories.toLocaleString(getLocale())} kcal</strong></div>
          {food&&calories===null&&!/geleia/i.test(food.name)&&(food.portion||food.slice||food.defaultAmount)&&<button type="button" className="outline" onClick={()=>update(index,{amount:food.portion?.grams||food.slice?.grams||food.defaultAmount,estimated:true})}>{t('Usar porção de referência: {0} {1}',[food.portion?.grams||food.slice?.grams||food.defaultAmount,unit])}</button>}
          {food?.portion&&/geleia/i.test(food.name)&&<div className="meal-portion-shortcuts" aria-label={t('Referências de quantidade para geleia')}>{[.25,.5,1].map(fraction=><button type="button" className="outline" key={fraction} onClick={()=>update(index,{amount:food.portion.grams*fraction,estimated:true})}>{t('{0} colher de sopa · aprox. {1} g',[fraction===.25?'¼':fraction===.5?'½':'1',food.portion.grams*fraction])}</button>)}</div>}
          <details className="meal-item-details"><summary>{t('Ajustar alimento e referência')}</summary>{food&&selector}{food&&(food.portion||food.defaultAmount||food.slice)&&<button type="button" className="outline" onClick={()=>update(index,{amount:portionFor(row,food)||food.portion?.grams||food.slice?.grams||food.defaultAmount,estimated:true})}>{t('Usar referência: {0}',[portionFor(row,food)?`${portionFor(row,food)} ${unit}`:food.portion?t(food.portion.label):`${food.slice?.grams||food.defaultAmount} ${unit}`])}</button>}{row.question&&<p>{row.question}</p>}{row.sourceText&&<small>{t('No relato: {0}',[row.sourceText])}</small>}{food?.note&&<small>{foodNote(food)}</small>}<label className="assistant-checkbox"><input type="checkbox" checked={row.estimated} onChange={e=>update(index,{estimated:e.target.checked})}/><span>{t('Quantidade estimada, não pesada')}</span></label></details>
        </article>;
      })}
      {draft.pending>0&&<p className="meal-pending" role="status">{t('Complete {0} item(ns) para salvar.',[draft.pending])}</p>}
      {!onDraft&&<div className="local-ai-save"><strong>{t('Total revisado: {0} kcal',[total.toLocaleString(getLocale())])}</strong><button type="button" className="primary" disabled={!ready||working||listening} onClick={()=>{try{onAdd(fixedMeal||meal,draft.items);setRows(null);setText('');}catch(e){setError(e.message);}}}>{t('Adicionar à refeição')}</button></div>}
    </section>}
  </section>;
}
