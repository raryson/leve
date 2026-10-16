# Leve — roadmap de evolução

Atualizado em 14/10/2026. Objetivo: um diário rápido e confiável para acompanhar alimentação, peso, água e movimento, funcionando offline e depois sincronizando entre dispositivos.

## Ordem das próximas entregas

Sequência confirmada pelo usuário após a publicação do catálogo:

1. **Implementado:** corrigir a sobreposição entre data e botão Registrar dia no histórico mobile. Conferido em 320, 360, 390 e 430 px.
2. **Implementado:** orientação dispensável da PWA na tela Hoje e ajuda permanente no Perfil, com instruções por plataforma. Instalação real em Android/iOS ainda precisa de dispositivo.
3. **Revisão inicial concluída:** histórico/detalhes, formulários e navegação responsiva. Corrigida perda de preenchimentos de alimento/treino ao salvar o dia sem adicionar; agora exige adicionar ou descartar. Cadastro comunitário pede confirmação ao trocar de aba com alterações não salvas. Regressões de persistência/sincronização cobertas pelos testes existentes; validação completa offline em dois dispositivos continua pendente.
4. **Integração preparada, coleta desligada:** Google tag GA4 `G-VF5TNY4EWR`, consentimento explícito com recusa/revogação no Perfil, apenas origem pública e build Production. Ativar `LEVE_GA4_REVIEWED=true` em Production somente após confirmação de Medição otimizada desligada no fluxo GA4. Eventos permitidos: abertura, navegação por identificador fixo de tela e instalação; sem dados do diário. Falta confirmar configuração externa e verificar recebimento real no GA4. Não é contêiner GTM.

O status de cada item acima distingue implementação, validação e configuração externa pendente.

## Catálogo comunitário de alimentos

**Status:** implementada em 14/10/2026; publicada no endereço principal e conferida com a conta moderadora. Cadastros particulares, compartilhamento com revisão humana obrigatória, moderação, denúncias e integração ao buscador. Nome Leve mantido; sem IA ou serviço pago adicional.

### Fluxo e dados

- Usuário autenticado cadastra um alimento para uso próprio e escolhe explicitamente **Compartilhar com a comunidade**. Cadastros privados não são publicados automaticamente.
- Campos: nome, marca opcional, categoria, estado/preparo (cru, cozido, assado etc.), kcal por 100 g da parte comestível e fonte verificável (rótulo ou tabela nutricional). Porção opcional tem peso em gramas; o app converte calorias por porção para a referência por 100 g.
- Ao compartilhar, o alimento é enviado ao banco e recebe status `pending`, `published` ou `rejected`, com motivo. Alimentos publicados aparecem no buscador de todos, identificados como **Comunidade** e com fonte; a base oficial permanece identificada separadamente.
- Estrutura própria no banco: UUID, autor interno obtido da sessão, campos nutricionais, fonte, versão, datas, status e motivo de moderação. Não expor e-mail, perfil ou diário do autor.

### Validação mínima obrigatória no servidor

- Repetir a validação na API, independentemente do formulário. Limites e restrições também no banco; soma e conversão continuam locais, sem confiar em totais enviados pelo cliente.
- Aceitar apenas números finitos: recusar `NaN`, infinito, overflow, negativos, campos vazios e unidades ambíguas. Faixa técnica inicial: **0 a 1.000 kcal/100 g**; zero precisa de referência que o justifique. Essa faixa é um limite de entrada, não uma confirmação de plausibilidade nutricional.
- Porções: peso finito maior que zero e até 10.000 g, com unidade explícita. Recalcular kcal/100 g a partir de kcal e gramas do rótulo quando informadas; inconsistências bloqueiam a publicação. Não converter ml em g sem uma densidade fundamentada.
- Nome de 2 a 120 caracteres após normalização Unicode, remoção de controles e espaços repetidos; rejeitar nomes vazios, só símbolos, links, spam e caracteres invisíveis usados para burlar filtros. Preservar acentos e nomes legítimos em português.
- Verificar termos ofensivos, discriminatórios e tentativas simples de disfarce com normalização de caixa, acentos e separadores. Usar palavras/expressões contextualizadas, evitando bloquear um nome legítimo por conter parte de outra palavra. Informar motivo de rejeição e permitir correção ou revisão de falso positivo.
- Conferir coerência entre nome, preparo, categoria, fonte e calorias. Comparar com referências existentes e rótulos verificáveis; nomes equivalentes e valores muito divergentes, fontes ausentes ou inconclusivas e pratos mistos vão para revisão, sem publicação automática. Exemplos de suspeita: água com centenas de kcal/100 g ou óleo com quase zero kcal/100 g.
- **Limitação explícita:** estar dentro da faixa e ter um nome aceitável não prova que as calorias correspondem ao alimento. Publicação automática só quando a referência e a conversão puderem ser verificadas; nos demais casos, exigir revisão humana. Definir faixas por categoria com fontes antes de usá-las como regra; não inventar valores nutricionais.
- Detectar duplicatas por nome normalizado, marca e preparo; sugerir o alimento existente. Aplicar limite de envios por conta e impedir alterações de registros de outros autores. Não buscar URLs arbitrárias no servidor sem proteção contra acesso a redes internas.

### Publicação, correções e segurança dos registros

- Compartilhar publica apenas o cadastro do alimento, nunca refeições, fotos ou informações pessoais do diário. O usuário pode cancelar uma submissão pendente.
- Denúncia de nome ofensivo, alimento incorreto ou valor nutricional suspeito; responsável pela moderação pode ocultar/rejeitar e registrar o motivo. A fila precisa de um fluxo de revisão utilizável antes do lançamento.
- Alterações de alimentos publicados exigem nova validação/revisão. Refeições já registradas guardam uma cópia da referência e das calorias utilizadas; editar ou ocultar o catálogo não reescreve o histórico.
- Guardar a última lista pública validada para consulta offline, com atualização ao reconectar; submissão só anuncia sucesso após confirmação do servidor. Favoritos e modelos devem preservar a referência quando um alimento for ocultado.
- Isolar o banco de testes do principal antes da migração desta feature; planejar migração versionada, autorização e testes com dados sintéticos.

