# Segunda integração isolada — 06/11/2026

## Corte integrado

Base integrada anterior: `39e096b`. Segundo snapshot do trabalho do chat “Auditar gestão das prefeituras”: `1c5235b`, descendente do snapshot `f6056ad`. O novo corte contém 112 arquivos alterados em relação ao primeiro snapshot. A captura foi conferida por hashes; o manifesto está nesta pasta.

Cópia de integração: `/tmp/maringa-integracao-isolada`, branch `codex/integracao-admin-seguranca`. Nenhuma alteração no workspace de origem, no Supabase remoto ou na produção; nenhum push ou deploy.

## Conciliação

Foram incorporadas as extrações dos módulos de cadastros, assistência, implantação, território, formulário da Gestão e serviços locais do evento. Os arquivos gerados foram reconstruídos a partir das fontes conciliadas.

As proteções anteriores foram transportadas para os novos módulos: aplicação de esquemas do banco, bloqueio do formulário por permissão, opções e limites operacionais fornecidos pelo servidor, referências de equipes por ID, respostas canônicas após gravações e configuração de precisão GPS e compatibilidade. O adaptador conectado não preenche dados municipais ausentes com valores demonstrativos nem busca referências locais fixas de outra cidade. O território conectado continua vindo do banco.

O conflito do teste de tarefas foi corrigido restaurando a conexão simulada do próprio teste. Foram acrescentadas regressões para impedir abertura do formulário sem permissão e impedir preenchimento demonstrativo no adaptador conectado. Fixtures ficam nos testes; nada foi enviado ao banco remoto.

## Verificação conjunta

- 241 testes JavaScript aprovados, nenhuma falha.
- Instalação de todas as migrações em PostgreSQL temporário local e seis suítes SQL aprovadas: permissões, segurança do servidor, operações, painel, administração geral e integração.
- Concorrência aprovada: conflito de versão rejeitado e ciclo entre relações simultâneas impedido.
- `npm run check`: todos os módulos gerados correspondem às fontes.
- Artefato de publicação reconstruído localmente; precache validado. Atendimento simulado permanece excluído desse artefato.
- `git diff --check` sem problemas.

As migrações SQL não foram alteradas neste segundo corte. Os resultados SQL validam o estado integrado anterior junto com a nova interface; não constituem auditoria do estado atual de produção. Não foi feito teste manual em navegador autenticado nem certificação “enterprise”.

## Trabalho posterior ao corte

O outro chat permaneceu ativo. A conferência final detectou mudanças posteriores em 23 caminhos do manifesto; elas não fazem parte deste corte testado. Uma futura integração deve partir deste snapshot e comparar o estado novo, sem sobrescrever o trabalho ativo:

- `cadastro-ocorrencia.js`
- `gestao/acoes-cabecalho.js`
- `gestao/gestao.js`
- `gestao/implantacao-ui.js`
- `mapas/app.js`
- `src/acoes-cabecalho/00-alerts.js`
- `src/gestao/00-render-municipios.js`
- `src/gestao/02-render-pref-tabs.js`
- `src/gestao/03-render-estruturas.js`
- `src/gestao/04-render.js`
- `src/gestao/05-carregar-ibge.js`
- `src/implantacao/00-notify.js`
- `src/implantacao/01-refresh-table.js`
- `src/implantacao/02-import-official.js`
- `src/implantacao/04-montar.js`
- `src/mapas/00-alertar.js`
- `src/mapas/00-camadas.js`
- `src/mapas/01-render-equipe-por-bairro.js`
- `src/mapas/02-counters.js`
- `src/modulos.json`
- `src/ocorrencias/02-marcar.js`
- `tests/integracao-canonica-mapas.test.cjs`
- `tests/mapa-navegacao.test.cjs`
