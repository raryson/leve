import React from 'react';
import { t } from './i18n.js';

export default function LegalLinks({ compact = false }) {
  const links = <nav className="legal-links" aria-label={t('Ajuda e privacidade')}>
    <a href="/support/" target="_blank" rel="noreferrer">{t('Ajuda e suporte')}</a>
    <a href="/privacy/" target="_blank" rel="noreferrer">{t('Política de privacidade')}</a>
    <a href="/terms/" target="_blank" rel="noreferrer">{t('Regras de uso e comunidade')}</a>
    <a href="/delete-account/" target="_blank" rel="noreferrer">{t('Solicitar exclusão da conta e dos dados')}</a>
  </nav>;
  return compact ? links : <section className="legal-settings">
    <h3>{t('Ajuda e privacidade')}</h3>
    <p>{t('Calorias e gasto de energia são estimativas. O Leve não é um dispositivo médico e não diagnostica, trata, cura ou previne condições médicas. Consulte um profissional de saúde para orientação.')}</p>
    {links}
    <small>{t('A exclusão é solicitada por e-mail e processada após confirmar a titularidade da conta.')}</small>
  </section>;
}
