# Autoridade e liberação — E2

A implementação fica no PR 110; a publicação continua reservada à E6. A política verificável está em `config/liberacao.json`.

## Integração

A main deve exigir os checks `verificar`, `permissoes-banco`, `autoridade-banco`, `transporte-whatsapp`, `mapas-mobile`, `primeiro-acesso` e `liberacao`, todos da aplicação GitHub Actions. Manter branch atualizada, proteção também para administradores, proibição de force push/exclusão e uma aprovação independente. Aprovações antigas são descartadas quando muda o código; a última atualização precisa de aprovação de outra pessoa.

A pessoa responsável pelo repositório é AldenQuesada. Alterações de migração, autorização, workflows ou liberação exigem revisão que confira o contrato de privilégios, evidências de preservação e testes negativos. Só existe um colaborador cadastrado no inventário da E2: será necessário adicionar um revisor autorizado antes de integrar o PR. Não desabilitar os requisitos para contornar essa pendência e não aprovar o próprio PR.

O job `liberacao` executa mesmo quando uma dependência falha ou é ignorada e só aceita sucesso em todos os seis testes. Os testes do gate injetam falha, cancelamento, skip, ausência e resultado pendente em cada dependência. A proteção remota é conferida por `node scripts/verificar-liberacao.mjs protecao ARQUIVO_JSON`, usando o resultado atual da API de branch protection.

## Banco

A CI mantém a regressão integral e acrescenta `autoridade-banco`: instala o histórico de produção no bootstrap da plataforma; passa as quatro migrações candidatas pelo executor `postgres` sem superuser, com CREATEROLE/CREATEDB/BYPASSRLS e concessões equivalentes ao inventário real. Auth não pode ser delegado livremente pelo dono da migração. O PostGIS histórico é instalado no bootstrap, sem fingir que seu instalador é parte do papel limitado.

A prova histórica reproduz a troca de dono seguida da retirada de associação antes de REVOKE: a instrução gera WARNING e a permissão continua efetiva. A E2 revoga sob o dono correto, fecha padrões de objetos futuros e verifica o resultado, sem confiar apenas no sucesso do comando SQL.

Após cada migração candidata, conferir executor, RLS e exposições anônimas; a única exceção histórica, A11, precisa desaparecer na E2. A matriz final versionada cobre 130 funções e 36 relações. Sua alteração exige revisar as diferenças; não recapturar a matriz só para tornar um teste verde. O programa de regressão injeta e remove grants indevidos em banco descartável para provar que o gate os detecta.

Nove comandos de cadastro/acesso usam `ma_gestor_acessos`, sem login, herança, superuser, criação de objetos ou BYPASSRLS. O papel só escreve pessoas e os metadados de acesso necessários; não exclui cadastros nem cria administradores gerais. Uma projeção privada de Auth retorna identidade, confirmação e presença de senha, sem o hash. As funções de autoridade e os demais subsistemas mantêm os proprietários documentados na matriz; a E2 não elimina indiscriminadamente SECURITY DEFINER de guards ou triggers.

## Publicação E6

Mesmo com testes aprovados e PR integrado, Pages exige a variável `PRA_SOMAR_E6_RELEASE_SHA` igual ao SHA completo do commit autorizado. Ausente, antigo ou diferente significa bloqueio antes de preparar/publicar o artefato. Não definir essa variável durante E2–E5. A autorização é específica para um commit e não se transfere ao seguinte.

Antes de autorizar na E6: revalidar backup recente; aplicar as migrações com o papel real e comparar dados/matriz; configurar Auth/SMTP/retornos; publicar a função compatível; conferir as proteções remotas; revisar o commit. O guia `SMTP_SUPABASE.md` contém os requisitos de senha e signup a conferir no Auth hospedado. As mudanças locais não configuram esse serviço automaticamente.

MFA administrativo ainda precisa de política de exigência e recuperação aprovada e implementação correspondente antes de se declarar o sistema enterprise. A E2 não afirma que MFA já seja obrigatório. O gate de commit é uma autorização de publicação pelo responsável, não uma prova automática de configuração de Auth, entrega SMTP ou prontidão de escala.

Depois da publicação, testar cadastro completo, envio a destinatário autorizado, primeiro acesso, login existente, recuperação, suspensão e acesso por município no endereço real. Registrar o SHA, evidências remotas e eventual reversão; só então concluir a E6.
