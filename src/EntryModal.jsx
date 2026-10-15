import React,{useEffect,useRef,useState} from 'react';
import {t,getLocale} from './i18n.js';
import {numeric,validDate} from './domain.js';
import {itemName,itemQuantity} from './foodLabels.js';
import SavedMeals,{SaveMealButton} from './SavedMeals.jsx';
import VoiceMeal from './VoiceMeal.jsx';

const mealNames=['Café da manhã','Almoço','Lanche','Jantar','Ceia'];
const clock=()=>new Date().toTimeString().slice(0,5);
const currentMeal=()=>{const hour=new Date().getHours();return hour<10?mealNames[0]:hour<14?mealNames[1]:hour<18?mealNames[2]:hour<22?mealNames[3]:mealNames[4];};
const titles={meal:'Registrar refeição',workout:'Registrar treino',water:'Registrar água',weight:'Registrar peso'};

export default function EntryModal({mode,today,initialDate=today,library,catalog,Modal,FoodForm,ExerciseForm,onFavorite,onSaveMeal,onSave,close}) {
  const [date,setDate]=useState(initialDate),[time,setTime]=useState(clock),[name,setName]=useState(currentMeal);
  const [items,setItems]=useState([]),[amount,setAmount]=useState('250'),[weight,setWeight]=useState('');
  const [foodDirty,setFoodDirty]=useState(false),[voiceDirty,setVoiceDirty]=useState(false),[modelDirty,setModelDirty]=useState(false),[formDirty,setFormDirty]=useState(false);
  const [error,setError]=useState(''),[confirmClose,setConfirmClose]=useState(false);
  const discardPrompt=useRef(null);
  useEffect(()=>{if(confirmClose){discardPrompt.current?.scrollIntoView({block:'nearest'});discardPrompt.current?.querySelector('button')?.focus();}},[confirmClose]);
  const dirty=Boolean(items.length||foodDirty||voiceDirty||modelDirty||formDirty);
  function save(values){try{validDate(date);if(date>today)throw new Error('Escolha uma data até hoje.');if(mode==='meal'&&!values.items.length)throw new Error('Adicione pelo menos um alimento à refeição.');if(mode==='meal'&&!/^([01]\d|2[0-3]):[0-5]\d$/.test(values.time))throw new Error('Informe um horário válido.');if(mode==='water')numeric(values.amount,1,10000,'Água');if(mode==='weight')numeric(values.value,20,500,'Pesagem');const saved=onSave({type:mode,id:crypto.randomUUID?.()||Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join(''),date,...values});if(!saved)setError('Não foi possível salvar no navegador. Seus dados continuam nesta janela.');return saved;}catch(e){setError(e.message);return false;}}
  function add(next){setItems(previous=>[...previous,...next]);setError('');}
  return <Modal title={t(titles[mode])} close={()=>dirty?setConfirmClose(true):close()}>
    <p className="modal-copy">{t(mode==='meal'?'Monte só esta refeição. Os outros registros do dia serão preservados.':mode==='workout'?'Registre uma atividade. Alimentação e água ficam nos seus próprios registros.':mode==='water'?'Informe a água que você bebeu agora. O volume será somado ao dia.':'Adicione uma pesagem sem alterar suas refeições ou treinos.')}</p>
    <div className="entry-context"><label>{t('Data do registro')}<input required type="date" max={today} value={date} onInput={e=>{setDate(e.currentTarget.value);setFormDirty(true);}} onBlur={e=>setDate(e.currentTarget.value)} onChange={e=>{setDate(e.target.value);setFormDirty(true);}}/></label>{mode==='meal'&&<><label>{t('Horário da refeição')}<input required type="time" value={time} onInput={e=>{setTime(e.currentTarget.value);setFormDirty(true);}} onBlur={e=>setTime(e.currentTarget.value)} onChange={e=>{setTime(e.target.value);setFormDirty(true);}}/></label><label>{t('Refeição')}<select value={name} onChange={e=>{setName(e.target.value);setFormDirty(true);}}>{mealNames.map(m=><option key={m} value={m}>{t(m)}</option>)}</select></label></>}</div>
    {mode==='meal'&&<>
      <FoodForm fixedMeal={name} catalog={catalog} onDirty={setFoodDirty} favorites={library.favoriteFoods} recent={library.recentFoods} onFavorite={onFavorite} onAdd={(_name,item)=>add([item])}/>
      <SavedMeals fixedMeal={name} savedMeals={library.savedMeals} onDirty={setModelDirty} onUse={(_name,meal)=>add(meal.items)}/>
      <details className="voice-disclosure"><summary>{t('Falar ou escrever minha refeição')}<span>{t('Ditado + revisão dos alimentos')}</span></summary><VoiceMeal fixedMeal={name} onDirty={setVoiceDirty} onAdd={(_name,next)=>add(next)}/></details>
      <section className="meal-entry-review" aria-label={t('Esta refeição')}><h4>{t('Esta refeição')} · {t(name)} · {time}</h4>{!items.length&&<p className="local-note">{t('Adicione os alimentos acima antes de salvar.')}</p>}{items.map((item,index)=><div className="draft-row" key={item.id||index}><span>{itemName(item)} · {itemQuantity(item)} · {item.calories} kcal</span><button type="button" className="outline" aria-label={t('Remover {0}',[itemName(item)])} onClick={()=>setItems(previous=>previous.filter((_,i)=>i!==index))}>×</button></div>)}{items.length>0&&<SaveMealButton meal={{name,items}} onSave={onSaveMeal}/>}</section>
      <div className="editor-save"><strong>{items.reduce((sum,i)=>sum+i.calories,0).toLocaleString(getLocale())} kcal</strong><button type="button" className="primary" onClick={()=>{if(foodDirty||voiceDirty||modelDirty){setError('Adicione ou descarte os preenchimentos pendentes antes de salvar a refeição.');return;}save({name,time,items});}}>{t('Salvar refeição')}</button></div>
    </>}
    {mode==='workout'&&<ExerciseForm profile={library.profile} onDirty={setFormDirty} submitLabel="Salvar treino" onAdd={activity=>save({activity})}/>}
    {(mode==='water'||mode==='weight')&&<form className="entry-form" onSubmit={e=>{e.preventDefault();save(mode==='water'?{amount}:{value:weight});}}><label>{t(mode==='water'?'Água consumida (ml)':'Peso (kg)')}<input required type="number" min={mode==='water'?1:20} max={mode==='water'?10000:500} step={mode==='water'?1:0.1} value={mode==='water'?amount:weight} onChange={e=>{mode==='water'?setAmount(e.target.value):setWeight(e.target.value);setFormDirty(true);}}/></label><button className="primary">{t(mode==='water'?'Salvar água':'Salvar pesagem')}</button></form>}
    {error&&<p className="error-box" role="alert">{t(error)}</p>}
    {confirmClose&&<div ref={discardPrompt} className="error-box" role="alert"><p>{t('Descartar este registro não salvo?')}</p><div className="account-actions"><button type="button" className="outline" onClick={()=>setConfirmClose(false)}>{t('Continuar editando')}</button><button type="button" className="outline" onClick={close}>{t('Descartar e fechar')}</button></div></div>}
  </Modal>;
}
