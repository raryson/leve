import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import InstallBanner from './InstallBanner.jsx';
import VoiceMeal from './VoiceMeal.jsx';
import FoodPicker from './FoodPicker.jsx';
import SavedMeals, { SaveMealButton } from './SavedMeals.jsx';
import { trackRecentFoods } from './foodLibrary.js';
import { AccountRoot, SyncPanel } from './Account.jsx';
import useJournal from './useJournal.js';
import { accountKey } from './cloud.js';
import { KEY, localDate, normalizeProfile, normalizeState, normalizeDay, newDay, upsertDay, portionCalories, parseDay, trainingDays, numeric, appendFood, appendActivity, normalizeSavedMeal, useSavedMeal } from './domain.js';
import { foods, FOOD_SOURCE } from './foods.js';
import './styles.css';

const fmt = n => Number(n).toLocaleString('pt-BR', { maximumFractionDigits: 1 });
const dateLabel = date => date ? new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR') : 'Registro antigo · sem data';
const id = () => crypto.randomUUID?.() || Array.from(crypto.getRandomValues(new Uint8Array(16)), byte => byte.toString(16).padStart(2, '0')).join('');
function download(data, name) {
  const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function App({ account, accountControls }) {
  const [tab, setTab] = useState('home');
  const [editor, setEditor] = useState(null);
  const [importing, setImporting] = useState(false);
  const journal = useJournal(account, Boolean(editor || importing));
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
    if ((s.profile || loadError) && !window.confirm(account ? 'Substituir o diário desta conta pelo backup e sincronizar a alteração? Exporte os dados atuais antes, se precisar.' : 'Substituir os dados deste dispositivo pelo backup? Exporte os dados atuais antes, se precisar.')) return;
    if (commit(next)) setToast('Backup restaurado.');
  }
  const backup = () => download(JSON.stringify(s, null, 2), `leve-backup-${today}.json`);
  const syncPanel = <SyncPanel account={account} journal={journal} onExport={backup}/>;
  if (!journal.ready && !loadError) return <><div className="onboard-account">{accountControls}</div>{syncPanel}<div className="onboarding"><section className="onboard-card"><h1>Buscando seu diário</h1><p>Estamos verificando se esta conta já tem registros. Sua cópia local permanece neste dispositivo.</p>{journal.sync.phase === 'error' && <p role="alert">{journal.sync.message}</p>}<button className="outline" onClick={journal.synchronize}>Tentar novamente</button></section></div></>;
  if (loadError) return <><div className="onboard-account">{accountControls}</div>{syncPanel}<div className="onboarding"><section className="onboard-card"><h1>Vamos proteger seus registros.</h1><p role="alert">{loadError}</p><p>A cópia original continua no navegador. Exporte-a antes de tentar recuperar os dados.</p><button className="primary" onClick={() => download(loaded.raw || '', 'leve-recuperacao.json')}>Exportar cópia original</button><BackupInput onImport={restore}/><button className="outline" onClick={() => { try { const previous = localStorage.getItem(`${account ? accountKey(account.userId) : KEY}-previous`); if (!previous) throw new Error('Não há cópia anterior.'); const parsed = JSON.parse(previous); restore(account ? parsed.state : parsed); } catch (e) { setRecoveryError(e.message); } }}>Recuperar cópia anterior</button>{(storageError || recoveryError) && <p role="alert">{storageError || recoveryError}</p>}</section></div></>;
  if (!s.profile) return <><div className="onboard-account">{accountControls}</div>{syncPanel}<div className="onboarding"><section className="onboard-card"><div className="onboard-brand"><img src="/icon.svg" alt=""/> leve</div><small>SEU PRIMEIRO PASSO</small><h1>Bora cuidar<br/>da sua rotina?</h1><p>Alimentação, água e movimento. Um registro de cada vez, no seu ritmo.</p><ProfileForm onSave={p => commit({ ...s, profile: p, weights: [{ id: id(), date: today, value: p.weight }] })}/><BackupInput onImport={restore}/><p className="local-note">Seus registros são salvos aqui. Entre na conta para sincronizar entre dispositivos.</p>{(storageError || recoveryError) && <p role="alert">{storageError || recoveryError}</p>}</section></div></>;
  const day = s.days.find(d => d.date === today) || newDay(today);
  const nav = [['home', 'home', 'Hoje'], ['days', 'history', 'Histórico'], ['evo', 'trend', 'Meu peso'], ['profile', 'user', 'Perfil']];
  const syncLabel = !account ? 'Salvo neste dispositivo' : journal.sync.phase === 'synced' ? 'Salvo na sua conta' : journal.sync.phase === 'syncing' ? 'Sincronizando…' : journal.sync.phase === 'error' ? 'Revisar sincronização' : journal.sync.phase === 'conflict' ? 'Revisar conflito' : 'Sincronização pendente';
  return <div className="shell">
    <aside><a className="brand" href="#" onClick={e => { e.preventDefault(); setTab('home'); }}><img className="brand-mark" src="/icon.svg" alt=""/> leve<span className="brand-dot">.</span></a><p className="sidebar-caption">Um pouco melhor, todo dia.</p><nav aria-label="Navegação principal">{nav.map(([key, icon, label]) => <button key={key} className={tab === key ? 'active' : ''} aria-current={tab === key ? 'page' : undefined} onClick={() => setTab(key)}><Icon name={icon}/><span>{label}</span></button>)}</nav><div className="sidebar-note"><span>✳</span><b>Feito é melhor que perfeito.</b><p>Um copo d’água, uma caminhada, uma refeição registrada. Tudo conta.</p></div><footer><span className="avatar">{s.profile.name.slice(0, 1).toUpperCase()}</span><div><b>{s.profile.name}</b><small>Sua rotina no Leve</small></div></footer></aside>
    <main><header><div><p className="eyebrow">{dateLabel(today)}</p><h2>{tab === 'home' ? `Oi, ${s.profile.name}!` : nav.find(n => n[0] === tab)[2]}</h2></div><div className="header-account"><button className={`sync-status ${account && ['error', 'conflict'].includes(journal.sync.phase) ? 'needs-attention' : ''}`} onClick={() => setTab('profile')}><span/>{syncLabel}</button>{accountControls}</div></header>
      {account && ['error', 'conflict'].includes(journal.sync.phase) && tab !== 'profile' && syncPanel}
      {storageError && <div className="error-box" role="alert">{storageError}<button className="outline" onClick={backup}>Exportar backup</button></div>}
      {tab === 'home' && <Home s={s} day={day} today={today} onEdit={() => setEditor(today)} onWeight={() => setTab('evo')} onWater={delta => { if (commit(x => { const d = x.days.find(d => d.date === today) || newDay(today); return upsertDay(x, { ...d, waterMl: Math.max(0, d.waterMl + delta) }); })) setToast('Água atualizada.'); }}/>}
      {tab === 'days' && <History s={s} today={today} onEdit={setEditor} onImport={() => setImporting(true)} onDelete={date => { if (window.confirm(`Excluir o registro de ${dateLabel(date)}?`)) commit(x => ({ ...x, days: x.days.filter(d => d.date !== date) })); }}/>}
      {tab === 'evo' && <Evolution s={s} today={today} onSave={(value, date) => { let saved = false; saved = commit(x => { const records = [...x.weights, { id: id(), date, value }].sort((a, b) => (a.date || '').localeCompare(b.date || '')); return { ...x, weights: records, profile: { ...x.profile, weight: records.at(-1).value } }; }); if (saved) setToast('Pesagem salva.'); return saved; }}/>}
      {tab === 'profile' && <>{syncPanel}<div className="intro"><div><small>SEU PERFIL</small><h3>Do seu jeito.</h3><p>Ajuste suas referências e proteja seus registros.</p></div></div><section className="formbox"><ProfileForm key={JSON.stringify(s.profile)} initial={s.profile} onSave={p => { if (commit(x => ({ ...x, profile: p }))) setToast('Perfil salvo.'); }}/></section><section className="data-transfer"><h3>Seus dados com você</h3><p>Use o backup para guardar uma cópia. Com login, o diário sincroniza por conta; conflitos pedem sua revisão.</p><button className="primary" onClick={backup}>Exportar backup</button><BackupInput onImport={restore}/></section></>}
    </main>
    {editor && <DayEditor key={editor} library={s} onFavorite={foodId => commit(x => ({...x, favoriteFoods: x.favoriteFoods.includes(foodId) ? x.favoriteFoods.filter(id=>id!==foodId) : [...x.favoriteFoods,foodId]}))} onSaveMeal={(name,items) => {
      if(items.some(i=>i.grams==null || i.grams==='' || i.kcalPer100==null || i.kcalPer100==='')) throw new Error('Para salvar uma combinação, todos os alimentos precisam de gramas e kcal por 100 g. Registros antigos sem esses dados precisam ser cadastrados novamente pelo formulário.');
      const existing=s.savedMeals.find(m=>m.name.toLocaleLowerCase('pt-BR')===name.trim().toLocaleLowerCase('pt-BR'));
      const template=normalizeSavedMeal({id:existing?.id || id(),name,items});
      if(existing && !window.confirm(`Atualizar a combinação “${existing.name}”? Os dias já registrados não serão alterados.`)) return false;
      if(!commit(x=>({...x,savedMeals:[...x.savedMeals.filter(m=>m.id!==template.id),template]}))) throw new Error('Não foi possível salvar a combinação. Confira o aviso de armazenamento.');
      setToast('Combinação salva em Minhas refeições.');return true;
    }} onDeleteMeal={meal=>{if(window.confirm(`Excluir a combinação “${meal.name}”? Os dias já registrados serão preservados.`)) commit(x=>({...x,savedMeals:x.savedMeals.filter(m=>m.id!==meal.id)}));}} day={s.days.find(d => d.date === editor) || newDay(editor)} close={() => setEditor(null)} onSave={d => { const saved = commit(x => ({...upsertDay(x, d),recentFoods:trackRecentFoods(x,d)})); if (saved) { setEditor(null); setToast('Dia salvo.'); } return saved; }}/>}
    {importing && <ImportDay close={() => setImporting(false)} onImport={d => { const existing = s.days.find(x => x.date === d.date); if (existing && !window.confirm('Este dia já existe. Substituir refeições e exercícios? Água registrada será preservada.')) return; if (commit(x => upsertDay(x, { ...d, waterMl: existing?.waterMl ?? d.waterMl }))) { setImporting(false); setToast('Dia importado e totais recalculados.'); } }}/>}
    <InstallBanner/>{toast && <div className="toast" role="status">{toast}</div>}
  </div>;
}

