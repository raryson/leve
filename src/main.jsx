import BeveragePortions from './BeveragePortions.jsx';
import { t, getLocale } from './i18n.js';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import InstallBanner from './InstallBanner.jsx';
import PrivacyControls from './PrivacyControls.jsx';
import VoiceMeal from './VoiceMeal.jsx';
import CommunityFoods from './CommunityFoods.jsx';
import useCommunityFoods from './useCommunityFoods.js';
import FoodPicker from './FoodPicker.jsx';
import EnergyPanel from './EnergyPanel.jsx';
import {routineLevels,exerciseReferences,workoutEstimate,createWorkout} from './energy.js';
import QuickAdd from './QuickAdd.jsx';
import EntryModal from './EntryModal.jsx';
import {applyEntry} from './entries.js';
import SavedMeals, { SaveMealButton } from './SavedMeals.jsx';
import { trackRecentFoods } from './foodLibrary.js';
import { AccountRoot, SyncPanel } from './Account.jsx';
import useJournal from './useJournal.js';
import { accountKey } from './cloud.js';
import { KEY, localDate, normalizeProfile, normalizeState, normalizeDay, newDay, upsertDay, portionCalories, parseDay, trainingDays, numeric, appendFood, appendActivity, normalizeSavedMeal, useSavedMeal, amountUnit, sliceGrams } from './domain.js';
import { foods, FOOD_SOURCE } from './foods.js';
import LanguageSwitcher from './LanguageSwitcher.jsx';
import {foodNote,itemName,itemQuantity} from './foodLabels.js';
import './styles.css';

