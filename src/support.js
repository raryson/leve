export const supportRecipient={key:'7a3a2235-ade3-4e03-9f8f-17dd98f14eb4',name:'Raryson Pereira Rost',city:'Gravataí'};
const field=(id,value)=>id+String(value.length).padStart(2,'0')+value;
const ascii=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();
export function crc16(value){
  let crc=0xffff;
  for(const char of value){crc^=char.charCodeAt(0)<<8;for(let i=0;i<8;i++)crc=((crc<<1)^((crc&0x8000)?0x1021:0))&0xffff;}
  return crc.toString(16).toUpperCase().padStart(4,'0');
}
export function pixPayload(recipient=supportRecipient){
  const merchant=field('00','br.gov.bcb.pix')+field('01',recipient.key);
  const code=field('00','01')+field('26',merchant)+field('52','0000')+field('53','986')+field('58','BR')+field('59',ascii(recipient.name).slice(0,25))+field('60',ascii(recipient.city).slice(0,15))+field('62',field('05','***'))+'6304';
  return code+crc16(code);
}
export const supportPreferenceKey=owner=>'leve-support-dismissed-v1:'+encodeURIComponent(owner||'guest');
export function shouldOfferSupport(weights,entry,today){
  if(entry.type!=='weight'||entry.date!==today||!Number.isFinite(Number(entry.value)))return false;
  const dated=weights.filter(w=>w.date&&w.date<=today).sort((a,b)=>a.date.localeCompare(b.date));
  const previous=dated.at(-1);
  return Boolean(previous&&Number(entry.value)<previous.value);
}

// Add only after the owner verifies receipt AND obtains permission to publish this alias.
// Public fields only: {id, displayName, date, verified:true, consent:true}.
export const supporters=[];
export const publishedSupporters=entries=>entries.filter(e=>e.verified===true&&e.consent===true&&typeof e.displayName==='string'&&e.displayName.trim()).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
