import {normalizeMealLanguage} from './mealLanguage.js';
import {mealSourceText} from './compoundMeal.js';
import {numbers,parseMealText,mealFoodAliases} from './mealText.js';
import {translate} from './i18n.js';

const singular={pessegos:'pessego',peaches:'peach',fatias:'fatia',slices:'slice',colheres:'colher',tablespoons:'tablespoon',unidades:'unidade',units:'unit',bananas:'banana',ameixas:'ameixa',plums:'plum'};
const clean=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9., ]/g,' ').split(/\s+/).filter(Boolean).map(word=>singular[word]||word).join(' ');
const vague=/\bpouq\w*\b|\bpouco\b|\bpouca\b|\bsome\b|\blittle\b|\ba bit\b/;
const filler=new Set('de do da dos das comi comeu como foi ta to esta estou sendo no na o a os as e um uma aproximadamente bem cerca mais menos aproximadamente aprox pequeno pequena medio media grande fatia slice colher tablespoon sopa cha cafe unidade unit g gram grams grama gramas kg ml l litro litros liter liters mililitro mililitros milliliter milliliters of for had ate i my some a an the'.split(' '));
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
  let previousUnit=null;
  return parsed.rows.filter(source=>!(/\bnao\s+(?:comi|tomei|bebi|consumi|como)\b|\b(?:did not|didn't)\s+(?:eat|drink|have)\b/.test(source.text))).map((source,index)=>{
    const clause=clean(source.text),haystack=` ${clause} `;
    const ranked=catalog.map(food=>{
      const hits=aliasesFor(food,language).filter(alias=>haystack.includes(` ${alias} `)).sort((a,b)=>b.length-a.length);
      return {food,alias:hits[0],score:hits[0]?.split(' ').length||0};
    });
    const best=Math.max(...ranked.map(r=>r.score),0),top=ranked.filter(r=>r.score===best&&best>0);
    const defaults=top.length>1&&top.every(r=>['taco-1','taco-3'].includes(r.food.id))?top.find(r=>r.food.id==='taco-3'):top.length>1&&top.every(r=>['usda-05064','taco-406'].includes(r.food.id))?top.find(r=>r.food.id==='usda-05064'):top.length>1&&top.every(r=>['taco-328','taco-371','sbd-beef-stew-average'].includes(r.food.id))?top.find(r=>r.food.id==='sbd-beef-stew-average'):top.length>1&&top.every(r=>['coffee-milk-half','dolce-gusto-latte-macchiato'].includes(r.food.id))?top.find(r=>r.food.id==='coffee-milk-half'):null;
    const selected=source.foodId?top.find(r=>r.food.id===source.foodId)||ranked.find(r=>r.food.id===source.foodId):top.length===1?top[0]:defaults;
    const food=selected?.food;
    let rest=haystack;
    if(food)for(const alias of aliasesFor(food,language).sort((a,b)=>b.length-a.length))rest=rest.replaceAll(` ${alias} `,' ');
    rest=rest.replace(/\bxicaras?\s+com\b/g,' ');
    rest=rest.replace(/\b(?:xicara|xicaras|cup|cups|caneca|canecas|mug|mugs)\b/g,' ');
    const extra=rest.split(/\s+/).filter(w=>w&&!/^\d+(?:[.,]\d+)?$/.test(w)&&!filler.has(w)&&!vague.test(w));
    const grounded=Boolean(food&&!source.needsSplit&&!extra.length);
    const isVague=vague.test(clause);
    let quantity=source.amount,unit=source.measure==='grams'?'g':source.measure==='slice'?'slice':source.measure==='spoon'?'tablespoon':'unknown';
    const volume=source.text.match(/\b(\d+(?:[.,]\d+)?)\s*(ml|mililitros?|milliliters?|l|litros?|liters?)\b/);
    if(volume){quantity=Number(volume[1].replace(',','.'))*(/^l/.test(volume[2])?1000:1);unit='ml';}
    const shorthand=source.text.match(/^\s*(\d+(?:[.,]\d+)?)\s+(?:de|of)\s+/);
    const inherited=previousUnit==='g'&&source.measure==='unknown'&&!volume&&shorthand&&food?.unit!=='ml'&&food&&!food.slice&&!food.countedUnitGrams&&food.category!=='Frutas'&&!/^1 (?:banana|pêssego|ameixa)/.test(food.portion?.label||'');
    if(inherited){quantity=Number(shorthand[1].replace(',','.'));unit='g';}
    previousUnit=source.measure==='grams'||inherited?'g':null;
    // Outside the explicit shorthand above, bare numbers mean counts, not grams.
    if(unit==='unknown'&&!isVague){const count=numbers(source.text,language).match(/\b(\d+(?:[.,]\d+)?)\s+(?!(?:g|gramas?|ml|kg)\b)/);if(count){quantity=Number(count[1].replace(',','.'));unit='unit';}}
    if(isVague&&!volume&&!inherited&&source.measure==='unknown'){quantity=null;unit='unknown';}
    let assumption=inherited?'A unidade em gramas foi mantida do item anterior. Confira a quantidade.':'';
    if(grounded&&food?.id==='taco-3'&&!/\bbranco\b|\bwhite\b/.test(clause))assumption=[assumption,'Tipo não informado: usei arroz branco cozido como referência. Troque se foi integral ou outro preparo.'].filter(Boolean).join(' ');
    if(grounded&&food?.id==='usda-05064'&&!/sem pele|skinless/.test(clause))assumption=[assumption,'Pele não informada: usei peito assado sem pele. Troque para com pele se também consumiu a pele.'].filter(Boolean).join(' ');
    if(food?.countedUnitGrams&&unit==='unit')assumption='Unidade média estimada: 45 g por ovo cozido, sem casca. Ajuste para o tamanho que consumiu.';
    if(context.breadSpread&&food&&quantity==null&&!isVague){const grams=food.id==='sbd-power-one-integral'?food.portion?.grams:food.id==='jam-fig-casa-madeira'?food.portion?.grams/2:null;if(grams){quantity=grams;unit='g';assumption='Cobertura sem quantidade informada: porção inicial de referência para as fatias, não por fatia. Ajuste se necessário.';}}
    const mug=source.text.match(/\b(\d+(?:[.,]\d+)?)\s*(?:canecas?|mugs?)\b/);
    if(mug&&!volume&&food?.id==='coffee-milk-half'){quantity=Number(mug[1].replace(',','.'))*300;unit='ml';assumption='Caneca estimada em 300 ml, metade café e metade leite integral, sem açúcar. Ajuste se foi diferente.';}
    const cup=source.text.match(/\b(\d+(?:[.,]\d+)?)\s*xicaras?\b/);
    if(!mug&&!volume&&food?.id==='coffee-milk-half'&&(cup||context.sandwich&&(quantity==null||unit==='unit'))){quantity=(cup?Number(cup[1].replace(',','.')):unit==='unit'?quantity:1)*200;unit='ml';assumption=language==='en'?'Cup estimated at 200 ml, half coffee and half whole milk, without sugar. Adjust if different.':'Xícara estimada em 200 ml, metade café e metade leite integral, sem açúcar. Ajuste se foi diferente.';}
    if(context.breadInferred&&food?.slice&&source.measure==='slice')assumption='Sanduíche estimado com duas fatias por unidade. Ajuste o número ou peso se foi diferente.';
    if((context.sandwich||context.salad)&&food&&source.measure==='unknown'&&!cup&&quantity==null){const grams={'taco-77':15,'taco-157':15,'sbd-pickled-cucumber':15}[food.id];if(grams){quantity=grams*(context.count||1);unit='g';assumption=context.sandwich?'Estimativa de 15 g por ingrediente da salada em cada sanduíche, não pesada. Ajuste se necessário.':'Salada sem peso informado: referência inicial de 15 g por ingrediente. Ajuste se necessário.';}}
    if(food?.id==='sbd-beef-stew-average')assumption=language==='en'?'Average cooked beef reference; cut and sauce were not specified. A tablespoon is estimated at 30 g.':'Referência média de carne bovina cozida; corte e molho não informados. Colher de sopa estimada em 30 g.';
    let question='';
    if(isVague&&unit==='unknown')question=language==='en'?'How much did you have? Choose a reference portion or enter grams.':'Quanto foi esse pouquinho? Escolha uma porção de referência ou informe os gramas.';
    else if(unit==='tablespoon'&&!/\bsopa\b|\btablespoon/.test(clause))question=language==='en'?'Spoon size was not specified. The initial estimate uses the catalog tablespoon; adjust for your spoon.':'O tamanho da colher não foi informado. A estimativa inicial usa a colher de sopa do catálogo; ajuste para a sua colher.';
    return {sourceText:source.text,grounded,row:{id:index,description:grounded?food.name:source.text,foodId:grounded?food.id:'',quantity:quantity??null,unit,question,estimated:Boolean(assumption)||!['g','ml'].includes(unit),assumption,confirmed:false,amount:'',sourceText:source.text}};
  });
}
const preparationWords=new Set('cozido cozida cozidos cozidas assado assada assados assadas grelhado grelhada frito frita fritos fritas cru crua cozimento preparado preparada salted boiled cooked roasted grilled fried skinless'.split(' '));
export function mentionsFood(text,food,language='pt'){
  if(!food)return false;
  const value=' '+clean(normalizeMealLanguage(text,language))+' ';
  return aliasesFor(food,language).some(alias=>{const index=value.indexOf(' '+alias+' ');return index>=0&&!/\b(?:sem|without)$/.test(value.slice(0,index).trim());});
}
export const sourceWords=text=>new Set(clean(text).split(' ').filter(word=>word.length>3&&!filler.has(word)&&!preparationWords.has(word)&&!/^\d/.test(word)));