function ProfileForm({ initial, onSave }) {
  const [p, setP] = useState(initial || { name: '', age: '', height: '', weight: '', sex: 'female', waterGoal: 2000, weeklyWorkouts: 3, calorieGoal: '' });
  const [error, setError] = useState('');
  const input = (key, label, min, max, step = 1) => <label>{label}<input required={key !== 'calorieGoal'} type="number" min={min} max={max} step={step} value={p[key] ?? ''} onChange={e => setP({ ...p, [key]: e.target.value })}/></label>;
  return <form className="form" onSubmit={e => { e.preventDefault(); try { onSave(normalizeProfile(p)); setError(''); } catch (e) { setError(e.message); } }}>
    <label>Como podemos te chamar?<input required maxLength={80} value={p.name} onChange={e => setP({ ...p, name: e.target.value })}/></label>
    {input('age', 'Idade (adultos)', 18, 120)}{input('height', 'Altura (cm)', 80, 250, 0.1)}
    {initial ? <label>Peso atual<output>{fmt(initial.weight)} kg</output><small>Atualize em Evolução.</small></label> : input('weight', 'Peso inicial (kg)', 20, 500, 0.1)}
    <label>Sexo (perfil)<select value={p.sex} onChange={e => setP({ ...p, sex: e.target.value })}><option value="female">Feminino</option><option value="male">Masculino</option></select></label>
    {input('waterGoal', 'Objetivo pessoal de água (ml)', 250, 10000, 50)}{input('weeklyWorkouts', 'Dias de treino por semana', 1, 7)}{input('calorieGoal', 'Referência de kcal (opcional)', 1, 10000)}
    <p className="form-note">Objetivos pessoais ajustáveis, sem prescrição automática de dieta. A referência de calorias pode ser definida com seu nutricionista.</p>
    {error && <p className="form-note error-box" role="alert">{error}</p>}<button className="primary">{initial ? 'Salvar perfil' : 'Criar meu perfil →'}</button>
  </form>;
}

