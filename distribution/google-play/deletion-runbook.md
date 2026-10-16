# Atendimento manual — exclusão verificada

O contato público é raryson.rost@gmail.com. Monitorar essa caixa: publicar um link sem processar pedidos não atende à exigência da Play. Meta de serviço: até 30 dias após confirmar titularidade, avisando impedimentos. Não é uma alegação de prazo legal universal.

1. Receber pedido e confirmar titularidade no e-mail associado ao usuário Clerk. Não pedir senha, OTP, documento ou diário. Pedido enviado por outro endereço requer verificação adicional pelo endereço já registrado. Não apagar apenas por alguém conhecer um e-mail ou userId.
2. Identificar o userId exato na instância Clerk correta e registrar somente identificação mínima/pedido verificado em controle privado de atendimento. Não colocar tickets, e-mails ou userIds de clientes neste repositório.
3. Confirmar escopo (conta inteira versus alguns registros), irreversibilidade e eventuais retenções legais. Se um agente executar operações, a confirmação de exclusão deve ser específica para aquela conta.
4. Revogar sessões e excluir a identidade Clerk conforme procedimento oficial, para impedir novos logins/escritas. A exclusão Clerk **não apaga o Neon**. Se falhar, não afirmar conclusão. Antes do banco, aguardar expiração máxima dos tokens já emitidos na configuração real, mais janela de requisições em andamento; verificar ausência de sessão ativa. Não presumir que deletar usuário invalida imediatamente todo JWT previamente emitido.
5. Com conexão direta ao Neon correto, realizar limpeza transacional por userId. Primeiro remover denúncias/eventos que apontam para alimentos desse dono, além dos registros criados pela própria pessoa em outros alimentos; depois remover os alimentos e o diário. Usar parâmetros vinculados; nunca interpolar e-mail/userId em SQL. Fazer dry-run com contagens, sem imprimir conteúdo do diário. Não executar em produção com identidade fictícia ou não verificada.

```sql
BEGIN;
-- $1 = userId exato, autenticado e verificado no atendimento
SELECT pg_advisory_xact_lock(hashtext('leve-food:' || $1));
DELETE FROM leve_food_reports
 WHERE reporter_id = $1 OR food_id IN (SELECT id FROM leve_community_foods WHERE owner_id = $1);
DELETE FROM leve_food_events
 WHERE actor_id = $1 OR food_id IN (SELECT id FROM leve_community_foods WHERE owner_id = $1);
DELETE FROM leve_community_foods WHERE owner_id = $1;
DELETE FROM leve_journals WHERE user_id = $1;
COMMIT;
```

6. Conferir contagens zero em todas as tabelas acima e identidade ausente no Clerk. Em falha entre serviços, manter solicitação aberta e retomar somente a parte faltante. Não restaurar identidade/diário de backup para “desfazer” pedido sem autorização.
7. Cópias nutricionais já salvas em diários alheios não contêm autoria da pessoa e permanecem. Se houver agradecimento público de apoio associado à pessoa, removê-lo também quando solicitado. Não registrar doação falsa nem acessar banco do doador.
8. Responder com conclusão e instruções de sair da conta, apagar dados do site em cada navegador e remover backups exportados. Não é possível apagar remotamente arquivos particulares. Backups técnicos seguem retenção dos fornecedores; retenção legal excepcional deve ser informada com motivo/prazo.
9. Após expiração de tokens e execução, verificar novamente que o diário não reapareceu por sincronização em andamento. Não usar a conta excluída para teste ou recriá-la automaticamente.

Teste de homologação antes de liberar produção: criar conta descartável em instância/branch de desenvolvimento, salvar diário/alimento/denúncia fictícios, verificar escopo entre dois donos, executar exclusão com confirmação explícita e comprovar que só a conta alvo foi removida. Este fluxo destrutivo ainda não foi executado sobre conta real nesta preparação.
