// Deliberately narrow corrections: never fuzzy-match arbitrary food names.
// A transposed letter in milk must not turn peaches into fish or add ingredients.
export function normalizeMealLanguage(text,language='pt'){
  if(language!=='pt')return text;
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/\bcafe\s+(?:com|c\/)\s+liete\b/g,'cafe com leite')
    .replace(/\bhj\b/g,'hoje')
    .replace(/\bc\/\s*/g,'com ')
    .replace(/\bs\/\s*(?=acucar\b)/g,'sem ')
    .replace(/\be\s+(?:tbm|tb|tambem)\s+/g,'e ')
    .replace(/\b(frango|peito)\s+asado\b/g,'$1 assado')
    .replace(/\bsalade\s+de\b/g,'salada de')
    .replace(/\b(?:e\s+)?acompanhad[oa]\s+de\s+/g,', ')
    .replace(/\b(?:no|de|do|durante o)\s+(?:almoco|jantar|lanche)\b/g,'')
    .replace(/\b(?:uma?|1)\s+(?=salada\s+(?:de|com)\s+(?:alface|tomate|picles)\b)/g,'')
    .replace(/\bsalada\s+(?:de|com)\s+(?=(?:alface|tomate|picles)\b)/g,'');
}

// Syntax normalization is deliberately separate from food matching. Never fuzzy
// match an ingredient or discard an unknown filling while cleaning narration.
export function mealNarrative(text,language='pt'){
  let value=normalizeMealLanguage(text,language).replace(/([^\d]),(?=\d)/g,'$1, ').replace(/(\d)(kg|g|ml|l|grams?|gramas?|litros?|ovos?|fatias?|colher(?:es)?|canecas?)\b/gi,'$1 $2').replace(/[+&]/g,', ').replace(/\b(?:mas|but)\s+(?=(?:comi|tomei|bebi|consumi|i ate|i had|i drank)\b)/g,', ').replace(/:(?!\d)/g,', ');
  if(language==='pt'){
    value=value.replace(/(^|[,;\n])\s*(?:(?:eu|hoje)\s+)*(?:(?:no|na|pro|para o|para a)\s+)?(?:cafe da manha|almoco|jantar|lanche|ceia)\b\s*(?:[,;:]\s*)?(?:(?:eu\s+)?(?:comi|tomei|bebi|jantei|almocei|foi|ta sendo)\s+)?/g,'$1 ')
      .replace(/(^|[,;\n]|\be\s+)\s*(?:(?:eu|hoje)\s+)*(?:comi|tomei|bebi|consumi|jantei|almocei)\s+/g,'$1 ');
  }else{
    value=value.replace(/(^|[,;\n])\s*(?:(?:today|for)\s+)*(?:breakfast|lunch|dinner|snack)\b\s*(?:[,;:]\s*)?/g,'$1 ')
      .replace(/(^|[,;\n]|\band\s+)\s*(?:i\s+)?(?:had|ate|drank)\s+/g,'$1 ');
  }
  // Split consecutive measured foods, but keep suffix weights (yogurt of 170 g)
  // and container capacities attached to their original ingredient.
  const measure=/\b\d+(?:[.,]\d+)?\s+(?:kg|g|ml|l|gramas?|grams?|fatias?|slices?|ovos?|eggs?|colher(?:es)?|tablespoons?|teaspoons?)\b/g;
  const matches=[...value.matchAll(measure)];let end=0,out='';
  for(let i=1;i<matches.length;i++){
    const previous=matches[i-1],current=matches[i],between=value.slice(previous.index+previous[0].length,current.index);
    const following=value.slice(current.index+current[0].length);
    if(/[,;\n]|\b(?:e|and)\b/.test(between))continue;
    if(!/[,;\n]/.test(between)&&/[a-z]/.test(between)&&!/(?:\bde|\bof|\bcom|\bwith|\bcaneca|\bxicara|\bmug|\bcup)\s*$/.test(between)&&/^\s+(?:de\s+|of\s+)?[a-z]/.test(following)){
      out+=value.slice(end,current.index).replace(/\s+$/,'')+', ';end=current.index;
    }else if(/\b(?:com|with)\s*$/.test(between)&&/[a-z]/.test(between.replace(/\b(?:com|with)\s*$/,''))&&/^\s+(?:de\s+|of\s+)?[a-z]/.test(following)){
      out+=value.slice(end,current.index).replace(/\s+(?:com|with)\s*$/,'')+', ';end=current.index;
    }
  }
  return out+value.slice(end);
}

export function ambiguousMealText(text,language='pt'){
  const value=text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[−–—]/g,'-');
  return /\b(?:na verdade|corrigindo|quis dizer|correcao|actually|instead|correction)\b/.test(value)
    || /\b\d+(?:[.,]\d+)?\s*(?:a|ate|ou|to|or|-)\s*\d+\b/.test(value)
    || /\b(?:entre|between)\s+\d+/.test(value)
    || /(?:^|[,;]\s*)nao\s+\d+/.test(value)
    || /(?:^|\s)-\s*\d/.test(value);
}
