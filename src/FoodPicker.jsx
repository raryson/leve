import {amountUnit} from './domain.js';
import {foodName} from './foodLabels.js';
import { t, getLocale } from './i18n.js';
import React, { useRef, useState } from 'react';
import { foods } from './foods.js';
import { categories, foodCategory, searchFoods } from './foodLibrary.js';

export function FoodArt({ food }) {
  const category = food ? foodCategory(food) : 'custom';
  const colors = { 'Grãos e pães': '#f6e5c8', 'Bebidas': '#dcebe8', 'Feijões': '#f4dcce', 'Frutas': '#e9edc3', 'Frango': '#f8e3c9', 'Carnes': '#f4d8d0', 'Doces e pastas': '#ebe0f5', custom: '#e0e9e0' };
  return <svg className="food-art" viewBox="0 0 64 64" aria-hidden="true">
    <rect width="64" height="64" rx="16" fill={colors[category]||colors.custom}/>
    {food?.slice ? <><path d="M16 29C8 13 55 8 49 29v23H16Z" fill="#b77f48"/><path d="M21 30C12 18 49 14 44 30v17H21Z" fill="#efd9a5"/><path d="m27 28 1 5m8-8-1 5m-7 8 5 1" stroke="#c19b62" strokeWidth="2" strokeLinecap="round"/></> : category === "Bebidas" ? <><path d="M18 18h27l-3 34H21Z" fill="#fffaf0" stroke="#67968c" strokeWidth="2"/><path d="m21 31 3 18h15l2-18Z" fill="#b98258"/><path d="m38 12-5 26" stroke="#567d70" strokeWidth="3" strokeLinecap="round"/><path d="M18 18h27" stroke="#67968c" strokeWidth="3" strokeLinecap="round"/></> : category === "Grãos e pães" ? <><path d="M12 32h40c-2 15-8 20-20 20S14 47 12 32" fill="#759e7a"/><ellipse cx="32" cy="31" rx="20" ry="7" fill="#fff9e8"/>{[22,30,38,27,35,43].map((x,i)=><ellipse key={x} cx={x} cy={i<3?27:32} rx="4" ry="2" fill="#e2ca8c" transform={`rotate(-20 ${x} ${i<3?27:32})`}/>)}</> : category === "Feijões" ? <><ellipse cx="32" cy="43" rx="23" ry="9" fill="#fff7eb"/>{[0,1,2,3].map(i=><path key={i} d="M0 0c-8-10-17 3-10 9s16-1 13-7C1 5-2 4 0 0" fill={i%2?'#88513d':'#ad6c49'} transform={`translate(${25+i%2*17} ${23+Math.floor(i/2)*12})`}/>)}</> : category === "Frutas" ? <><path d="M14 16c-2 26 18 37 37 22-22 4-28-7-27-21Z" fill="#edbd46"/><path d="m15 16 4-5m5 6 3-3" stroke="#69804b" strokeWidth="4" strokeLinecap="round"/></> : category === "Frango" ? <><path d="m35 36 9 10 5-1 4 4-4 5-4-4 1-4-10-9" fill="#fff7e5"/><path d="M16 17c10-8 25 0 27 11s-10 18-18 14S7 25 16 17" fill="#bd7b42"/><path d="M17 22c4-4 8-4 12-2" stroke="#e9ad64" strokeWidth="4" strokeLinecap="round"/></> : category === "Carnes" ? <><path d="M12 31c-2-12 18-19 30-12s16 22 2 27S15 45 12 31" fill="#b75c4e" stroke="#ffece1" strokeWidth="4"/><path d="M24 23c6 5 9 13 11 21M16 30l29 4" fill="none" stroke="#e4997c" strokeWidth="3" strokeLinecap="round"/></> : category === "Doces e pastas" ? <><path d="m21 35 11 21 11-21" fill="#cd995b"/><path d="M17 32c0-5 3-8 6-9-1-12 18-15 20-1 7 2 8 13 3 15H21c-3 0-4-2-4-5" fill="#fdf6ea"/><path d="M24 20c5-4 11-3 14 1" stroke="#d0a7b8" strokeWidth="4" strokeLinecap="round"/></> : <><path d="M16 22h32v27H16Z" fill="#86a28b"/><path d="M23 16h18v7H23" fill="#c0d3bd"/><path d="M24 34h16m-8-8v16" stroke="white" strokeWidth="3" strokeLinecap="round"/></>}
  </svg>;
}

