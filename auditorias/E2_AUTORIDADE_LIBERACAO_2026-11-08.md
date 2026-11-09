# E2 — privilégios do banco e controles de liberação

Implementação e homologação local concluídas no candidato da fase 2, [PR 110](https://github.com/AldenQuesada/maringa-alerta/pull/110). A publicação permanece na E6. Nenhum dado, usuário, senha, configuração Auth ou migração foi alterado no banco de produção. A proteção da main deve ser confirmada no encerramento desta rodada; o comprovante final será anexado à cópia compartilhada deste relatório.

## Banco: correção e autoridade

O inventário remoto confirmou o achado A11: `private.ma_salvar_catalogo_territorial` tinha execução para PUBLIC. A causa foi reproduzida no PostgreSQL com o executor sem superuser: a migração antiga retirava a associação ao proprietário antes de revogar a permissão. PostgreSQL emitia WARNING, a execução terminava sem erro e a ACL permanecia aberta. A função ainda tinha guards e schema protegido; isso não foi apresentado como uma invasão anônima comprovada.

A nova migração `20261109021506_e2_autoridade_e_privilegios.sql` revoga sob a autoridade correta, mantém apenas os consumidores previstos e verifica o privilégio efetivo antes de confirmar. As versões anteriores continuam intactas. As instruções seguem a distinção oficial entre [autoridade para revogar](https://www.postgresql.org/docs/17/sql-revoke.html) e [privilégios padrão de objetos futuros](https://www.postgresql.org/docs/17/sql-alterdefaultprivileges.html).

Também foram removidas concessões residuais de escrita, TRUNCATE, REFERENCES, TRIGGER e MAINTAIN das tabelas próprias para os papéis de cliente. O serviço continua usando suas RPCs autorizadas. Funções futuras criadas pelo executor não recebem execução pública; tabelas e sequências futuras também não recebem privilégios automáticos de cliente. Canários transacionais verificam esses padrões.

Nove comandos de cadastro/acesso passaram de `postgres` para `ma_gestor_acessos`: sem login, herança, superuser, CREATEROLE, CREATEDB, criação de objetos ou BYPASSRLS. O papel só tem as leituras, inserções e atualizações necessárias; a escrita no cadastro canônico fica limitada à coleção de pessoas. Não pode excluir cadastros ou inserir administradores gerais. Uma projeção privada de Auth retorna identidade, confirmação e presença de senha, sem retornar hashes. Guards, versão, relações, suspensão e auditoria permanecem ativos.

O caminho legado de vínculo continua bloqueado para fichas gerenciadas, e o finalizador de entrega antigo continua sem execução pelo serviço. As associações temporárias de papéis são retiradas antes de concluir a migração. Os demais guards e triggers mantêm os proprietários documentados na matriz; SECURITY DEFINER não foi removido indiscriminadamente.

## Verificação com autoridade realista

O novo job `autoridade-banco` separa o superuser da plataforma do executor de migrações. O histórico publicado, incluindo instalação do PostGIS, é preparado no bootstrap. **As quatro migrações candidatas** — duas da fase 2, E1 e E2 — são aplicadas como `postgres` sem superuser, com propriedades e concessões equivalentes ao inventário remoto. Isso não é uma alegação de que todo o histórico antigo tenha sido instalado sem privilégios da plataforma.

Após cada migração candidata, o teste confere executor, RLS e exposição anônima; A11 é a única exceção histórica permitida antes da E2 e obrigatoriamente desaparece nela. Ao final, uma matriz versionada compara **130 funções e 36 relações**: proprietários, execução por papel, RLS e privilégios de tabela. Foram injetadas três regressões reais no banco descartável — escrita direta, execução anônima e associação ao executor — e todas foram recusadas pelo verificador; a matriz original foi restaurada após cada teste.

O backup real foi novamente restaurado e validado: **77 tabelas e 17.545 linhas**, hashes e contagens iguais, sequências conferidas, Vault recuperável e Storage íntegro. As quatro migrações candidatas passaram no clone sem rede como `postgres` sem superuser. A comparação das 33 tabelas próprias anteriores e `auth.users` preservou cadastros, contas e hashes de senha; apenas as mudanças de configuração já previstas na fase 2/E1 ocorreram. **A matriz final do clone ficou idêntica à do banco vazio.**

Evidências: [backup](e2-autoridade-2026-11-08/backup-validado.json), [preservação](e2-autoridade-2026-11-08/preservacao-backup.json), [matriz do clone](e2-autoridade-2026-11-08/matriz-clone.txt) e [regressões deliberadas](e2-autoridade-2026-11-08/matriz-regressao.txt).

## Liberação e Auth

O contrato exige os seis checks `verificar`, `permissoes-banco`, `autoridade-banco`, `transporte-whatsapp`, `mapas-mobile` e `primeiro-acesso`, além do agregador `liberacao`, todos do GitHub Actions. O agregador executa mesmo quando uma dependência falha ou é ignorada e só aceita sucesso de todas. Testes negativos cobrem falha, cancelamento, skip, ausência e resultado pendente em cada gate.

A proteção prevista para a main exige branch atualizada, vale também para administradores, mantém force push/exclusão bloqueados e exige uma revisão independente atualizada. Hoje o repositório tem apenas um colaborador: incluir um revisor autorizado antes de integrar na E6; não remover os controles para contornar a pendência.

Pages passa a exigir `PRA_SOMAR_E6_RELEASE_SHA` igual ao SHA completo autorizado. Sem essa autorização específica, falha antes de preparar ou publicar o artefato. Não foi definida autorização de publicação nesta rodada. O mecanismo exige uma decisão do responsável na E6; não prova sozinho SMTP, configuração remota ou prontidão de escala. [Procedimento de liberação](../backend/LIBERACAO.md).

Na configuração candidata, o autocadastro público está desabilitado. O Auth real recusou `/signup` sem enviar e-mail; o cadastro completo pelo administrador, convite, conta existente, primeiro acesso, login e recuperação continuaram funcionando. A alteração do Auth hospedado fica para a publicação coordenada na E6. MFA administrativo continua exigindo política e implementação próprias antes de uma declaração de prontidão enterprise; a E2 não afirma exigência de MFA já implementada.

## Resultados e limites

| Verificação | Resultado local |
|---|---|
| Node | 290 testes passaram, sem skips |
| Primeiro acesso e senha | 28 cenários com Auth/PostgREST reais, Chromium e WebKit |
| Mapas móveis | 12 combinações, três mapas, dois navegadores, 320/390 px, toque e Leaflet real |
| Banco | 40 migrações no candidato; quatro pendentes ensaiadas sem superuser; 17 suítes SQL |
| Concorrência, dados espaciais e mensagens | Seis programas anteriores e um novo de regressão de ACL aprovados |
| Transporte | Nove testes aprovados |
| Build | 17 bundles conferidos |
| Advisors | Zero erros; um aviso de desempenho preexistente em `ma_configuracao` |

O teste espacial usa a autoridade da plataforma apenas para carregar `auto_explain`; a consulta medida continua sob o papel autenticado e RLS. Os helpers temporários de teste receberam grants explícitos, pois o novo padrão não concede execução a PUBLIC; não se reabriu o padrão de produção para manter os testes funcionando.

As câmeras, expectativas imutáveis e configuração móvel ficaram byte a byte iguais. O job móvel permanece inteiro e obrigatório. [Resumo](e2-autoridade-2026-11-08/resumo.json), [avisos do banco](e2-autoridade-2026-11-08/advisors.json) e [hashes das evidências](e2-autoridade-2026-11-08/SHA256SUMS).

E3 não foi iniciada. Paginação, modularização, observabilidade, operação sob carga e os demais itens da auditoria continuam nas etapas correspondentes. O banco publicado permanece na fase 1; as correções de E2 estão no candidato até a E6.