const fmt = n => Number(n).toLocaleString(getLocale(), { maximumFractionDigits: 1 });
const dateLabel = date => date ? new Date(`${date}T12:00:00`).toLocaleDateString(getLocale()) : t('Registro antigo · sem data');
const id = () => crypto.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
function download(data, name) {
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function App({ account, accountControls }) {
  const [tab, setTab] = useState('home');
  const [catalogPageDirty,setCatalogPageDirty]=useState(false);
  const [navigationTarget,setNavigationTarget]=useState(null);
  function navigate(next){if(next===tab)return;if(catalogPageDirty){setNavigationTarget(next);return;}setTab(next);}
  useEffect(()=>{window.scrollTo(0,0);},[tab]);
  const community = useCommunityFoods(account);
  const catalog = [...foods,...community.catalog];
  const [editor, setEditor] = useState(null);
  const [entry,setEntry]=useState(null);
  const [entryDate,setEntryDate]=useState(localDate);
  function openEntry(mode,date=localDate()){setEntryDate(date);setEntry(mode);}
  const [importing, setImporting] = useState(false);
  const journal = useJournal(account, Boolean(editor || entry || importing));
  const { state: s, loaded, loadError, error: storageError, commit } = journal;
  const [toast, setToast] = useState('');
  const [today, setToday] = useState(localDate);
  const [recoveryError, setRecoveryError] = useState('');
  useEffect(() => {
    const update = () => setToday(localDate());
    const timer = setInterval(update, 30000);
    window.addEventListener('focus', update);
    if (import.meta.env.PROD) navigator.serviceWorker?.register('/sw.js').catch(() => {});
    return () => { clearInterval(timer); window.removeEventListener('focus', update); };
  }, []);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 4000); return () => clearTimeout(timer); }, [toast]);
  function restore(data) {
    const next = normalizeState(data);
    if ((s.profile || loadError) && !window.confirm(account?t("Substituir o diário desta conta pelo backup e sincronizar a alteração? Exporte os dados atuais antes, se precisar."):t("Substituir os dados deste dispositivo pelo backup? Exporte os dados atuais antes, se precisar."))) return;
    if (commit(next)) setToast('Backup restaurado.');
  }
  function saveMeal(name,items) {
      if(items.some(i=>i.unit==='ml'?(i.milliliters==null||i.milliliters===''||i.kcalPer100Ml==null||i.kcalPer100Ml===''):(i.grams==null || i.grams==='' || i.kcalPer100==null || i.kcalPer100===''))) throw new Error('Para salvar uma combinação, todos os itens precisam de quantidade e referência calórica na unidade correta. Registros antigos sem esses dados precisam ser cadastrados novamente.');
      const existing=s.savedMeals.find(m=>m.name.toLocaleLowerCase('pt-BR')===name.trim().toLocaleLowerCase('pt-BR'));
      const template=normalizeSavedMeal({id:existing?.id || id(),name,items});
      if(existing && !window.confirm(t("Atualizar a combinação “{0}”? Os dias já registrados não serão alterados.",[existing.name]))) return false;
      if(!commit(x=>({...x,savedMeals:[...x.savedMeals.filter(m=>m.id!==template.id),template]}))) throw new Error('Não foi possível salvar a combinação. Confira o aviso de armazenamento.');
      setToast('Combinação salva em Minhas refeições.');return true;
    }
  const backup = () => download(JSON.stringify(s, null, 2), `leve-backup-${today}.json`);
  const syncPanel = <SyncPanel account={account} journal={journal} onExport={backup}/>;
  if (!journal.ready && !loadError) return <><div className="onboard-account">{accountControls}</div>{syncPanel}<div className="onboarding"><section className="onboard-card"><h1>{t("Buscando seu diário")}</h1><p>{t("Estamos verificando se esta conta já tem registros. Sua cópia local permanece neste dispositivo.")}</p>{journal.sync.phase === 'error' && <p role="alert">{t(journal.sync.message)}</p>}<button className="outline" onClick={journal.synchronize}>{t("Tentar novamente")}</button></section></div></>;
  if (loadError) return <><div className="onboard-account">{accountControls}</div>{syncPanel}<div className="onboarding"><section className="onboard-card"><h1>{t("Vamos proteger seus registros.")}</h1><p role="alert">{t(loadError)}</p><p>{t("A cópia original continua no navegador. Exporte-a antes de tentar recuperar os dados.")}</p><button className="primary" onClick={() => download(loaded.raw || '', 'leve-recuperacao.json')}>{t("Exportar cópia original")}</button><BackupInput onImport={restore}/><button className="outline" onClick={() => { try { const previous = localStorage.getItem(`${account ? accountKey(account.userId) : KEY}-previous`); if (!previous) throw new Error('Não há cópia anterior.'); const parsed = JSON.parse(previous); restore(account ? parsed.state : parsed); } catch (e) { setRecoveryError(e.message); } }}>{t("Recuperar cópia anterior")}</button>{(storageError || recoveryError) && <p role="alert">{t(storageError || recoveryError)}</p>}</section></div></>;
  if (!s.profile) return <><div className="onboard-account">{accountControls}</div>{syncPanel}<div className="onboarding"><section className="onboard-card"><div className="onboard-brand"><img src="/icon.svg" alt=""/>{t(" leve")}</div><small>{t("SEU PRIMEIRO PASSO")}</small><h1>{t("Bora cuidar")}<br/>{t("da sua rotina?")}</h1><p>{t("Alimentação, água e movimento. Um registro de cada vez, no seu ritmo.")}</p><ProfileForm onSave={p => commit({ ...s, profile: p, weights: [{ id: id(), date: today, value: p.weight }] })}/><BackupInput onImport={restore}/><p className="local-note">{t("Seus registros são salvos aqui. Entre na conta para sincronizar entre dispositivos.")}</p>{(storageError || recoveryError) && <p role="alert">{t(storageError || recoveryError)}</p>}</section></div></>;
  const day = s.days.find(d => d.date === today) || newDay(today);
  const nav = [['home', 'home', 'Hoje'], ['days', 'history', 'Histórico'], ['evo', 'trend', 'Meu peso'], ['foods', 'food', 'Alimentos'], ['profile', 'user', 'Perfil']];
  const syncLabel = !account ? 'Salvo neste dispositivo' : journal.sync.phase === 'synced' ? 'Salvo na sua conta' : journal.sync.phase === 'syncing' ? 'Sincronizando…' : journal.sync.phase === 'error' ? 'Revisar sincronização' : journal.sync.phase === 'conflict' ? 'Revisar conflito' : 'Sincronização pendente';
  return <div className="shell">
    <aside><a className="brand" href="#" onClick={e => { e.preventDefault(); navigate('home'); }}><img className="brand-mark" src="/icon.svg" alt=""/>{t(" leve")}<span className="brand-dot">.</span></a><p className="sidebar-caption">{t("Um pouco melhor, todo dia.")}</p><nav aria-label={t("Navegação principal")}>{nav.map(([key, icon, label]) => <button key={key} className={tab === key ? 'active' : ''} aria-current={tab === key ? 'page' : undefined} onClick={() => navigate(key)}><Icon name={icon}/><span>{t(label)}</span></button>)}</nav><div className="sidebar-note"><span>✳</span><b>{t("Feito é melhor que perfeito.")}</b><p>{t("Um copo d’água, uma caminhada, uma refeição registrada. Tudo conta.")}</p></div><footer><span className="avatar">{s.profile.name.slice(0, 1).toUpperCase()}</span><div><b>{s.profile.name}</b><small>{t("Sua rotina no Leve")}</small></div></footer></aside>
    <main><header><div><p className="eyebrow">{dateLabel(today)}</p><h2>{tab === 'home' ? t("Oi, {0}!",[s.profile.name]) : t(nav.find(n => n[0] === tab)[2])}</h2></div><div className="header-account"><button className={`sync-status ${account && ['error', 'conflict'].includes(journal.sync.phase) ? 'needs-attention' : ''}`} onClick={() => navigate('profile')}><span/>{t(syncLabel)}</button>{accountControls}</div></header>
      {account && ['error', 'conflict'].includes(journal.sync.phase) && tab !== 'profile' && syncPanel}
      {storageError && <div className="error-box" role="alert">{t(storageError)}<button className="outline" onClick={backup}>{t("Exportar backup")}</button></div>}
      <InstallBanner mode={tab==='home'?'notice':'hidden'}/>{tab!=='profile'&&<PrivacyControls settings={false} screen={tab}/>}
      {tab === 'home' && <Home s={s} day={day} today={today} onMeal={()=>openEntry('meal')} onWorkout={()=>openEntry('workout')} onEdit={() => setEditor(today)} onWeight={() => openEntry('weight')} onWater={delta => { if (commit(x => { const d = x.days.find(d => d.date === today) || newDay(today); return upsertDay(x, { ...d, waterMl: Math.max(0, d.waterMl + delta) }); })) setToast('Água atualizada.'); }}/>}
      {tab === 'days' && <History s={s} today={today} onAdd={date=>openEntry('meal',date)} onEdit={setEditor} onImport={() => setImporting(true)} onDelete={date => { if (window.confirm(t("Excluir o registro de {0}?",[dateLabel(date)]))) commit(x => ({ ...x, days: x.days.filter(d => d.date !== date) })); }}/>}
      {tab === 'evo' && <Evolution s={s} today={today} onSave={(value, date) => { let saved = false; saved = commit(x => { const records = [...x.weights, { id: id(), date, value }].sort((a, b) => (a.date || '').localeCompare(b.date || '')); return { ...x, weights: records, profile: { ...x.profile, weight: records.at(-1).value } }; }); if (saved) setToast('Pesagem salva.'); return saved; }}/>}
      {tab === 'foods' && <CommunityFoods account={account} community={community} onDirty={setCatalogPageDirty}/>}
      {tab === 'profile' && <div className="settings-stack"><div className="intro"><div><small>{t("SEU PERFIL")}</small><h3>{t("Do seu jeito.")}</h3><p>{t("Ajuste suas referências e proteja seus registros.")}</p></div></div>{syncPanel}<section className="language-settings" aria-labelledby="language-settings-title"><div><h3 id="language-settings-title">{t('Idioma / Language')}</h3><p>{t('Escolha o idioma do app neste dispositivo.')}</p></div><LanguageSwitcher/></section><section className="formbox"><ProfileForm key={JSON.stringify(s.profile)} initial={s.profile} onSave={p => { if (commit(x => ({ ...x, profile: p }))) setToast('Perfil salvo.'); }}/></section><InstallBanner mode="help"/><PrivacyControls settings screen={tab}/><section className="data-transfer"><h3>{t("Seus dados com você")}</h3><p>{t("Use o backup para guardar uma cópia. Com login, o diário sincroniza por conta; conflitos pedem sua revisão.")}</p><button className="primary" onClick={backup}>{t("Exportar backup")}</button><BackupInput onImport={restore}/></section></div>}
    </main>
    <QuickAdd Icon={Icon} onSelect={openEntry}/>
    {entry&&<EntryModal key={entry} mode={entry} today={today} initialDate={entryDate} library={s} catalog={catalog} Modal={Modal} FoodForm={FoodForm} ExerciseForm={ExerciseForm} onFavorite={foodId=>commit(x=>({...x,favoriteFoods:x.favoriteFoods.includes(foodId)?x.favoriteFoods.filter(id=>id!==foodId):[...x.favoriteFoods,foodId]}))} onSaveMeal={saveMeal} close={()=>setEntry(null)} onSave={payload=>{const saved=commit(x=>{const next=applyEntry(x,payload);return payload.type==='meal'?{...next,recentFoods:trackRecentFoods(next,next.days.find(d=>d.date===payload.date)||newDay(payload.date))}:next;});if(saved){setEntry(null);setToast('Registro salvo.');}return saved;}}/>}
    {editor && <DayEditor key={editor} account={account} community={community} catalog={catalog} library={s} onFavorite={foodId => commit(x => ({...x, favoriteFoods: x.favoriteFoods.includes(foodId) ? x.favoriteFoods.filter(id=>id!==foodId) : [...x.favoriteFoods,foodId]}))} onSaveMeal={saveMeal} onDeleteMeal={meal=>{if(window.confirm(t("Excluir a combinação “{0}”? Os dias já registrados serão preservados.",[meal.name]))) commit(x=>({...x,savedMeals:x.savedMeals.filter(m=>m.id!==meal.id)}));}} day={s.days.find(d => d.date === editor) || newDay(editor)} close={() => setEditor(null)} onSave={d => { const saved = commit(x => ({...upsertDay(x, d),recentFoods:trackRecentFoods(x,d)})); if (saved) { setEditor(null); setToast('Dia salvo.'); } return saved; }}/>}
    {importing && <ImportDay close={() => setImporting(false)} onImport={d => { const existing = s.days.find(x => x.date === d.date); if (existing && !window.confirm(t("Este dia já existe. Substituir refeições e exercícios? Água registrada será preservada."))) return; if (commit(x => upsertDay(x, { ...d, waterMl: existing?.waterMl ?? d.waterMl }))) { setImporting(false); setToast('Dia importado e totais recalculados.'); } }}/>}
    {navigationTarget&&<Modal title={t("Cadastro não salvo")} close={()=>setNavigationTarget(null)}><p>{t("Este alimento ainda não foi salvo. Continue editando ou descarte o preenchimento para trocar de aba.")}</p><div className="account-actions"><button type="button" className="primary" onClick={()=>setNavigationTarget(null)}>{t("Continuar editando")}</button><button type="button" className="outline" onClick={()=>{setCatalogPageDirty(false);setTab(navigationTarget);setNavigationTarget(null);}}>{t("Descartar e trocar de aba")}</button></div></Modal>}
    {toast && <div className="toast" role="status">{t(toast)}</div>}
  </div>;
}

