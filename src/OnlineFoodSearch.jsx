import React,{useEffect,useRef,useState} from 'react';
import {t,getLocale} from './i18n.js';
import {foodSearchQuery,normalizeExternalFoods,normalizeExternalFood,suggestedFoodQuery,OFF_LICENSE} from './externalFoods.js';

export default function OnlineFoodSearch({description,onUse,onImport}){
  const [query,setQuery]=useState(()=>suggestedFoodQuery(description)),[results,setResults]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const controller=useRef(null),sequence=useRef(0);
  useEffect(()=>()=>{sequence.current++;controller.current?.abort();},[]);
  async function search(){
    const current=++sequence.current;controller.current?.abort();const abort=new AbortController();controller.current=abort;setError('');setResults(null);
    try{const q=foodSearchQuery(query);setBusy(true);const response=await fetch('/api/food-search?q='+encodeURIComponent(q),{signal:abort.signal});const data=await response.json();if(!response.ok)throw Error(data.error);if(current===sequence.current)setResults(normalizeExternalFoods(data.foods));}
    catch(e){if(current===sequence.current&&!abort.signal.aborted)setError(e.message||'A busca online está indisponível agora. O catálogo local continua disponível.');}
    finally{if(current===sequence.current)setBusy(false);}
  }
  return <details className="online-food-search"><summary>{t('Não achei no catálogo · buscar na internet')}</summary><p>{t('Buscamos rótulos no Open Food Facts. Só o termo abaixo é enviado; teu relato e perfil ficam no app. Confira marca, preparo e unidade antes de usar.')}</p><label>{t('Alimento ou marca para pesquisar')}<input maxLength={70} value={query} onChange={e=>{sequence.current++;controller.current?.abort();setBusy(false);setQuery(e.target.value);setResults(null);setError('');}}/></label><button type="button" className="outline" disabled={busy||query.trim().length<2} onClick={()=>void search()}>{busy?t('Buscando referência…'):t('Buscar na internet')}</button>
    {results&&<><p className="local-note">{t('Produtos como vendidos; receitas caseiras e alimentos preparados podem não ter equivalente. Resultados com dados ausentes ou inconsistentes foram excluídos.')}</p>{!results.length&&<p role="status">{t('Nenhuma referência utilizável. Tente a marca ou um nome mais simples; o cadastro por rótulo continua disponível na aba Manual.')}</p>}{results.map(food=><article key={food.id} className="online-food-result"><strong>{food.name}</strong><span>{t('{0} kcal por 100 {1}',[food.kcal.toLocaleString(getLocale()),food.unit])}</span><a href={food.sourceUrl} target="_blank" rel="noreferrer">{t('Conferir fonte ↗')}</a><button type="button" className="outline" onClick={()=>{try{const reference=normalizeExternalFood({...food,searchAliases:[foodSearchQuery(query)]});if(onImport?.(reference)===false)throw Error('Não foi possível guardar a referência. Tente novamente antes de usar.');onUse(reference);}catch(e){setError(e.message);}}}>{onImport?t('Usar referência e guardar no meu catálogo'):t('Usar referência nesta refeição')}</button></article>)}<small><a href="https://world.openfoodfacts.org/" target="_blank" rel="noreferrer">Open Food Facts</a> · <a href={OFF_LICENSE} target="_blank" rel="noreferrer">ODbL</a> · {t('Dados colaborativos, sujeitos a erros. Nada é publicado na comunidade automaticamente.')}</small></>}
    {error&&<p role="alert" className="error-box">{t(error)}</p>}
  </details>;
}
