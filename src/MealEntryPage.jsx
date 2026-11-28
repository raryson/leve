import React,{useCallback,useEffect,useRef,useState} from 'react';
import {t,getLocale} from './i18n.js';
import {validDate} from './domain.js';
import {itemName,itemQuantity} from './foodLabels.js';
import LocalMealAssistant from './LocalMealAssistant.jsx';
import SavedMeals,{SaveMealButton} from './SavedMeals.jsx';

const mealNames=['Café da manhã','Almoço','Lanche','Jantar','Ceia'];
const initialMeal=()=>{const hour=new Date().getHours();return hour<10?mealNames[0]:hour<14?mealNames[1]:hour<18?mealNames[2]:hour<22?mealNames[3]:mealNames[4];};
export default function MealEntryPage({today,initialDate=today,allowPast=false,library,catalog,catalogSync,FoodForm,onFavorite,onSaveMeal,onSave,onImportFood,close}){
  const [date,setDate]=useState(allowPast?initialDate:today),[time,setTime]=useState(()=>new Date().toTimeString().slice(0,5)),[name,setName]=useState(initialMeal);
  const [mode,setMode]=useState('assistant'),[items,setItems]=useState([]),[draft,setDraft]=useState({items:[],analyzed:false,hasText:false,pending:0,busy:false});
  const [manualVersion,setManualVersion]=useState(0);
  const [foodDirty,setFoodDirty]=useState(false),[modelDirty,setModelDirty]=useState(false),[voiceDirty,setVoiceDirty]=useState(false),[contextDirty,setContextDirty]=useState(false);
  const [error,setError]=useState(''),[confirmClose,setConfirmClose]=useState(false);const heading=useRef(null);
  const onDraft=useCallback(value=>setDraft(value),[]);
  const dirty=Boolean(items.length||foodDirty||modelDirty||voiceDirty||contextDirty);
  useEffect(()=>{window.scrollTo(0,0);heading.current?.focus();},[]);
  useEffect(()=>{if(!dirty)return;const before=e=>{e.preventDefault();e.returnValue='';};window.addEventListener('beforeunload',before);return()=>window.removeEventListener('beforeunload',before);},[dirty]);
  const allItems=[...items,...draft.items],total=allItems.reduce((sum,item)=>sum+item.calories,0);
  const pending=draft.pending>0||draft.busy||draft.hasText&&!draft.analyzed;
  function save(){
    try{
      validDate(date);if(date>today||!allowPast&&date!==today)throw Error('Para registrar refeições de outros dias, use o Histórico.');
      if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw Error('Informe um horário válido.');
      if(pending)throw Error('Monte a refeição e complete as porções pendentes antes de salvar.');
      if(foodDirty||modelDirty)throw Error('Conclua ou descarte o preenchimento nas abas Manual ou Salvas antes de salvar.');
      if(!allItems.length)throw Error('Adicione pelo menos um alimento à refeição.');
      if(!onSave({type:'meal',id:crypto.randomUUID(),date,name,time,items:allItems}))setError('Não foi possível salvar no navegador. Seus dados continuam nesta janela.');
    }catch(e){setError(e.message);}
  }
  const fmt=value=>value.toLocaleString(getLocale());
  return <main className="meal-compose-page"><header className="meal-compose-header"><button type="button" className="outline" onClick={()=>dirty?setConfirmClose(true):close()}>{t('← Voltar')}</button><div><p className="eyebrow">{t('ALIMENTAÇÃO')}</p><h1 ref={heading} tabIndex="-1">{t('Registrar refeição')}</h1></div><span className="meal-compose-step">{t('Conta · ajusta · salva')}</span></header>
    <div className="meal-compose-body"><div className="meal-compose-context"><label>{t('Refeição')}<select value={name} onChange={e=>{setName(e.target.value);setContextDirty(true);}}>{mealNames.map(meal=><option key={meal} value={meal}>{t(meal)}</option>)}</select></label><label>{t('Horário da refeição')}<input type="time" value={time} onChange={e=>{setTime(e.target.value);setContextDirty(true);}}/></label>{allowPast?<label>{t('Data do registro')}<input type="date" max={today} value={date} onChange={e=>{setDate(e.target.value);setContextDirty(true);}}/></label>:<span className="meal-today">{t('Hoje')} · {new Date(date+'T12:00:00').toLocaleDateString(getLocale())}</span>}</div>
      <nav className="meal-compose-tabs" aria-label={t('Como registrar a refeição')}>{[['assistant','Texto ou voz'],['manual','Manual'],['saved','Salvas']].map(([key,label])=><button type="button" key={key} className={mode===key?'primary':'outline'} aria-pressed={mode===key} disabled={draft.busy} onClick={()=>setMode(key)}>{t(label)}{(key==='manual'&&foodDirty||key==='saved'&&modelDirty)&&<span> ·</span>}</button>)}</nav>
      <div hidden={mode!=='assistant'}><LocalMealAssistant catalogSync={catalogSync} onImportFood={onImportFood} catalog={catalog} fixedMeal={name} onDraft={onDraft} onDirty={setVoiceDirty}/></div>
      <div className="meal-manual-panel" hidden={mode!=='manual'}><h3>{t('Escolher no catálogo')}</h3><p>{t('Use o catálogo ou informe o rótulo. Os itens são somados à mesma refeição.')}</p><FoodForm key={manualVersion} catalog={catalog} fixedMeal={name} onDirty={setFoodDirty} favorites={library.favoriteFoods} recent={library.recentFoods} onFavorite={onFavorite} onAdd={(_meal,item)=>{setItems(previous=>[...previous,item]);setError('');}}/>{foodDirty&&<button type="button" className="link" onClick={()=>{setManualVersion(v=>v+1);setFoodDirty(false);setError('');}}>{t('Limpar formulário manual')}</button>}</div>
      <div className="meal-manual-panel" hidden={mode!=='saved'}><h3>{t('Repetir uma refeição')}</h3><SavedMeals fixedMeal={name} savedMeals={library.savedMeals} onDirty={setModelDirty} onUse={(_meal,meal)=>{setItems(previous=>[...previous,...meal.items]);setError('');}}/></div>
      {items.length>0&&<section className="meal-added-items"><h4>{t('Também nesta refeição')}</h4>{items.map((item,index)=><div className="draft-row" key={index}><span>{itemName(item)} · {itemQuantity(item)} · {item.calories} kcal</span><button type="button" className="outline" aria-label={t('Remover {0}',[itemName(item)])} onClick={()=>setItems(previous=>previous.filter((_,i)=>i!==index))}>×</button></div>)}</section>}
      {allItems.length>0&&!pending&&<details className="meal-save-template"><summary>{t('Guardar esta combinação para repetir')}</summary><SaveMealButton meal={{name,items:allItems}} onSave={onSaveMeal}/></details>}
      {error&&<p className="error-box" role="alert">{t(error)}</p>}
      {confirmClose&&<div className="error-box" role="alert"><p>{t('Descartar este registro não salvo?')}</p><div className="account-actions"><button type="button" className="outline" onClick={()=>setConfirmClose(false)}>{t('Continuar editando')}</button><button type="button" className="outline" onClick={close}>{t('Descartar e fechar')}</button></div></div>}
    </div>
    <footer className="meal-compose-footer"><div><strong>{fmt(total)} <small>kcal</small></strong><span>{draft.pending?t('Faltam {0} porções',[draft.pending]):t('{0} alimento(s)',[allItems.length])}</span></div><button type="button" className="primary" disabled={!allItems.length||pending} onClick={save}>{t('Salvar refeição')}</button></footer>
  </main>;
}