function ProfileForm({ initial, onSave }) {
  const [p, setP] = useState(initial || { name: '', age: '', height: '', weight: '', sex: 'female', waterGoal: 2000, weeklyWorkouts: 3, calorieGoal: '' });
  const [error, setError] = useState('');
  const input = (key, label, min, max, step = 1) => <label>{t(label)}<input required={key !== 'calorieGoal'} type="number" min={min} max={max} step={step} value={p[key] ?? ''} onChange={e => setP({ ...p, [key]: e.target.value })}/></label>;
  return <form className="form" onSubmit={e => { e.preventDefault(); try { onSave(normalizeProfile(p)); setError(''); } catch (e) { setError(e.message); } }}>
    <label>{t("Como podemos te chamar?")}<input required maxLength={80} value={p.name} onChange={e => setP({ ...p, name: e.target.value })}/></label>
    {input('age', t("Idade (adultos)"), 18, 120)}{input('height', t("Altura (cm)"), 80, 250, 0.1)}
    {initial ? <label>{t("Peso atual")}<output>{fmt(initial.weight)}{t(" kg")}</output><small>{t("Atualize em Evolução.")}</small></label> : input('weight', t("Peso inicial (kg)"), 20, 500, 0.1)}
    <label>{t("Sexo usado na fórmula de repouso")}<select value={p.sex} onChange={e => setP({ ...p, sex: e.target.value })}><option value="female">{t("Feminino")}</option><option value="male">{t("Masculino")}</option></select></label>
    <label>{t('Movimento fora dos treinos')}<select aria-label={t('Movimento fora dos treinos')} value={p.activityFactor??1.4} onChange={e=>setP({...p,activityFactor:Number(e.target.value)})}>{routineLevels.map(level=><option key={level.factor} value={level.factor}>{t(level.label)}</option>)}</select></label>
    {input('waterGoal', t("Objetivo pessoal de água (ml)"), 250, 10000, 50)}{input('weeklyWorkouts', t("Dias de treino por semana"), 1, 7)}{input('calorieGoal', t("Referência de kcal (opcional)"), 1, 10000)}
    <p className="form-note">{t("Objetivos pessoais ajustáveis, sem prescrição automática de dieta. A referência de calorias pode ser definida com seu nutricionista.")}</p>
    {error && <p className="form-note error-box" role="alert">{t(error)}</p>}<button className="primary">{initial ? t("Salvar perfil") : t("Criar meu perfil →")}</button>
  </form>;
}

