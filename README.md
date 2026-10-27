# Leve — seu ritmo, seus dados

PWA em React + Vite para registrar alimentação, peso, água e movimento. Cálculos de alimentos rodam no dispositivo, sem depender de ChatGPT: `gramas × kcal por 100 g ÷ 100`.

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

O catálogo local tem 40 opções com referências da TACO, de fabricantes e do manual da SBD, além da opção para informar o rótulo. Carnes têm corte e preparo identificados; aproximações são sinalizadas. Pasta de amendoim e cremes têm atalhos de colher com gramas editáveis. Sólidos usam gramas, pão de forma também aceita fatias com peso editável, e as novas bebidas usam ml; atenção ao preparo e à parte comestível. IA não é necessária, e a importação JSON do fluxo antigo continua disponível.

Sem login, os dados continuam no `localStorage` deste navegador, na chave original `leve-state-v3`, com migração dos backups antigos. Com login, cada conta usa uma cópia local própria e um diário no PostgreSQL Neon. A cópia de visitante não é enviada automaticamente: use **Importar dados deste dispositivo** quando a conta estiver vazia ou restaure um backup pelo perfil. A prévia tem outro endereço e não enxerga os registros locais do endereço antigo; nesse caso, transfira um backup.

## Login e sincronização

Projeto vinculado: `rarysonrosts-projects/leve`. Recursos reais provisionados pelo Marketplace: `leve-db` (Neon Free, São Paulo, sem Neon Auth) e `leve-login` (Clerk Hobby). `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` é mapeada para a configuração pública do Vite; `CLERK_SECRET_KEY` e URLs do banco ficam somente no servidor. `.env.local` e `.vercel/` são ignorados pelo Git e não devem ser compartilhados.

`api/journal.js` expõe GET/PUT autenticados pelo Clerk. O proprietário vem do token verificado, nunca do corpo da requisição. Cada diário tem versão e identificador de operação: repetições são idempotentes; versão antiga retorna 409. A API e as respostas de autenticação não entram no cache do service worker.

O app envia alterações pendentes após salvar/fechar o registro e verifica a nuvem ao voltar à aba, recuperar conexão ou a cada minuto. A cópia local inclui a alteração pendente, permitindo nova tentativa. Falhas mantêm os dados no navegador. Conflitos **não são mesclados automaticamente**: exporte sua cópia e escolha a versão completa. Se outra aba local mudar os dados durante uma edição, o app pede para recarregar antes de sobrescrever.

O cache é separado por conta. A sessão Clerk pode precisar de rede ao abrir o app; o modo **Continuar localmente** acessa apenas os dados de visitante. Ainda falta migrar para IndexedDB, sincronizar eventos individuais e validar dois dispositivos simultâneos em modo avião.

Para desenvolver com a API, use a CLI Vercel autenticada e o projeto vinculado:

```sh
vercel env pull .env.local --yes --scope rarysonrosts-projects
npm run db:migrate
vercel dev --listen 127.0.0.1:3000 --scope rarysonrosts-projects
```

`npm run dev`/`npm run preview` servem somente a interface; a API exige `vercel dev` ou uma implantação Vercel. `scripts/verify-db.mjs` testa isolamento, conflitos e idempotência numa transação desfeita ao final, sem ler conteúdo pessoal. Execute com `node --env-file=.env.local scripts/verify-db.mjs`.

**Endereço principal:** `https://leve-fawn.vercel.app`. Por escolha do usuário, o app mantém o domínio gratuito da Vercel e a instância atual de desenvolvimento do Clerk; não há domínio próprio nem migração de usuários. O modo de produção do Clerk exige domínio próprio, então continuam valendo os limites de desenvolvimento desse serviço. O banco principal é usado somente por novas implantações Production. Preview e Development usam os bancos lógicos separados `leve_preview` e `leve_development`, no mesmo recurso Neon Free, sem copiar diários reais. Isso separa os dados de teste, mas compartilha endpoint e credenciais; não equivale a branches ou papéis independentes. Implantações antigas anteriores a essa mudança mantêm a configuração antiga. Nenhum plano pago foi contratado para esta publicação.

## Minhas refeições e busca de alimentos

No registro do dia, **Alimento** abre um buscador visual com texto, categorias, favoritos e recentes. As ilustrações SVG representam categorias; não são fotos do alimento ou garantia de preparo. A busca ignora acentos e combina palavras, como “sobrecoxa sem pele”. Estrelas salvam favoritos imediatamente; recentes são atualizados somente ao salvar o dia.

