import {mealSourceText} from './compoundMeal.js';
import {numbers,parseMealText,mealFoodAliases} from './mealText.js';
import {translate} from './i18n.js';

const singular={pessegos:'pessego',peaches:'peach',fatias:'fatia',slices:'slice',colheres:'colher',tablespoons:'tablespoon',unidades:'unidade',units:'unit',bananas:'banana',ameixas:'ameixa',plums:'plum'};
const clean=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9., ]/g,' ').split(/\s+/).filter(Boolean).map(word=>singular[word]||word).join(' ');
const vague=/\bpouq\w*\b|\bpouco\b|\bpouca\b|\bsome\b|\blittle\b|\ba bit\b/;
const filler=new Set('de do da dos das comi comeu como foi ta to esta estou sendo no na o a os as e um uma aproximadamente cerca mais menos aproximadamente aprox pequeno pequena medio media grande fatia slice colher tablespoon sopa cha cafe unidade unit g gram grams grama gramas kg ml l litro litros liter liters mililitro mililitros milliliter milliliters of for had ate i my some a an the'.split(' '));
function aliasesFor(food,language){
  const names=mealFoodAliases(food,language);
  if(language==='en'){const english=translate(food.name,[],'en');names.push(english,english.split(/[,—(·]/)[0].trim().replace(/^traditional /i,''));}
  // A fresh fruit's common name and a jam's flavor are usable without cultivar/brand.
  const base=food.name.split(/[,—(·]/)[0].trim().replace(/\s+tradicional$/i,'');
  names.push(base);
  return [...new Set(names.map(clean))].filter(Boolean);
}
export function sourceMealClauses(text,catalog,language='pt'){
  const context=mealSourceText(text,language);
  const parsed=parseMealText(context.text,language);
  return parsed.rows.filter(source=>!(/\bnao\s+(?:comi|tomei|bebi|consumi|como)\b|\b(?:did not|didn't)\s+(?:eat|drink|have)\b/.test(source.text))).map((source,index)=>{
    const clause=clean(source.text),haystack=` ${clause} `;
    const ranked=catalog.map(food=>{
      const hits=aliasesFor(food,language).filter(alias=>haystack.includes(` ${alias} `)).sort((a,b)=>b.length-a.length);
      return {food,alias:hits[0],score:hits[0]?.split(' ').length||0};
    });
    const best=Math.max(...ranked.map(r=>r.score),0),top=ranked.filter(r=>r.score===best&&best>0);
    const defaults=top.length>1&&top.every(r=>['taco-328','taco-371','sbd-beef-stew-average'].includes(r.food.id))?top.find(r=>r.food.id==='sbd-beef-stew-average'):top.length>1&&top.every(r=>['coffee-milk-half','dolce-gusto-latte-macchiato'].includes(r.food.id))?top.find(r=>r.food.id==='coffee-milk-half'):null;
    const selected=source.foodId?top.find(r=>r.food.id===source.foodId)||ranked.find(r=>r.food.id===source.foodId):top.length===1?top[0]:defaults;
    const food=selected?.food;
    let rest=haystack;
    if(food)for(const alias of aliasesFor(food,language).sort((a,b)=>b.length-a.length))rest=rest.replaceAll(` ${alias} `,' ');
    rest=rest.replace(/\bxicaras?\s+com\b/g,' ');
    rest=rest.replace(/\b(?:xicara|xicaras|cup|cups)\b/g,' ');
    const extra=rest.split(/\s+/).filter(w=>w&&!/^\d+(?:[.,]\d+)?$/.test(w)&&!filler.has(w)&&!vague.test(w));
    const grounded=Boolean(food&&!source.needsSplit&&!extra.length);
    const isVague=vague.test(clause);
    let quantity=source.amount,unit=source.measure==='grams'?'g':source.measure==='slice'?'slice':source.measure==='spoon'?'tablespoon':'unknown';
    const volume=source.text.match(/\b(\d+(?:[.,]\d+)?)\s*(ml|mililitros?|milliliters?|l|litros?|liters?)\b/);
    if(volume){quantity=Number(volume[1].replace(',','.'))*(/^l/.test(volume[2])?1000:1);unit='ml';}
    // Numbers without a measure mean counted foods, never grams.
    if(unit==='unknown'&&!isVague){const count=numbers(source.text,language).match(/\b(\d+(?:[.,]\d+)?)\s+(?!(?:g|gramas?|ml|kg)\b)/);if(count){quantity=Number(count[1].replace(',','.'));unit='unit';}}
    if(isVague&&!volume&&source.measure==='unknown'){quantity=null;unit='unknown';}
    let assumption='';
    const cup=source.text.match(/\b(\d+(?:[.,]\d+)?)\s*xicaras?\b/);
    if(cup&&!volume&&food?.id==='coffee-milk-half'){quantity=Number(cup[1].replace(',','.'))*200;unit='ml';assumption=language==='en'?'Cup estimated at 200 ml, half coffee and half whole milk, without sugar. Adjust if different.':'Xícara estimada em 200 ml, metade café e metade leite integral, sem açúcar. Ajuste se foi diferente.';}
    if(context.breadInferred&&food?.slice&&source.measure==='slice')assumption='Sanduíche estimado com duas fatias por unidade. Ajuste o número ou peso se foi diferente.';
    if(context.sandwich&&food&&source.measure==='unknown'&&!cup&&quantity==null){const grams={'taco-77':10,'taco-157':30,'sbd-pickled-cucumber':10}[food.id];if(grams){quantity=grams*context.count;unit='g';assumption='Porção ilustrativa de recheio de sanduíche, não pesada. Ajuste os gramas se necessário.';}}
    if(food?.id==='sbd-beef-stew-average')assumption=language==='en'?'Average cooked beef reference; cut and sauce were not specified. A tablespoon is estimated at 30 g.':'Referência média de carne bovina cozida; corte e molho não informados. Colher de sopa estimada em 30 g.';
    let question='';
    if(isVague&&unit==='unknown')question=language==='en'?'How much did you have? Choose a reference portion or enter grams.':'Quanto foi esse pouquinho? Escolha uma porção de referência ou informe os gramas.';
    else if(unit==='tablespoon'&&!/\bsopa\b|\btablespoon/.test(clause))question=language==='en'?'Spoon size was not specified. The initial estimate uses the catalog tablespoon; adjust for your spoon.':'O tamanho da colher não foi informado. A estimativa inicial usa a colher de sopa do catálogo; ajuste para a sua colher.';
    return {sourceText:source.text,grounded,row:{id:index,description:food?.name||source.text,foodId:grounded?food.id:'',quantity:quantity??null,unit,question,estimated:Boolean(assumption)||!['g','ml'].includes(unit),assumption,confirmed:false,amount:'',sourceText:source.text}};
  });
}
export const sourceWords=text=>new Set(clean(text).split(' ').filter(word=>word.length>3&&!filler.has(word)&&!/^\d/.test(word)));
