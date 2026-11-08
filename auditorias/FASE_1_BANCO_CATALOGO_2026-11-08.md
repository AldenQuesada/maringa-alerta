# PRA SOMAR — banco e catálogo territorial

**Fase 1 concluída e aplicada ao banco real em 08/11/2026.** Os quatro jobs obrigatórios passaram, incluindo os 12 testes móveis. Base: `f1b38bc` da main; migração nova: `20261108115725_fase1_catalogo_territorial.sql`.

## Entrega

- Fonte única em `ma_cadastros`, preservando as coleções e IDs anteriores. Projeção relacional transacional em schema privado; clientes não escrevem diretamente nela.
- Domínios de local, serviço, recurso, pessoa, operação e área; um local aceita vários serviços e recursos com identidade própria. Referências exigem o mesmo município e o domínio correto.
- Catálogo global com 12 categorias e 70 tipos iniciais, subtipos, versão, desativação e auditoria. Novos tipos não exigem alteração de JavaScript.
- Permissões municipais para as três novas coleções, suspensão e leitura restrita por coleção. Pessoas e operações não ganham permissões novas.
- PostGIS em `gis`, índices GiST, busca por raio em metros e consulta de áreas com borda incluída. Fonte, precisão e confirmação explícita de coordenadas; serviços/recursos sem ponto próprio consultam o ponto atual do local.

O [contrato técnico](../backend/TERRITORIO.md) descreve as RPCs e os campos. Formulários e integração visual dos novos domínios nos mapas continuam na fase 3. Esta fase não envia mensagens, não reserva estoque e não inicia a fase 2.

## Backup e preservação

Novo backup capturado em 08/11/2026 às 08:54 de Brasília, antes da migração. O snapshot somente leitura foi restaurado em contêiner sem rede e sem portas, com execução de cron desativada. Conferidos dados das 72 tabelas, nove sequências, três segredos portáveis do Vault e o objeto Storage inventariado. [Evidência da recuperação](fase1-pra-somar-2026-11-08/backup-validado.json).

A migração foi aplicada novamente sobre uma restauração limpa. As 29 tabelas próprias conservaram o conteúdo anterior por contagem e hash. As únicas alterações esperadas nessas tabelas são os três novos contratos, a versão desse documento e nove permissões adicionais; o verificador remove exatamente esses acréscimos para comparar o conteúdo anterior. Os 253 cadastros mantiveram IDs, JSON, versões, datas e histórico. A projeção classificou 79 locais e 174 áreas; não criou serviços, recursos ou pessoas fictícias. [Preservação na restauração](fase1-pra-somar-2026-11-08/preservacao-restauracao.json).

Os backups, senhas, segredos e dados pessoais permanecem em arquivos privados ignorados pelo Git. O ensaio comprova recuperação do banco e do conteúdo armazenado, sem simular envio Meta ou login HTTP. A chave gerenciada do Vault não é exportada: seus segredos foram recuperados com uma nova chave apenas no destino isolado.

## Verificações

- Todas as 36 migrações em PostgreSQL 17 + PostGIS descartável; regressões de banco e WhatsApp.
- Testes territoriais: múltiplos serviços, recurso próprio, catálogo dinâmico, isolamento, suspensão, negação de escrita direta, referências, auditoria, conflito de versão, coordenadas e polígonos inválidos, desativação e compatibilidade legada.
- Concorrência entre criação de vínculo/exclusão de local, ciclo de subtipos e duas atualizações do mesmo recurso: uma transação rejeitada, sem órfãos ou atualização perdida.
- RPC real com usuário municipal e 3.000 pontos temporários: resultado correto e índice `entidades_ponto` efetivamente executado, confirmado por `auto_explain`.
- 280 testes Node, 17 bundles canônicos e nove testes Deno do transporte; 36 casos de texto, botões e imagem do WhatsApp.
- Câmeras e seus testes de contrato sem alteração. O job obrigatório `mapas-mobile` permanece sem filtros ou exceções. O [CI da implementação](https://github.com/AldenQuesada/maringa-alerta/actions/runs/42480384752) aprovou os quatro jobs; o [job móvel](https://github.com/AldenQuesada/maringa-alerta/actions/runs/42480384752/job/128730817920) registrou **12 passed**, nenhum ignorado, nos três mapas, dois navegadores e duas larguras. Nesta máquina os executáveis de navegador não estão disponíveis; a evidência móvel é do CI.

A CLI 2.115.0 identificou exclusivamente a nova migração, sem seed, alteração de papéis ou Vault: [dry-run](fase1-pra-somar-2026-11-08/migracao-prevista.json). Os advisors anteriores apontam dois avisos já existentes: reavaliação de identidade na policy de configuração e `pg_net` instalado em `public`. Eles não foram alterados para esta entrega. [Diagnóstico anterior](fase1-pra-somar-2026-11-08/advisors-antes.json).

## Aplicação e conferência remota

A CLI aplicou exclusivamente a migração territorial, com `--skip-vault`, sem seeds. O histórico remoto contém **36 versões iguais às locais** e o novo dry-run informou `upToDate: true`, sem migrações pendentes. [Aplicação](fase1-pra-somar-2026-11-08/aplicacao-remota.json) e [alinhamento](fase1-pra-somar-2026-11-08/migracoes-alinhadas.json).

A comparação pós-aplicação confirmou o conteúdo anterior das **29 tabelas próprias**, incluindo todos os **253 cadastros**. Não houve cadastro novo em produção. As quatro tabelas territoriais elevam o total próprio a 33, com RLS. [Preservação remota](fase1-pra-somar-2026-11-08/preservacao-remota.json).

As APIs foram exercitadas em transação somente leitura com papel SQL `authenticated` e o vínculo municipal existente: catálogo 12/70, 79 locais, 174 áreas, raio e cobertura territorial funcionaram. Nenhuma sessão HTTP foi simulada nem mensagem enviada. [Verificação remota](fase1-pra-somar-2026-11-08/verificacao-remota.json).

Os advisors posteriores apresentaram exatamente os dois avisos anteriores; **nenhum aviso novo**. [Diagnóstico posterior](fase1-pra-somar-2026-11-08/advisors-depois.json). A implementação está no [PR #109](https://github.com/AldenQuesada/maringa-alerta/pull/109). A fase 2 permanece não iniciada.

## Reprodução

Em banco descartável, siga o job `permissoes-banco` de `.github/workflows/testes-prototipo.yml`. Ele cria banco via `template0`, para que a migração instale PostGIS em `gis`, e mantém a imagem fixada por digest. Nunca execute as fixtures no banco real.

`scripts/fase1-verificar-preservacao.py` executa somente transações de leitura e compara um manifesto privado da fase 0/backup com o banco migrado. Recebe `--manifesto` e `--saida`; conexão por `PGSERVICEFILE`/`PGSERVICE` ou por executável `PSQL` para o contêiner. Não imprime dados dos registros.

A aplicação da migração é transacional. Em caso de falha antes do commit, nada dessa migração permanece. Depois do commit e do uso dos novos domínios, não há reversão destrutiva automática: uma eventual correção deve preservar os cadastros novos e usar migração adicional ou recuperação previamente planejada.
