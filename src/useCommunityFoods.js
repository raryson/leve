import { useCallback, useEffect, useRef, useState } from 'react';
import { asCatalogFood, validateCommunityFood } from './communityFood.js';

const PUBLIC_KEY='leve-community-public-v1';
const validRows=(rows,publicOnly=false)=>{
  if(!Array.isArray(rows))return [];
  return rows.slice(0,1000).flatMap(row=>{try{
    if(typeof row.id!=='string'||!/^[-a-f0-9]{36}$/i.test(row.id)||!['private','pending','published','rejected','hidden'].includes(row.status)||!Number.isSafeInteger(row.version)||(publicOnly&&row.status!=='published'))return [];
    return [{...row,food:validateCommunityFood(row.food)}];
  }catch{return [];}});
};
function cached(key,publicOnly=false){try{return validRows(JSON.parse(localStorage.getItem(key)||'[]'),publicOnly);}catch{return [];}}
export default function useCommunityFoods(account) {
  const privateKey=account?`leve-community-private-v1:${account.userId}`:null;
  const [data,setData]=useState(()=>({publicFoods:cached(PUBLIC_KEY,true),mine:privateKey?cached(privateKey):[],moderation:[],reports:[],moderator:false,nextOffset:null,moderationNextOffset:null}));
  const [error,setError]=useState(''),[loading,setLoading]=useState(false),[saving,setSaving]=useState(false);
  const auth=useRef(account);auth.current=account;
  const generation=useRef(0),sequence=useRef(0),pending=useRef(false),dataRef=useRef(data);dataRef.current=data;
  const request=useCallback(async(path,body)=>{
    const token=auth.current?await auth.current.getToken():null;
    if(auth.current&&!token)throw new Error('Entre novamente na conta para acessar seus alimentos.');
    const response=await fetch(path,{method:body?'POST':'GET',cache:'no-store',headers:{...(token?{Authorization:`Bearer ${token}`} : {}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(result.error||'O catálogo está indisponível agora.');
    return result;
  },[]);
  const refresh=useCallback(async(offset=0,moderationOffset=0)=>{
    const gen=generation.current,seq=++sequence.current;setLoading(true);
    try {
      const result=await request(`/api/foods?offset=${offset}&moderationOffset=${moderationOffset}`);
      if(gen!==generation.current||seq!==sequence.current)return;
      const pub=validRows(result.publicFoods,true),mine=validRows(result.mine);
      const merged=offset?[...new Map([...dataRef.current.publicFoods,...pub].map(f=>[f.id,f])).values()]:pub;
      try{localStorage.setItem(PUBLIC_KEY,JSON.stringify(merged));if(privateKey)localStorage.setItem(privateKey,JSON.stringify(mine));}catch{/* Network results still work when cache storage is full. */}
      setData({...result,publicFoods:merged,mine,moderation:validRows(result.moderation),reports:Array.isArray(result.reports)?result.reports:[]});
      setError('');
    }catch(e){if(gen===generation.current&&seq===sequence.current)setError(e.message||'Sem conexão com o catálogo. A lista salva continua disponível.');}
    finally{if(gen===generation.current&&seq===sequence.current)setLoading(false);}
  },[request,privateKey]);
  useEffect(()=>{
    generation.current++;
    setData({publicFoods:cached(PUBLIC_KEY,true),mine:privateKey?cached(privateKey):[],moderation:[],reports:[],moderator:false,nextOffset:null,moderationNextOffset:null});
    refresh();const update=()=>refresh();const timer=setInterval(update,60000);
    window.addEventListener('online',update);window.addEventListener('focus',update);
    return ()=>{generation.current++;clearInterval(timer);window.removeEventListener('online',update);window.removeEventListener('focus',update);};
  },[refresh,privateKey]);
  const mutate=async body=>{
    if(!auth.current)throw new Error('Entre na conta para cadastrar ou compartilhar.');
    if(pending.current)throw new Error('Aguarde o envio atual terminar.');
    const gen=generation.current;pending.current=true;setSaving(true);
    try {
      const result=await request('/api/foods',body);
      if(gen!==generation.current)throw new Error('A conta mudou. Atualize a lista para conferir o envio.');
      if(result.item&&['create','update','cancel'].includes(body.action)){
        const mine=[result.item,...dataRef.current.mine.filter(f=>f.id!==result.item.id)];
        try{if(privateKey)localStorage.setItem(privateKey,JSON.stringify(mine));}catch{/* Confirmed server data remains usable even when local storage is full. */}
        setData(previous=>({...previous,mine}));
      }
      await refresh();return result;
    }finally{pending.current=false;if(gen===generation.current)setSaving(false);}
  };
  const catalog=[...new Map([...data.publicFoods,...data.mine.filter(f=>f.status!=='hidden')].map(row=>[row.id,asCatalogFood(row)])).values()];
  return {...data,catalog,error,loading,saving,refresh,mutate};
}
