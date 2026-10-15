import React,{useEffect,useRef,useState} from 'react';
import {t} from './i18n.js';

export default function QuickAdd({Icon,onSelect}) {
  const [open,setOpen]=useState(false);
  const root=useRef(null),trigger=useRef(null);
  useEffect(()=>{
    if(!open)return;
    const outside=e=>{if(!root.current?.contains(e.target))setOpen(false);};
    const escape=e=>{if(e.key==='Escape'){setOpen(false);trigger.current?.focus();}};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape);};
  },[open]);
  return <div ref={root} className={`quick-add ${open?'is-open':''}`}>
    <button ref={trigger} type="button" className="quick-add-trigger" aria-label={t(open?'Fechar opções de registro':'Adicionar registro')} aria-expanded={open} aria-controls={open?'quick-add-options':undefined} onClick={()=>setOpen(value=>!value)}><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button>
    {open&&<div id="quick-add-options" className="quick-add-options" role="group" aria-label={t('O que vamos registrar?')}>
      {[['weight','trend','Peso'],['water','water','Água'],['workout','move','Treino'],['meal','food','Refeição']].map(([type,icon,label],index)=><button key={type} type="button" style={{'--action-index':index}} onClick={()=>{setOpen(false);onSelect(type);}}><span className="quick-add-label">{t(label)}</span><span className="quick-add-icon"><Icon name={icon}/></span></button>)}
    </div>}

  </div>;
}