export default function FoodPicker({ value, onChange, favorites, recent, onFavorite, catalog = foods, onCreate }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Todos');
  const trigger = useRef(null);
  const food = catalog.find(f => f.id === value);
  const results = searchFoods(query, category, favorites, recent, catalog);
  function select(id) { onChange(id); setOpen(false); trigger.current?.focus(); }
  return <div className="food-picker">
    <span className="field-label">{t("Alimento")}</span>
    <button ref={trigger} type="button" className="food-picker-trigger" aria-expanded={open} onClick={() => setOpen(!open)}><FoodArt food={food}/><span><b>{food?foodName(food):t("Outro alimento / rótulo")}</b><small>{food ? t("{0} kcal / 100 {1}",[(Math.round(food.kcal * 10) / 10).toLocaleString(getLocale()),amountUnit(food)]) : t("Informe os dados da embalagem")}</small></span><span aria-hidden="true">⌄</span></button>
    {open && <section className="food-search" aria-label={t("Buscar alimentos")} onKeyDown={e => { if(e.key==='Enter' && e.target.tagName==='INPUT') e.preventDefault(); if(e.key==='Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); trigger.current?.focus(); } }}>
      <label>{t("Buscar alimento")}<input autoFocus type="search" placeholder={t("Arroz, feijão, carne de panela…")} value={query} onChange={e=>setQuery(e.target.value)}/></label>
      <div className="food-filters" aria-label={t("Filtrar alimentos")}>{['Todos','Favoritos','Recentes',...categories].map(c=><button type="button" key={c} className={category===c?'selected':''} aria-pressed={category===c} onClick={()=>setCategory(c)}>{t(c)}</button>)}</div>
      <p className="local-note">{results.length}{t(" opções · ilustrações por categoria")}</p>
      <div className="food-results">{results.map(f=><article key={f.id} className={value===f.id?'chosen':''}><button type="button" className="food-result" onClick={()=>select(f.id)}><FoodArt food={f}/><span><b>{foodName(f)}</b><small>{(Math.round(f.kcal*10)/10).toLocaleString(getLocale())}{t(" kcal / 100 {0} · ",[amountUnit(f)])}{f.communityStatus?(f.communityStatus==='published'?t("Comunidade"):t("Meu alimento")):t("Referência local")}{f.slice&&t(' · ~{0} g/fatia',[f.slice.grams])}</small></span></button><button type="button" className="food-favorite" aria-label={`${favorites.includes(f.id)?t("Desfavoritar"):t("Favoritar")} ${foodName(f)}`} aria-pressed={favorites.includes(f.id)} onClick={()=>onFavorite(f.id)}>{favorites.includes(f.id)?'★':'☆'}</button></article>)}</div>
      {!results.length && <p className="empty-day">{category==="Recentes"?t("Os alimentos aparecem aqui depois de salvar o dia."):category==="Favoritos"?t("Toque na estrela de um alimento para favoritar."):t("Nenhum alimento encontrado. Experimente outro termo ou informe o rótulo.")}</p>}
      <button type="button" className="outline custom-food" onClick={()=>select('custom')}>{t("＋ Outro alimento / rótulo")}</button>
      {onCreate&&<button type="button" className="outline custom-food" onClick={()=>{setOpen(false);onCreate();}}>{t("Cadastrar e compartilhar um alimento")}</button>}
      <button type="button" className="close" onClick={()=>{setOpen(false);trigger.current?.focus();}}>{t("Fechar busca")}</button>
    </section>}
  </div>;
}