### Critérios de aceite

1. Uma conta cadastra e compartilha; após aprovação, outra conta encontra e usa o alimento. Cadastro privado e submissão pendente não aparecem publicamente.
2. API recusa valores não finitos, negativos, porções inválidas, nomes ofensivos e tentativas de contornar os limites pelo envio direto de requisições.
3. Valor numericamente válido, mas incompatível com o alimento/fonte, não é publicado automaticamente; duplicata é sinalizada e falso positivo pode ser revisado.
4. Alteração ou ocultação do alimento preserva os dias e modelos existentes. Outra conta não consegue editar o cadastro ou acessar dados privados do autor.
5. Fonte, indicação de contribuição comunitária, estados de envio/revisão e erros ficam claros. Validar o fluxo completo em duas contas, sem leitura de diários reais nos testes.

## Pendências adicionais — histórico mobile, aviso PWA e analytics

**Status:** histórico mobile e orientação PWA implementados em 14/10/2026. Analytics implementado com coleta desligada por escolha do usuário; ver status detalhado acima. Os critérios abaixo continuam como referência, incluindo testes reais de dispositivo ainda pendentes.

### Corrigir sobreposição no histórico mobile

- Bug relatado pelo usuário: no histórico, o botão **Registrar dia** fica sob/sobreposto ao campo de data em telas pequenas.
- Revisar o layout de `.new-date`, largura mínima do campo nativo de data e quebra de linha. Em larguras pequenas, permitir empilhar campo e botão com espaçamento explícito, sem posições que sobreponham controles.
- Aceite: campo e botão inteiramente visíveis, sem sobreposição nem rolagem horizontal, em larguras de 320, 360, 390 e 430 px; testar seletor nativo de data em Android/iOS, zoom e textos maiores.

### Explicar e facilitar a instalação da PWA

- Exibir um aviso discreto e dispensável explicando que o Leve é uma PWA e pode ser instalado/adicionado à tela inicial para abrir como app, sem loja de aplicativos. Manter uma opção **Como instalar** acessível no perfil/ajuda depois de dispensar o aviso.
- Aproveitar o `InstallBanner` existente quando `beforeinstallprompt` estiver disponível, além de fornecer instruções manuais por plataforma, incluindo Safari no iPhone. Não depender desse evento para mostrar a orientação.
- Explicar os limites com clareza: registros e cálculos locais podem funcionar offline após o primeiro carregamento; login, sincronização e atualização de dados compartilhados precisam de internet. Instalar não substitui backup e não garante que o navegador nunca limpará o armazenamento.
- Não mostrar convite de instalação quando já estiver em modo standalone. Respeitar dispensa e evitar avisos repetitivos ou que desloquem a navegação.
- Aceite: instruções úteis em Android/iOS/desktop, dispensa persistente, ausência do aviso no app instalado e teste de abertura offline após o primeiro acesso.

### Analytics — Google Analytics 4

- ID fornecido pelo usuário: **`G-VF5TNY4EWR`**.
- O snippet é a **Google tag (`gtag.js`) para GA4**, carregada de `googletagmanager.com`; não é um contêiner do Google Tag Manager (`GTM-...`). Não instalar os dois por engano nem duplicar a coleta.
- Integrar a tag ao site público em etapa futura, com execução restrita ao ambiente de produção. Não contar prévias, desenvolvimento ou testes internos.
- Definir aviso de privacidade e comportamento de consentimento antes de ativar a coleta; respeitar a escolha de recusar e permitir alterá-la. Documentar o que será medido.
- Medir somente uso agregado necessário, por exemplo instalação, navegação entre abas, registro concluído e reutilização de refeição salva. Não transmitir nomes de alimentos/refeições, relatos, fotos, anotações, nome/e-mail, ID Clerk, peso, idade, metas, calorias ou outros dados pessoais/de saúde. Não usar esses dados em URLs, títulos ou parâmetros de eventos. Revisar também medições automáticas/enhanced measurement para evitar captura involuntária.
- Falha de rede, bloqueador ou recusa de analytics nunca deve bloquear o app, salvar dados ou sincronizar. Analytics não precisa de cache offline nem de acesso ao banco do diário.
- Aceite: ausência de coleta em prévia/desenvolvimento e antes da escolha exigida pelo fluxo de consentimento; eventos únicos na produção, sem dados privados, verificados com ferramentas de depuração do GA4 e inspeção de requisições.