function Home({ s, day, today, onEdit, onWeight, onWater }) {
  const workouts = trainingDays(s.days, today);
  const change = s.profile.weight - s.weights[0].value;
  return <>
    <div className="daily-heading"><div><span className="eyebrow">SEU DIA EM UM LUGAR</span><h3>Bora fazer hoje valer.</h3><p>Comida, água e movimento. No seu ritmo.</p></div><button className="primary" onClick={onEdit}>＋ Registrar refeição</button></div>
    <div className="dashboard-metrics">
      <article className="metric calorie-metric"><div className="metric-label"><span className="metric-icon"><Icon name="food"/></span>Calorias de hoje</div><b className="big">{fmt(day.totalCalories)} <i>kcal</i></b>{s.profile.calorieGoal ? <><Progress value={day.totalCalories} max={s.profile.calorieGoal}/><p>Referência: {fmt(s.profile.calorieGoal)} kcal</p></> : <p>Seu total de alimentos registrados</p>}<button className="link" onClick={onEdit}>Adicionar alimento →</button></article>
      <article className="metric water-metric"><div className="metric-label"><span className="metric-icon"><Icon name="water"/></span>Água de hoje</div><b className="big">{fmt(day.waterMl)} <i>ml</i></b><Progress value={day.waterMl} max={s.profile.waterGoal}/><p>Objetivo pessoal: {fmt(s.profile.waterGoal)} ml</p><div className="water-actions"><button className="outline" disabled={!day.waterMl} aria-label="Remover 250 ml de água" onClick={() => onWater(-250)}>−</button><button className="primary" onClick={() => onWater(250)}>+ 250 ml</button><button className="outline" onClick={() => onWater(500)}>+ 500 ml</button></div></article>
      <article className="metric weight-metric"><div className="metric-label"><span className="metric-icon"><Icon name="trend"/></span>Meu peso</div><b className="big">{fmt(s.profile.weight)} <i>kg</i></b><p>{change > 0 ? '+' : ''}{fmt(change)} kg desde o primeiro registro</p><button className="link" onClick={onWeight}>Registrar pesagem →</button></article>
    </div>
    <section className={`movement-card ${day.exercise.performed ? 'done' : ''}`}><div className="movement-title"><span className="metric-icon"><Icon name="move"/></span><div><span className="eyebrow">MOVIMENTO NA SEMANA</span><h3>{day.exercise.performed ? 'Boa! Você se movimentou hoje.' : 'Seu próximo treino começa com um passo.'}</h3><p>{day.exercise.activities.map(a => `${a.type} · ${a.durationMinutes} min`).join(' / ') || 'Academia ou caminhada: escolha o que cabe no seu dia.'}</p></div></div><div className="workout-progress"><b>{workouts}<span> / {s.profile.weeklyWorkouts} dias</span></b><div className="workout-dots" aria-label={`${workouts} de ${s.profile.weeklyWorkouts} dias de treino na semana`}>{Array.from({length:s.profile.weeklyWorkouts}, (_, i) => <span key={i} className={i < workouts ? 'completed' : ''}/>)}</div><small>{workouts >= s.profile.weeklyWorkouts ? 'Objetivo da semana alcançado!' : 'Um dia de cada vez.'}</small></div><button className="outline" onClick={onEdit}>Registrar treino</button></section>
    <div className="head"><div><span className="eyebrow">NO SEU PRATO</span><h3>Refeições de hoje</h3></div><button className="outline" onClick={onEdit}>Editar dia</button></div><DayCard day={day}/>

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
function Progress({ value, max }) { return <div className="bar" role="progressbar" aria-label="Progresso registrado" aria-valuenow={Math.min(value, max)} aria-valuemin={0} aria-valuemax={max}><span style={{ width: `${Math.min(100, value / max * 100)}%` }}/></div>; }
function DayCard({ day }) { return <div className="list">
  {day.meals.length ? day.meals.map((m, i) => <div className="meal" key={i}><div><b>{m.name}</b>{m.items.map((item, j) => <small key={j}>{item.food} · {item.quantity || 'Quantidade não informada'} · {fmt(item.calories)} kcal</small>)}</div><strong>{fmt(m.calories)} <i>kcal</i></strong></div>) : <p className="empty-day">Nenhuma refeição registrada para este dia.</p>}
  {day.exercise.performed && <div className="exercise-row"><div><b>Movimento</b><small>{day.exercise.activities.map(a => `${a.type} · ${a.durationMinutes} min`).join(' / ') || 'Atividade registrada em importação'}</small></div><strong>{day.exercise.totalCaloriesBurned ? `${fmt(day.exercise.totalCaloriesBurned)} kcal estimadas` : 'Sem estimativa de gasto'}</strong></div>}
  <div className="day-total"><b>Total registrado</b><strong>{fmt(day.totalCalories)} kcal</strong><small>Água: {fmt(day.waterMl)} ml{day.exercise.totalCaloriesBurned > 0 ? ` · Ingestão − exercício estimado: ${fmt(day.netCalories)} kcal (não é o déficit diário)` : ''}</small></div>{day.notes && <p className="detail-notes day-notes">{day.notes}</p>}
</div>; }

function History({ s, today, onEdit, onImport, onDelete }) {
  const [query, setQuery] = useState('');
  const [date, setDate] = useState(today);
  const [selected, setSelected] = useState(null);
  const days = [...s.days].reverse().filter(d => `${d.date} ${dateLabel(d.date)} ${d.notes} ${d.meals.map(m => `${m.name} ${m.items.map(i => i.food).join(' ')}`).join(' ')}`.toLocaleLowerCase('pt-BR').includes(query.toLocaleLowerCase('pt-BR')));
  return <><div className="intro"><div><small>SEU DIÁRIO</small><h3>Seu diário, dia a dia.</h3><p>Veja suas refeições, água e movimento em cada dia.</p></div><form className="new-date" onSubmit={e => { e.preventDefault(); onEdit(date); }}><label>Data do registro<input required type="date" max={today} value={date} onChange={e => setDate(e.target.value)}/></label><button className="primary">＋ Registrar dia</button></form></div><div className="history-tools"><label>Buscar no histórico<input type="search" placeholder="Data, alimento ou anotação" value={query} onChange={e => setQuery(e.target.value)}/></label><button className="outline" onClick={onImport}>Importar dia em JSON</button></div><p className="local-note">{days.length} dia(s) encontrado(s)</p><div className="day-list">{days.map(d => <article key={d.date}><button className="day-open" onClick={() => setSelected(d.date)}><small>{dateLabel(d.date)}</small><h4>{d.meals.length} refeições · {fmt(d.totalCalories)} kcal</h4><p>{fmt(d.waterMl)} ml de água · {d.exercise.performed ? 'Treino registrado' : 'Sem treino'}</p></button><div className="row-actions"><button className="outline" onClick={() => onEdit(d.date)}>Editar</button><button className="outline danger" aria-label={`Excluir dia ${dateLabel(d.date)}`} onClick={() => onDelete(d.date)}>Excluir</button></div></article>)}</div>{!days.length && <p className="empty-day">{s.days.length ? 'Nenhum registro corresponde à busca.' : 'Seu histórico começa com o primeiro registro.'}</p>}{selected && s.days.find(d => d.date === selected) && <Modal title={dateLabel(selected)} close={() => setSelected(null)}><DayCard day={s.days.find(d => d.date === selected)}/></Modal>}</>;
}

function Modal({ title, close, children }) {
  const ref = useRef(null);
  useEffect(() => { const dialog = ref.current; dialog.showModal(); return () => dialog.close(); }, []);
  return <dialog className="modal native-dialog" ref={ref} aria-label={title} onCancel={e => { e.preventDefault(); close(); }}><div className="dialog-header"><h3>{title}</h3><button className="outline" aria-label="Fechar janela" onClick={close}>×</button></div>{children}<button className="close" onClick={close}>Fechar</button></dialog>;
}

function DayEditor({ day, close, onSave, library, onFavorite, onSaveMeal, onDeleteMeal }) {
  const [draft, setDraft] = useState(() => structuredClone(day));
  const [error, setError] = useState('');
  const [voiceDirty, setVoiceDirty] = useState(false);
  const [mealDirty, setMealDirty] = useState(false);
  function save() { try { if (voiceDirty || mealDirty) { setError('Adicione ou cancele a revisão pendente da refeição ou do relato antes de salvar o dia.'); return; } if (!onSave(normalizeDay(draft))) setError('Não foi possível salvar no navegador. Seus dados continuam nesta janela.'); } catch (e) { setError(e.message); } }
  return <Modal title={`Registro · ${dateLabel(day.date)}`} close={() => { if ((!voiceDirty && !mealDirty && JSON.stringify(draft) === JSON.stringify(day)) || window.confirm('Descartar alterações e relatos não salvos?')) close(); }}>
    <p className="modal-copy">Os cálculos acontecem neste dispositivo. Salve ao terminar.</p>
    <SavedMeals savedMeals={library.savedMeals} onDirty={setMealDirty} onDelete={onDeleteMeal} onUse={(name,meal)=>{setDraft(previous=>useSavedMeal(previous,name,meal));setError('');}}/>
    <FoodForm favorites={library.favoriteFoods} recent={library.recentFoods} onFavorite={onFavorite} onAdd={(name, item) => { setDraft(appendFood(draft, name, item)); }}/>
    <details className="voice-disclosure"><summary>Falar ou escrever minha refeição <span>Ditado + revisão dos alimentos</span></summary>
    <VoiceMeal onDirty={setVoiceDirty} onAdd={(meal, items) => { setDraft(previous => items.reduce((day, item) => appendFood(day, meal, item), previous)); setError(''); }}/>
    </details>
    <div className="draft-list">{draft.meals.map((m, mi) => <section key={mi}><b>{m.name} · {fmt(m.calories)} kcal</b>{m.items.length>0 && <SaveMealButton meal={m} onSave={onSaveMeal}/>} {m.items.map((item, ii) => <div className="draft-row" key={ii}><span>{item.food} · {item.quantity} · {fmt(item.calories)} kcal</span><button className="outline" aria-label={`Remover ${item.food}`} onClick={() => { const meals = structuredClone(draft.meals); meals[mi].items.splice(ii, 1); if (!meals[mi].items.length) meals.splice(mi, 1); setDraft(normalizeDay({ ...draft, meals })); }}>×</button></div>)}{!m.items.length && <button className="outline" onClick={() => setDraft(normalizeDay({ ...draft, meals: draft.meals.filter((_, i) => i !== mi) }))}>Remover refeição</button>}</section>)}</div>
    <ExerciseForm onAdd={activity => setDraft(appendActivity(draft, activity))}/>
    {draft.exercise.activities.map((a, i) => <div className="draft-row" key={i}><span>{a.type} · {a.durationMinutes} min</span><button className="outline" aria-label={`Remover treino ${a.type}`} onClick={() => { const activities = draft.exercise.activities.filter((_, j) => j !== i); setDraft(normalizeDay({ ...draft, exercise: { activities, performed: activities.length > 0, totalCaloriesBurned: 0 } })); }}>×</button></div>)}
    <label className="standalone-label">Água do dia (ml)<input type="number" min="0" max="100000" value={draft.waterMl} onChange={e => setDraft({ ...draft, waterMl: e.target.value })}/></label>
    <label className="standalone-label">Anotações<textarea rows="3" maxLength={5000} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} placeholder="Como foi seu dia?"/></label>
    {error && <p className="error-box" role="alert">{error}</p>}<div className="editor-save"><strong>{fmt(draft.totalCalories)} kcal registradas</strong><button className="primary" onClick={save}>Salvar dia</button></div>
  </Modal>;
}