Monte a refeição no rascunho e use **Salvar combinação para repetir**. Dê um nome, como “Almoço de casa”. Em **Minhas refeições**, use **Revisar e usar** para escolher a refeição de destino e ajustar cada quantidade em gramas antes de adicionar. O total é recalculado localmente; usar a combinação não modifica o modelo nem os dias anteriores. Salvar outro modelo com o mesmo nome pede confirmação para atualizar. Exclusão da combinação também preserva os registros anteriores.

Até 100 combinações, com 50 alimentos por combinação. Alimentos precisam ter gramas e kcal/100 g ou ml e kcal/100 ml; registros antigos com apenas um total não são convertidos em porções inventadas. A biblioteca e as preferências fazem parte do backup e do diário da conta, usando a sincronização existente por versão completa. O schema passa para versão 6, preservando dados anteriores; versões antigas do app podem pedir atualização depois que este diário for salvo.

Não há serviço de IA ou armazenamento de fotos nesta funcionalidade. Nenhum recurso pago adicional foi contratado.

## Refeição por voz ou relato

No registro do dia, use **Conte sua refeição**. O ditado usa `SpeechRecognition`/`webkitSpeechRecognition` em português, quando o navegador oferece suporte. O microfone exige HTTPS ou localhost; a prévia HTTP por IP permite somente texto/ditado do teclado. O modo serviço do navegador exige autorização explícita na tela e pode enviar áudio ao provedor do navegador e precisar de internet. O modo somente no dispositivo usa `processLocally` e depende de suporte e pacote de português já instalado; não faz fallback automático para a nuvem. O app não grava arquivos de áudio nem usa uma API de IA.

A transcrição pode ser corrigida antes de **Interpretar e revisar alimentos**. O interpretador local em `src/mealText.js` reconhece itens do catálogo, números por extenso, gramas/kg e colheres com porções de referência. Exemplo: “No almoço comi cento e cinquenta gramas de arroz branco e uma colher de pasta de amendoim”. Cortes ambíguos, alimentos desconhecidos e quantidades sem peso ficam pendentes. Ele não interpreta qualquer prato ou receita.

Revise as sugestões, adicione a refeição ao rascunho e salve o dia. O relato bruto não entra no backup; somente os itens confirmados. O microfone para ao sair do componente; sessões duram até um minuto e podem ser retomadas manualmente. Reconhecimento real de áudio ainda precisa ser validado em navegador compatível em HTTPS; testes cobrem resultados/eventos do reconhecedor e o fluxo de revisão com texto.

