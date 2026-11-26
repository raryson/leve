// Deliberately narrow corrections: never fuzzy-match arbitrary food names.
// A transposed letter in milk must not turn peaches into fish or add ingredients.
export function normalizeMealLanguage(text,language='pt'){
  if(language!=='pt')return text;
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()
    .replace(/\bcafe\s+(?:com|c\/)\s+liete\b/g,'cafe com leite')
    .replace(/\bsalade\s+de\b/g,'salada de')
    .replace(/\b(?:e\s+)?acompanhad[oa]\s+de\s+/g,', ')
    .replace(/\b(?:no|de|do|durante o)\s+(?:almoco|jantar|lanche)\b/g,'')
    .replace(/\b(?:uma?|1)\s+(?=salada\s+(?:de|com)\s+(?:alface|tomate|picles)\b)/g,'')
    .replace(/\bsalada\s+(?:de|com)\s+(?=(?:alface|tomate|picles)\b)/g,'');
}
