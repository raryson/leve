import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Resvg} from '@resvg/resvg-js';
import jsQR from 'jsqr';
import {crc16,pixPayload,supportRecipient,shouldOfferSupport,supportPreferenceKey,publishedSupporters} from '../src/support.js';

test('Pix sem valor predefinido tem campos e CRC válidos; QR publicado decodifica para o mesmo código',async()=>{
  assert.equal(crc16('123456789'),'29B1');
  const payload=pixPayload();assert.equal(payload.slice(-4),crc16(payload.slice(0,-4)));
  const fields={};for(let i=0;i<payload.length;){const id=payload.slice(i,i+2),length=Number(payload.slice(i+2,i+4));fields[id]=payload.slice(i+4,i+4+length);i+=4+length;}
  assert.equal(fields['00'],'01');assert.ok(fields['26'].includes(supportRecipient.key));assert.equal(fields['53'],'986');assert.equal(fields['58'],'BR');assert.equal(fields['59'],'RARYSON PEREIRA ROST');assert.equal(fields['60'],'GRAVATAI');assert.equal(fields['54'],undefined);
  const svg=await readFile(new URL('../src/assets/support-pix.svg',import.meta.url),'utf8');
  const image=new Resvg(svg).render();const decoded=jsQR(new Uint8ClampedArray(image.pixels),image.width,image.height);
  assert.equal(decoded?.data,payload);
});
test('convite só acompanha nova pesagem menor de hoje, comparada ao último registro datado',()=>{
  const today='2026-10-16',weights=[{date:'2026-10-15',value:90},{date:null,value:50}];
  assert.equal(shouldOfferSupport(weights,{type:'weight',date:today,value:89.9},today),true);
  for(const entry of [{type:'weight',date:today,value:90},{type:'weight',date:today,value:91},{type:'weight',date:'2026-10-14',value:80},{type:'meal',date:today,value:80}])assert.equal(shouldOfferSupport(weights,entry,today),false);
  assert.equal(shouldOfferSupport([], {type:'weight',date:today,value:80},today),false);
  assert.equal(shouldOfferSupport([...weights,{date:today,value:89}],{type:'weight',date:today,value:89},today),false);
  assert.equal(shouldOfferSupport([...weights,{date:today,value:89}],{type:'weight',date:today,value:88.9},today),true);
});
test('preferências por conta são separadas; agradecimentos exigem pagamento verificado e autorização',()=>{
  assert.notEqual(supportPreferenceKey(),supportPreferenceKey('user1'));assert.notEqual(supportPreferenceKey('user1'),supportPreferenceKey('user2'));
  const list=[{id:'a',displayName:'Autorizado',date:'2026-10-15',verified:true,consent:true},{id:'b',displayName:'Sem consentimento',date:'2026-10-16',verified:true,consent:false},{id:'c',displayName:'Não verificado',date:'2026-10-16',verified:false,consent:true}];
  assert.deepEqual(publishedSupporters(list).map(p=>p.id),['a']);assert.deepEqual(publishedSupporters([]),[]);
});
