# Exclusão definitiva pela lixeira

Substitui a exclusão lógica do diretório, conforme solicitação de 08/11/2026. Publicar a mudança instala a funcionalidade; não exclui nenhum contato existente.

## Escopo e cascata

A sessão do WhatsApp é a raiz. FKs com `ON DELETE CASCADE` removem inbox, outbox, estados de entrega, conclusões, histórico dos ciclos, respostas e vínculos de identidade. `wa.contact_owned_records` registra a propriedade dos cadastros dos três fluxos e dos pontos públicos, com exclusão dos registros canônicos quando o vínculo proprietário cai. A operação também remove os snapshots pessoais de `private.ma_historico`, inclusive os produzidos pelos próprios triggers de DELETE. Fica somente auditoria técnica do ato, sem telefone, respostas ou conversa.

A propriedade vem das projeções confirmadas, nunca da comparação de telefones digitados. Cadastros de terceiros são preservados. Se um atendimento de terceiro referencia o cadastro, a UI pede que o vínculo seja resolvido antes de excluir. A autorização é conferida em cada coleção envolvida, dentro da prefeitura, em uma transação. Mensagens em envio ou com resultado incerto impedem a operação até sua conciliação.

A confirmação mostra “Excluir definitivamente”, informa que não é possível desfazer e identifica o telefone selecionado. Um prefixo de protocolo impede que uma aba antiga, ainda exibindo a descrição de arquivamento, execute a exclusão definitiva.

## Reinício do cadastro e mídia

Depois de excluir, uma nova mensagem Oi cria uma sessão nova, sem respostas, protocolo ou cadastros anteriores. Hashes de IDs aleatórios de mensagens já apagadas impedem reenvios da Meta de recriar o histórico; esses marcadores não contêm telefone nem conteúdo. Callbacks de entrega de mensagens removidas são ignorados.

Anexos privados são removidos pela API do Storage, com fila, reserva e repetição em caso de falha. A fila aguarda dois minutos para cobrir uploads que já estivessem em andamento e usa chaves exatas, nunca prefixos de um canal inteiro. Novos acessos assinados deixam de ser autorizados assim que a inbox é excluída. A imagem institucional compartilhada é preservada. Não se usa DELETE direto em `storage.objects`, porque isso não remove o arquivo físico.

## Validação

- 278 testes Node; nove testes Deno de transporte, segurança e remoção de arquivos.
- Migrações instaladas desde zero em PostgreSQL descartável.
- Percurso real do motor nos três fluxos, ponto público e ciclos de correção; exclusão das quatro projeções e de todas as dependências.
- Testes de revisão desatualizada, aba antiga, usuário sem permissão, município distinto, envio em andamento, referências de terceiros, fotos privadas e exclusão de cadastro manual sob o papel authenticated.
- Duas transações concorrentes confirmam que a exclusão aguarda a reserva do worker e rejeita mensagens em voo; a reserva não atravessa uma cascata aberta.
- Nova mensagem com o mesmo número gera nova sessão vazia. Replay da mensagem apagada e callback atrasado não restauram registros.

Referências: [cascata no PostgreSQL](https://supabase.com/docs/guides/database/postgres/cascade-deletes) e [remoção de objetos no Storage](https://supabase.com/docs/guides/storage/management/delete-objects).