function FoodForm({ onAdd, favorites, recent, onFavorite }) {
  const [foodId, setFoodId] = useState(foods[0].id);
  const [name, setName] = useState('');
  const [per100, setPer100] = useState('');
  const [grams, setGrams] = useState('100');
  const [meal, setMeal] = useState('Almoço');
  const [error, setError] = useState('');
  const food = foods.find(f => f.id === foodId);
  let preview = '—';
  try { preview = fmt(portionCalories(grams, food ? food.kcal : per100)); } catch { /* Incomplete form. */ }
  return <form className="entry-form" onSubmit={e => { e.preventDefault(); try { const label = food ? food.name : name.trim(); if (!label) throw new Error('Informe o alimento.'); onAdd(meal, { id: id(), foodId: food?.id || '', food: label, quantity: `${grams} g`, grams: Number(grams), kcalPer100: food?.kcal ?? Number(per100), calories: portionCalories(grams, food ? food.kcal : per100), source: food ? (food.sourceUrl || food.referenceId || food.id) : 'Rótulo informado', referenceNote: food?.note || '' }); setError(''); } catch (e) { setError(e.message); } }}>
    <h4>Adicionar alimento</h4><label>Refeição<select aria-label="Refeição" value={meal} onChange={e => setMeal(e.target.value)}>{['Café da manhã', 'Almoço', 'Lanche', 'Jantar', 'Ceia'].map(m => <option key={m}>{m}</option>)}</select></label>
    <FoodPicker value={foodId} onChange={setFoodId} favorites={favorites} recent={recent} onFavorite={onFavorite}/>
    {!food && <><label>Nome do alimento<input required maxLength={200} value={name} onChange={e => setName(e.target.value)}/></label><label>kcal por 100 g (rótulo)<input required type="number" min="0" max="1000" step="0.1" value={per100} onChange={e => setPer100(e.target.value)}/></label></>}
    <label>Quantidade consumida (g)<input required type="number" min="0.1" max="10000" step="0.1" value={grams} onChange={e => setGrams(e.target.value)}/></label>
    {food?.portion && <button type="button" className="outline" onClick={() => setGrams(String(food.portion.grams))}>Usar {food.portion.label}</button>}
    {food?.note && <p className="form-note">{food.note}</p>}
    <p className="form-note" aria-live="polite">{preview} kcal · quantidade × kcal por 100 g ÷ 100. Considere a parte comestível e o preparo. Óleo e acompanhamentos não incluídos na referência devem ser registrados à parte. {food && <a href={food.sourceUrl || FOOD_SOURCE} target="_blank" rel="noreferrer">Fonte: {food.sourceLabel || 'TACO, 4ª edição'}</a>}</p>
    {error && <p role="alert" className="error-box">{error}</p>}<button className="outline">＋ Adicionar alimento</button>
  </form>;
}

