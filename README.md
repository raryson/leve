# Leve — seu ritmo, seus dados

PWA em React + Vite para registrar alimentação, peso, água e movimento. Cálculos de alimentos rodam no dispositivo, sem depender de ChatGPT: `gramas × kcal por 100 g ÷ 100`.

```sh
npm install
npm run dev
npm test
npm run build
npm run preview
```

O catálogo local tem 28 opções com referências da TACO, de fabricantes e do manual da SBD, além da opção para informar o rótulo. Carnes têm corte e preparo identificados; aproximações são sinalizadas. Pasta de amendoim e cremes têm atalhos de colher com gramas editáveis. Quantidades usam gramas; atenção ao preparo e à parte comestível. IA não é necessária, e a importação JSON do fluxo antigo continua disponível.

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

**Ambiente atual:** prévia HTTPS, com Clerk de desenvolvimento; a produção não foi alterada. Antes de promover, configurar a instância/domínio de produção do Clerk, confirmar `APP_ORIGINS` para domínios próprios e separar os bancos de Preview/Development/Production. O provisionamento inicial conectou o mesmo recurso Neon aos três ambientes. Não publicar dados de teste como produção.

## Refeição por voz ou relato

No registro do dia, use **Conte sua refeição**. O ditado usa `SpeechRecognition`/`webkitSpeechRecognition` em português, quando o navegador oferece suporte. O microfone exige HTTPS ou localhost; a prévia HTTP por IP permite somente texto/ditado do teclado. O modo serviço do navegador exige autorização explícita na tela e pode enviar áudio ao provedor do navegador e precisar de internet. O modo somente no dispositivo usa `processLocally` e depende de suporte e pacote de português já instalado; não faz fallback automático para a nuvem. O app não grava arquivos de áudio nem usa uma API de IA.

A transcrição pode ser corrigida antes de **Interpretar e revisar alimentos**. O interpretador local em `src/mealText.js` reconhece itens do catálogo, números por extenso, gramas/kg e colheres com porções de referência. Exemplo: “No almoço comi cento e cinquenta gramas de arroz branco e uma colher de pasta de amendoim”. Cortes ambíguos, alimentos desconhecidos e quantidades sem peso ficam pendentes. Ele não interpreta qualquer prato ou receita.

Revise as sugestões, adicione a refeição ao rascunho e salve o dia. O relato bruto não entra no backup; somente os itens confirmados. O microfone para ao sair do componente; sessões duram até um minuto e podem ser retomadas manualmente. Reconhecimento real de áudio ainda precisa ser validado em navegador compatível em HTTPS; testes cobrem resultados/eventos do reconhecedor e o fluxo de revisão com texto.

Referência técnica: [SpeechRecognition (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).

`src/domain.js` contém validação, migração e cálculo; `src/foods.js` guarda o catálogo com fonte. `scripts/build-sw.mjs` inclui os assets do build no cache da PWA. O service worker é registrado somente no build de produção, em HTTPS ou localhost. Dados e API não são armazenados no cache do service worker.

`vercel.json` configura o build estático e evita cache persistente do service worker. A API roda em Vercel Functions, com pool de conexões PostgreSQL no servidor. A migração SQL versionada fica em `db/migrations/`, e não roda automaticamente no build.

Veja o [roadmap](ROADMAP.md) para arquitetura de sincronização, prioridades e critérios de aceite. A referência calórica é opcional e definida pela pessoa; o app não prescreve dieta nem projeta perda de peso.
