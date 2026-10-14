import test from 'node:test';
import assert from 'node:assert/strict';
import {createAnalytics,ANALYTICS_ID} from '../src/analytics.js';

function setup(enabled=true){
  const scripts=[],removedCookies=[];
  const win={navigator:{onLine:true}};
  const doc={head:{appendChild:script=>scripts.push(script)},createElement:()=>({}),get cookie(){return '_ga=abc; _ga_X=def; __session=private';},set cookie(value){removedCookies.push(value);}};
  return {client:createAnalytics({enabled,win,doc}),win,scripts,removedCookies};
}
test('analytics não carrega antes de consentir, em prévias desativadas ou offline',()=>{
  const {client,win,scripts}=setup();client.track('navigation','home');assert.equal(scripts.length,0);
  client.choose('denied');client.track('navigation','home');assert.equal(scripts.length,0);
  const disabled=setup(false);disabled.client.choose('granted');assert.equal(disabled.scripts.length,0);
  win.navigator.onLine=false;client.choose('granted');assert.equal(scripts.length,0);
  win.navigator.onLine=true;client.track('navigation','home');assert.equal(scripts.length,1);
});
test('payload é fixo e não aceita diário, nomes, URL, referrer ou IDs de conta',()=>{
  const {client,win,scripts}=setup();client.choose('granted');client.choose('granted');
  assert.equal(scripts.length,1);assert.match(scripts[0].src,/G-VF5TNY4EWR/);
  assert.equal(client.track('navigation','home'),true);assert.equal(client.track('navigation','home'),false);
  assert.equal(client.track('navigation','peso=90&email=private'),false);
  assert.equal(client.track('secret',{weight:90}),false);
  const config=win.dataLayer.find(e=>e[0]==='config')[2];
  assert.equal(config.send_page_view,false);assert.equal(config.page_title,'Leve');assert.equal(config.page_referrer,'');assert.equal(config.page_location,'https://leve-fawn.vercel.app/');assert.equal(config.allow_google_signals,false);
  assert.doesNotMatch(JSON.stringify(win.dataLayer),/private|peso=|weight/);
});
test('revogar bloqueia novos eventos e limpa só cookies GA; permitir outra vez não duplica tag',()=>{
  const {client,win,scripts,removedCookies}=setup();client.choose('granted');client.track('navigation','home');
  client.choose('denied');assert.equal(win[`ga-disable-${ANALYTICS_ID}`],true);assert.equal(client.track('pwa_installed'),false);
  assert.equal(removedCookies.length,2);assert.ok(removedCookies.every(c=>c.startsWith('_ga')));
  client.choose('granted');assert.equal(scripts.length,1);assert.equal(client.track('navigation','foods'),true);
});