Snippet recebido, guardado apenas como referência (não ativado):

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-VF5TNY4EWR"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-VF5TNY4EWR');
</script>
```

## 1. Base local utilizável — implementada nesta entrega

- Motor de calorias no dispositivo: gramas × kcal/100 g ÷ 100, com arredondamento por item e soma dos itens.
- Catálogo ampliado para **28 opções**, com carnes por corte/preparo, pão integral, sorvete, cremes e pasta de amendoim. Referências de fabricantes e SBD são vinculadas por alimento, com atalhos de porção editáveis. A base usa a [TACO, 4ª edição, tabela 1](https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf). Outros alimentos podem ser cadastrados no registro pelo rótulo; ainda não existe catálogo pessoal persistente.
- Refeições e treinos registrados diretamente no app. Importação de dias do fluxo anterior permanece disponível.
- Histórico com busca, datas completas, detalhes, edição e confirmação de exclusão. Registros retroativos disponíveis pela data no histórico.
- Água por dia, atalhos de 250/500 ml e objetivo pessoal ajustável.
- Objetivo de dias de treino por semana, contagem a partir da segunda-feira e incentivo sem penalidade por faltar.
- Pesagens com data e gráfico que acomoda todos os registros. Pesagens antigas mantêm ordem e ficam sem data quando ela nunca foi registrada.
- Validação de perfil, dias, exercícios e backups; totais recalculados; falhas de gravação visíveis. Cópia anterior guardada antes de cada gravação e cópia original de migração preservada.
- Dados antigos inválidos abrem uma tela de recuperação, sem serem apagados ou substituídos automaticamente.
- Data local do dispositivo, atualizada quando o dia muda. Removida projeção de emagrecimento baseada em registros incompletos e gasto de treino presumido.
- PWA: shell e arquivos do build pré-armazenados; navegação prioriza rede; API e recursos externos não entram no cache. Atualização não depende do cache antigo.

Critério de aceite: registrar alimento + treino + água, salvar, recarregar e encontrar o mesmo dia no histórico. Confirmado em navegador com dados fictícios. O service worker foi verificado em testes de eventos/cache; teste real em modo avião depende de prévia HTTPS ou localhost acessível ao navegador.

## 2. Login e sincronização — primeira versão conectada

**Implementado e provisionado:** checkout vinculado a `rarysonrosts-projects/leve`; Neon Free `leve-db` em São Paulo e Clerk Hobby `leve-login` criados e conectados pelo Marketplace. Migração inicial aplicada. Prévia HTTPS publicada; usuário confirmou criação de conta, login e gravação do perfil. A contagem no banco confirmou um diário real, sem leitura do conteúdo pessoal durante a verificação.

Arquitetura atual: React/Vite + Clerk + Vercel Function autenticada + PostgreSQL Neon. Cada conta tem um diário JSON versionado e cópia local separada. Uploads são idempotentes, atualizações usam comparação de versão e conflitos retornam 409. O usuário escolhe qual diário completo manter, com exportação de backup disponível; não há mesclagem por item. A importação da cópia de visitante é explícita.

Próximos passos:

1. Decisão atual do usuário: manter `leve-fawn.vercel.app` e a instância existente de desenvolvimento do Clerk, sem comprar domínio ou alterar planos. Uma instância de produção do Clerk só será considerada se houver domínio próprio no futuro.
2. **Implementado:** bancos lógicos `leve_preview` e `leve_development` separados do principal no recurso Neon Free existente. Novas implantações escolhem a conexão por ambiente; migrações locais exigem URL isolada, e o principal exige `--production`. Sem cópia de diários. Endpoint e credenciais ainda são compartilhados; branches/papéis independentes ficam para uma etapa futura. Configurar origens permitidas se houver domínio próprio.
3. Criar entidades separadas: perfil, refeições/itens, pesagens, eventos de água e sessões de treino. Cada registro recebe UUID, `user_id`, versão, datas de criação/edição e exclusão lógica.
4. Manter a autorização existente por sessão verificada ao passar do diário completo para entidades individuais. Adicionar exclusão de conta/dados com recuperação definida.
5. Migrar a persistência local para IndexedDB, com fila de alterações offline, estado de sincronização e última sincronização bem-sucedida. A tela só anuncia sincronização após confirmação do servidor.
6. Sincronizar eventos por ID com idempotência, cursor do servidor e versões. Água vira eventos individuais para duas adições offline não se sobrescreverem. Conflitos de edição do mesmo registro ficam visíveis para resolução, sem apagar silenciosamente dados.
7. Evoluir a importação atual para mesclar registros por ID com deduplicação, preservando o backup. Exclusões por evento usam tombstones para não ressuscitarem em outro dispositivo.
8. Verificar dois dispositivos: criar online, editar offline, reconectar, repetir requisição, sair da conta e entrar novamente. Isolar também cache local por conta.

Critério de aceite completo: a mesma conta vê os mesmos registros em dois aparelhos, inclusive após edição offline, sem duplicação; outra conta não consegue ler nenhum registro. A primeira versão já foi verificada com testes de API, isolamento SQL, idempotência e conflito, além de login/gravação reais confirmados pelo usuário. Ainda falta a validação completa em dois aparelhos e a mesclagem por evento.

## Visual de rotina — implementado em prévia

- Conta integrada ao cabeçalho; sincronização detalhada no perfil, com erros e conflitos visíveis também na tela atual. Removidos os banners que deslocavam a barra lateral.
- Navegação lateral no desktop ancorada ao topo; navegação inferior no celular, com espaço reservado para o conteúdo e a área segura do dispositivo.
- Painel direto de calorias, água e peso; atalhos de registro; constância semanal de treino.
- Estilos unificados para histórico, detalhes, pesagens, perfil, recuperação e formulários. Tipografia sem serifa, campos maiores e estados de foco visíveis.
- Registro manual aparece primeiro; ditado e relato ficam em uma seção expansível com revisão dos alimentos.
- Verificado em navegador com diário fictício em desktop e celular: inclusão de alimento, salvar, histórico/detalhes, pesagens e perfil. Testes existentes: 26 aprovados.

## 3. Alimentação mais prática

- Ampliar catálogo com origem, edição da fonte, alimento cru/cozido e unidades explícitas; conferir licenciamento antes de distribuir uma base maior.
- **Implementado:** buscador visual com categorias, busca sem acentos, favoritos e recentes. Ilustrações locais por categoria, sem fotos externas ou IA. Alimentos pessoais persistentes implementados no catálogo comunitário. Edição de quantidades de itens já registrados continua pendente.
- Rótulos por porção, receitas com rendimento final e porções pesadas; nunca tratar ml como g sem densidade conhecida.
- **Implementado:** Minhas refeições, modelos nomeados com porções em gramas, revisão de quantidades e destino antes de adicionar uma cópia ao rascunho. Modelos, favoritos e recentes entram no backup e no diário sincronizado da conta. Repetir diretamente um dia do histórico e copiar dia inteiro continuam pendentes.
- Marcar dia como completo ou parcial. Relatórios de consumo usam apenas dias completos e mostram cobertura dos dados.
- Ditado do navegador e interpretação local já implementados, com relato editável, revisão de cada alimento e confirmação de quantidades. Modo local depende do navegador/pacote de português; modo do serviço do navegador exige autorização e pode usar internet. A prévia HTTP por IP não habilita microfone. Ainda falta validar captura real em HTTPS. IA para receitas livres continua como possibilidade futura; soma e cálculo permanecem locais.

## 4. Rotina e incentivo

- Planejamento simples dos dias de academia e check-in de treino.
- Resumo semanal de constância, água e registros, com evolução do peso observado; sem prometer um peso futuro.
- Lembretes opcionais, horários silenciosos e controle para desligar. Push entre dispositivos exige backend; não assumir que timers do navegador funcionam com o app fechado.
- Personalizar objetivos e mensagens; valorizar retomada e pequenas ações, sem culpa por interromper uma sequência.

## 5. Confiança e manutenção

- Editar/excluir pesagens com confirmação e recuperação, exportar dados completos e excluir conta/dados quando houver nuvem.
- Testes de migração e sincronização em CI, prévia HTTPS e teste em Android/iOS instalado, teclado, leitor de tela e modo avião.
- Fixar versões de dependências após revisar compatibilidade; evitar `latest` no manifesto. Manter atualizações deliberadas.
- Monitoramento sem conteúdo de refeições ou dados pessoais nos logs; política de privacidade clara antes da sincronização.
- Revisar metas automáticas com fontes e profissional qualificado antes de oferecê-las. Hoje o app tem apenas referências pessoais ajustáveis.

## Validação desta entrega

`npm test`: testes de migração, porções, importação inválida, datas, armazenamento, constância e eventos do service worker.

`npm run build`: gera app e lista de assets para cache offline.

Navegador: criação de perfil fictício, água, 150 g de arroz branco = 192 kcal, treino de 45 minutos, detalhes do histórico, nova pesagem e persistência ao recarregar. Layout conferido em largura de celular. Clerk: usuário confirmou cadastro/login e perfil salvo na conta. Banco: verificação em transação desfeita e contagem do diário real. API implantada: resposta 401 sem sessão Clerk. Prévia publicada; nenhuma promoção para produção.


Validação de Minhas refeições: 32 testes aprovados; migração v4→v5, backup, validação de porções, cópia sem mutar modelo, busca/filtros e API autenticada. Navegador com diário fictício: 200 g de arroz + 100 g de feijão = 333 kcal; reutilização com 150 g de arroz = 269 kcal; revisão pendente bloqueia salvar; combinação preservada ao recarregar.

Identidade e compartilhamento: ícone prato + folha, PWA PNG 192/512, maskable 512, Apple 180, favicons e capa social 1200×630. Metatags OG/Twitter no HTML inicial com URLs por implantação. Validado formato/dimensões e build; validação real da tela inicial em Android/iOS e unfurl social público continuam pendentes de dispositivo e publicação pública.

Publicação pública em 14/10/2026: manter a configuração Clerk/Neon existente por escolha do usuário; liberar visual, biblioteca de refeições, ícones e metatags no endereço principal da Vercel. Remover a rota e as dependências da análise de fotos cancelada. Não alterar planos, domínios ou conteúdo dos diários.

Verificação da publicação pública: implantação `dpl_C3zonqxrJLadcPqJRMxvBrSAijPw`, endereço `https://leve-fawn.vercel.app`. HTML/manifesto/capa/ícones/SW responderam 200 sem bypass, inclusive com user-agent de robô social. `/api/journal` respondeu 401 sem sessão e `/api/photo` respondeu 404. Formulário Clerk abriu no navegador; não foi criada conta nem lido conteúdo de diário na verificação pública. Cache antigo observado no primeiro acesso; recarregar trouxe a versão nova.


