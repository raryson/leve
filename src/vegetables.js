const taco='https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf';
const zucchini='https://www.tbca.net.br/base-dados-en/int_food_composition_2_edit.php?cod_produto=BRC0263B';
const eggplant='https://www.tbca.net.br/base-dados-en/int_food_composition_2_edit.php?cod_produto=BRC0156B';
const ratatouille='https://tbca.net.br/base-dados/int_composicao_estatistica.php?n0REd3kv7e86D%2BViXWYUnQ%3D%3D=av71d%2BHijsBQbuM2olPoiQ%3D%3D';
const common={category:'Verduras e legumes',defaultAmount:100,sourceLabel:'TACO, 4ª edição',sourceUrl:taco};
const cooked='Pese somente a parte comestível já cozida e escorrida, conforme o preparo indicado. Referência sem óleo adicionado; registre azeite, manteiga e molhos separadamente.';
const raw='Pese a parte comestível crua. Referência sem óleo, molhos ou outros ingredientes; acrescente esses itens separadamente.';
const grilled='Referência TBCA do vegetal grelhado, sem óleo. Pese a parte comestível pronta. Óleo, manteiga, queijo e molhos não estão incluídos.';
const portions=[{grams:100,label:'Porção de 100 g'},{grams:150,label:'Porção de 150 g'},{grams:200,label:'Porção de 200 g'}];
export const vegetables=[
  ...[
    ['taco-100','Brócolis cozido',25,cooked],['taco-109','Cenoura cozida',30,cooked],
    ['taco-118','Couve-flor cozida',19,cooked],['taco-112','Chuchu cozido',19,cooked],
    ['taco-70','Abobrinha italiana cozida',15,cooked],['taco-64','Abóbora cabotiá cozida',48,cooked],
    ['taco-95','Berinjela cozida',19,cooked],['taco-97','Beterraba cozida',32,cooked],
    ['taco-91','Batata inglesa cozida',52,cooked],['taco-88','Batata-doce cozida',77,cooked],
    ['taco-129','Mandioca cozida (aipim / macaxeira)',125,cooked],
    ['taco-142','Pepino cru',10,raw],['taco-157','Tomate cru',15,raw],
    ['taco-77','Alface americana crua',9,raw],['taco-144','Pimentão verde cru',21,raw],
    ['taco-116','Couve-manteiga refogada',90,'Referência TACO de couve refogada, que já inclui óleo e temperos do preparo de referência. Pese pronta. Não some o mesmo óleo novamente; receitas com outra quantidade de gordura podem diferir.'],
  ].map(([id,name,kcal,note])=>({...common,id,name,kcal,note})),
  {...common,id:'tbca-zucchini-grilled',name:'Abobrinha grelhada sem óleo',kcal:27,sourceLabel:'TBCA — BRC0263B',sourceUrl:zucchini,note:grilled},
  {...common,id:'tbca-eggplant-grilled',name:'Berinjela grelhada sem óleo',kcal:23,sourceLabel:'TBCA — BRC0156B',sourceUrl:eggplant,note:grilled},
  {...common,id:'mix-vegetables-grilled',name:'Legumes grelhados — mix sem óleo (estimativa)',kcal:(27+23)/2,defaultAmount:150,presets:portions,sourceLabel:'Receita de referência — abobrinha e berinjela TBCA',sourceUrl:zucchini,extraSources:[{label:'TBCA — berinjela grelhada',url:eggplant}],note:'Mix ilustrativo em partes iguais, pelo peso pronto, de abobrinha e berinjela grelhadas sem óleo. Usa 27 e 23 kcal por 100 g, respectivamente, das referências TBCA consultadas. Outros legumes e proporções mudam o total. Registre óleo e molhos à parte.'},
  {...common,id:'mix-vegetables-grilled-oil',name:'Legumes grelhados com azeite (estimativa)',kcal:95*.25+5*8.84,defaultAmount:150,presets:portions,sourceLabel:'Receita de referência — mix TBCA + azeite TACO',sourceUrl:zucchini,extraSources:[{label:'TBCA — berinjela grelhada',url:eggplant},{label:'TACO — azeite de oliva',url:taco+'#page=45'}],note:'Receita ilustrativa para 100 g prontos: 47,5 g de abobrinha grelhada, 47,5 g de berinjela grelhada e 5 g de azeite retido. O azeite já está incluído; não registre esse mesmo óleo outra vez. Mais óleo, outros legumes ou proporções diferentes mudam o resultado.'},
  {...common,id:'tbca-vegetables-roasted',name:'Legumes assados — ratatouille (ref. TBCA)',kcal:76,defaultAmount:150,presets:portions,sourceLabel:'TBCA — BRC0718B',sourceUrl:ratatouille,note:'Referência TBCA de ratatouille: berinjela, abobrinha, tomate, manjericão, molho de tomate com óleo, cebola e alho, e azeite. Já inclui o óleo do preparo. Pese pronto. Não equivale a batata ou abóbora assada, nem a legumes assados sem óleo; a receita real pode variar.'},
  {id:'taco-260',name:'Azeite de oliva extravirgem',category:'Outros',kcal:884,defaultAmount:5,sourceUrl:taco+'#page=45',sourceLabel:'TACO, 4ª edição',note:'Registre o azeite consumido em gramas. 5 g são aproximadamente 44 kcal; colher e quantidade absorvida variam. Use para acrescentar óleo a referências sem gordura, evitando contar novamente o óleo que já está incluído em uma receita.'},
];