Referência técnica: [SpeechRecognition (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).

`src/domain.js` contém validação, migração e cálculo; `src/foods.js` guarda o catálogo com fonte. `scripts/build-sw.mjs` inclui os assets do build no cache da PWA. O service worker é registrado somente no build de produção, em HTTPS ou localhost. Dados e API não são armazenados no cache do service worker.

`vercel.json` configura o build estático e evita cache persistente do service worker. A API roda em Vercel Functions, com pool de conexões PostgreSQL no servidor. A migração SQL versionada fica em `db/migrations/`, e não roda automaticamente no build.

Veja o [roadmap](ROADMAP.md) para arquitetura de sincronização, prioridades e critérios de aceite. A referência calórica é opcional e definida pela pessoa; o app não prescreve dieta nem projeta perda de peso.

## Identidade, instalação e compartilhamento

Ícone vetorial de prato + folha, PNGs de 192/512 px para PWA, ícone maskable com desenho dentro da área segura e Apple Touch Icon PNG de 180 px. Favicons SVG, PNG e ICO, nome de atalho “Leve” e tema verde consistentes. Os ícones fazem parte do cache offline.

A capa social `public/share-cover.png` tem 1200×630 px, com Open Graph e Twitter Card no HTML inicial, sem precisar executar JavaScript. Não contém informações do diário. O Vite usa a URL da implantação em Preview; fora de Preview, o padrão é o domínio verificado `https://leve-fawn.vercel.app`. `SITE_URL` permite substituir a origem para um domínio próprio. As URLs de imagem e canonical são absolutas.

Para alterar o desenho e regenerar os arquivos, edite `scripts/build-brand.mjs` e execute `npm run assets:brand`. O renderizador roda localmente; não há API de imagens ou serviço pago. Os PNGs gerados ficam versionados, e o build normal não depende das fontes do servidor para regenerá-los.

Prévias com Deployment Protection não são acessíveis aos robôs de compartilhamento do WhatsApp/redes sociais. Compartilhe o endereço principal público `https://leve-fawn.vercel.app`, e não as URLs protegidas de prévia. Metatags não removem essa proteção. Atalhos já instalados podem manter o ícone anterior no cache do sistema; reinstalar o atalho pode ser necessário.

## Alimentos pessoais e comunidade

Na aba **Alimentos**, cadastre nome, marca opcional, preparo, categoria, kcal/100 g e referência nutricional. O rótulo por porção em gramas pode ser convertido localmente. O cadastro fica particular por padrão e entra no buscador do registro do dia. **Compartilhar** envia uma sugestão pendente: toda publicação exige revisão humana. Não são enviados dados do diário.

Moderadores definidos por `FOOD_MODERATOR_IDS` (IDs internos Clerk, separados por vírgula, somente no servidor) veem a fila nessa aba. Aprovar exige confirmar a conferência da fonte e registrar um motivo. É possível pedir correção, ocultar publicados e concluir denúncias. O servidor verifica a permissão pela sessão; nenhum e-mail ou ID do autor aparece nas respostas públicas. Não confundir a chave publicável Clerk com uma permissão de moderação.

A API `/api/foods` valida tipos, números finitos, 0–1.000 kcal/100 g, porções de 0,1–10.000 g, consistência da conversão, nomes e referências. O filtro de linguagem é mínimo e não cobre todos os disfarces ou contextos; descrições legítimas recusadas podem ser reformuladas para revisão. Alertas de plausibilidade ajudam o moderador, mas não comprovam a composição. Links HTTPS são abertos pelo usuário, nunca buscados no servidor. São permitidos até 200 alimentos por conta, 20 cadastros/edições por dia e 10 denúncias em 24 horas. Duplicatas por nome, marca e preparo são recusadas.

Editar um publicado o retira da lista pública até nova aprovação. Cancelar uma sugestão pendente a mantém particular. Refeições e modelos existentes guardam a referência usada e não são recalculados por alterações do catálogo. A última lista pública e os alimentos particulares são guardados localmente, separados por conta; consultas offline podem estar desatualizadas. Cadastro exige conexão e só confirma sucesso após resposta do servidor. O catálogo é atualizado ao voltar à aba, reconectar ou a cada minuto, com paginação de 100 itens.

As migrações numeradas usam transação, trava e checksum. `npm run db:migrate` exige `LEVE_DATABASE_URL_UNPOOLED` e migra somente o banco isolado de desenvolvimento. Para preparar uma instalação vinculada existente, `node --env-file=.env.local scripts/setup-test-databases.mjs` cria idempotentemente os bancos lógicos vazios e gera arquivos locais ignorados. `scripts/configure-food-env.mjs` combina as URLs geradas e `.env.foods-moderator.local` com `.env.local`; `--push` configura esses valores nos ambientes Vercel, preservando as URLs originais de produção. Não versionar esses arquivos.

Migração do principal é deliberada: `node --env-file=.env.local scripts/migrate.mjs --production`. Nunca executar testes de escrita no principal. `node --env-file=.env.local scripts/verify-community-db.mjs` exige o banco `leve_development`, usa identidades sintéticas, testa isolamento/moderação/conflitos/limites e remove somente seus próprios registros de teste. Não cria contas Clerk nem altera diários reais. Nenhum serviço pago ou IA foi adicionado.

## Instalação, correções mobile e estatísticas opcionais

A tela Hoje explica que o Leve é uma PWA, com dispensa persistente. Perfil mantém **Como instalar no meu dispositivo** para Safari/iOS, Chrome/Android e Chrome/Edge no computador. `beforeinstallprompt` habilita instalação direta quando suportada; `appinstalled` e modo standalone ocultam o convite. A ajuda não depende desses eventos, não desloca a barra lateral e informa os limites de offline/backup. Instalação real e modo avião em Android/iOS ainda precisam ser verificados nos dispositivos.

No histórico, data e botão usam uma coluna no celular, com largura limitada do campo nativo. Conferido em 320, 360, 390 e 430 px. No registro do dia, alimentos/treinos digitados precisam ser adicionados ou descartados antes de salvar; fechar pede confirmação quando há preenchimento pendente. Trocar de aba com cadastro comunitário não salvo também pede confirmação.

GA4 `G-VF5TNY4EWR`: implementação em `src/analytics.js` e `src/PrivacyControls.jsx`. **Produção ativada em 16/10/2026 após o titular confirmar a Medição otimizada desligada; coleta somente mediante consentimento.** Desative Medição otimizada no fluxo web do Google Analytics, incluindo formulários, buscas, cliques e mudanças de histórico, antes de definir `LEVE_GA4_REVIEWED=true` no ambiente Production da Vercel e republicar. Não basta `send_page_view:false`: a [documentação de pageviews do Google](https://developers.google.com/analytics/devguides/collection/ga4/views) alerta que a medição otimizada pode gerar eventos por histórico. Não ativar sem essa conferência; não adicionar outra tag/contêiner GTM.

Mesmo habilitada no build, a tag roda só em `https://leve-fawn.vercel.app` e após consentimento neste navegador. Antes disso, não se carrega script do Google nem se envia ping de consentimento. Perfil permite recusar ou revogar; bloqueia envios com `ga-disable-G-VF5TNY4EWR` e remove cookies `_ga` host-only desta integração. Dados já recebidos não são apagados pela revogação. As regras usam os [controles de privacidade oficiais do Google](https://developers.google.com/tag-platform/security/guides/privacy).

Somente `app_open`, `page_view` manual, `app_navigation` (home/days/evo/foods/profile) e `pwa_installed` são enviados. Cada navegação consentida gera uma visualização manual, sem duplicar a mesma tela consecutiva; URLs virtuais e títulos são referências fixas, sem query/hash/referrer; não há parâmetros de diário, valores nutricionais, peso, textos, identidade Clerk ou e-mail. Pageview automático, Google Signals e personalização de anúncios ficam desativados. Cookies têm expiração de 30 dias. Não há fila de eventos offline. Bloqueadores, falha de script e armazenamento indisponível não impedem o uso do app. O Google ainda recebe dados técnicos de rede e identificadores próprios quando a pessoa permite, como explicado na interface.

Testes verificam o controle de carga e o conteúdo permitido; recebimento real no GA4/DebugView ainda depende da ativação e do acesso à propriedade. Prévia, desenvolvimento e testes permanecem sem coleta. Não houve contratação de serviço pago.

Decisão do usuário em 14/10/2026: manter a coleta GA4 desligada por enquanto. Não configurar `LEVE_GA4_REVIEWED=true` nem carregar a tag até nova autorização para ativação, após conferir a medição otimizada.

## Português e inglês

O seletor **Idioma / Language** fica somente na tela **Perfil**, junto às configurações do usuário. O cabeçalho, cadastro inicial e carregamento usam a detecção automática do idioma, sem exibir o seletor. No primeiro acesso, o app percorre `navigator.languages` e escolhe o primeiro português/inglês disponível; outros idiomas usam inglês como fallback. Uma escolha manual prevalece e fica na chave `leve-language-v1` deste navegador. Se o armazenamento estiver indisponível, a escolha vale só nesta sessão. Abas da mesma origem acompanham mudanças dessa preferência. A preferência é por navegador, não sincronizada com o diário da conta.

`src/i18n.js` controla a seleção, mensagens parametrizadas, datas/números e idioma do documento. `src/locales/en.json` contém a tradução da interface e do catálogo embutido. A troca atualiza React sem remontar formulários: rascunhos são mantidos. Clerk usa os recursos `ptBR`/`enUS` de `@clerk/localizations`, seguindo a [documentação oficial de localização](https://clerk.com/docs/guides/customizing-clerk/localization); não há mudança nas contas, sessões ou permissões.

IDs de alimentos, categorias e refeições padrão continuam canônicos; a apresentação usa o idioma selecionado. A busca local aceita nomes em português e inglês. Calorias, gramas, kg, cm, ml, fontes e valores do diário não são convertidos ou recalculados pela mudança de idioma. Notas, nomes de modelos e contribuições dos usuários permanecem no idioma em que foram escritos, sem tradução automática ou IA. Os alimentos continuam usando as mesmas referências brasileiras e de fabricantes; tradução não transforma uma referência em outro produto ou preparo.

O ditado solicita `pt-BR` ou `en-US`. O interpretador local aceita inglês com números por extenso, gramas/kg e tablespoons; fatias de pão integral usam a estimativa editável do catálogo. Teaspoons e unidades sem peso continuam pendentes; bebidas devem ser registradas pelo formulário em ml. Cortes ambíguos não são escolhidos automaticamente. Captura real de áudio em inglês ainda exige teste em navegador compatível; interpretação de texto, configuração do reconhecedor e regressões em português são testadas.

O manifesto inglês é `/manifest.en.webmanifest`, com a mesma identidade e os mesmos ícones da PWA; os dois manifestos e o catálogo de tradução entram no cache offline. Idioma, título e descrição do documento acompanham a seleção. Textos de controles nativos do navegador/SO e páginas externas seguem as configurações desses serviços. A capa social estática mantém a identidade atual do Leve.

Testes de internacionalização cobrem detecção, fallback, preferência manual, armazenamento restrito, mensagens parametrizadas, preservação dos dados, busca em inglês, relato com números/porções e ausência de chaves estáticas sem tradução. Analytics continua desligado conforme a decisão anterior; nenhum serviço pago foi adicionado.

## Bebidas e fatias

## Registro por ação

O botão flutuante **+** abre atalhos em leque para refeição, treino, água e peso. Também é possível usar os botões diretos de Hoje. Cada ação tem seu próprio modal: refeição monta apenas os alimentos desse momento, com data, tipo e horário; treino salva uma atividade; água soma o volume informado; peso acrescenta uma pesagem. Histórico permite iniciar uma refeição na data escolhida. **Editar dia** continua disponível para corrigir registros existentes.

Refeições novas são entradas separadas, mesmo com o mesmo tipo (por exemplo, dois lanches). O registro por alimento, modelos salvos e relato revisado alimentam a mesma refeição em montagem. Fechar com alterações pede confirmação; alimentos/modelos/relatos incompletos precisam ser adicionados ou descartados antes de salvar. Os registros são aplicados sobre o estado mais recente, preservando as demais refeições, água, notas e atividades. Horário/ID da refeição são campos aditivos no JSON existente, sem migração SQL ou alteração de registros antigos.

## Bebidas e fatias

O catálogo inclui espresso sem açúcar, café com leite sem açúcar, leite integral preparado, Coca-Cola original/sem açúcar e sucos 100% de laranja/uva. Cada item identifica o produto ou preparo de referência e liga à fonte. Bebidas usam `unit: ml`, `milliliters` e `kcalPer100Ml`; não se assume que ml sejam gramas. Adições de açúcar e outros ingredientes devem ser registradas separadamente. Café com leite é uma receita explícita de volumes iguais de espresso e leite integral preparado; outras proporções exigem registrar os componentes separadamente.

Referências: [Nespresso](https://www.contact.nespresso.com/faq-3/mx/en), [NINHO Integral preparado](https://www.nestleparaespecialistas.com.br/produtos/ninho-integral), [Coca-Cola Brasil](https://www.coca-cola.com/br/pt/brands/coca-cola/produtos) e [Del Valle 100%](https://www.coca-cola.com/br/pt/brands/del-valle/del-valle-100). Sucos são referências de produtos específicos; não equivalem a qualquer suco fresco, néctar ou receita adoçada. Confira o rótulo da marca/país utilizado.

Pão integral de forma começa em uma fatia de 25 g, **estimativa editável**, baseada na porção de 50 g/2 fatias da [Wickbold](https://wickbold.com.br/produtos/grao-sabor-100-natural-tradicional/); não é uma média universal. A referência calórica continua TACO, 253 kcal/100 g, separada da fonte do peso. É possível usar frações de fatia, ajustar o peso e alternar para gramas. Diário/modelos guardam `servingUnit: slice`, `servings`, `gramsPerSlice` e massa total, preservando a porção usada.

Modelos mistos preservam ml/fatias e permitem editar o volume ou a quantidade ao repetir. Backup e API usam a mesma validação. Versão 6 preserva os registros antigos em gramas e suas calorias históricas, sem inventar fatias retroativamente; nenhuma migração SQL é necessária. O relato local entende fatias de pão em português/inglês, mas exclui bebidas por volume para não interpretar kcal/100 ml como kcal/100 g. Não há serviço pago novo; analytics permanece desligado.

## Estimativas de repouso, rotina e exercício

O painel Hoje separa repouso aproximado (basal), rotina sem treino, extra dos treinos, gasto total projetado e consumo registrado. Saldo parcial = consumo registrado menos gasto do dia inteiro estimado. Sem refeições, não exibe um déficit numérico. A basal não é uma meta de ingestão para ficar abaixo, e nenhum déficit ou limite alimentar é prescrito automaticamente. A referência pessoal de kcal permanece independente.

Repouso usa Mifflin–St Jeor: 10 × kg + 6,25 × cm − 5 × idade + coeficiente (+5 masculino, −161 feminino). Fonte: https://pubmed.ncbi.nlm.nih.gov/2305711/ . O Perfil identifica o sexo usado na fórmula e permite escolher movimento fora dos treinos: fatores 1,4 / 1,6 / 1,8, com 1,4 inicial. O NIDDK informa faixa usual de PAL 1,4 a 2,5: https://www.niddk.nih.gov/bwp . A adaptação do Leve para separar rotina de sessões é uma aproximação própria, não reprodução do modelo clínico Body Weight Planner; rotina muito sedentária, condições individuais e registro incompleto podem gerar diferenças importantes.

Exercício e intensidade são escolhidos explicitamente. Referências do Adult Compendium 2024: musculação variada 3,5 MET (02054), musculação vigorosa 6 MET (02050), caminhada plana 3,8 MET (17190), caminhada rápida 4,8 MET (17200) e elíptico moderado 5 MET (02048). Fontes: https://pacompendium.com/conditioning-exercise/ e https://pacompendium.com/walking/ . Gasto bruto = MET × 3,5 × kg / 200 × minutos. Extra = máximo de zero e bruto menos a rotina prevista nesses minutos (rotina diária / 1.440 × minutos). Não somamos basal à rotina outra vez.

Treinos novos guardam referência, MET, peso, duração, gasto bruto e extra usados ao salvar. Validação recalcula os valores derivados e recusa referências/valores inválidos. O painel recalcula apenas a parcela extra contra a rotina atual, sem alterar os snapshots históricos. Atividades sem referência e registros antigos não ganham calorias retroativas; valores antigos sem base compatível são preservados, mas não incluídos no painel novo. Não inferimos exercício a partir de texto livre. Outra atividade permanece disponível sem estimativa. Estimativas são médias, não medição individual, dieta ou garantia de emagrecimento; intensidade, pausas, idade e condições clínicas afetam a aplicabilidade.

Campos aditivos na estrutura JSON atual, sem migração SQL. Tudo é calculado localmente; nenhum serviço pago ou coleta extra. O ícone + usa SVG com traços simétricos e botão sem padding, eliminando o desalinhamento tipográfico.

O resumo de energia fica no topo de Hoje em gráfico de rosca: o arco compara consumo registrado / gasto diário estimado, sem somar duas grandezas que não são partes de um total. Exibe ambos os valores e percentual em texto, com descrição acessível. Acima de 100%, o arco fica completo, muda para âmbar e o percentual real continua visível. Ver detalhes abre um modal com repouso, rotina, extra, saldo parcial, limitações e fontes; as explicações já vêm expandidas. Nenhum cálculo ou registro foi alterado por essa mudança visual.

Catálogo ampliado para 40 opções em 15/10/2026: granola (SBD 2024 p. 106, 174 kcal/40 g), iogurte natural integral médio (SBD 2024 p. 113, 126 kcal/170 g), chia seca Cisbra (359 kcal/100 g), açúcar mascavo TBCA BRC0006K (381 kcal/100 g) e aveia fina Quaker (104 kcal/30 g). Referências: https://diabetes.org.br/wp-content/uploads/2024/11/Manual-contagem-carboidratos2024.pdf , https://cisbra.com.br/chia/ , https://www.tbca.net.br/base-dados/int_composicao_estatistica.php?n0REd3kv7e86D%2BViXWYUnQ%3D%3D=4wpXogwA4ZDyIQG%2B%2BEdEMQ%3D%3D e https://quaker.lat/br/productos-quaker/avenas/aveia-em-flocos-finos-quakerr . Valores convertidos proporcionalmente para 100 g quando a fonte informa porção. Marcas/preparos podem variar; a nota orienta conferir o rótulo. Chia usa peso seco, não gel hidratado. A aveia comum TACO continua separada, sem alterar referências históricas. Busca aceita aveia fina e fine oats; relato local e traduções também incluídos.

### Refeições prontas (16/10/2026)

`src/readyMeals.js` contém receitas ilustrativas, porções em gramas e atalhos no seletor. Valores por 100 g são calculados com fontes explícitas, sem substituir referências antigas. SBD 2024: sushi salmão 38 kcal/30 g e com cream cheese 51 kcal/30 g (p.161); pizza muçarela 278 e calabresa 240 kcal/100 g (p.142); cream cheese 70 kcal/30 g (p.85); sashimi salmão 15 kcal/10 g (referência p.190); pão francês 135 kcal/50 g (p.173); maionese industrializada 52 kcal/17 g (p.123); muçarela 65 kcal/20 g (p.146); manga Haden 67 kcal/100 g (p.123). TACO: arroz cozido 128, patinho grelhado 219, alface americana 9, tomate 15, pepino 10 e toucinho frito 697 kcal/100 g. Pão francês e toucinho são aproximações declaradas para pão de hambúrguer e bacon, respectivamente.

Composições e exclusões estão nos próprios alimentos. São estimativas de receitas fixas, não promessa sobre qualquer restaurante. Porções continuam armazenadas em gramas; `itemQuantity` deriva o rótulo do atalho somente para pesos coincidentes. Testes cobrem proporções, totais, tradução, busca, cópia/repetição e alteração manual de massa. Nenhum dado real foi modificado para testar.

### Copos e álcool (16/10/2026)

`beverageServings.js` define atalhos por tipo de bebida e `BeveragePortions.jsx` renderiza ícones e kcal por porção. Selecionar substitui o volume total; preenchimento manual continua disponível, sem gravar unidade artificial de copo ou converter ml em gramas. Drinks escalam a receita, excluindo capacidade do copo/gelo. Nenhuma alteração no esquema persistido.

`alcoholicDrinks.js`: SBD 2024 cerveja 143 kcal/350 ml (p.79), vinho tinto seco 108/150 ml (p.166), branco seco 99/150 ml (p.165), caipirinha com açúcar 240/200 ml (p.71; fonte sem receita detalhada). Bacardi: [Martini Rosso 15%](https://www.bacardilimited.com/nutrition/martini?brand_locale=es-ES) 87/60 ml e [Bombay Sapphire 40%](https://www.bacardilimited.com/nutrition/bombay-sapphire?brand_locale=es-CO) 66/30 ml. [58 and CO](https://58andco.com/pages/nutritional-information) fornece aproximação do Negroni 185/90 ml com ingredientes próprios; diferença do clássico declarada. Mimosa: 75 ml espumante brut SBD (90 kcal/100 ml) + 75 ml suco Del Valle 100% (44 kcal/100 ml), proporção [IBA](https://iba-world.com/iba-cocktail/mimosa/). Referências de marca/país não garantem equivalência com outro produto. Volumes de copos são ilustrativos e editáveis; americano tradicional de 190 ml documentado pela Nadir.

71 testes aprovados, incluindo totais, ml, modelos repetidos, backup JSON e preservação da água. Componentes revisados: botões com tipo/estado acessível, ícones decorativos, fieldset/legend, nenhuma nova chamada de rede ou biblioteca.

### Gráficos de evolução e registro retroativo (16/10/2026)

`evolutionData.js` cria intervalos de calendário em UTC para evitar desvio de dia por fuso/DST, agrega registros por data e preserva lacunas como null. `EvolutionCharts.jsx` oferece filtros semana/mês, períodos anteriores, quatro séries isoladas e visão combinada (kcal à esquerda, ml à direita), legenda interativa e tabela diária. Valores sem alimentação registrada não viram ingestão zero; dias sem treino registrado mostram zero apenas quando há um registro de dia. Treinos antigos sem referência deixam o gasto desconhecido; combinações com treinos estimáveis são marcadas como parciais.

Basal e rotina usam o Perfil atual como referência em todas as datas; a tela declara que não se trata de uma série histórica medida. Exercício e gasto total usam `dailyEnergy` para manter o mesmo desconto de rotina usado no painel Hoje. Nenhuma recomendação de dieta ou modificação dos snapshots persistidos.

Histórico ganhou ação explícita por cartão e no modal de detalhes para acrescentar refeição. `EntryModal.allowPast` é habilitado somente pelos caminhos do Histórico; fora dele o campo de data de refeição é somente leitura, com mínimo/máximo de hoje e validação no salvamento. A API continua aceitando datas históricas válidas para sincronizar o diário; essa restrição é de fluxo de interface. Inclusão usa `applyEntry` e atualização funcional do estado, preservando outros dados. 74 testes aprovados; validação visual desktop/mobile e inclusão real somente em diário fictício local.

### Catálogo de legumes (16/10/2026)

`src/vegetables.js` adiciona 21 preparos de vegetais e azeite em gramas. Referências simples TACO (IDs originais), grelhados TBCA BRC0263B e BRC0156B, assados BRC0718B (ratatouille, com óleo). Mix grelhado sem óleo = 50% abobrinha grelhada + 50% berinjela grelhada por peso pronto; com azeite = 95% mix + 5% azeite TACO 884 kcal/100 g. São receitas ilustrativas, não valores universais de restaurante. TBCA consultada: abobrinha grelhada 27 kcal/100 g na página de medidas, berinjela 23; outros resultados indexados da abobrinha exibem 24, por isso a referência utilizada está explícita no mix e pode diferir de versões da tabela. Atualizar dados futuros exige cuidado com calorias já persistidas.

Óleo incluído é declarado para mix com azeite, ratatouille e couve refogada. Itens sem óleo orientam registrar extras separadamente; azeite foi adicionado com porção inicial de 5 g. Presets de 100/150/200 g continuam usando o fluxo existente de gramas/modelos/sincronização. IDs conferidos sem duplicatas, tradução e testes existentes aprovados, nenhum diário modificado durante a revisão visual.

## Apoio por Pix

O recebedor autorizou a publicação da chave aleatória, nome e cidade usados em `src/support.js`. A imagem QR é gerada localmente por `npm run assets:support`; após mudar os dados, regenere e rode `npm test`. O teste decodifica a imagem SVG e compara o resultado com o Pix Copia e Cola, sem realizar pagamentos.

A lista pública de agradecimentos é mantida manualmente em `supporters`, no mesmo arquivo. Adicione somente um apelido/nome de exibição autorizado, depois de conferir o recebimento fora do app. Cada entrada usa `id`, `displayName`, `date` (YYYY-MM-DD), `verified: true` e `consent: true`. Não inclua dados bancários, comprovantes, CPF, valor ou contato. Os últimos cinco registros autorizados aparecem no modal; remova a entrada e publique novamente se a pessoa retirar a autorização. Não há integração com banco nem confirmação automática de Pix.

O convite automático acompanha apenas uma pesagem de hoje, salva com sucesso e menor que o último registro datado até hoje. Registros retroativos, importação/sincronização e perfil não abrem o convite. A dispensa fica separada por visitante/conta neste navegador e o apoio manual continua disponível no Perfil.

## Screenshots de divulgação

Capturas em inglês com dados fictícios estão em `public/screenshots/`, com um ZIP para download. Elas mostram a interface real de desktop e mobile; o nome Alex e todos os registros são sintéticos.

Para renovar o diário de demonstração: `node scripts/build-store-demo.mjs YYYY-MM-DD caminho-do-backup.json`. Importe pelo app somente em uma origem local vazia, em modo visitante, sem substituir diários reais nem sincronizar esses dados com uma conta. A data final deve corresponder ao dia da captura. Ajuste o idioma pelo Perfil e capture as telas pelo navegador. O JSON é temporário e não deve ir para a hospedagem; publique somente as imagens revisadas.


## Distribuição Android e páginas públicas

Plano e materiais: [Google Play](distribution/google-play/README.md). Gerar páginas com `node scripts/build-public-pages.mjs` (também executado em `npm run build`) e artes com `node scripts/build-play-assets.mjs`. Privacidade, suporte, regras e solicitação de exclusão funcionam sem conta em `/privacy/`, `/support/`, `/terms/` e `/delete-account/`. Atendimento manual precisa ser efetivamente acompanhado pelo responsável; ver runbook de exclusão. Nenhuma exclusão real foi executada nos testes.

## Academia do condomínio — entregue em 27/10/2026

- Nova tela Treinos, com configuração de esteira, bicicleta, halteres, banco e estação; sugestões educativas A/B, alternativas por equipamento e referências de execução. Início padrão: dois dias de força e uma série, ajustáveis pelo usuário.
- Registro de séries efetivamente realizadas, repetições, carga opcional e minutos de musculação/cardio. Histórico com últimos registros por exercício e alternância A/B pela última sessão de força. Sem prescrição individual ou aumento automático de carga.
- Sessões entram no diário, constância e gráficos existentes. Força moderada (3,5 MET) só é estimada por opção explícita; cardio permanece sem calorias sem intensidade informada. Não somar força e cardio duas vezes.
- Formato do diário v7 preserva dados anteriores e inclui plano/sessões no backup e na sincronização existente. Abas antigas devem ser recarregadas. Sem migração SQL, serviço pago ou novos eventos de analytics.
- Validação automatizada: 100 testes passando, incluindo migração, persistência, API autenticada com repositório simulado, idempotência e exclusão agrupada. Build aprovado. Sincronização real em dois dispositivos permanece como validação manual pendente.
- Conferência publicada: visitante com dados fictícios configurou o plano e salvou duas séries (20 min de força + 10 min de cardio), com carga opcional de 5 kg; recarregamento preservou a sessão, próxima ficha B e presença no Histórico. Textos PT/EN conferidos no desktop (1280 px, sem rolagem horizontal). O navegador de teste não aplicou o redimensionamento solicitado: validação visual em celular e sincronização entre contas/dispositivos continuam pendentes. Deploy de produção confirmado Ready em leve-fawn.vercel.app.

