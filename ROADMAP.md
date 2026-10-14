# Leve — roadmap de evolução

Atualizado em 14/10/2026. Objetivo: um diário rápido e confiável para acompanhar alimentação, peso, água e movimento, funcionando offline e depois sincronizando entre dispositivos.

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
2. Isolar bancos por ambiente antes de futuras migrações: o recurso Neon atual continua ligado a Production, Preview e Development. A publicação atual preserva os registros e não executa migrações. Configurar origens permitidas se houver domínio próprio.
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
- **Implementado:** buscador visual com categorias, busca sem acentos, favoritos e recentes. Ilustrações locais por categoria, sem fotos externas ou IA. Alimentos pessoais persistentes e edição de quantidades de itens já registrados continuam pendentes.
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
