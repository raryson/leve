import {foodSearchQuery,offProduct} from '../src/externalFoods.js';

const FIELDS=['code','product_name','product_name_pt','product_name_en','brands','nutriments','nutrition_data_per','no_nutrition_data','categories_tags','data_quality_errors_tags'];
const HEADERS={'User-Agent':'Leve/1.0 (+https://leve-fawn.vercel.app/support/)','Accept':'application/json'};
export function createFoodSearchHandler({fetcher=fetch,now=Date.now}={}){
  const cache=new Map(),pending=new Map();let calls=[];
  const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':status===200&&!body.stale?'public, max-age=300, s-maxage=86400':'no-store','X-Content-Type-Options':'nosniff',...(status===429?{'Retry-After':'60'}:{})}});
  async function read(url,options){
    const response=await fetcher(url,{...options,headers:{...HEADERS,...options?.headers},signal:AbortSignal.timeout(6500),redirect:'error'});
    if(!response.ok)throw Object.assign(Error('upstream'),{status:response.status});
    const body=await response.text();if(body.length>2000000)throw Error('oversize');
    return JSON.parse(body);
  }
  async function lookup(query){
    // Use the official full-text API first. The legacy endpoint may return 503
    // for specific terms; it is only a fallback, never a rate-limit bypass.
    try{
      const data=await read('https://search.openfoodfacts.org/search',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q:query.replace(/[+\-=!(){}\[\]\^"~*?:\\/|<>]/g,' '),fields:FIELDS,page_size:20,langs:['pt','en']})});
      if(!Array.isArray(data.hits)||data.timed_out)throw Error('format');return data.hits;
    }catch(error){
      if([400,401,403,429].includes(error.status))throw error;
      const url=new URL('https://world.openfoodfacts.org/cgi/search.pl');url.search=new URLSearchParams({search_terms:query,search_simple:'1',action:'process',json:'1',page_size:'20',fields:FIELDS.join(',')});
      const data=await read(url);if(!Array.isArray(data.products))throw Error('format');return data.products;
    }
  }
  return async request=>{
    if(request.method!=='GET')return reply({error:'Método não permitido.'},405);
    let query;try{query=foodSearchQuery(new URL(request.url).searchParams.get('q'));}catch(e){return reply({error:e.message},400);}
    const key=query.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),time=now(),cached=cache.get(key);
    if(cached?.expires>time)return reply(cached.value);
    if(pending.has(key))return (await pending.get(key)).clone();
    calls=calls.filter(t=>time-t<60000);
    // Four jobs, at most two provider requests each; repeated terms use cache.
    if(calls.length>=4)return reply({error:'Muitas buscas. Aguarde um minuto e tente novamente.'},429);
    calls.push(time);
    const job=(async()=>{
      try{
        const products=await lookup(query);
        const foods=[...new Map(products.slice(0,20).map(offProduct).filter(Boolean).map(f=>[f.id,f])).values()].slice(0,8);
        const value={foods,source:'Open Food Facts',license:'ODbL',licenseUrl:'https://opendatacommons.org/licenses/odbl/1-0/'};
        if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(key,{value,expires:time+86400000});return reply(value);
      }catch(error){
        if(cached&&time<cached.expires+6*86400000)return reply({...cached.value,stale:true});
        if(error.status===429)return reply({error:'Muitas buscas. Aguarde um minuto e tente novamente.'},429);
        return reply({error:'O Open Food Facts está temporariamente indisponível. Tente novamente em instantes; as referências locais continuam disponíveis.',code:'provider-unavailable'},503);
      }
    })();pending.set(key,job);try{return (await job).clone();}finally{pending.delete(key);}
  };
}
