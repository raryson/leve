import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {parseSync} from 'rolldown/utils';
import {detectLanguage,initialLanguage,translate,setLanguage,getLanguage,LANGUAGE_KEY} from '../src/i18n.js';
import {foods} from '../src/foods.js';
import {searchFoods} from '../src/foodLibrary.js';
import {foodName,itemName} from '../src/foodLabels.js';
import {parseMealText,reviewedItems} from '../src/mealText.js';
import {createDictation} from '../src/speech.js';

test('detecção respeita preferências do navegador e escolha salva; armazenamento indisponível não bloqueia',()=>{
  assert.equal(detectLanguage(['pt-PT','en-US']),'pt');assert.equal(detectLanguage(['en-GB','pt-BR']),'en');assert.equal(detectLanguage(['es-AR','fr']),'en');
  assert.equal(initialLanguage({getItem:()=> 'pt'},['en-US']),'pt');assert.equal(initialLanguage({getItem:()=> 'xx'},['en-US']),'en');assert.equal(initialLanguage({getItem:()=>{throw Error();}},['pt-BR']),'pt');
});
test('trocar idioma não escreve no diário nem traduz textos próprios; IDs e calorias permanecem iguais',()=>{
  const before=JSON.stringify(foods),writes=[];const previous=globalThis.localStorage;
  globalThis.localStorage={setItem:(...args)=>writes.push(args)};
  try{setLanguage('en');assert.equal(getLanguage(),'en');assert.equal(foodName(foods[0]),'Brown rice, cooked');assert.equal(itemName({foodId:'taco-3',food:'Arroz branco tipo 1, cozido'}),'White rice, cooked');assert.equal(itemName({food:'My family recipe'}),'My family recipe');assert.equal(foodName({id:'community:test',name:'Receita da família'}),'Receita da família');assert.deepEqual(writes,[[LANGUAGE_KEY,'en']]);assert.equal(JSON.stringify(foods),before);setLanguage('invalid');assert.equal(getLanguage(),'en');}finally{globalThis.localStorage=previous;setLanguage('pt');}
});
test('mensagens parametrizadas traduzem erros do servidor sem perder detalhes ou texto do usuário',()=>{
  assert.equal(translate('Nome: use de 2 a 120 caracteres.',[],'en'),'Name: use between 2 and 120 characters.');
  assert.equal(translate('Não foi salvo: Data inválida.',[],'en'),'Not saved: Invalid date.');
  assert.equal(translate('Oi, {0}!',['Raryson'],'en'),'Hi, Raryson!');assert.equal(translate('Anotação pessoal: almoço',[],'en'),'Anotação pessoal: almoço');
});
test('busca em inglês mantém as referências nutricionais originais e os filtros canônicos',()=>{
  assert.equal(searchFoods('black beans','Todos')[0].id,'taco-567');assert.equal(searchFoods('bread','Grãos e pães')[0].id,'taco-52');assert.equal(searchFoods('peanut butter','Favoritos',['sbd-power-one-integral'])[0].id,'sbd-power-one-integral');
});
test('relato em inglês reconhece números, gramas e colheres sem converter unidades ambíguas',()=>{
  const result=parseMealText('For lunch I ate one hundred and fifty grams of white rice and one tablespoon of peanut butter','en');assert.equal(result.meal,'Almoço');assert.equal(result.rows.length,2);assert.equal(result.rows[0].foodId,'taco-3');assert.equal(result.rows[0].grams,150);assert.equal(result.rows[1].grams,15);assert.equal(reviewedItems(result.rows)[0].calories,192);
  assert.equal(parseMealText('100 grams of skinless chicken thighs','en').rows[0].foodId,'taco-413');assert.equal(parseMealText('one teaspoon of peanut butter','en').rows[0].grams,'');assert.equal(parseMealText('two slices of whole wheat bread','en').rows[0].grams,'');
  assert.equal(parseMealText('half a kilogram of black beans','en').rows[0].grams,500);
  assert.equal(parseMealText('1,000 grams of black beans','en').rows[0].grams,1000);
});
test('ditado usa inglês quando solicitado e mantém português por padrão',()=>{
  let instance;class Recognition{constructor(){instance=this;}abort(){}start(){}stop(){}}
  const options={local:false,onText:()=>{},onStart:()=>{},onEnd:()=>{},onError:()=>{}};createDictation(Recognition,{...options,lang:'en-US'});assert.equal(instance.lang,'en-US');createDictation(Recognition,options);assert.equal(instance.lang,'pt-BR');
});
test('todas as chaves estáticas da interface têm inglês e nenhuma comparação depende de texto traduzido',async()=>{
  const en=JSON.parse(await readFile(new URL('../src/locales/en.json',import.meta.url),'utf8')),missing=[];
  function visit(n,file){if(!n||typeof n!=='object')return;
    if(n.type==='CallExpression'&&n.callee.name==='t'&&n.arguments[0]?.type==='Literal'){const key=n.arguments[0].value.trim();if(!(key in en))missing.push(`${file}: ${key}`);}
    if(n.type==='BinaryExpression')assert.ok(![n.left,n.right].some(a=>a.type==='CallExpression'&&a.callee.name==='t'),`${file}: comparação traduzida`);
    for(const value of Object.values(n)){if(Array.isArray(value))value.forEach(n=>visit(n,file));else if(value&&typeof value==='object')visit(value,file);}
  }
  for(const file of(await readdir(new URL('../src/',import.meta.url))).filter(f=>f.endsWith('.jsx'))){const source=await readFile(new URL('../src/'+file,import.meta.url),'utf8');visit(parseSync(file,source,{sourceType:'module'}).program,file);}
  assert.deepEqual(missing,[]);for(const food of foods){assert.ok(en[food.name]);if(food.note)assert.ok(en[food.note]);}
});