function ExerciseForm({ onAdd }) {
  const [type, setType] = useState('Academia');
  const [minutes, setMinutes] = useState('45');
  const [error, setError] = useState('');
  return <form className="entry-form" onSubmit={e => { e.preventDefault(); try { if (!type.trim()) throw new Error('Informe a atividade.'); onAdd({ id: id(), type: type.trim(), durationMinutes: numeric(minutes, 1, 1440, 'Duração'), caloriesBurned: 0 }); setError(''); } catch (e) { setError(e.message); } }}><h4>Registrar movimento</h4><label>Atividade<input required maxLength={150} value={type} onChange={e => setType(e.target.value)}/></label><label>Duração (minutos)<input required type="number" min="1" max="1440" value={minutes} onChange={e => setMinutes(e.target.value)}/></label><p className="form-note">O treino conta para sua constância. O app não presume quantas calorias você gastou.</p>{error && <p role="alert">{error}</p>}<button className="outline">＋ Adicionar treino</button></form>;
}

function Evolution({ s, today, onSave }) {
  const [weight, setWeight] = useState('');
  const [date, setDate] = useState(today);
  const [error, setError] = useState('');
  const values = s.weights.map(w => w.value);
  const min = Math.min(...values), max = Math.max(...values);
  const points = values.map((v, i) => `${40 + i / Math.max(1, values.length - 1) * 520},${180 - (v - min) / (max - min || 1) * 140}`);
  return <><div className="intro"><div><small>HISTÓRICO DE PESO</small><h3>Cada registro conta.</h3><p>Observe a tendência dos registros ao longo do tempo.</p></div><b className="stat">{fmt(s.profile.weight)} kg<small>último peso registrado</small></b></div>
    <section className="weight-chart"><svg viewBox="0 0 600 220" role="img" aria-label={`Gráfico de ${values.length} pesagens, de ${fmt(values[0])} a ${fmt(values.at(-1))} kg`}><line x1="40" x2="560" y1="190" y2="190" stroke="#dcebe2"/><polyline points={points.join(' ')} fill="none" stroke="#0f766e" strokeWidth="3"/>{points.map((p, i) => <circle key={s.weights[i].id} cx={p.split(',')[0]} cy={p.split(',')[1]} r="4" fill="#0f766e"><title>{dateLabel(s.weights[i].date)}: {fmt(values[i])} kg</title></circle>)}<text x="40" y="210">{fmt(values[0])} kg · início</text><text x="560" y="210" textAnchor="end">{fmt(values.at(-1))} kg · atual</text></svg><p className="local-note">Pesagens antigas mantêm a ordem original; suas datas não foram inventadas.</p></section>
    <form className="entry-form" onSubmit={e => { e.preventDefault(); try { if (onSave(numeric(weight, 20, 500, 'Peso'), date)) setWeight(''); setError(''); } catch (e) { setError(e.message); } }}><h4>Nova pesagem</h4><label>Peso (kg)<input required type="number" min="20" max="500" step="0.1" value={weight} onChange={e => setWeight(e.target.value)}/></label><label>Data<input required type="date" max={today} value={date} onChange={e => setDate(e.target.value)}/></label><button className="primary">Salvar pesagem</button>{error && <p role="alert">{error}</p>}</form>
    <div className="weight-history">{[...s.weights].reverse().map(w => <div className="draft-row" key={w.id}><span>{dateLabel(w.date)}</span><b>{fmt(w.value)} kg</b></div>)}</div>
  </>;
}