Catálogo comunitário em 14/10/2026: 38 testes aprovados e build concluído. Verificação SQL no banco isolado com identidades sintéticas cobriu cadastro particular, envio, isolamento entre contas, aprovação concorrente, edição, cancelamento, denúncia, ocultação e limites; dados sintéticos removidos. Migrações 002/003 aditivas aplicadas ao principal sem modificar diários. API pública: consulta 200 com lista vazia, cadastro sem sessão 401, diário sem sessão 401. Navegador autenticado: aba Alimentos e fila de moderação presentes, conversão de 90 kcal/150 g para 60 kcal/100 g conferida sem salvar; formulário cancelado. Layout conferido em 320 e 390 px, sem rolagem horizontal no catálogo. Ainda não houve publicação de um alimento real nem teste manual de duas contas Clerk usando o mesmo alimento; o fluxo entre identidades foi coberto no SQL isolado.

Implantação final do catálogo: `dpl_7rZRtwFB6Sarret4VrBJo42coZee`, publicada em `https://leve-fawn.vercel.app`. Versão final confirmada no HTML público; catálogo 200 sem dados privados, fila e denúncias vazias conferidas na sessão moderadora. Nenhum alimento de teste salvo na conta real.


Validação dos ajustes de rotina em 14/10/2026: 41 testes aprovados; build concluído. No navegador com diário fictício: data/botão sem sobreposição nas quatro larguras, preenchimentos pendentes de alimento e treino bloquearam Salvar dia, descarte permitiu fechar sem alterações, ajuda manual de instalação no Perfil disponível mesmo sem beforeinstallprompt. Nenhum script Google carregado no ambiente local. Nenhum registro real alterado. Testes do analytics cobrem bloqueio sem consentimento, ambiente desativado/offline, lista de eventos permitidos, URLs fixas, revogação, cookies e ausência de tag duplicada.

Decisão do usuário em 14/10/2026: manter a coleta GA4 desligada por enquanto. Não configurar `LEVE_GA4_REVIEWED=true` nem carregar a tag até nova autorização para ativação, após conferir a medição otimizada.

