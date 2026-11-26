import {numbers} from './mealText.js';

// Expand only the structure of a sandwich. Preserve unknown fillings so they
// remain pending rather than disappearing behind a single recipe estimate.
export function mealSourceText(text,language='pt'){
  if(language!=='pt')return {text,sandwich:false};
  let value=numbers(text).replace(/\bsanduiches\b/g,'sanduiche'),sandwich=/\bsanduiche\b/.test(value);
  if(!sandwich||/\bnao\b|\bsem\b|\bna verdade\b|\bcorrigindo\b/.test(value.replace(/\bsem acucar\b/g,'')))return {text,sandwich:false};
  const count=Number(value.match(/\b(\d+)\s+sanduiche\b/)?.[1]||1);
  if(count>5)return {text,sandwich:false};
  const bread=/\bpao (?:de forma(?: integral| branco)?|integral(?: de forma)?)\b/;
  const match=value.match(bread);
  if(!match)return {text,sandwich:false};
  const breadInferred=!/\b\d+\s+fatias?\b|\b\d+(?:[.,]\d+)?\s*(?:g|gramas?)\s+(?:de\s+)?pao\b/.test(value);
  if(breadInferred)value=value.replace(bread,`${count*2} fatias de ${match[0]}`);
  value=value.replace(/\b(?:comi|comemos|foi|era)\s+/g,'').replace(/\b(?:\d+\s+)?sanduiche\s+(?:de|com)\s+/g,'').replace(/\bsanduiche\b/g,'');
  value=value.replace(/\b(?:e\s+)?acompanhad[oa]\s+de\s+/g,', ').replace(/\bcom\s+(?:salad[ae]\s+de\s+)?(?=(?:\d+\s+(?:colher|fatias?)|alface|tomate|picles|carne)\b)/g,', ');
  value=value.replace(/\b(?:no|de|do)\s+almoco\b/g,'').replace(/\bsalad[ae]\s+de\s+/g,'');
  // Bread can be specified after the filling: keep each as its own clause.
  value=value.replace(/\s+(?=\d+\s+fatias?\s+de\s+pao)/g,', ');
  return {text:value,sandwich:true,count,breadInferred};
}
