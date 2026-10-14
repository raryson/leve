import { foods } from './foods.js';
import { portionCalories } from './domain.js';

const normalize = text => text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const words = { zero: 0, um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, onze: 11, doze: 12, treze: 13, catorze: 14, quatorze: 14, quinze: 15, dezesseis: 16, dezasseis: 16, dezessete: 17, dezoito: 18, dezenove: 19, vinte: 20, trinta: 30, quarenta: 40, cinquenta: 50, sessenta: 60, setenta: 70, oitenta: 80, noventa: 90, cem: 100, cento: 100, duzentos: 200, duzentas: 200, trezentos: 300, trezentas: 300, quatrocentos: 400, quinhentos: 500, seiscentos: 600, setecentos: 700, oitocentos: 800, novecentos: 900, mil: 1000, meia: 0.5, meio: 0.5 };
const wordPattern = Object.keys(words).join('|');
const englishWords={zero:0,one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,thirteen:13,fourteen:14,fifteen:15,sixteen:16,seventeen:17,eighteen:18,nineteen:19,twenty:20,thirty:30,forty:40,fifty:50,sixty:60,seventy:70,eighty:80,ninety:90,hundred:100,thousand:1000,half:.5};
function numbers(text,language='pt') {
  if(language==='en'){
    const pattern=Object.keys(englishWords).join('|');
    return normalize(text).replace(/\b[1-9]\d{0,2}(?:,\d{3})+(?:\.\d+)?\b/g,value=>value.replaceAll(',','')).replace(/-/g,' ').replace(/\bhalf (?:a|an)\s+/g,'half ').replace(/\b(?:a|an)\s+(tablespoons?|teaspoons?|spoonfuls?)\b/g,'1 $1').replace(new RegExp(`\\b(?:${pattern})(?:\\s+(?:and\\s+)?(?:${pattern}))*\\b`,'g'),phrase=>{
      let total=0,current=0;for(const word of phrase.split(/\s+/).filter(w=>w!=='and')){if(word==='hundred')current=(current||1)*100;else if(word==='thousand'){total+=(current||1)*1000;current=0;}else current+=englishWords[word];}return String(total+current);
    });
  }
  return normalize(text).replace(new RegExp(`\\b(?:${wordPattern})(?:\\s+(?:e\\s+)?(?:${wordPattern}))*\\b`, 'g'), phrase => {
    let total = 0, current = 0;
    for (const word of phrase.split(/\s+/).filter(w => w !== 'e')) {
      if (word === 'mil') { total += (current || 1) * 1000; current = 0; }
      else current += words[word];
    }
    return String(total + current);
  });
}
const aliases = {
  'taco-1': ['arroz', 'arroz integral'], 'taco-3': ['arroz', 'arroz branco'],
  'taco-7': ['aveia'], 'taco-164': ['abacaxi'], 'taco-179': ['banana', 'banana nanica'], 'taco-182': ['banana', 'banana prata'],
  'taco-561': ['feijao', 'feijao carioca'], 'taco-567': ['feijao', 'feijao preto'], 'taco-577': ['lentilha'],
  'taco-328': ['carne de panela', 'carne de gado de panela', 'acem', 'carne de panela acem'],
  'taco-371': ['carne de panela', 'carne de gado de panela', 'musculo', 'carne de panela musculo'],
  'taco-396': ['coxa', 'coxa de frango', 'coxa assada', 'coxa de frango assada'],
  'taco-411': ['sobrecoxa', 'sobrecoxa de frango', 'sobrecoxa assada', 'sobrecoxa com pele'],
  'taco-413': ['sobrecoxa', 'sobrecoxa de frango', 'sobrecoxa assada', 'sobrecoxa sem pele'],
  'approx-taco-423': ['salsichao', 'linguica', 'linguica suina', 'salsichao assado'],
  'taco-432': ['carne de porco', 'carne suina', 'lombo', 'lombo de porco'],
  'taco-435': ['carne de porco', 'carne suina', 'pernil', 'pernil de porco'],
  'taco-430': ['carne de porco', 'carne suina', 'costela de porco', 'costela suina'],
  'taco-428': ['bisteca', 'bisteca de porco', 'bisteca suina', 'bisteca frita', 'bisteca na frigideira'],
  'taco-429': ['bisteca', 'bisteca de porco', 'bisteca suina', 'bisteca grelhada'],
  'approx-taco-377': ['bife', 'bife de gado', 'patinho', 'bife de patinho'],
  'approx-taco-346': ['bife', 'bife de gado', 'contrafile', 'contrafile sem gordura'],
  'approx-taco-344': ['bife', 'bife de gado', 'contrafile', 'contrafile com gordura'],
  'taco-52': ['pao integral', 'pao de forma integral'], 'kibon-creme': ['sorvete', 'sorvete de creme'],
  nutella: ['nutella', 'creme de avela'], 'ninho-recheio': ['creme de ninho', 'creme de leite ninho', 'recheio de ninho'],
  'sbd-power-one-integral': ['pasta de amendoim'],
};
const singular = { coxas: 'coxa', sobrecoxas: 'sobrecoxa', bifes: 'bife', bananas: 'banana', salsichoes: 'salsichao',thighs:'thigh',drumsticks:'drumstick',sausages:'sausage',steaks:'steak',chops:'chop',beans:'bean',lentils:'lentil' };
const englishAliases={
  'taco-1':['rice','brown rice'],'taco-3':['rice','white rice'],'taco-7':['oats','rolled oats','oatmeal'],'taco-164':['pineapple'],'taco-179':['banana','cavendish banana'],'taco-182':['banana','prata banana'],
  'taco-561':['beans','carioca beans'],'taco-567':['beans','black beans'],'taco-577':['lentils'],
  'taco-328':['beef stew','pot roast','chuck','beef chuck'],'taco-371':['beef stew','pot roast','shank','beef shank'],
  'taco-396':['chicken drumstick','drumstick'],'taco-411':['chicken thigh','thigh with skin','chicken thigh with skin','chicken thigh skin on'],
  'taco-413':['chicken thigh','skinless chicken thigh','chicken thigh without skin','chicken thigh skinless'],
  'approx-taco-423':['sausage','pork sausage'],'taco-432':['pork','pork loin'],'taco-435':['pork','pork leg'],'taco-430':['pork','pork ribs'],
  'taco-428':['pork chop','fried pork chop','pan fried pork chop'],'taco-429':['pork chop','grilled pork chop'],
  'approx-taco-377':['beef steak','knuckle steak'],'approx-taco-346':['beef steak','striploin steak','trimmed striploin steak'],'approx-taco-344':['beef steak','striploin steak','striploin steak with fat'],
  'taco-52':['whole wheat bread','wholemeal bread','whole grain bread'],'kibon-creme':['ice cream','vanilla ice cream'],nutella:['nutella','hazelnut spread','hazelnut cocoa spread'],'ninho-recheio':['ninho cream','ninho milk cream'],'sbd-power-one-integral':['peanut butter'],
};
const tokens = text => normalize(text).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(t => t && !['de', 'do', 'da'].includes(t)).map(t => singular[t] || t).join(' ');
function candidatesFor(text,language='pt') {
  const haystack = ` ${tokens(text)} `;
  if (/\bnao\b/.test(normalize(text))||(language==='en'&&/\b(?:not|didn't|did not)\b/.test(text))) return { candidates: [], needsSplit: false };
  const ranked = foods.map(food => {
    const name = normalize(food.name);
    if(language==='en'){
      if(/skinless|without skin/.test(text)&&/com pele/.test(name))return {id:food.id,score:0};
      if(/with skin|skin on/.test(text)&&/sem pele/.test(name))return {id:food.id,score:0};
      if(/trimmed|without fat/.test(text)&&/com gordura/.test(name))return {id:food.id,score:0};
      if(/with fat/.test(text)&&/sem gordura/.test(name))return {id:food.id,score:0};
    }
    if (/\bsem pele\b/.test(text) && /com pele/.test(name)) return { id: food.id, score: 0 };
    if (/\bcom pele\b/.test(text) && /sem pele/.test(name)) return { id: food.id, score: 0 };
    if (/\bsem gordura\b/.test(text) && /com gordura/.test(name)) return { id: food.id, score: 0 };
    if (/\bcom gordura\b/.test(text) && /sem gordura/.test(name)) return { id: food.id, score: 0 };
    const matches = [food.name, ...((language==='en'?englishAliases:aliases)[food.id] || [])].map(alias => {
      const needle = tokens(alias);
      const start = haystack.indexOf(` ${needle} `);
      return { score: start >= 0 ? needle.split(' ').length : 0, start, end: start + needle.length + 1 };
    }).sort((a, b) => b.score - a.score);
    return { id: food.id, ...matches[0] };
  });
  const best = Math.max(0, ...ranked.map(r => r.score));
  const top = ranked.filter(r => r.score > 0 && r.score === best);
  const separate = (a, b) => a.end <= b.start || b.end <= a.start;
  // Independent food mentions must not disappear merely because one name is
  // more specific than another, e.g. "arroz branco com feijão".
  const needsSplit = top.some(a => top.some(b => separate(a, b))) || ranked.some(r => r.score > 0 && top.every(t => separate(r, t)));
  return { candidates: top.map(r => r.id), needsSplit };
}

export function resolveGrams(row, foodId = row.foodId) {
  if (row.measure === 'grams') return row.amount;
  const food = foods.find(f => f.id === foodId);
  if (row.measure === 'spoon' && food?.portion?.label.includes('colher de sopa')) return row.amount * food.portion.grams;
  return '';
}
export function parseMealText(transcript,language='pt') {
  if (!transcript.trim()) throw new Error('Fale ou digite a refeição primeiro.');
  if (transcript.length > 5000) throw new Error('Divida relatos longos em refeições menores (até 5.000 caracteres).');
  const text = numbers(transcript,language);
  const meal = /cafe da manha|breakfast/.test(text) ? 'Café da manhã' : /jantar|jantei|dinner|supper/.test(text) ? 'Jantar' : /ceia|late snack/.test(text) ? 'Ceia' : /lanche|snack/.test(text) ? 'Lanche' : 'Almoço';
  const clauses = text.split(language==='en'?/\s+and\s+|[,;\n](?!\d)|\.(?!\d)/:/\s+e\s+|[,;\n](?!\d)|\.(?!\d)/).map(s => s.trim()).filter(s => s && !/^(?:hoje |no |na |eu )*(?:almoco|jantar|lanche|ceia|cafe da manha|comi|almocei|jantei|foi|tive)(?: eu| comi)?$/.test(s));
  const rows = clauses.map((clause, index) => {
    const masses = [...clause.matchAll(/\b(\d+(?:[.,]\d+)?)\s*(kg|kilograms?|quilos?|quilogramas?|gramas?|grams?|g)\b/g)];
    if (masses.length > 1) return { id: index, text: clause, candidates: [], foodId: '', measure: 'unknown', amount: null, grams: '', needsSplit: true };
    const mass = clause.match(/\b(\d+(?:[.,]\d+)?)\s*(kg|kilograms?|quilos?|quilogramas?|gramas?|grams?|g)\b/);
    const spoon = clause.match(language==='en'?/\b(\d+(?:[.,]\d+)?)\s*(tablespoons?|tbsp|teaspoons?|tsp|spoonfuls?)\b/:/\b(\d+(?:[.,]\d+)?)\s*colher(?:es)?(?:\s+(?:de\s+)?(sopa|cha|cafe))?/);
    const { candidates, needsSplit } = candidatesFor(clause,language);
    const foodId = !needsSplit && candidates.length === 1 ? candidates[0] : '';
    const measure = mass ? 'grams' : spoon && !['cha', 'cafe'].includes(spoon[2])&&!/^teaspoon|^tsp/.test(spoon[2]) ? 'spoon' : 'unknown';
    const amount = mass ? Number(mass[1].replace(',', '.')) * (/^(kg|quilo|kilogram)/.test(mass[2]) ? 1000 : 1) : spoon ? Number(spoon[1].replace(',', '.')) : null;
    const row = { id: index, text: clause, candidates, foodId, measure, amount, needsSplit };
    return { ...row, grams: resolveGrams(row) };
  });
  if (!rows.length) throw new Error('Conte os alimentos e as quantidades da refeição.');
  return { meal, rows };
}

export function reviewedItems(rows) {
  if (!rows.length) throw new Error('Inclua pelo menos um alimento.');
  return rows.map(row => {
    if (row.needsSplit) throw new Error('Separe os alimentos do trecho por “e” ou vírgula e interprete novamente.');
    const food = foods.find(f => f.id === row.foodId);
    if (!food) throw new Error(`Escolha o alimento para “${row.text}”. Se ele não estiver na lista, use o registro por rótulo.`);
    const calories = portionCalories(row.grams, food.kcal);
    return { food: food.name, quantity: `${row.grams} g`, grams: Number(row.grams), kcalPer100: food.kcal, calories, source: food.sourceUrl || food.referenceId || food.id, referenceNote: food.note || '', entryMethod: 'reviewed-dictation' };
  });
}