Publicação dos ajustes: `dpl_2pZ4EAH35NGLGZTTN5pKCY8pKJ6B`, endereço principal `https://leve-fawn.vercel.app`. Navegação agora reposiciona a nova aba no topo. Aviso acessível de cadastro não salvo conferido na sessão real: Continuar editando preservou o texto e Cancelar cadastro limpou o rascunho; nenhum alimento foi salvo. Ajuda PWA e controles de privacidade presentes em produção; nenhum script Google carregado. Coleta mantida desligada conforme resposta explícita do usuário. HTML, manifesto, SW e catálogo responderam 200, diário sem autenticação respondeu 401. O build em produção avisou sobre bundle acima de 500 kB (cerca de 145 kB gzip); otimização de carregamento fica como manutenção futura.

## Internacionalização — português e inglês

Implementado em 14/10/2026: detecção do navegador com fallback em inglês, seletor sempre acessível no cabeçalho/cadastro inicial, preferência local persistente e atualização entre abas. Tradução de navegação, perfil, histórico, peso/água, registro, biblioteca de refeições, catálogo/comunidade/moderação, instalação, privacidade, erros e confirmações. Login Clerk localizado; manifesto inglês com identidade PWA preservada e suporte offline. Datas e números seguem o idioma; unidades métricas e dados permanecem iguais.

Busca de alimentos em português/inglês e relato local em inglês, incluindo números por extenso, gramas/kg e tablespoons. Sem tradução automática de contribuições e textos pessoais. Sem alteração de plano, contas, diários, schema ou valores nutricionais; analytics continua desligado.

Validação: 48 testes aprovados e build concluído; detecção, preferência, fallback, erros, dados intactos e interpretação em inglês cobertos. Navegador com diário fictício: idioma mudou sem alterar os registros, busca peanut butter funcionou, porção de colher foi traduzida, relato 150 g de white rice + 100 g de black beans resultou em 269 kcal e rascunho de perfil permaneceu ao trocar o idioma. Conferência final em produção concluída: catálogo, moderação, manifesto inglês, cache offline e ausência de tag Google confirmados. Screenshots desktop/mobile registrados. Captura de áudio e instalação real em Android/iOS permanecem pendentes de dispositivo.


Internacionalização publicada: `dpl_9BcyqCTh9GrqrR5VdJxp3M5ZxiKV`, endereço `https://leve-fawn.vercel.app`. Manifesto inglês 200 (`lang: en`, mesmo `id: /`), catálogo 200, diário sem sessão 401, SW inclui ambos os manifestos. Navegador autenticado: catálogo e moderação em inglês, seletor funcional; português restaurado na aba do usuário após a conferência. Login em inglês conferido no navegador local sem criar conta. Build em produção: cerca de 189 kB gzip no bundle principal; otimização do carregamento de traduções/localizações permanece possível em manutenção futura.

## Bebidas e pão por fatias — 14/10/2026

- [x] Catálogo embutido com 35 opções: espresso, café com leite meio a meio, leite integral preparado, Coca-Cola original/sem açúcar e sucos 100% laranja/uva. Produto/preparo, fontes oficiais e adições não incluídas identificados; português/inglês e ilustrações por categoria.
- [x] Registro em ml com referência por 100 ml, sem conversão fictícia para gramas. Modelos, repetição, histórico, backup e API preservam a unidade.
- [x] Pão integral de forma por fatias como padrão, estimativa inicial editável de 25 g por fatia, frações, peso total e alternativa em gramas. Fonte do peso separada da referência calórica; não se trata de média universal.
- [x] Relato local entende fatias de pão em português/inglês. Bebidas são direcionadas ao formulário em ml para evitar confusão entre densidades por massa/volume.
- [x] Schema JSON versão 6, preservando registros históricos sem inferir fatias ou recalcular calorias antigas; nenhuma migração SQL. Analytics desligado e nenhum serviço pago adicional.

Validação: 54 testes e build aprovados. Testes cobrem referências de volume, receita meio a meio, limites numéricos, modelo misto, repetição, backup, migração e API com proprietário autenticado. No navegador com dados fictícios: duas fatias de 25 g resultaram em 50 g/127 kcal; peso de 30 g resultou em 60 g/152 kcal; troca para gramas preservou a massa. Coca-Cola 200 ml resultou em 85 kcal; modelo com pão e bebida preservou ambos, permitiu alterar fatias/ml e reabriu o diário com as mesmas medidas. Café com leite 200 ml mostrou 65 kcal e fontes. Formulário em 390 px sem rolagem horizontal. Nenhum registro real alterado. Fontes e limites detalhados no README.

Publicado em https://leve-fawn.vercel.app: dpl_4r4efU3j2ixnPBDnukhbXs8oKX7p. HTML e bundle final conferidos, manifesto e catálogo responderam 200, diário sem sessão respondeu 401. Navegador confirmou o bundle novo e nenhum script Google carregado. Build em produção: cerca de 193 kB gzip no bundle principal; aviso de tamanho já existente permanece para manutenção futura. Screenshots da interface registrados; nenhuma conta/diário real modificada nos testes.

Ajuste visual em 14/10/2026: seletor de idioma movido exclusivamente para Perfil, retirado do cabeçalho, cadastro e carregamento. Configurações agrupadas com cartões alinhados, intervalos de 24 px no desktop e 20 px no celular e seletor com área de toque de 44 px. Detecção automática e preferência persistente mantidas. 54 testes aprovados e build concluído.
Conferência visual: Perfil em português/inglês a 390 px, histórico a 320 px sem seletor ou rolagem horizontal, desktop com cabeçalho simplificado. Publicado como dpl_4vzKcUsvEst2dnJzp9t7bU1XhTt4 em https://leve-fawn.vercel.app; HTML público 200 com CSS/bundle novos. Testes apenas com registros fictícios; nenhum diário real alterado.

## Registros separados por ação — 15/10/2026

Implementado: botão + com atalhos em leque para refeição, treino, água e peso. Refeição monta só os alimentos daquele momento, com data/tipo/horário, modelos e relato revisado; duas refeições do mesmo tipo permanecem separadas. Treino salva somente uma atividade, água soma volume e peso cria pesagem. Atalhos diretos de Hoje abrem o modal correspondente; Histórico inicia refeição na data escolhida. Editar dia permanece para correções dos registros existentes.

