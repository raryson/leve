const servings={
  americano:{id:'americano',label:'Copo americano',ml:190,icon:'americano'},
  mug:{id:'mug',label:'Caneca',ml:300,icon:'mug'},
  tall:{id:'tall',label:'Copo alto',ml:300,icon:'tall'},
  coffee:{id:'coffee',label:'Xícara de café',ml:50,icon:'cup'},
  espresso:{id:'espresso',label:'Espresso',ml:40,icon:'cup'},
  beer:{id:'beer',label:'Copo de cerveja',ml:300,icon:'beer'},
  pint:{id:'pint',label:'Caneca de cerveja',ml:500,icon:'beer'},
  can:{id:'can',label:'Lata',ml:350,icon:'can'},
  longneck:{id:'longneck',label:'Long neck',ml:330,icon:'bottle'},
  bottle:{id:'bottle',label:'Garrafa de cerveja',ml:600,icon:'bottle'},
  wine:{id:'wine',label:'Taça de vinho',ml:150,icon:'wine'},
  halfWine:{id:'half-wine',label:'Meia porção de vinho',ml:75,icon:'wine'},
  shot:{id:'shot',label:'Dose de 50 ml',ml:50,icon:'shot'},
  smallShot:{id:'small-shot',label:'Dose de 30 ml',ml:30,icon:'shot'},
  vermouth:{id:'vermouth',label:'Dose de 60 ml',ml:60,icon:'shot'},
};
export function beverageServings(food){
  if(food?.unit!=='ml')return [];
  // Mixed drinks scale the recipe, never the capacity of a glass full of ice.
  if(food.beverageKind==='cocktail')return [1,2].map(count=>({id:'drink-'+count,label:count===1?'1 drink':'2 drinks',ml:food.defaultAmount*count,icon:food.drinkIcon||'rocks'}));
  const keys=food.beverageKind==='beer'?['americano','beer','pint','can','longneck','bottle']:food.beverageKind==='wine'?['wine','halfWine']:food.beverageKind==='spirit'?['smallShot','shot','vermouth']:food.id==='nespresso-espresso'?['espresso','coffee','americano','mug']:['americano','mug','tall'];
  return keys.map(key=>servings[key]);
}
