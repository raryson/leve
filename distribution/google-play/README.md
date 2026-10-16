# Leve — preparação para Google Play

Responsável e suporte público: Raryson Pereira Rost — raryson.rost@gmail.com.
Atualizado em 16/10/2026. Preparação técnica não equivale a aprovação pela Google.

## Recursos públicos

- Site: https://leve-fawn.vercel.app/
- Privacidade: https://leve-fawn.vercel.app/privacy/
- Exclusão: https://leve-fawn.vercel.app/delete-account/
- Suporte: https://leve-fawn.vercel.app/support/
- Regras: https://leve-fawn.vercel.app/terms/
- Ícone 512 PNG: https://leve-fawn.vercel.app/icon-512.png
- Capturas mobile reais com dados fictícios: `assets/phone-*-pt.jpg` e `assets/phone-*-en.jpg` (415 × 772, JPEG, duas por idioma). Capturas anteriores para divulgação: `public/screenshots/`.
- Artes de destaque 1024 × 500: `distribution/google-play/assets/`.

## Sequência de lançamento

1. Confirmar conta Play Console do titular, identidade, contato e verificações exigidas. Cadastro tem taxa única de US$25; não foi pago nem criado automaticamente.
2. Resolver autenticação de produção. A instância Clerk atual é de desenvolvimento por escolha anterior do titular. Não confundir login funcionando com configuração adequada para lançamento público: Clerk requer domínio próprio para instância de produção. Não migrar usuários nem comprar domínio sem decidir o plano com o titular.
3. Empacotar pelo PWABuilder Android/TWA usando a origem pública HTTPS. Proposta de ID: `app.raryson.leve`, ainda não reservado na Play. Confirmar antes do primeiro upload; depois não trocar o ID para atualizar o mesmo app. Usar versão inicial `1.0.0`, versionCode `1`; incrementar versionCode em cada AAB novo. Conferir target SDK exigido pelo Console na data de envio.
4. Guardar AAB/APK, chave de upload, alias e senhas em armazenamento privado com cópia segura. Nunca Git, `public/`, anexos da loja ou logs. Artefatos privados locais ficam em `distribution/google-play/private/`, ignorados por Git e Vercel.
5. Upload do AAB em teste interno, habilitar Play App Signing. Copiar o SHA-256 do **certificado de assinatura do app** em Integridade do app, não apenas o certificado da chave de upload. Gerar Digital Asset Links com `node scripts/build-assetlinks.mjs app.raryson.leve SHA256_DO_CONSOLE` e publicar. O comando valida formato e não usa um certificado fictício. É possível adicionar o certificado de upload como segundo argumento de fingerprint para testar APK local, preservando o de produção.
6. Instalar a versão distribuída pela Play em Android real. Confirmar TWA sem barra do navegador, login, retorno de autenticação, sincronização, entrada/saída da conta, offline em visitante, atualização, telas pequenas, voz quando suportada, links públicos e pedido de exclusão. APK local e emulador não substituem essa validação.
7. Preencher ficha pt-BR/en-US, Segurança dos dados, declaração de saúde, classificação etária, público-alvo e acesso do avaliador. Ver `data-safety.md` e `listing.json`. Não marcar “nenhum dado coletado”.
8. Fornecer à revisão uma conta de demonstração isolada e instruções em inglês, sem usar conta pessoal ou moderadora. Se login usa OTP, preparar acesso estável permitido pela autenticação; não desabilitar segurança global nem enviar segredos pelo repositório. Visitante permite experimentar o diário, mas não todas as funções de conta/comunidade.
9. Se a conta pessoal foi criada após 13/11/2023, cumprir teste fechado com pelo menos 12 participantes inscritos continuamente por 14 dias e solicitar acesso à produção. Registrar feedback e correções; esse período não é algo que um build pode dispensar.
10. Só enviar para produção após testes, declarações e revisão final do titular. PayPal permanece futuro; não há integração paga nova nesta preparação.

## Pendências que impedem afirmar “pronto para publicar”

- Conta/estado de verificação no Play Console ainda não confirmados.
- Clerk de produção/domínio ainda pendente.
- Certificado Play App Signing e teste em Android distribuído pela Play pendentes. AAB e chave de upload já gerados e preservados localmente.
- Declarações e teste fechado, quando aplicável, dependem do Console e de participantes reais.

## Pacote Android gerado

`private/Leve.aab` é o arquivo para enviar à Play; `private/Leve.apk` é para teste local. O ZIP completo, a chave e as instruções de assinatura estão em `private/`, excluídos do Git e da Vercel. Faça uma cópia segura dessa pasta antes de qualquer limpeza da máquina. Não coloque o ZIP na hospedagem: ele contém a chave e as senhas.

O PWABuilder gerou versão 1.0.0/code 1 com ID `app.raryson.leve`, minSdk 24 e targetSdk 36. Assinatura CMS, manifesto e hashes de 456 entradas do AAB foram verificados; detalhes públicos e SHA-256 em `build-report.json`. O ID só fica reservado após criação/upload no Console. A ausência de um ensaio em aparelho físico continua explícita.

`public/.well-known/assetlinks.json` contém o certificado de **upload**, para teste do APK local. Antes de usar o pacote da Play, acrescente o certificado **Play App Signing** com o gerador. Não substitua inadvertidamente o fingerprint real por um exemplo. Um Android confirmado sem barra de navegador é a validação final do vínculo; HTTP 200 sozinho não comprova isso.

As capturas do diretório `assets/` têm proporção inferior a 2:1, conforme o limite da Play, e retratam o PWA com dados fictícios. Ainda devem ser comparadas com a interface instalada em Android. Não apresentamos as capturas como prova de teste nativo. As artes de destaque são PNG RGB sem alfa, 1024 × 500. [Requisitos de materiais](https://support.google.com/googleplay/android-developer/answer/9866151).

## Referências oficiais

- [PWABuilder Android](https://github.com/pwa-builder/PWABuilder/blob/main/docs/builder/android.md)
- [Conta Play Console e taxa](https://support.google.com/googleplay/android-developer/answer/6112435)
- [Teste de novas contas pessoais](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Exclusão de conta e dados](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Declaração de saúde](https://support.google.com/googleplay/android-developer/answer/14738291)
- [Conteúdo de saúde](https://support.google.com/googleplay/android-developer/answer/16679511)
- [Clerk em produção](https://clerk.com/docs/guides/development/deployment/production)
