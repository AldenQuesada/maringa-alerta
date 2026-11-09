# Autoridade e liberação — E2

A implementação fica no PR 110; a publicação continua reservada à E6. A política verificável está em `config/liberacao.json`.

## Integração

A main deve exigir os checks `verificar`, `permissoes-banco`, `autoridade-banco`, `transporte-whatsapp`, `mapas-mobile`, `primeiro-acesso` e `liberacao`, todos da aplicação GitHub Actions. Manter branch atualizada, proteção também para administradores e proibição de force push/exclusão. Em 09/11/2026, o responsável autorizou explicitamente retirar somente a exigência de aprovação por outra pessoa: `required_approving_review_count=0` e `require_last_push_approval=false`. As demais proteções e os sete checks permanecem obrigatórios. Revisões recebidas continuam sendo invalidadas quando o código muda.

A pessoa responsável pelo repositório é AldenQuesada. Alterações de migração, autorização, workflows ou liberação continuam exigindo a conferência do contrato de privilégios, evidências de preservação e testes negativos. A revisão por uma segunda conta deixou de ser requisito obrigatório por decisão explícita do responsável; não registrar aprovação em nome de outra pessoa nem alterar os requisitos de teste.

O job `liberacao` executa mesmo quando uma dependência falha ou é ignorada e só aceita sucesso em todos os seis testes. Os testes do gate injetam falha, cancelamento, skip, ausência e resultado pendente em cada dependência. A proteção remota é conferida por `node scripts/verificar-liberacao.mjs protecao ARQUIVO_JSON`, usando o resultado atual da API de branch protection.

## Banco

A CI mantém a regressão integral e acrescenta `autoridade-banco`: instala o histórico de produção no bootstrap da plataforma; passa as cinco migrações candidatas pelo executor `postgres` sem superuser, com CREATEROLE/CREATEDB/BYPASSRLS e concessões equivalentes ao inventário real. Auth não pode ser delegado livremente pelo dono da migração. O PostGIS histórico é instalado no bootstrap, sem fingir que seu instalador é parte do papel limitado.

A prova histórica reproduz a troca de dono seguida da retirada de associação antes de REVOKE: a instrução gera WARNING e a permissão continua efetiva. A E2 revoga sob o dono correto, fecha padrões de objetos futuros e verifica o resultado, sem confiar apenas no sucesso do comando SQL.

Após cada migração candidata, conferir executor, RLS e exposições anônimas; a única exceção histórica, A11, precisa desaparecer na E2. A matriz final versionada cobre 139 funções e 36 relações após a primeira entrega da E3. Sua alteração exige revisar as diferenças; não recapturar a matriz só para tornar um teste verde. O programa de regressão injeta e remove grants indevidos em banco descartável para provar que o gate os detecta.

Nove comandos de cadastro/acesso usam `ma_gestor_acessos`, sem login, herança, superuser, criação de objetos ou BYPASSRLS. O papel só escreve pessoas e os metadados de acesso necessários; não exclui cadastros nem cria administradores gerais. Uma projeção privada de Auth retorna identidade, confirmação e presença de senha, sem o hash. As funções de autoridade e os demais subsistemas mantêm os proprietários documentados na matriz; a E2 não elimina indiscriminadamente SECURITY DEFINER de guards ou triggers.

## Publicação E6

### Publicação compatível autorizada em 09/11/2026

Para liberar a lixeira e a largura das tabelas sem substituir o acesso já usado em produção, `backend/config.js` mantém `cadastroAdministrativo:false`. Nesse modo, o login por link, as sessões existentes, o formulário municipal e os vínculos atuais permanecem operacionais. As páginas novas de cadastro e ativação retornam à gestão antes de inicializar Auth ou chamar suas RPCs. Nenhuma migração, política Auth, template, função de acesso ou SMTP novo é necessário para esse pacote; não aplicar essas mudanças nesta publicação.

Os sete checks continuam executando integralmente. O ambiente descartável de primeiro acesso habilita explicitamente o recurso novo e mantém os testes com Auth/PostgREST reais. Testes adicionais cobrem o modo compatível, sessões existentes e a ausência de chamadas às dependências ainda não implantadas. O flag serve para implantação gradual da interface, não como fronteira de autorização: a segurança continua nos guards e permissões do servidor.

O gate de Pages e a autorização para o SHA exato permanecem obrigatórios. A ativação futura de `cadastroAdministrativo:true` exige concluir as dependências e a homologação descritas abaixo. Esta publicação compatível não declara concluída a implantação do novo cadastro, nem a E3/E4 ou a prontidão enterprise.

Mesmo com testes aprovados e PR integrado, Pages exige a variável `PRA_SOMAR_E6_RELEASE_SHA` igual ao SHA completo do commit autorizado. Ausente, antigo ou diferente significa bloqueio antes de preparar/publicar o artefato. Não definir essa variável durante E2–E5. A autorização é específica para um commit e não se transfere ao seguinte.

Antes de autorizar na E6: revalidar backup recente; aplicar as migrações com o papel real e comparar dados/matriz; configurar Auth/SMTP/retornos; publicar a função compatível; conferir as proteções remotas; revisar o commit. O guia `SMTP_SUPABASE.md` contém os requisitos de senha e signup a conferir no Auth hospedado. As mudanças locais não configuram esse serviço automaticamente.

MFA administrativo ainda precisa de política de exigência e recuperação aprovada e implementação correspondente antes de se declarar o sistema enterprise. A E2 não afirma que MFA já seja obrigatório. O gate de commit é uma autorização de publicação pelo responsável, não uma prova automática de configuração de Auth, entrega SMTP ou prontidão de escala.

Depois da publicação, testar cadastro completo, envio a destinatário autorizado, primeiro acesso, login existente, recuperação, suspensão e acesso por município no endereço real. Registrar o SHA, evidências remotas e eventual reversão; só então concluir a E6.

## Compatibilidade da primeira entrega E3

A migração `20261109131212_e3_consultas_paginadas` altera `ma_colaboradores_contexto` para retornar apenas metadados. Publicar na E6 junto da interface de colaboradores que usa páginas, detalhe por ID e seletores; a interface anterior que esperava todas as fichas no contexto não é compatível. O serviço de envio mantém seu contrato. Não aplicar esta migração isoladamente antes da E6.

O novo executor `ma_consultor` só lê cadastros/configuração e executa os guards necessários. Os wrappers públicos continuam como invoker, sem execução anônima. A exceção de Administração Geral fica limitada aos seletores de pessoas/equipes, sob o mesmo guard do cadastro administrativo; ela não abre leitura municipal genérica. O papel e seus privilégios entram na matriz e nos testes de autoridade.

Esta entrega remove a carga integral da tela administrativa de colaboradores. O repositório compartilhado por gestão/mapas ainda acumula os cadastros municipais e copia o estado nas transações. A E3 permanece aberta até a substituição dessas leituras/comandos e a verificação dos mapas com dados paginados, sem omitir registros.
