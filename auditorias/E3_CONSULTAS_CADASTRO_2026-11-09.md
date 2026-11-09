# E3 — primeira entrega: consultas do cadastro administrativo

A tela administrativa de colaboradores passou a consultar páginas e fichas sob demanda no candidato do [PR 110](https://github.com/AldenQuesada/maringa-alerta/pull/110). **Esta entrega não conclui toda a E3.** A remoção da carga integral do repositório compartilhado por gestão/mapas e do snapshot nas gravações permanece como próximo bloco. E4 não iniciada; publicação reservada à E6.

## Comportamento entregue

- O contexto inicial retorna município, papéis e áreas de acesso; não agrega fichas nem equipes. A abertura consulta apenas ID/nome da prefeitura selecionada, com limite de um registro, sem transportar geometrias municipais.
- Lista administrativa com 30 cartões por página, navegação anterior/próxima e busca no servidor por palavras do nome/bairro ou e-mail completo. O cursor usa o ID imutável, sem OFFSET. A pesquisa reinicia o cursor e descarta respostas antigas.
- A ficha completa, sua versão, permissões e nomes dos vínculos são consultados por ID somente ao editar. O endereço com `pessoa=` abre inclusive registros fora da primeira página.
- Equipe, responsável e substituto usam busca e páginas de 20 opções. A escolha atual permanece disponível quando está fora da página; voltar etapas mantém o ID e o nome selecionados. Os controles têm rótulos explícitos e cancelam buscas obsoletas.
- O salvamento continua sendo o comando específico `ma_colaborador_salvar`, com versão e guards do banco. O link continua sendo enviado somente depois de salvar. Suspensão não envia acesso; falha de envio preserva a ficha.

A migração `20261109131212_e3_consultas_paginadas.sql` fornece contratos de página/detalhe e as consultas administrativas. A interface anterior que esperava fichas dentro do contexto não é compatível com esse novo contexto; banco/interface devem ser liberados juntos na E6. O handler de envio conserva seu contrato.

## Autoridade e preservação

O novo papel `ma_consultor` não tem login, herança, criação de papéis/bancos/objetos, superuser ou BYPASSRLS. Só recebe SELECT em cadastros/configuração e execução dos guards necessários. As funções públicas são invoker; leitura privada verifica autorização antes da consulta. Anônimo e service_role não recebem execução dos novos endpoints.

A Administração Geral conserva a autorização existente de gerenciar colaboradores sem criar um vínculo municipal artificial. O acesso adicional do seletor limita-se a pessoas/equipes e é autorizado pelo guard administrativo; não libera a listagem/detalhe municipal genérico. Testes cobrem esse caso, terceiros, município externo, suspensão e chamada direta à função privada.

A matriz efetiva foi revisada: nove funções novas; execução dos dois guards pelo consultor; SELECT do consultor nas duas tabelas. Nenhum grant de escrita foi adicionado. **139 funções e 36 relações** conferiram no banco vazio e no clone real. O verificador rejeitou cinco regressões deliberadas, incluindo associação ao consultor e UPDATE concedido ao consultor. [Matriz do clone](e3-consultas-2026-11-09/matriz-clone.txt), [matriz do banco vazio](e3-consultas-2026-11-09/matriz-vazio.txt), [regressões](e3-consultas-2026-11-09/matriz-regressao.txt).

O backup autorizado foi restaurado novamente em contêiner sem rede: **77 tabelas e 17.545 linhas**, contagens/hashes, sequências, Vault e Storage conferidos. O proprietário do banco clonado foi ajustado para `postgres`, como confirmado na origem; ele permaneceu sem superuser durante as cinco migrações candidatas. As 33 tabelas anteriores, exceto a configuração já prevista pela fase 2/E1, foram preservadas. Comparando imediatamente antes/depois da E3, **as 36 tabelas verificadas, incluindo auth.users, ficaram integralmente iguais**. [Backup](e3-consultas-2026-11-09/backup-validado.json), [preservação](e3-consultas-2026-11-09/preservacao-clone.json), [migrações no clone](e3-consultas-2026-11-09/migracoes-clone.txt).

Nenhuma migração foi aplicada em produção: a conferência remota continuou mostrando 36 versões. Nenhum usuário, senha, e-mail externo ou configuração Auth foi alterado. A configuração das câmeras e seus testes permaneceram byte a byte iguais. [Câmeras](e3-consultas-2026-11-09/cameras-preservadas.json).

## Evidências de leitura com volume

Ensaio local de uma sessão: 1.000, 10.000 e 100.000 fichas sintéticas, 21 consultas por volume, primeira amostra descartada. Cada ficha contém campos adicionais que não são transportados na lista.

| Fichas sintéticas | Itens na página | JSON da página | Contexto inicial | p50 local | p95 local |
|---:|---:|---:|---:|---:|---:|
| 1.000 | 30 | 6.516 bytes | 418 bytes | 107,27 ms | 125,03 ms |
| 10.000 | 30 | 6.516 bytes | 418 bytes | 126,97 ms | 137,72 ms |
| 100.000 | 30 | 6.516 bytes | 418 bytes | 283,91 ms | 306,72 ms |

O orçamento de lista é 300 KB. O contrato admite no máximo 100 itens e interrompe a página antes de exceder 280 KB de resumos, reservando margem para o envelope. A lista administrativa de colaboradores e os seletores não incluem endereço, documento, horários, histórico ou geometria. A listagem genérica usa as colunas autorizadas pelo contrato da tela. Planos com ANALYZE/BUFFERS estão guardados; a navegação por ID usou a chave primária. O GIN foi utilizado nas buscas de 1 mil/10 mil; em 100 mil o planejador preferiu percorrer a chave primária para atender ao LIMIT. Não foi forçada a desativação de varredura sequencial. [Dados e planos](e3-consultas-2026-11-09/volume.json).

Esse ensaio mede consultas e tamanho de JSON, não capacidade de produção, rede, heap total do navegador, concorrência ou ingestão. Para preparar as fixtures de leitura, triggers de usuário foram desativados **apenas no banco descartável, dentro da transação de preparação**, e reativados antes das consultas; constraints permaneceram ativas. O ensaio inicial com ingestão passando pelos triggers foi interrompido após aproximadamente oito minutos na carga de 100 mil; isso reforça o trabalho de importação/bloqueios da E5 e não é contabilizado como prova de ingestão aprovada. As suítes funcionais e de concorrência usam os guards ativos.

## Verificações

| Verificação | Resultado |
|---|---|
| Testes Node e contratos | 291 aprovados |
| Auth, cadastro, senha, recuperação, paginação e seletores | 30 cenários em Chromium/WebKit aprovados |
| Mapas reais em 320/390 px com toque | 12 cenários aprovados; contrato canônico aprovado |
| Banco | 18 suítes SQL, concorrência e cópia canônica aprovadas |
| Autoridade | Executor sem superuser no clone; matriz exata em duas instalações; cinco regressões recusadas |
| Montagem e artefato | 17 bundles determinísticos; manifesto explícito com novo seletor; testes de empacotamento aprovados |

[Testes Node](e3-consultas-2026-11-09/testes-node.txt), [acesso](e3-consultas-2026-11-09/testes-acesso.txt), [mapas](e3-consultas-2026-11-09/mapas-mobile.txt), [SQL](e3-consultas-2026-11-09/testes-sql-completos.txt), [novas consultas](e3-consultas-2026-11-09/consultas-sql.txt).

A proteção da main foi relida: sete checks do GitHub Actions, strict, revisão independente atualizada, administradores sujeitos à regra, sem force push ou exclusão. O conector não expõe essa leitura; foi usada a API oficial via CLI. A autorização `PRA_SOMAR_E6_RELEASE_SHA` permanece ausente. [Proteção](e3-consultas-2026-11-09/protecao-main.json), [bloqueio E6](e3-consultas-2026-11-09/liberacao.json). O resultado da CI do novo commit será registrado após sua execução.

## Próximo bloco e critério para concluir E3

Adaptar `src/backend/consultas.js` e `src/backend/repositorio.js`, listas da gestão e consumidores dos três mapas. Substituir a acumulação de todas as páginas e o diff do município por consultas de tela/registro e comandos delimitados. As telas precisam informar/percorrer os resultados completos e manter contagens corretas, seleção de vínculos e geometrias necessárias; limitar uma lista a 100 silenciosamente não atende ao requisito. Medir também memória e preservar abertura, retorno, arraste e pinça usando as câmeras canônicas.

O sistema ainda não pode ser declarado enterprise pronto para escala: E3 está em andamento e permanecem os critérios de E4/E5/E6, incluindo a política de MFA, operação sob falhas, ingestão/concorrência e homologação de envio real.
