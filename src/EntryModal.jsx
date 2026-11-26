import React,{useEffect,useRef,useState} from 'react';
import {t} from './i18n.js';
import {numeric,validDate} from './domain.js';

const titles={workout:'Registrar treino',water:'Registrar água',weight:'Registrar peso'};
export default function EntryModal({mode,today,initialDate=today,Modal,ExerciseForm,library,onSave,close}){
  const [date,setDate]=useState(initialDate),[amount,setAmount]=useState('250'),[weight,setWeight]=useState('');
  const [formDirty,setFormDirty]=useState(false),[contextDirty,setContextDirty]=useState(false),[error,setError]=useState(''),[confirmClose,setConfirmClose]=useState(false);
  const dirty=formDirty||contextDirty;
  const prompt=useRef(null);
  useEffect(()=>{if(confirmClose)prompt.current?.querySelector('button')?.focus();},[confirmClose]);
  function save(values){try{validDate(date);if(date>today)throw Error('Escolha uma data até hoje.');if(mode==='water')numeric(values.amount,1,10000,'Água');if(mode==='weight')numeric(values.value,20,500,'Pesagem');const saved=onSave({type:mode,id:crypto.randomUUID(),date,...values});if(!saved)setError('Não foi possível salvar no navegador. Seus dados continuam nesta janela.');return saved;}catch(e){setError(e.message);return false;}}
  return <Modal title={t(titles[mode])} close={()=>dirty?setConfirmClose(true):close()}>
    <p className="modal-copy">{t(mode==='workout'?'Registre uma atividade. Alimentação e água ficam nos seus próprios registros.':mode==='water'?'Informe a água que você bebeu agora. O volume será somado ao dia.':'Adicione uma pesagem sem alterar suas refeições ou treinos.')}</p>
    <div className="entry-context"><label>{t('Data do registro')}<input required type="date" max={today} value={date} onChange={e=>{setDate(e.target.value);setContextDirty(true);}}/></label></div>
    {mode==='workout'&&<ExerciseForm profile={library.profile} onDirty={setFormDirty} submitLabel="Salvar treino" onAdd={activity=>save({activity})}/>}
    {(mode==='water'||mode==='weight')&&<form className="entry-form" onSubmit={e=>{e.preventDefault();save(mode==='water'?{amount}:{value:weight});}}><label>{t(mode==='water'?'Água consumida (ml)':'Peso (kg)')}<input required type="number" min={mode==='water'?1:20} max={mode==='water'?10000:500} step={mode==='water'?1:0.1} value={mode==='water'?amount:weight} onChange={e=>{mode==='water'?setAmount(e.target.value):setWeight(e.target.value);setFormDirty(true);}}/></label><button className="primary">{t(mode==='water'?'Salvar água':'Salvar pesagem')}</button></form>}
    {error&&<p className="error-box" role="alert">{t(error)}</p>}
    {confirmClose&&<div ref={prompt} className="error-box" role="alert"><p>{t('Descartar este registro não salvo?')}</p><div className="account-actions"><button type="button" className="outline" onClick={()=>setConfirmClose(false)}>{t('Continuar editando')}</button><button type="button" className="outline" onClick={close}>{t('Descartar e fechar')}</button></div></div>}
  </Modal>;
}