Aplicação sobre estado mais recente preserva demais refeições, notas, água e treino; bloqueio de preenchimentos pendentes e confirmação acessível de descarte. Menu acessível por teclado/Escape, animação reduzida respeitada, posição acima da navegação mobile. Horário/ID são campos aditivos, sem SQL ou recálculo histórico. Analytics continua desligado.

Validação: 59 testes aprovados, incluindo isolamento dos quatro registros, refeições repetidas, data histórica, estado recente e entradas inválidas; build concluído. Navegador com diário fictício: refeição nova vazia, refeições separadas, alteração de horário persistida, treino 20 min e água 250 ml preservando alimentação, peso isolado, modelo inserido só na refeição atual, guarda de rascunhos, português/inglês e larguras 320/390 px sem overflow. Nenhum diário real alterado. Screenshots do menu e modais disponíveis.
Publicado em https://leve-fawn.vercel.app como dpl_6a3EGk56kaWmP4cmTJVHaESmSMaZ. HTML/bundle com menu e modais conferidos; manifesto e catálogo 200, diário sem sessão 401. Bundle principal cerca de 196 kB gzip, aviso de tamanho já conhecido mantido para otimização futura.

## Energia estimada e ícone centralizado — 15/10/2026

Implementado: + em SVG centralizado; painel com repouso aproximado por Mifflin–St Jeor, rotina ajustável no Perfil, extra dos treinos, total projetado e saldo parcial contra consumo registrado. Basal não é tratada como meta alimentar; nenhum déficit é prescrito. Treino exige referência e intensidade selecionadas, mostra gasto bruto e extra, guarda snapshot do peso/fonte e evita contar o gasto previsto duas vezes. Registros antigos preservados e atividades desconhecidas sem calorias inventadas. Português/inglês, cálculos locais, sem SQL/serviços pagos/analytics novo.

65 testes aprovados e build concluído: fórmulas, coeficientes, rotina, saldo, limites, contagem dupla, snapshots, backup e API. Navegador com dados fictícios: musculação 45 min a 89,4 kg mostrou 246 kcal brutas e 173 extras; caminhada 30 min mostrou 178 brutas / 129 extras e atualizou o painel. Alterar rotina pelo Perfil atualizou a projeção; snapshots ficaram preservados. Medição DOM do + mostrou deslocamento zero em X/Y. Conferência mobile sem overflow. Nenhum diário real alterado. Fontes e limites no README.
Publicado em https://leve-fawn.vercel.app como dpl_5TyPvETgyKkGY6bSEJsgP9V8qt5m. HTML/bundle final conferidos, catálogo 200, diário sem sessão 401. Conferência desktop 1280 px, painel mobile 390 px e treino inglês 320 px sem overflow; screenshot do painel salvo. Bundle principal cerca de 201 kB gzip, aviso de tamanho conhecido permanece. Nenhum dado de conta real alterado.

Resumo circular de energia em 15/10/2026: gráfico de rosca no topo de Hoje, consumo/estimativa diária em kcal e percentual; acima de 100%, cor e texto explícitos sem perder o percentual. Ver detalhes abre modal com os cinco valores, saldo, limites e fontes, já expandidos. 65 testes e build aprovados; conferência visual e modal com dados fictícios, sem alterar diário real.
Publicado como dpl_4EQdWRrgZ3E7ekHrkqhtXDVQG9hH em https://leve-fawn.vercel.app; HTML/bundle final com gráfico e modal confirmados. Modal em 390 px e inglês 320 px sem overflow, três fontes presentes. Preferência de idioma restaurada após teste fictício; nenhuma alteração no diário real.

15/10/2026 — Catálogo conferido: havia apenas aveia comum em flocos. Adicionados granola, iogurte natural integral, chia seca, açúcar mascavo e aveia em flocos finos, totalizando 40 IDs únicos. Referências SBD/TBCA/fabricantes, notas de preparo, quantidades e PT/EN. Busca e relato reconhecem os cinco termos; aveia comum preservada. 65 testes e build aprovados; conferidos 174 kcal/40 g de granola, 126/170 g de iogurte, 54/15 g de chia, 38/10 g de açúcar e 104/30 g de aveia fina. Sem SQL, custo novo ou alteração de diário real.
Publicado como dpl_3mo3F1RBjDCFTFzgvumj1KCU5GmH em https://leve-fawn.vercel.app; HTML/bundle com os cinco IDs novos confirmados. Busca dos cinco itens conferida no navegador, seleção de aveia fina iniciou 30 g/104 kcal com fonte e porção corretas. Formulário descartado, sem salvar refeição. Screenshot disponível.

## Refeições prontas — 16/10/2026

Implementadas oito referências locais em **Refeições prontas**: poke de salmão com cream cheese (400 g), mix de sushi (10/20/30/40 peças), quatro hambúrgueres artesanais (simples, bacon, duplo e duplo com bacon) e pizzas de muçarela/calabresa (¼, meia ou inteira). Atalhos mostram kcal e peso; o usuário pode editar os gramas. Busca e textos em PT/EN.

