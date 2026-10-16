export const ANALYTICS_ID='G-VF5TNY4EWR';
export const CONSENT_KEY='leve-analytics-consent-v1';
const screens=new Set(['home','days','evo','foods','profile']);
const pageReferences={
  home:{page_location:'https://leve-fawn.vercel.app/',page_title:'Leve — Today'},
  days:{page_location:'https://leve-fawn.vercel.app/history',page_title:'Leve — History'},
  evo:{page_location:'https://leve-fawn.vercel.app/progress',page_title:'Leve — My weight'},
  foods:{page_location:'https://leve-fawn.vercel.app/foods',page_title:'Leve — Foods'},
  profile:{page_location:'https://leve-fawn.vercel.app/profile',page_title:'Leve — Profile'},
};

// Strict allowlist: callers cannot attach journal values or arbitrary parameters.
export function createAnalytics({enabled,win,doc}) {
  let consent=null,started=false,script=null,lastScreen=null;
  function gtag(){win.dataLayer.push(arguments);}
  const allowed=()=>enabled&&consent==='granted'&&win.navigator.onLine!==false;
  function start(){
    if(!allowed()||started)return;
    started=true;win[`ga-disable-${ANALYTICS_ID}`]=false;
    win.dataLayer=win.dataLayer||[];
    gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    gtag('js',new Date());
    gtag('config',ANALYTICS_ID,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,page_location:'https://leve-fawn.vercel.app/',page_title:'Leve',page_referrer:'',cookie_domain:'none',cookie_expires:2592000});
    script=doc.createElement('script');script.async=true;script.src=`https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_ID}`;
    script.onerror=()=>{/* A blocked tag never interrupts the app. */};doc.head.appendChild(script);
    gtag('event','app_open',{send_to:ANALYTICS_ID});
  }
  function choose(value){
    const next=value==='granted'?'granted':'denied';
    if(next===consent)return;
    consent=next;
    win[`ga-disable-${ANALYTICS_ID}`]=consent!=='granted'||!enabled;
    if(consent==='granted'){if(started)gtag('consent','update',{analytics_storage:'granted'});start();}
    else {
      if(started){gtag('consent','update',{analytics_storage:'denied'});win.dataLayer.length=0;}
      // Removing a loaded script cannot unload its listeners. Keep one instance disabled.
      lastScreen=null;
      // This integration creates host-only cookies. Do not touch Clerk cookies.
      for(const entry of doc.cookie.split(';')){const name=entry.trim().split('=')[0];if(/^_ga(?:_|$)/.test(name))doc.cookie=`${name}=; Max-Age=0; Path=/; SameSite=Lax`;}
    }
  }
  function track(event,screen){
    if(!allowed())return false;start();
    if(event==='navigation'&&screens.has(screen)){
      if(lastScreen===screen)return false;lastScreen=screen;
      // Explicit SPA pageviews populate GA4's standard reports without leaking the live URL/title.
      gtag('event','page_view',{send_to:ANALYTICS_ID,...pageReferences[screen],page_referrer:''});
      gtag('event','app_navigation',{send_to:ANALYTICS_ID,screen});return true;
    }
    if(event==='pwa_installed'){gtag('event','pwa_installed',{send_to:ANALYTICS_ID});return true;}
    return false;
  }
  return {choose,track};
}

export const analyticsEnabled=import.meta.env?.VITE_ANALYTICS_ENABLED===true&&typeof window!=='undefined'&&window.location.origin==='https://leve-fawn.vercel.app';
const client=typeof window==='undefined'?null:createAnalytics({enabled:analyticsEnabled,win:window,doc:document});
export function readConsent(){try{const value=localStorage.getItem(CONSENT_KEY);return ['granted','denied'].includes(value)?value:null;}catch{return null;}}
export function applyConsent(value){try{client?.choose(value);}catch{/* Analytics must never block the journal. */}}
export function trackUsage(event,screen){try{return client?.track(event,screen)||false;}catch{return false;}}
