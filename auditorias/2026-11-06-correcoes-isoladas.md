# Correções verificadas na cópia isolada — 6 de novembro de 2026

## Resultado e limite desta entrega

As correções das regras operacionais existentes e dos controles da interface foram preparadas e testadas na branch `codex/seguranca-banco`, em `/tmp/maringa-seguranca-banco`. A base permanece `2c895659025ea7492328270ae63957c65b8b3655`; o primeiro pacote foi registrado em `8ff3ef6`.

**Nenhuma alteração foi aplicada ao Supabase, à produção ou à cópia do outro chat. Não houve push nem merge.** O pacote está disponível para conciliação; não equivale a uma certificação enterprise ou a uma auditoria atualizada do banco remoto.

## Regras operacionais no banco

A configuração `ma_configuracao.operacao` define transições de status, compatibilidade de colaboradores, pesos de ordenação, precisão máxima de GPS e limites numéricos. Os gatilhos e a RPC validam as operações sem depender da interface.

- Pedidos: impede saltar diretamente para atendido, concluir sem chegada e reabrir estados terminais. Exige colaborador nos estados encaminhado, chegada e atendido. Impede trocar atribuição/necessidade em etapas avançadas.
- Encaminhamento: rejeita colaborador de outro município, indisponível, sem recurso compatível ou com o mesmo telefone do solicitante. Pedidos críticos não são encaminhados automaticamente a voluntários.
- Eventos, relatos, mobilizações e apoios: aplicam as transições definidas na configuração.
- Recursos: rejeita quantidades negativas ou não finitas, exige inteiros quando adequado e impede vagas livres superiores à capacidade do abrigo. Estoque aceita quantidade fracionária conforme sua unidade.
- Presença: consulta o polígono do bairro validado no banco, confere coordenadas e precisão, gera o horário no servidor e impede reescrita dos metadados. A posição continua sendo autodeclarada pelo dispositivo; esta validação não prova presença física nem impede falsificação do GPS pelo próprio dispositivo.
- Mobilizações: confere a zona cadastrada e calcula os destinatários a partir dos registros municipais. Uma lista inventada enviada pelo cliente é substituída pelo resultado do banco.
- Apoio intermunicipal: exige município destinatário ativo, diferente da origem, e recurso informado; o nome do destino é derivado do cadastro oficial da prefeitura.
- Relações: mantém referências no mesmo município e impede ciclos. As operações são serializadas por município antes da escrita, com ordem determinística de bloqueios.
- Lotes: valida formato, limite de tamanho, permissão, versão e atomicidade. O executor interno anterior não pode ser chamado diretamente pelo papel autenticado.

A interface recebe os registros confirmados pela RPC, incluindo campos calculados e versões reais; não assume que o rascunho do navegador é o registro final.

## Permissões e interface

- A RPC `ma_minhas_capacidades` calcula permissões a partir dos vínculos e das mesmas regras usadas no banco.
- Repositório e controles usam essas capacidades por coleção, município e ação. Falta de capacidade bloqueia a tentativa antes do envio, sem substituir a proteção do servidor.
- Navegação restrita, novo cadastro, edição, exclusão, check-in e comandos de mobilização/apoio refletem as capacidades. As rotas e o formulário possuem verificações adicionais.
- Ao retornar à janela, a interface consulta novamente as capacidades. Mudanças provocam recarga para não manter a tela baseada nas permissões anteriores. Revogação já é aplicada pelo banco na próxima operação, mesmo antes dessa atualização visual.
- Formulários mostram estados seguintes permitidos e limites numéricos definidos no banco. Relações de equipe, colaborador e prefeitura destinatária usam IDs dos cadastros existentes.
- Controles já desabilitados durante uma operação não são reativados inadvertidamente pela atualização de permissões.
- Removidas setas decorativas dos links de mapas e dos trechos de interface alterados, respeitando as preferências do projeto.

## Persistência que ainda estava no navegador

Tarefas e marcações de alertas lidos do cabeçalho passaram a usar `ma_painel`, isolado por usuário e prefeitura. São tarefas pessoais dentro do contexto municipal; não são uma atribuição de tarefa operacional a terceiros.