São receitas ilustrativas, não médias estatísticas de restaurantes. Sushi: metade salmão e metade salmão com cream cheese, 30 g/peça, sem fritura. Pizza inteira: hipótese de 800 g (8×100 g), sem borda recheada. Hambúrgueres: peso da carne já pronta, pão aproximado pelo francês, patinho magro; bacon aproximado pelo toucinho frito. Ingredientes e limitações aparecem no formulário. Fontes: [SBD 2024](https://diabetes.org.br/wp-content/uploads/2024/11/Manual-contagem-carboidratos2024.pdf) e [TACO](https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf).

Presets são atalhos para gramas: sem migração de banco/versão, novo serviço ou custo. Histórico e modelos exibem peças/fração apenas quando o peso corresponde ao atalho; alterar o peso remove a indicação incompatível. GA4 continua desligado. Validação: 68 testes aprovados, build de produção e revisão do formulário no navegador.

Publicação confirmada: `dpl_DvofxPnYgMHTWxtBTRdDD4Zqe5jS`, alias `https://leve-fawn.vercel.app`, HTTP 200 e bundle `index-CWZw7mWa.js` com as novas referências. Revisão mobile em 390 px: atalhos sem sobreposição/overflow; 40 peças geram 1.780 kcal no rascunho. Rascunho descartado sem salvar no diário.

## Copos e bebidas alcoólicas — 16/10/2026

Implementados atalhos com ícones SVG: copo americano 190 ml, caneca/copo alto 300 ml, xícaras 40/50 ml, copo de cerveja 300 ml, caneca de cerveja 500 ml, lata 350 ml, long neck 330 ml, garrafa 600 ml, vinho servido 75/150 ml e doses 30/50/60 ml. São referências editáveis e filtradas pelo tipo de bebida. O copo americano tradicional tem referência [Nadir](https://nadir.com.br/o-copo-oficial-do-brasileiro/); os demais volumes são escolhas ilustrativas de porção, não tamanhos universais.

Nova categoria local **Bebidas alcoólicas**: cerveja comum, vermute tinto doce, vinho tinto/branco seco, gin puro 40%, caipirinha com açúcar, Negroni e Mimosa. Fontes SBD e fabricantes; receitas/variações estão explícitas no formulário. Negroni usa a aproximação 58 and CO (185 kcal/90 ml), com Bianco e British Red Bitter, distinta da receita clássica IBA. Mimosa usa proporção 1:1 da IBA, com referências de calorias SBD e Del Valle. Drinks têm atalhos de 1/2 receitas, sem inferir volume pela capacidade do copo ou gelo. Registros continuam em ml, preservados ao repetir refeições; não somam ao controle de água.

Validação: 71 testes, build e revisão mobile em 390 px; copo americano gera 190 ml/78 kcal de cerveja no rascunho. Nenhum serviço pago, migração de banco ou ativação de analytics.

Publicação confirmada: `dpl_4GGpNDri7EiQ8tzv9PdFqDTgnrHf`, alias `https://leve-fawn.vercel.app`; build remoto concluído. Dois Negronis no formulário mostram 180 ml/370 kcal; rascunhos de teste descartados sem gravar registros.

Batata frita adicionada em 16/10/2026 à categoria Refeições prontas: referência TACO 93 (267 kcal/100 g), com atalhos ilustrativos pequena 70 g, média 100 g e grande 150 g, ajustáveis. Peso pronto, já inclui fritura; extras à parte. PT/EN, cálculo local, sem mudar porções de registros anteriores.

## Evolução por semana/mês e refeições esquecidas — 16/10/2026

**Implementado:** Meu peso agora traz quatro gráficos separados (água, consumo, basal/repouso e gasto adicional de exercício), mais gráfico combinado com gasto total estimado. Semana de calendário começa na segunda; mês respeita o calendário. Setas permitem períodos anteriores, botão retorna ao atual; dias futuros não entram nos cálculos. Totais/médias usam apenas valores disponíveis. Legenda interativa liga/desliga séries e tabela acessível permite conferir valores diários. Água usa eixo direito em ml; calorias, esquerdo em kcal, sem comparar unidades como equivalentes.

Basal/rotina são referências recalculadas com o Perfil atual em todas as datas, não snapshots históricos. Extra de treino usa a mesma lógica de `dailyEnergy`, evitando somar basal duas vezes. Dias sem registros permanecem ausentes; treino sem referência não vira zero. Em dias com treinos conhecidos e desconhecidos, gasto conhecido aparece como parcial, marcado com * na tabela. Sem meta de déficit ou nova prescrição. Gráfico original de peso preservado.

**Histórico:** botão ＋ Refeição em cada dia e botão nos detalhes abrem um registro separado com a data preenchida. Se o dia ainda não existir, basta escolher a data no formulário superior. Só o Histórico habilita data passada para nova refeição (incluindo o botão + quando nessa aba); fora dele a data fica restrita a hoje. Ao salvar, acrescenta a refeição ao estado mais recente sem sobrescrever água, notas, treinos ou outras refeições.

Validação: 74 testes, build, navegação semanal/mensal, legenda e tabela, desktop 1280 px e mobile 390 px sem overflow. Diário fictício local: jantar adicionado em 15/10, total passou de 372 para 496 kcal, manteve 1.000 ml de água e treinos; detalhes confirmam Jantar às 19:00. Dados reais não foram usados. Sem migração de banco, serviço pago ou ativação de analytics.

Publicação confirmada: `dpl_DwpwFVYYR3d26psnoWj4TfJh1kc7`, `https://leve-fawn.vercel.app`, HTTP 200 e bundle `index-Bl8CwXhp.js` com gráficos e registro retroativo. Mês anterior vazio mostra valores indisponíveis, sem fabricar zeros de consumo; legenda/tabela verificadas. Refeição fictícia de ontem persistiu após recarregar e atualizou o gráfico de consumo.

### Correção: treinos sem calorias não desaparecem — 16/10/2026

O acompanhamento anterior exibia somente estimativas de gasto; por isso atividades sem referência calórica pareciam ausentes. Agora há gráfico independente de dias com treino, contador e lista por data com atividades/durações disponíveis, incluindo registros antigos com apenas `exercise.performed`. A visão combinada marca dias de treino com ▲ independentemente das kcal, e a tabela inclui presença de treino. Nenhuma caloria antiga foi inventada nem registro alterado. Teste cobre dois dias com atividades sem estimativa, incluindo dia sem detalhes; 75 testes aprovados. Conferido no diário fictício local com 2 dias de treino em 14/10 e 15/10.

Correção publicada: `dpl_JDnzgnPPYBfH8Dr7HmDyEmxkBoiZ`, alias `https://leve-fawn.vercel.app`, HTTP 200 e bundle `index-hlBFW6DI.js` com gráfico/lista independente de treinos.

### Extra dos treinos antigos — 16/10/2026

A correção de presença não preenchia o gráfico de kcal, pois o diário antigo não salvava `energyEstimate`. Agora `displayWorkoutEstimate` aplica uma estimativa somente visual para tipos reconhecidos com duração válida: Academia/Gym (musculação moderada como suposição explícita), musculação, caminhada e elíptico; intensidade vigorosa/rápida é usada quando declarada. Peso do Perfil atual e rotina atual; referências e natureza retroativa ficam visíveis. Registros com snapshot usam o snapshot original. Atividade desconhecida, duração ausente/zero ou escolha explícita de sem estimativa (`referenceId: ''`) continuam sem valor inventado. O fallback não grava nem altera histórico, backup ou dados da conta.

`dailyEnergy` e os gráficos agora compartilham o fallback; mistura de referências estimáveis/desconhecidas continua marcada parcial. 77 testes cobrem estimativa de Academia/Caminhada legadas, limites, preservação de registros/snapshots e recusa de atividade insuficiente.

Publicado: `dpl_An1sX8XzhDgXbDv7H6yNBv2d8U8o`, alias público HTTP 200, bundle `index-Dj4KPTgs.js`. Prévia local conferida: dois dias com extra disponível (366 kcal adicionais no total do diário fictício), antes com um dia ausente. Nenhum registro foi editado para a verificação.

## Legumes e verduras — 16/10/2026

Adicionadas 21 opções na categoria Verduras e legumes e azeite separado: mix grelhado sem óleo, mix com azeite, legumes assados (ratatouille), abobrinha/berinjela grelhadas, brócolis, cenoura, couve-flor, chuchu, abobrinha, abóbora cabotiá, berinjela, beterraba, batata, batata-doce, mandioca, pepino, tomate, alface, pimentão e couve refogada. Nomes/notas em PT/EN, ícone de vegetais, mixes com atalhos 100/150/200 g e gramas editáveis.

Fontes: TACO para preparos simples e azeite; TBCA BRC0263B/BRC0156B para grelhados e BRC0718B para ratatouille. Mix sem óleo usa pesos prontos iguais de abobrinha (27 kcal/100 g na página consultada) e berinjela (23); mix com óleo usa 95 g dessa mistura + 5 g de azeite por 100 g finais (67,95 kcal). Ratatouille 76 kcal/100 g já inclui molho/óleo; não representa todo tipo de assado. Preparo, composição e óleo incluído/excluído ficam explícitos. Sem migração, custo ou modificação de registros antigos. 77 testes aprovados, build e revisão do seletor/formulário.

Publicação confirmada: `dpl_8RdBwmmQ5WyYswKVC3qurq7wBA7v`, alias público HTTP 200, bundle `index-B2RN7jga.js` com novos legumes e azeite.

## Refinamento visual de Meu peso — 16/10/2026

Reorganizada a hierarquia: peso/tendência primeiro, ações de pesagem e histórico em blocos expansíveis próximos ao gráfico, resumo do período (água e consumo por dia registrado, dias de treino, extra total), visão combinada antes dos gráficos individuais, treinos compactos e lista de atividades recolhível. Explicações metodológicas ficam em Como ler as estimativas; etiqueta de estimativa retroativa continua visível. Tabela diária preservada.

Espaçamentos, tipografia, raios e controles reduzidos/consistentes. Gráficos agora acompanham a largura real do cartão com ResizeObserver, mantendo altura e tamanho de texto legíveis sem esticar no desktop ou encolher todo o texto no celular. Frequência de treino usa gráfico compacto. Resumo em 4 colunas no desktop/2 no mobile; legenda em duas colunas e navegação do período alinhada no mobile. Formulário e dados/cálculos preservados. 77 testes aprovados e build; revisão visual/interativa desktop e mobile.

Publicação confirmada: `dpl_8AGttD4S1YAAraMDHUqmjwrCHwuZ`, alias HTTP 200, bundle `index-CmRAkCz1.js`. Revisão em 1280 e 320 px, sem overflow horizontal; filtros, formulário recolhível e lista de treinos funcionam. Nenhum registro foi alterado na verificação visual.

Fluxo de versões confirmado pelo usuário em 16/10/2026: após concluir e validar cada versão, fazer commit das alterações realizadas e push para o remoto do projeto. Excluir segredos, arquivos de ambiente e artefatos gerados; não reescrever histórico remoto.

## Resumo semanal e constância — 16/10/2026

Implementado na tela Hoje, em português e inglês:
- Resumo da semana de segunda a domingo, com navegação para semanas anteriores e retorno à atual; calendário distingue registros, dias sem dados e futuros.
- Médias de calorias e água calculadas separadamente só sobre dias com alimentos/água registrados, com cobertura explícita e aviso de registros possivelmente incompletos. Total de refeições, dias de treino mesmo sem calorias e variação entre primeira/última pesagem do período; menos de duas pesagens deixa a variação indisponível.
- Sequência de dias com algum registro significativo (alimento, água, treino, pesagem ou anotação). Dias vazios e registros sem data/futuros não contam; múltiplos registros contam uma vez. Sequência até ontem continua ativa durante hoje. Maior sequência é derivada do histórico atual; editar/excluir/importar registros recalcula o resultado, sem novo campo persistido.
- Incentivo à continuidade e à retomada, sem vincular sequência a comer menos ou perder peso. Cálculos locais reaproveitam o diário já sincronizado, sem serviço/custo novo e sem ativar analytics.

Validação: 82 testes aprovados e build concluído (aviso existente de bundle >500 kB). Testes novos cobrem pausas, virada de mês/ano, datas ausentes/futuras, duplicação de pesagens na mesma data, treino sem estimativa, médias com lacunas e semanas passadas. Navegador com diário fictício: sequência 2→3 ao adicionar água hoje, retorno a 2 removendo a água; resumo atualizado imediatamente, semanas anteriores vazias sem médias inventadas, português/inglês e layout mobile/desktop sem rolagem horizontal. Nenhum registro de conta real modificado.