function Home({ s, day, today, onEdit, onMeal, onWorkout, onWeight, onWater }) {
  const workouts = trainingDays(s.days, today);
  const change = s.profile.weight - s.weights[0].value;
  return <>
    <EnergyPanel profile={s.profile} day={day} Modal={Modal}/>
    <div className="daily-heading"><div><span className="eyebrow">{t("SEU DIA EM UM LUGAR")}</span><h3>{t("Bora fazer hoje valer.")}</h3><p>{t("Comida, água e movimento. No seu ritmo.")}</p></div><button className="primary" onClick={onMeal}>{t("＋ Registrar refeição")}</button></div>
    <div className="dashboard-metrics">
      <article className="metric calorie-metric"><div className="metric-label"><span className="metric-icon"><Icon name="food"/></span>{t("Calorias de hoje")}</div><b className="big">{fmt(day.totalCalories)} <i>kcal</i></b>{s.profile.calorieGoal ? <><Progress value={day.totalCalories} max={s.profile.calorieGoal}/><p>{t("Referência: ")}{fmt(s.profile.calorieGoal)}{t(" kcal")}</p></> : <p>{t("Seu total de alimentos registrados")}</p>}<button className="link" onClick={onMeal}>{t("Adicionar alimento →")}</button></article>
      <article className="metric water-metric"><div className="metric-label"><span className="metric-icon"><Icon name="water"/></span>{t("Água de hoje")}</div><b className="big">{fmt(day.waterMl)} <i>ml</i></b><Progress value={day.waterMl} max={s.profile.waterGoal}/><p>{t("Objetivo pessoal: ")}{fmt(s.profile.waterGoal)}{t(" ml")}</p><div className="water-actions"><button className="outline" disabled={!day.waterMl} aria-label={t("Remover 250 ml de água")} onClick={() => onWater(-250)}>−</button><button className="primary" onClick={() => onWater(250)}>{t("+ 250 ml")}</button><button className="outline" onClick={() => onWater(500)}>{t("+ 500 ml")}</button></div></article>
      <article className="metric weight-metric"><div className="metric-label"><span className="metric-icon"><Icon name="trend"/></span>{t("Meu peso")}</div><b className="big">{fmt(s.profile.weight)} <i>kg</i></b><p>{change > 0 ? '+' : ''}{fmt(change)}{t(" kg desde o primeiro registro")}</p><button className="link" onClick={onWeight}>{t("Registrar pesagem →")}</button></article>
    </div>
    <section className={`movement-card ${day.exercise.performed ? 'done' : ''}`}><div className="movement-title"><span className="metric-icon"><Icon name="move"/></span><div><span className="eyebrow">{t("MOVIMENTO NA SEMANA")}</span><h3>{day.exercise.performed ? t("Boa! Você se movimentou hoje.") : t("Seu próximo treino começa com um passo.")}</h3><p>{day.exercise.activities.map(activityLabel).join(' / ') || t("Academia ou caminhada: escolha o que cabe no seu dia.")}</p></div></div><div className="workout-progress"><b>{workouts}<span> / {s.profile.weeklyWorkouts}{t(" dias")}</span></b><div className="workout-dots" aria-label={t("{0} de {1} dias de treino na semana",[workouts,s.profile.weeklyWorkouts])}>{Array.from({length:s.profile.weeklyWorkouts}, (_, i) => <span key={i} className={i < workouts ? 'completed' : ''}/>)}</div><small>{workouts >= s.profile.weeklyWorkouts ? t("Objetivo da semana alcançado!") : t("Um dia de cada vez.")}</small></div><button className="outline" onClick={onWorkout}>{t("Registrar treino")}</button></section>
    <div className="head"><div><span className="eyebrow">{t("NO SEU PRATO")}</span><h3>{t("Refeições de hoje")}</h3></div><button className="outline" onClick={onEdit}>{t("Editar dia")}</button></div><DayCard day={day}/>

  </>;
}
function Icon({ name }) {
  const paths = {
    home: 'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
    history: 'M8 3v4m8-4v4M3 10h18M5 5h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2m2 10h3m4 0h3',
    trend: 'M3 17 9 11l4 4 8-10m-6 0h6v6',
    user: 'M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0M4 21v-2a8 8 0 0 1 16 0v2',
    water: 'M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12Z',
    food: 'M4 3v6m3-6v6m3-6v6M4 7h6M7 9v12M20 3c-4 0-5 7-2 9h2m0-9v18',
    move: 'M3 8v8m3-11v14m12-14v14m3-11v8M6 12h12',
  };
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]}/></svg>;
}
function Progress({ value, max }) { return <div className="bar" role="progressbar" aria-label={t("Progresso registrado")} aria-valuenow={Math.min(value, max)} aria-valuemin={0} aria-valuemax={max}><span style={{ width: `${Math.min(100, value / max * 100)}%` }}/></div>; }
function activityLabel(a){return [t('{0} · {1} min',[t(a.type),a.durationMinutes]),a.energyEstimate?t(' · ~{0} kcal durante o treino',[fmt(a.energyEstimate.gross)]):''].join('');}
function DayCard({ day }) { return <div className="list">
  {day.meals.length ? day.meals.map((m, i) => <div className="meal" key={i}><div><b>{t(m.name)}{m.time&&<span className="meal-time"> · {m.time}</span>}</b>{m.items.map((item, j) => <small key={j}>{itemName(item)} · {itemQuantity(item) || t("Quantidade não informada")} · {fmt(item.calories)}{t(" kcal")}</small>)}</div><strong>{fmt(m.calories)} <i>kcal</i></strong></div>) : <p className="empty-day">{t("Nenhuma refeição registrada para este dia.")}</p>}
  {day.exercise.performed && <div className="exercise-row"><div><b>{t("Movimento")}</b><small>{day.exercise.activities.map(activityLabel).join(' / ') || t("Atividade registrada em importação")}</small></div><strong>{day.exercise.totalCaloriesBurned ? t("{0} kcal estimadas",[fmt(day.exercise.totalCaloriesBurned)]) : t("Sem estimativa de gasto")}</strong></div>}
  <div className="day-total"><b>{t("Total registrado")}</b><strong>{fmt(day.totalCalories)}{t(" kcal")}</strong><small>{t("Água: ")}{fmt(day.waterMl)}{t(" ml")}{day.exercise.totalCaloriesBurned > 0 ? t(" · Ingestão − exercício estimado: {0} kcal (não é o déficit diário)",[fmt(day.netCalories)]) : ''}</small></div>{day.notes && <p className="detail-notes day-notes">{day.notes}</p>}
</div>; }

