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

test('cada tela consentida envia uma page_view manual com metadados fixos; repetição e entradas arbitrárias não enviam',()=>{
  const {client,win}=setup();client.track('navigation','home');assert.equal(win.dataLayer,undefined);
  client.choose('granted');
  for(const screen of ['home','days','evo','foods','profile']){assert.equal(client.track('navigation',screen),true);assert.equal(client.track('navigation',screen),false);}
  const views=win.dataLayer.filter(e=>e[0]==='event'&&e[1]==='page_view');assert.equal(views.length,5);
  assert.deepEqual(views.map(e=>e[2].page_location),['https://leve-fawn.vercel.app/','https://leve-fawn.vercel.app/history','https://leve-fawn.vercel.app/progress','https://leve-fawn.vercel.app/foods','https://leve-fawn.vercel.app/profile']);
  for(const event of views){assert.equal(event[2].send_to,ANALYTICS_ID);assert.equal(event[2].page_referrer,'');assert.ok(event[2].page_title.startsWith('Leve — '));assert.deepEqual(Object.keys(event[2]).sort(),['page_location','page_referrer','page_title','send_to']);}
  const count=win.dataLayer.length;client.track('navigation','?email=private');client.track('page_view',{weight:90});assert.equal(win.dataLayer.length,count);
  client.choose('denied');const deniedCount=win.dataLayer.length;assert.equal(client.track('navigation','home'),false);assert.equal(win.dataLayer.length,deniedCount);
  client.choose('granted');assert.equal(client.track('navigation','home'),true);
});
