import {foodSearchQuery,offProduct} from '../src/externalFoods.js';

export function createFoodSearchHandler({fetcher=fetch,now=Date.now}={}){
  const cache=new Map(),pending=new Map();let calls=[];
  const reply=(body,status=200)=>Response.json(body,{status,headers:{'Cache-Control':status===200?'public, max-age=300, s-maxage=86400':'no-store','X-Content-Type-Options':'nosniff'}});
  return async request=>{
    if(request.method!=='GET')return reply({error:'Método não permitido.'},405);
    let query;try{query=foodSearchQuery(new URL(request.url).searchParams.get('q'));}catch(e){return reply({error:e.message},400);}
    const key=query.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase(),time=now();
    if(cache.get(key)?.expires>time)return reply(cache.get(key).value);
    if(pending.has(key))return (await pending.get(key)).clone();
    calls=calls.filter(t=>time-t<60000);
    if(calls.length>=8)return reply({error:'Muitas buscas. Aguarde um minuto e tente novamente.'},429);
    calls.push(time);
    const job=(async()=>{
      try{
        const url=new URL('https://world.openfoodfacts.org/cgi/search.pl');
        url.search=new URLSearchParams({search_terms:query,search_simple:'1',action:'process',json:'1',page_size:'20',fields:'code,product_name,product_name_pt,product_name_en,brands,nutriments,nutrition_data_per,no_nutrition_data,categories_tags,data_quality_errors_tags'});
        const response=await fetcher(url,{headers:{'User-Agent':'Leve/1.0 (+https://leve-fawn.vercel.app/support/)','Accept':'application/json'},signal:AbortSignal.timeout(12000),redirect:'error'});
        if(!response.ok)throw Error('upstream');
        const body=await response.text();if(body.length>2000000)throw Error('oversize');
        const data=JSON.parse(body);if(!Array.isArray(data.products))throw Error('format');
        const foods=[...new Map(data.products.slice(0,20).map(offProduct).filter(Boolean).map(f=>[f.id,f])).values()].slice(0,8);
        const value={foods,source:'Open Food Facts',license:'ODbL',licenseUrl:'https://opendatacommons.org/licenses/odbl/1-0/'};
        if(cache.size>=100)cache.delete(cache.keys().next().value);cache.set(key,{value,expires:time+86400000});return reply(value);
      }catch{return reply({error:'A busca online está indisponível agora. O catálogo local continua disponível.'},503);}
    })();pending.set(key,job);try{return (await job).clone();}finally{pending.delete(key);}
  };
}