- RLS impede leitura de outro usuário e de outra prefeitura.
- Gravação somente por RPC com versão esperada; escrita direta não concedida ao autenticado.
- Histórico de alterações no banco e limites de formato/tamanho.
- Cache da interface só muda após confirmação do servidor; falha ou resposta incompleta exige recarga.
- Nenhum dado antigo do armazenamento local é importado automaticamente.

A fila de mensagens offline do protótipo também fica explicitamente bloqueada no modo conectado. O atendimento demonstrativo e os rascunhos da ficha continuam indisponíveis no artefato de produção, conforme o primeiro pacote; isso não cria uma integração de WhatsApp nem um serviço de despacho.

## Verificação final

| Verificação | Resultado |
|---|---|
| JavaScript, Node 22.23.2 | 208 testes aprovados, zero falhas |
| Construção canônica | `npm run check` aprovado |
| Sintaxe de boot, repositório, permissões e cabeçalho | Aprovada |
| Instalação completa em PostgreSQL 16 UTF-8 vazio | Aprovada |
| Permissões e isolamento municipal | Suíte SQL aprovada |
| Proteção de escrita, histórico e referências | Suíte SQL aprovada |
| Regras operacionais e revogação | Suíte SQL aprovada |
| Painel pessoal, RLS e conflitos | Suíte SQL aprovada |
| Duas conexões alterando a mesma versão | Uma confirmação; outra rejeitada; versão final 2 |
| Duas conexões tentando formar ciclo entre eventos | Um vínculo confirmado; ciclo rejeitado |
| Tabelas próprias na instalação isolada | 10, todas com RLS habilitada |
| Artefato de publicação | Gerado localmente; não publicado |
| Higiene do diff | `git diff --check` aprovado |

Tabelas próprias locais: `ma_prefeituras`, `ma_vinculos`, `ma_cadastros`, `ma_configuracao`, `ma_painel`, `ma_admins`, `ma_convites_iniciais`, `ma_permissoes`, `ma_historico`, `ma_referencias`. A contagem não inclui tabelas internas do Supabase nem descreve o banco remoto atual.

As fixtures sintéticas ficaram exclusivamente nos testes descartáveis. As suítes SQL fazem rollback; os testes de duas conexões usam registros temporários próprios em uma instância efêmera. Nenhuma fixture foi enviada ao Supabase. Os controles foram verificados por testes de DOM simulado e de comportamento, sem afirmar inspeção visual ponta a ponta em navegador real.

Referência consultada para grants e políticas: [documentação oficial de RLS do Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security). A verificação local de catálogos e testes SQL não substitui o Security Advisor do projeto hospedado.

## O que ainda depende da integração

1. Conciliar as mudanças do outro chat em boot, repositório, administração e migrações. Não substituir sua cópia por esta. Repetir os testes com ambas as séries de migrações juntas.
2. Conciliar o histórico de snapshots com a auditoria de metadados do outro chat; definir retenção e acesso administrativo aos dados pessoais. Superusuários ainda podem alterar o banco: não se afirma inviolabilidade externa.
3. Confirmar no ambiente hospedado a criação/atribuição do papel interno e sua interação com os novos gatilhos do outro chat. Aplicar as migrações antes da interface que depende delas.
4. Conferir contratos contra os dados reais. A migração anterior de referências interrompe a instalação se já existirem relações por ID que exijam backfill; não apagar relações para contorná-la.
5. Revalidar no Supabase contagens, RLS, grants, funções, mapas e filtros. A carga dos 113 bairros e a confirmação das estruturas/imagens não foram repetidas nesta etapa isolada.
6. Realizar teste visual ponta a ponta, carga, restauração e recuperação no ambiente integrado. A CI está configurada para PostgreSQL 17; os testes executados aqui usaram PostgreSQL 16.

As regras dos fluxos existentes cobertos acima estão protegidas no servidor. Não foram criados novos fluxos de pagamento, despacho automático, reserva ou movimentação de estoque, envio de mensagens ou atendimento público. Permanecem módulos legados concatenados e código de protótipo fora dos fluxos conectados; esta entrega não afirma uma eliminação geral de monólitos ou de toda constante no código.