function BackupInput({ onImport }) {
  const [error, setError] = useState('');
  return <div className="backup-input"><label className="outline">Importar backup<input type="file" accept="application/json,.json" onChange={async e => { const file = e.target.files?.[0]; e.target.value = ''; if (!file) return; try { if (file.size > 5 * 1024 * 1024) throw new Error('O limite do backup é 5 MB.'); const data = normalizeState(JSON.parse(await file.text())); onImport(data); setError(''); } catch (e) { setError(e.message); } }}/></label>{error && <p className="error-box" role="alert">{error}</p>}</div>;
}
function ImportDay({ close, onImport }) {
  const [raw, setRaw] = useState('');
  const [error, setError] = useState('');
  return <Modal title="Importar dia em JSON" close={close}><p className="modal-copy">Compatível com os dias do fluxo anterior com ChatGPT. Revise as estimativas: os totais serão recalculados a partir dos itens.</p><form onSubmit={e => { e.preventDefault(); try { onImport(parseDay(raw)); } catch (e) { setError(`JSON inválido: ${e.message}`); } }}><label>JSON do dia<textarea required rows="12" value={raw} onChange={e => setRaw(e.target.value)} placeholder={'{"date":"2026-10-14","meals":[]}'}/></label>{error && <p className="error-box" role="alert">{error}</p>}<button className="primary">Validar e importar dia</button></form></Modal>;
}

createRoot(document.getElementById('root')).render(<AccountRoot App={App}/>);
