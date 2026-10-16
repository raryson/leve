import React from 'react';
import {beverageServings} from './beverageServings.js';
import {portionCalories} from './domain.js';
import {t,getLocale} from './i18n.js';

export function GlassIcon({kind}){
  const shapes={
    americano:<><path d="m14 12 4 38h28l4-38Z"/><path d="m22 22 2 21m8-21v21m10-21-2 21M15 18h34"/></>,
    mug:<><path d="M12 14h31v32a6 6 0 0 1-6 6H18a6 6 0 0 1-6-6Z"/><path d="M43 20h5c13 0 13 21-5 21M18 20h19"/></>,
    cup:<><path d="M10 24h32v15a10 10 0 0 1-10 10H20a10 10 0 0 1-10-10Z"/><path d="M42 27h5c10 0 10 14-5 14M8 54h44M20 10v7m12-7v7"/></>,
    tall:<><path d="m17 8 3 46h24l3-46Z"/><path d="M19 24h26m-8 18 6-36"/></>,
    beer:<><path d="M12 18h30v33H12Z"/><path d="M42 24h7c10 0 10 21-7 21M20 28v16m13-16v16"/><path d="M12 18c-5-8 5-14 10-9 2-8 14-8 15 0 8-3 13 7 5 9"/></>,
    can:<><rect x="17" y="9" width="30" height="46" rx="5"/><path d="M18 16h28M18 48h28m-18-36h8M26 28h12v10H26Z"/></>,
    bottle:<><path d="M27 7h10v15l8 12v20H19V34l8-12Z"/><path d="M27 12h10M20 36h24v12H20"/></>,
    wine:<><path d="M20 8h24c7 21 4 28-12 28S13 29 20 8Z"/><path d="M18 22h28M32 36v19m-11 0h22"/></>,
    shot:<><path d="m17 20 4 33h22l4-33Z"/><path d="M19 30h26m-23 15h20"/></>,
    rocks:<><path d="m12 20 4 33h32l4-33Z"/><path d="M15 35h34m-28-9 8 3-3 8-8-3Zm14 13 8-3 3 8-8 3Z"/></>,
    flute:<><path d="M24 6h16v23c0 17-16 17-16 0Z"/><path d="M24 19h16M32 42v13m-10 0h20"/></>,
  };
  return <svg className="glass-icon" viewBox="0 0 64 64" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">{shapes[kind]||shapes.tall}</svg>;
}

export default function BeveragePortions({food,amount,onSelect}){
  const choices=beverageServings(food);
  if(!choices.length)return null;
  const fmt=value=>Number(value).toLocaleString(getLocale(),{maximumFractionDigits:1});
  return <fieldset className="beverage-portions"><legend>{t('Escolha o tamanho da bebida')}</legend><div className="beverage-portion-grid">{choices.map(choice=><button className="outline" type="button" key={choice.id} aria-pressed={Number(amount)===choice.ml} onClick={()=>onSelect(choice.ml)}><GlassIcon kind={choice.icon}/><strong>{t(choice.label)}</strong><span>{t('{0} ml · ~{1} kcal',[fmt(choice.ml),fmt(portionCalories(choice.ml,food.kcal))])}</span></button>)}</div><p className="form-note">{food.beverageKind==='cocktail'?t('Cada drink usa a receita de referência abaixo. O gelo e a capacidade do copo não aumentam a porção. Ajuste os ml se sua receita tiver outro rendimento.'):t('Atalhos para uma porção. Copos e canecas variam de tamanho; os ml são referências editáveis. Para várias porções ou um copo parcialmente cheio, ajuste o volume total acima.')}</p>{choices.some(choice=>choice.id==='americano')&&<p className="form-note"><a href="https://nadir.com.br/o-copo-oficial-do-brasileiro/" target="_blank" rel="noreferrer">{t('Copo americano tradicional: 190 ml (Nadir) ↗')}</a></p>}</fieldset>;
}
