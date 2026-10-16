(() => {
  let saved;
  try { saved = localStorage.getItem('leve-language-v1'); } catch { /* Optional preference. */ }
  const detected = (navigator.languages || [navigator.language]).find(lang => /^(pt|en)(-|$)/i.test(lang));
  function apply(language) {
    document.documentElement.lang = language === 'pt' ? 'pt-BR' : 'en';
    document.querySelectorAll('[data-language]').forEach(section => { section.hidden = section.dataset.language !== language; });
    document.querySelectorAll('[data-set-language]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.setLanguage === language)));
  }
  apply(['pt', 'en'].includes(saved) ? saved : /^pt/i.test(detected || '') ? 'pt' : 'en');
  document.querySelectorAll('[data-set-language]').forEach(button => button.addEventListener('click', () => {
    const language = button.dataset.setLanguage;
    try { localStorage.setItem('leve-language-v1', language); } catch { /* Works for this page. */ }
    apply(language);
  }));
})();
