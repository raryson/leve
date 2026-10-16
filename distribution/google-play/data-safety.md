# Rascunho para Segurança dos dados e conteúdo

Preencher e confirmar no Console com a configuração final e inventário do AAB. Este arquivo não é uma declaração enviada e não substitui revisar fornecedores/SDKs. As categorias do formulário podem mudar.

| Dados tratados | Motivo | Obrigatoriedade/controle |
| --- | --- | --- |
| Nome, e-mail, identificador de usuário | Perfil, autenticação e conta Clerk | Conta opcional para usar modo visitante; e-mail necessário ao criar conta |
| Idade, altura, referência de sexo, peso, nível de atividade | Estimativas do perfil e acompanhamento | Perfil preenchido pelo usuário; com login vai ao banco |
| Alimentação, calorias, água, exercícios, pesagens, modelos | Diário, gráficos e sincronização | Dados de saúde/fitness fornecidos pelo usuário; só local em visitante, coletados na nuvem com conta |
| Alimentos e fontes enviados, denúncias, histórico de moderação | Catálogo, segurança e prevenção de abuso | Cadastro/denúncia opcional; compartilhamento público exige escolha separada e revisão |
| IDs de cookies, eventos de uso, IP e localização aproximada inferida | GA4 para analytics; logs técnicos dos serviços | GA4 só após consentimento, revogável; não há advertising ID ou eventos com conteúdo do diário |
| Áudio | Reconhecimento opcional pelo fornecedor do navegador, se escolhido e consentido | Não gravado pelo Leve. Conferir suporte e comportamento do pacote Android antes de declarar se é coletado/transmitido nesse build |

- Dados via HTTPS. Diário por conta protegida pela autenticação e autorização da API. Não declarar criptografia ponta a ponta: servidores processam os registros.
- Não há anúncios nem venda de dados. “Compartilhamento” na definição da Play tem exceções para fornecedores de serviço e ação iniciada pelo usuário: revisar cada fluxo e contratos, em vez de simplesmente escolher “não compartilha” para tudo.
- Informar coleta de dados de saúde/fitness: ter modo visitante não torna a coleta de contas inexistente.
- Conta e dados podem ser excluídos mediante solicitação verificada, dentro do app (Perfil → Solicitar exclusão) e na URL pública. Consultar `deletion-runbook.md`.
- Declarar funções de atividade/fitness e nutrição/controle de peso conforme as opções do formulário de saúde. Não é aplicativo médico nem usa Health Connect.
- Público pretendido: adultos. Classificação etária final depende do questionário; não inventar uma classificação aprovada. Catálogo possui bebidas alcoólicas como referências nutricionais, sem venda, promoção ou consumo incentivado.
- UGC: catálogo premoderado, regras com aceitação registrada nas gravações, denúncia e ocultação. Sem chat, perfis públicos ou contato direto entre usuários.
- Pagamentos: app gratuito, sem venda de recurso digital. Pix voluntário sem benefício funcional. Revisar agradecimentos públicos à luz da política de contribuições antes de habilitá-los em uma versão Play; a lista atual está vazia. Não introduzir recompensas, badge exclusivo, função premium ou PayPal sem nova revisão.
- Permissões: não pedir câmera, localização, contatos, arquivos amplos ou Health Connect sem função concreta. Revisar o AndroidManifest do pacote produzido, inclusive permissões geradas pelo empacotador. Microfone somente se o fluxo de voz do build realmente necessitar e for validado.

Referências: [Segurança dos dados](https://support.google.com/googleplay/android-developer/answer/10787469), [saúde](https://support.google.com/googleplay/android-developer/answer/16679511), [pagamentos](https://support.google.com/googleplay/android-developer/answer/10281818).
