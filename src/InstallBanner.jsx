import React, { useEffect, useState } from 'react';

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try { if (localStorage.getItem('leve-install-dismissed') === '1') return; } catch { /* Storage may be unavailable. */ }
    const onInstall = event => {
      event.preventDefault();
      setDeferredPrompt(event);
      setVisible(true);
    };
    window.addEventListener('beforeinstallprompt', onInstall);
    return () => window.removeEventListener('beforeinstallprompt', onInstall);
  }, []);

  if (!visible || !deferredPrompt) return null;
  const install = async () => { try { await deferredPrompt.prompt(); await deferredPrompt.userChoice; } finally { setVisible(false); setDeferredPrompt(null); } };
  const dismiss = () => { try { localStorage.setItem('leve-install-dismissed', '1'); } catch { /* Dismiss for this session. */ } setVisible(false); };
  return <div className="install-banner"><div className="install-icon">✳</div><div className="install-copy"><strong>Leve sempre por perto</strong><span>Salve este app no seu dispositivo para abrir mais rápido e usar como uma PWA.</span></div><button className="install-action" onClick={install}>Instalar</button><button className="install-dismiss" onClick={dismiss} aria-label="Fechar">×</button></div>;
}
