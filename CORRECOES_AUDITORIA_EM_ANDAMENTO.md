# Correções da auditoria — estado de execução

O pedido de eliminar os acoplamentos e hardcodes de todo o sistema e publicar após validação permanece em andamento. Este documento não substitui o diagnóstico da auditoria nem certifica conclusão.

## Alterações verificadas

- O repositório municipal recebe o município solicitado, filtra a prefeitura no servidor e consulta `ma_cadastros` somente para esse município. Uma mudança de município exige nova carga; não reutiliza um estado incompleto de outra prefeitura.
- Consultas paginadas e cálculo de alterações foram separados em `src/backend/consultas.js` e `src/backend/diferencas.js`. A composição está em `src/backend/repositorio.js`. O arquivo `backend/repositorio.js` agora é gerado pelo manifest.
- 206 testes aprovados; build canônico e verificação de diff aprovados.
- A tentativa de extração automática dos demais controladores foi descartada: não foi mantida uma transformação ampla sem validação suficiente. Os controladores legados continuam pendentes de extração por domínio.

## E-mail e acesso

O projeto Supabase Lifesinal (`tynksbinrvqzgsdmvqpq`) foi consultado pela Management API. Os campos de host, porta, usuário e remetente SMTP estão vazios; o hook de envio de e-mail está desativado e não há Edge Functions. Não há configuração SMTP no Supabase desse projeto que possa ser copiada. Isso não prova que a aplicação externa não tenha outro serviço de envio.

O remetente solicitado é `contato@aldenquesada.org`. Nenhuma senha foi escrita no repositório e nenhuma credencial foi enviada a um servidor SMTP não confirmado.

A credencial Supabase disponível retorna HTTP 403 para o projeto Maringá (`yyoozisgoginwepzvnvu`). O navegador, que havia permitido acesso no trabalho anterior, não respondeu nas duas tentativas desta rodada. Não foi possível alterar o Auth, reconciliar migrations ou realizar validação autenticada no projeto por essas vias.

## Ainda necessário

- Extração dos controladores legados por domínio e configuração municipal sem condições fixas por cidade.
- Matriz de permissões operacionais e integridade de referências no servidor.
- Homologação de carga, recuperação e operação; observabilidade e retenção.
- Identificar o provedor de envio usado pela aplicação Lifesinal ou confirmar o provedor da caixa institucional; configurar e testar o SMTP no projeto correto.
- Recuperar acesso ao projeto Maringá, concluir validações e publicar. Nenhuma publicação foi feita nesta rodada.