function History({ s, today, onAdd, onEdit, onImport, onDelete }) {
  const [query, setQuery] = useState('');
  const [date, setDate] = useState(today);
  const [selected, setSelected] = useState(null);
  const days = [...s.days].reverse().filter(d => `${d.date} ${dateLabel(d.date)} ${d.notes} ${d.meals.map(m => `${m.name} ${t(m.name)} ${m.items.map(i => `${i.food} ${itemName(i)}`).join(' ')}`).join(' ')}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
  return <><div className="intro"><div><small>{t("SEU DIÁRIO")}</small><h3>{t("Seu diário, dia a dia.")}</h3><p>{t("Veja suas refeições, água e movimento em cada dia.")}</p></div><form className="new-date" onSubmit={e => { e.preventDefault(); onAdd(date); }}><label>{t("Data do registro")}<input required type="date" max={today} value={date} onInput={e => setDate(e.currentTarget.value)} onChange={e => setDate(e.target.value)}/></label><button className="primary">{t("＋ Registrar refeição")}</button></form></div><div className="history-tools"><label>{t("Buscar no histórico")}<input type="search" placeholder={t("Data, alimento ou anotação")} value={query} onChange={e => setQuery(e.target.value)}/></label><button className="outline" onClick={onImport}>{t("Importar dia em JSON")}</button></div><p className="local-note">{days.length}{t(" dia(s) encontrado(s)")}</p><div className="day-list">{days.map(d => <article key={d.date}><button className="day-open" onClick={() => setSelected(d.date)}><small>{dateLabel(d.date)}</small><h4>{d.meals.length}{t(" refeições · ")}{fmt(d.totalCalories)}{t(" kcal")}</h4><p>{fmt(d.waterMl)}{t(" ml de água · ")}{d.exercise.performed ? t("Treino registrado") : t("Sem treino")}</p></button><div className="row-actions"><button className="outline" onClick={() => onEdit(d.date)}>{t("Editar")}</button><button className="outline danger" aria-label={t("Excluir dia {0}",[dateLabel(d.date)])} onClick={() => onDelete(d.date)}>{t("Excluir")}</button></div></article>)}</div>{!days.length && <p className="empty-day">{s.days.length ? t("Nenhum registro corresponde à busca.") : t("Seu histórico começa com o primeiro registro.")}</p>}{selected && s.days.find(d => d.date === selected) && <Modal title={dateLabel(selected)} close={() => setSelected(null)}><DayCard day={s.days.find(d => d.date === selected)}/></Modal>}</>;
}

function Modal({ title, close, children }) {
  const ref = useRef(null);
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog className="modal native-dialog" ref={ref} aria-label={title} onCancel={e => { e.preventDefault(); close(); }}><div className="dialog-header"><h3>{title}</h3><button className="outline" aria-label={t("Fechar janela")} onClick={close}>×</button></div>{children}<button className="close" onClick={close}>{t("Fechar")}</button></dialog>;
}

function DayEditor({ day, close, onSave, library, onFavorite, onSaveMeal, onDeleteMeal, account, community, catalog }) {
  const [draft, setDraft] = useState(() => structuredClone(day));
  const [error, setError] = useState('');
  const [voiceDirty, setVoiceDirty] = useState(false);
  const [mealDirty, setMealDirty] = useState(false);
  const [catalogDirty,setCatalogDirty] = useState(false);
  const [foodDirty,setFoodDirty]=useState(false),[exerciseDirty,setExerciseDirty]=useState(false);
  const [manageFoods,setManageFoods] = useState(false);
  const catalogPanel = useRef(null);
  useEffect(()=>{if(manageFoods)catalogPanel.current?.scrollIntoView({block:'start'});},[manageFoods]);
  function save() { try { if (voiceDirty || mealDirty || catalogDirty || foodDirty || exerciseDirty) { setError('Adicione ou descarte os alimentos, treinos, cadastros e relatos pendentes antes de salvar o dia.'); return; } if (!onSave(normalizeDay(draft))) setError('Não foi possível salvar no navegador. Seus dados continuam nesta janela.'); } catch (e) { setError(e.message); } }
  return <Modal title={t("Registro · {0}",[dateLabel(day.date)])} close={() => { if ((!voiceDirty && !mealDirty && !catalogDirty && !foodDirty && !exerciseDirty && JSON.stringify(draft) === JSON.stringify(day)) || window.confirm(t("Descartar alterações e relatos não salvos?"))) close(); }}>
    <p className="modal-copy">{t("Os cálculos acontecem neste dispositivo. Salve ao terminar.")}</p>
    <SavedMeals savedMeals={library.savedMeals} onDirty={setMealDirty} onDelete={onDeleteMeal} onUse={(name,meal)=>{setDraft(previous=>useSavedMeal(previous,name,meal));setError('');}}/>
    <details className="catalog-editor" ref={catalogPanel} open={manageFoods} onToggle={e=>setManageFoods(e.currentTarget.open)}><summary>{t("Cadastrar e compartilhar alimentos")}</summary><CommunityFoods account={account} community={community} onDirty={setCatalogDirty} showModeration={false}/></details>
    <FoodForm onDirty={setFoodDirty} catalog={catalog} onCreate={()=>setManageFoods(true)} favorites={library.favoriteFoods} recent={library.recentFoods} onFavorite={onFavorite} onAdd={(name, item) => { setDraft(appendFood(draft, name, item)); }}/>
    <details className="voice-disclosure"><summary>{t("Falar ou escrever minha refeição ")}<span>{t("Ditado + revisão dos alimentos")}</span></summary>
    <VoiceMeal onDirty={setVoiceDirty} onAdd={(meal, items) => { setDraft(previous => items.reduce((day, item) => appendFood(day, meal, item), previous)); setError(''); }}/>
    </details>
    <div className="draft-list">{draft.meals.map((m, mi) => <section key={mi}><b>{t(m.name)} · {fmt(m.calories)}{t(" kcal")}</b>{m.items.length>0 && <SaveMealButton meal={m} onSave={onSaveMeal}/>} {m.items.map((item, ii) => <div className="draft-row" key={ii}><span>{itemName(item)} · {itemQuantity(item)} · {fmt(item.calories)}{t(" kcal")}</span><button className="outline" aria-label={t("Remover {0}",[itemName(item)])} onClick={() => { const meals = structuredClone(draft.meals); meals[mi].items.splice(ii, 1); if (!meals[mi].items.length) meals.splice(mi, 1); setDraft(normalizeDay({ ...draft, meals })); }}>×</button></div>)}{!m.items.length && <button className="outline" onClick={() => setDraft(normalizeDay({ ...draft, meals: draft.meals.filter((_, i) => i !== mi) }))}>{t("Remover refeição")}</button>}</section>)}</div>
    <ExerciseForm profile={library.profile} onDirty={setExerciseDirty} onAdd={activity => setDraft(appendActivity(draft, createWorkout(activity,library.profile)))}/>
    {draft.exercise.activities.map((a, i) => <div className="draft-row" key={i}><span>{t(a.type)} · {a.durationMinutes}{t(" min")}</span><button className="outline" aria-label={t("Remover treino {0}",[t(a.type)])} onClick={() => { const activities = draft.exercise.activities.filter((_, j) => j !== i); setDraft(normalizeDay({ ...draft, exercise: { activities, performed: activities.length > 0, totalCaloriesBurned: 0 } })); }}>×</button></div>)}
    <label className="standalone-label">{t("Água do dia (ml)")}<input type="number" min="0" max="100000" value={draft.waterMl} onChange={e => setDraft({ ...draft, waterMl: e.target.value })}/></label>
    <label className="standalone-label">{t("Anotações")}<textarea rows="3" maxLength={5000} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder={t("Como foi seu dia?")}/></label>
    {error && <p className="error-box" role="alert">{t(error)}</p>}<div className="editor-save"><strong>{fmt(draft.totalCalories)}{t(" kcal registradas")}</strong><button className="primary" onClick={save}>{t("Salvar dia")}</button></div>
  </Modal>;
}

function FoodForm({ onDirty, onAdd, favorites, recent, onFavorite, catalog, onCreate, fixedMeal }) {
  const [foodId,setFoodId]=useState(foods[0].id),[name,setName]=useState(''),[per100,setPer100]=useState('');
  const [amount,setAmount]=useState('100'),[mode,setMode]=useState('g'),[sliceWeight,setSliceWeight]=useState('25');
  const [meal,setMeal]=useState('Almoço'),[error,setError]=useState(''),[dirty,setDirty]=useState(false);
  useEffect(()=>onDirty(dirty),[dirty,onDirty]);
  const food=catalog.find(f=>f.id===foodId),unit=amountUnit(food);
  function select(value){const next=catalog.find(f=>f.id===value);setFoodId(value);setMode(next?.slice?'slice':amountUnit(next));setSliceWeight(String(next?.slice?.grams||25));setAmount(next?.slice?'1':String(next?.defaultAmount||100));setDirty(true);setError('');}
  function measured(){return mode==='slice'?sliceGrams(amount,sliceWeight):numeric(amount,.1,10000,unit==='ml'?'Volume em ml':'Quantidade');}
  let preview='—',total=null;try{total=measured();preview=fmt(portionCalories(total,food?food.kcal:per100));}catch{/* Incomplete fields are reviewed before adding. */}
  return <form className="entry-form" onChange={()=>setDirty(true)} onSubmit={e=>{e.preventDefault();try{
    const label=food?food.name:name.trim();if(!label)throw new Error('Informe o alimento.');
    const value=measured(),density=food?food.kcal:Number(per100);
    onAdd(fixedMeal||meal,{id:id(),foodId:food?.id||'',food:label,calories:portionCalories(value,density),...(unit==='ml'?{unit:'ml',milliliters:value,kcalPer100Ml:density,grams:null,kcalPer100:null,quantity:value+' ml'}:{grams:value,kcalPer100:density,quantity:value+' g',...(mode==='slice'?{servingUnit:'slice',servings:Number(amount),gramsPerSlice:Number(sliceWeight)}:{})}),source:food?(food.sourceUrl||food.source||food.referenceId||food.id):'Rótulo informado',referenceNote:food?.note||''});setDirty(false);setError('');
  }catch(e){setError(e.message);}}}>
    <h4>{t('Adicionar alimento')}</h4>{!fixedMeal&&<label>{t('Refeição')}<select aria-label={t('Refeição')} value={meal} onChange={e=>setMeal(e.target.value)}>{['Café da manhã','Almoço','Lanche','Jantar','Ceia'].map(m=><option key={m} value={m}>{t(m)}</option>)}</select></label>}
    <FoodPicker catalog={catalog} onCreate={onCreate} value={foodId} onChange={select} favorites={favorites} recent={recent} onFavorite={onFavorite}/>
    {!food&&<><label>{t('Nome do alimento')}<input required maxLength={200} value={name} onChange={e=>setName(e.target.value)}/></label><label>{t('kcal por 100 g (rótulo)')}<input required type="number" min="0" max="1000" step="0.1" value={per100} onChange={e=>setPer100(e.target.value)}/></label></>}
    {food?.slice&&<label>{t('Registrar pão por')}<select value={mode} onChange={e=>{const next=e.target.value;try{const grams=measured();setAmount(String(next==='slice'?Math.round(grams/Number(sliceWeight)*100)/100:grams));}catch{setAmount('');}setMode(next);}}><option value="slice">{t('Fatias')}</option><option value="g">{t('Gramas')}</option></select></label>}
    <label>{mode==='slice'?t('Quantidade de fatias'):unit==='ml'?t('Volume consumido (ml)'):t('Quantidade consumida (g)')}<input required type="number" min={mode==='slice'?0.01:0.1} max={mode==='slice'?100:10000} step={mode==='slice'?0.01:0.1} value={amount} onChange={e=>setAmount(e.target.value)}/></label>
    {mode==='slice'&&<><label>{t('Peso médio por fatia (g)')}<input required type="number" min="0.1" max="500" step="0.1" value={sliceWeight} onChange={e=>setSliceWeight(e.target.value)}/></label><p className="form-note">{t('Estimativa editável: {0} g por fatia. Confira o rótulo ou pese sua fatia; o tamanho varia.',[fmt(food.slice.grams)])} {t('Peso total calculado: {0} g.',[total==null?'—':fmt(total)])} <a href={food.slice.sourceUrl} target="_blank" rel="noreferrer">{t('Referência do peso da fatia ↗')}</a></p></>}
    {food?.presets&&<fieldset className="ready-portions"><legend>{t('Porções prontas · estimativa')}</legend><div>{food.presets.map(preset=><button type="button" className="outline" key={preset.grams} aria-pressed={Number(amount)===preset.grams} onClick={()=>{setMode('g');setAmount(String(preset.grams));setDirty(true);setError('');}}><strong>{t(preset.label)}</strong><span>{t('~{0} kcal · {1} g',[fmt(portionCalories(preset.grams,food.kcal)),fmt(preset.grams)])}</span></button>)}</div><p className="form-note">{t('Escolha uma porção ou ajuste os gramas acima. Os valores são aproximados e variam por receita e restaurante.')}</p></fieldset>}
    {food?.portion&&<button type="button" className="outline" onClick={()=>{setAmount(String(food.portion.grams));setDirty(true);}}>{t('Usar ')}{t(food.portion.label)}</button>}
    {unit==='ml'&&<BeveragePortions food={food} amount={amount} onSelect={volume=>{setMode('ml');setAmount(String(volume));setDirty(true);setError('');}}/>}
    {unit==='ml'&&<p className="form-note">{t('Referência por volume. ml não são convertidos em gramas. Açúcar e outros ingredientes extras devem ser registrados separadamente.')}</p>}
    {food?.note&&<p className="form-note">{foodNote(food)}</p>}
    <p className="form-note" aria-live="polite">{t('{0} kcal · quantidade × kcal por 100 {1} ÷ 100.',[preview,unit])} {food&&(food.sourceUrl||!food.communityStatus)&&<a href={food.sourceUrl||FOOD_SOURCE} target="_blank" rel="noreferrer">{t('Fonte: ')}{t(food.sourceLabel||'TACO, 4ª edição')}</a>} {food?.extraSources?.map(source=><a key={source.url} href={source.url} target="_blank" rel="noreferrer">{t(source.label)} ↗</a>)}</p>
    {error&&<p role="alert" className="error-box">{t(error)}</p>}<button className="outline">{t('＋ Adicionar alimento')}</button>{dirty&&<button type="button" className="outline" onClick={()=>{setFoodId(foods[0].id);setName('');setPer100('');setAmount('100');setMode('g');setDirty(false);setError('');}}>{t('Descartar preenchimento do alimento')}</button>}
  </form>;
}

function ExerciseForm({ onAdd, onDirty, submitLabel, profile }) {
  const [referenceId,setReferenceId]=useState('strength-35'),[type,setType]=useState('');
  const [minutes,setMinutes]=useState('45'),[dirty,setDirty]=useState(false),[error,setError]=useState('');
  useEffect(()=>onDirty(dirty),[dirty,onDirty]);
  let estimate=null;try{if(referenceId)estimate=workoutEstimate(referenceId,minutes,profile);}catch{/* Incomplete inputs do not show an estimate. */}
  return <form className="entry-form" onChange={()=>setDirty(true)} onSubmit={e=>{e.preventDefault();try{
    const reference=exerciseReferences.find(r=>r.id===referenceId),label=reference?.label||type.trim();if(!label)throw new Error('Informe a atividade.');
    if(onAdd({id:id(),type:label,referenceId,durationMinutes:numeric(minutes,1,1440,'Duração'),caloriesBurned:0})===false)return;
    setDirty(false);setError('');
  }catch(e){setError(e.message);}}}>
    <h4>{t('Registrar movimento')}</h4><label>{t('Exercício e intensidade')}<select aria-label={t('Exercício e intensidade')} value={referenceId} onChange={e=>setReferenceId(e.target.value)}>{exerciseReferences.map(r=><option value={r.id} key={r.id}>{t(r.label)}</option>)}<option value="">{t('Outra atividade — sem estimativa')}</option></select></label>
    {!referenceId&&<label>{t('Atividade')}<input required maxLength={150} value={type} onChange={e=>setType(e.target.value)}/></label>}
    <label>{t('Duração (minutos)')}<input required type="number" min="1" max="1440" value={minutes} onChange={e=>setMinutes(e.target.value)}/></label>
    {estimate?<div className="exercise-estimate" aria-live="polite"><b>{t('Gasto durante o treino: ~{0} kcal',[fmt(estimate.gross)])}</b><p>{t('Extra somado ao dia: ~{0} kcal. Descontamos o gasto da rotina já previsto nesses minutos.',[fmt(estimate.additional)])}</p><small>{t('Estimado com {0} kg e {1} MET. Confira o exercício, o ritmo e inclua as pausas na sua avaliação.',[fmt(estimate.weightKg),fmt(estimate.met)])}</small><a href="https://pacompendium.com/" target="_blank" rel="noreferrer">Compendium 2024 ↗</a></div>:<p className="form-note">{t('Sem referência selecionada, o treino conta para sua constância, sem inventar calorias.')}</p>}
    {error&&<p role="alert">{t(error)}</p>}<button className="outline">{t(submitLabel||'＋ Adicionar treino')}</button>{dirty&&<button type="button" className="outline" onClick={()=>{setReferenceId('strength-35');setType('');setMinutes('45');setDirty(false);setError('');}}>{t('Descartar preenchimento do treino')}</button>}
  </form>;
}

function Evolution({ s, today, onSave }) {
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(today);
  const [error, setError] = useState('');
  const values = s.weights.map(w => w.value);
  const min = Math.min(...values), max = Math.max(...values);
  const points = values.map((v, i) => `${40 + i / Math.max(1, values.length - 1) * 520},${180 - (v - min) / (max - min || 1) * 140}`);
  return <><div className="intro"><div><small>{t("HISTÓRICO DE PESO")}</small><h3>{t("Cada registro conta.")}</h3><p>{t("Observe a tendência dos registros ao longo do tempo.")}</p></div><b className="stat">{fmt(s.profile.weight)}{t(" kg")}<small>{t("último peso registrado")}</small></b></div>
    <section className="weight-chart"><svg viewBox="0 0 600 220" role="img" aria-label={t("Gráfico de {0} pesagens, de {1} a {2} kg",[values.length,fmt(values[0]),fmt(values.at(-1))])}><line x1="40" x2="560" y1="190" y2="190" stroke="#dcebe2"/><polyline points={points.join(' ')} fill="none" stroke="#0f766e" strokeWidth="3"/>{points.map((p, i) => <circle key={s.weights[i].id} cx={p.split(',')[0]} cy={p.split(',')[1]} r="4" fill="#0f766e"><title>{dateLabel(s.weights[i].date)}: {fmt(values[i])}{t(" kg")}</title></circle>)}<text x="40" y="210">{fmt(values[0])}{t(" kg · início")}</text><text x="560" y="210" textAnchor="end">{fmt(values.at(-1))}{t(" kg · atual")}</text></svg><p className="local-note">{t("Pesagens antigas mantêm a ordem original; suas datas não foram inventadas.")}</p></section>
    <form className="entry-form" onSubmit={e => { e.preventDefault(); try { if (onSave(numeric(weight, 20, 500, 'Peso'), date)) setWeight(''); setError(''); } catch (e) { setError(e.message); } }}><h4>{t("Nova pesagem")}</h4><label>{t("Peso (kg)")}<input required type="number" min="20" max="500" step="0.1" value={weight} onChange={e => setWeight(e.target.value)}/></label><label>{t("Data")}<input required type="date" max={today} value={date} onChange={e => setDate(e.target.value)}/></label><button className="primary">{t("Salvar pesagem")}</button>{error && <p role="alert">{t(error)}</p>}</form>
    <div className="weight-history">{[...s.weights].reverse().map(w => <div className="draft-row" key={w.id}><span>{dateLabel(w.date)}</span><b>{fmt(w.value)}{t(" kg")}</b></div>)}</div>
  </>;
}

function BackupInput({ onImport }) {
  const [error, setError] = useState('');
  return <div className="backup-input"><label className="outline">{t("Importar backup")}<input type="file" accept="application/json,.json" onChange={async e => { const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; try { if (file.size > 5 * 1024 * 1024) throw new Error('O limite do backup é 5 MB.'); const data = normalizeState(JSON.parse(await file.text())); onImport(data); setError(''); } catch (e) { setError(e.message); } }}/></label>{error && <p className="error-box" role="alert">{t(error)}</p>}</div>;
}
function ImportDay({ close, onImport }) {
  const [raw, setRaw] = useState('');
  const [error, setError] = useState('');
  return <Modal title={t("Importar dia em JSON")} close={close}><p className="modal-copy">{t("Compatível com os dias do fluxo anterior com ChatGPT. Revise as estimativas: os totais serão recalculados a partir dos itens.")}</p><form onSubmit={e => { e.preventDefault(); try { onImport(parseDay(raw)); } catch (e) { setError(`JSON inválido: ${e.message}`); } }}><label>{t("JSON do dia")}<textarea required rows="12" value={raw} onChange={e => setRaw(e.target.value)} placeholder={'{"date":"2026-10-14","meals":[]}'}/></label>{error && <p className="error-box" role="alert">{t(error)}</p>}<button className="primary">{t("Validar e importar dia")}</button></form></Modal>;
}

createRoot(document.getElementById('root')).render(<AccountRoot App={App}/>);
