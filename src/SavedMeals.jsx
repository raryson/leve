import {itemName,itemQuantity} from './foodLabels.js';
import { t, getLocale } from './i18n.js';
import React, { useEffect, useState } from 'react';
import { normalizeSavedMeal, amountUnit, itemAmount, itemDensity } from './domain.js';
import { FoodArt } from './FoodPicker.jsx';
import { foods } from './foods.js';

const meals = ['Café da manhã', 'Almoço', 'Lanche', 'Jantar', 'Ceia'];
const fmt = n => Number(n).toLocaleString(getLocale(), {maximumFractionDigits:1});
export function SaveMealButton({ meal, onSave }) {
  const [naming, setNaming] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  return <div className="save-meal">
    {naming ? <><label>{t("Nome da refeição salva")}<input maxLength={80} value={name} onChange={e=>setName(e.target.value)} placeholder={t("Ex.: Almoço de casa")}/></label><div className="account-actions"><button type="button" className="primary" onClick={()=>{try { if(onSave(name,meal.items)) {setNaming(false);setError('');} } catch(e) {setError(e.message);} }}>{t("Salvar em Minhas refeições")}</button><button type="button" className="outline" onClick={()=>{setNaming(false);setError('');}}>{t("Cancelar")}</button></div></> : <button type="button" className="link" onClick={()=>{setName(t('{0} de casa',[t(meal.name)]));setNaming(true);}}>{t("☆ Salvar combinação para repetir")}</button>}
    {error && <p className="error-box" role="alert">{t(error)}</p>}
  </div>;
}

export default function SavedMeals({ savedMeals, onUse, onDelete, onDirty }) {
  const [selected, setSelected] = useState(null);
  const [destination, setDestination] = useState('Almoço');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  useEffect(()=>{onDirty(Boolean(selected));},[selected,onDirty]);
  let total=null;
  try { if(selected) total=normalizeSavedMeal(selected).items.reduce((sum,i)=>sum+i.calories,0); } catch { /* Invalid quantities remain visible for correction. */ }
  return <details className="saved-meals" open={selected ? true : undefined}>
    <summary>{t("☆ Minhas refeições ")}<span>{savedMeals.length ? (savedMeals.length===1?t("1 combinação para repetir"):t("{0} combinações para repetir",[savedMeals.length])) : t("Monte uma refeição abaixo e salve a combinação")}</span></summary>
    <p className="local-note">{t("São modelos de porções. Adicionar cria uma nova cópia no rascunho, sem alterar a combinação salva.")}</p>
    {!selected && <div className="saved-meal-grid">{savedMeals.map(m=><article key={m.id}><div className="saved-meal-title"><FoodArt food={foods.find(f=>f.id===m.items[0].foodId || f.name===m.items[0].food)}/><div><h4>{m.name}</h4><small>{m.items.length}{t(" alimentos · ")}{fmt(m.items.reduce((sum,i)=>sum+i.calories,0))}{t(" kcal")}</small></div></div><p>{m.items.map(i=>t("{0} de {1}",[itemQuantity(i)||fmt(i.grams)+' g',itemName(i)])).join(' + ')}</p><div className="account-actions"><button type="button" className="primary" onClick={()=>{setSelected(structuredClone(m));setError('');setMessage('');}}>{t("Revisar e usar")}</button><button type="button" className="outline" aria-label={t("Excluir refeição salva {0}",[m.name])} onClick={()=>onDelete(m)}>{t("Excluir")}</button></div></article>)}</div>}
    {!savedMeals.length && <p className="empty-day">{t("Teu almoço de sempre pode virar um atalho. Adicione os alimentos e toque em “Salvar combinação para repetir”.")}</p>}
    {selected && <div className="saved-meal-review">
      <h4>{selected.name}</h4><label>{t("Registrar como")}<select aria-label={t("Registrar como")} value={destination} onChange={e=>setDestination(e.target.value)}>{meals.map(m=><option key={m} value={m}>{t(m)}</option>)}</select></label>
      {selected.items.map((item,index)=><label className="saved-portion" key={index}><span>{itemName(item)}<small>{fmt(itemDensity(item))}{t(" kcal / 100 {0}",[amountUnit(item)])}</small></span><span><input aria-label={t(item.servingUnit==='slice'?'Fatias de {0}':item.unit==='ml'?'Mililitros de {0}':'Gramas de {0}',[itemName(item)])} type="number" min={item.servingUnit==='slice'?0.01:0.1} max={item.servingUnit==='slice'?100:10000} step={item.servingUnit==='slice'?0.01:0.1} value={item.servingUnit==='slice'?item.servings:itemAmount(item)} onChange={e=>{setSelected(previous=>({...previous,items:previous.items.map((i,n)=>n===index?(i.unit==='ml'?{...i,milliliters:e.target.value}:i.servingUnit==='slice'?{...i,servings:e.target.value,grams:Number(e.target.value)*i.gramsPerSlice}:{...i,grams:e.target.value}):i)}));setError('');}}/>{item.servingUnit==='slice'?t(' fatias · {0} g/fatia',[fmt(item.gramsPerSlice)]):' '+amountUnit(item)}</span></label>)}
      <p className="saved-total" aria-live="polite">{total===null?t("Confira as quantidades."):t("{0} kcal nesta porção",[fmt(total)])}</p>
      <div className="account-actions"><button type="button" className="primary" disabled={total===null} onClick={()=>{try{onUse(destination,normalizeSavedMeal(selected));setSelected(null);setMessage('Combinação adicionada ao rascunho. Salve o dia ao terminar.');setError('');}catch(e){setError(e.message);}}}>{t("Adicionar ao dia")}</button><button type="button" className="outline" onClick={()=>{setSelected(null);setError('');}}>{t("Cancelar revisão")}</button></div>
    </div>}
    {error && <p className="error-box" role="alert">{t(error)}</p>}{message && <p className="local-note" role="status">{t(message)}</p>}
  </details>;
}
