import React, {useSyncExternalStore} from 'react';
import {getLanguage,setLanguage,subscribeLanguage,t} from './i18n.js';
export function useLanguage(){return useSyncExternalStore(subscribeLanguage,getLanguage,()=> 'pt');}
export default function LanguageSwitcher(){const language=useLanguage();return <label className="language-switcher"><span aria-hidden="true">🌐</span><span className="sr-only">{t('Idioma')}</span><select aria-label={t('Idioma')} value={language} onChange={e=>setLanguage(e.target.value)}><option value="pt" lang="pt-BR">Português</option><option value="en" lang="en">English</option></select></label>;}
