# Administração Geral

A rota `/plataforma/` exige Supabase Auth e `ma_meu_perfil().admin_plataforma`. O servidor decide a autorização usando `private.ma_admins`; nome de responsável, e-mail institucional e metadados editáveis do usuário não concedem privilégios.

A identidade de administrador geral já existente no projeto foi preservada. A página permite consultar administradores gerais e administrar vínculos municipais; não oferece autopromoção nem criação de administrador global. O provisionamento inicial é técnico, por convite privado e confirmação de e-mail pelo Auth. O admin geral pode iniciar mesmo quando ainda não existe prefeitura.

## Fluxos

- Visão geral: contagens consultadas no servidor.
- Prefeituras: busca por nome ou código IBGE, filtro de UF e páginas de 25 registros.
- Nova Prefeitura: botão com + amarelo, identificação oficial e responsabilidade em duas etapas; grava na tabela existente `ma_prefeituras`.
- Editar: conserva dados e geometrias, exige a versão original, permite implantação, ativação e suspensão. IBGE e UF são imutáveis.
- Acessos: vincula uma conta já confirmada a uma prefeitura como administrador, operador ou leitor; permite alterar ou revogar o vínculo. Não cria contas Auth nem envia convites. Para uma conta nova, a pessoa precisa concluir o login por e-mail antes do vínculo. SMTP e URLs de retorno precisam estar configurados para os destinatários pretendidos.
- Território: importa o limite do município pelo código IBGE, sem regra especial por cidade.
- Histórico: consulta paginada dos metadados de alterações produzidos no banco. Não copia valores pessoais completos nem reconstrói estados anteriores.

O Admin Geral só abre os cadastros operacionais de prefeituras em que também tem vínculo municipal. O criador recebe esse vínculo no servidor ao cadastrar a prefeitura. Suspensão bloqueia os acessos municipais; o cadastro central permanece disponível para reativação.

## Contratos

`backend/admin.js` implementa consultas paginadas, estatísticas, catálogo e RPCs. Não carrega `ma_cadastros` nem as geometrias de todas as prefeituras ao entrar. `backend/boot.js` executa o guard da rota antes de iniciar esse serviço. Gravações falhas bloqueiam novas tentativas no serviço até recarregar e conferir o resultado.

`src/plataforma/` contém oito módulos com escopos independentes: componentes visuais, adaptador demonstrativo, listagem, formulário, acessos, histórico, território e composição das rotas. O build concatena módulos completos, sem dividir funções ou depender de variáveis lexicais de arquivos vizinhos. `plataforma/app.js` é gerado; editar os fontes.

O modo `?modo=demo` usa o cadastro local existente, é identificado visualmente e não simula concessão de permissões reais. Não é um mecanismo de autenticação.

## Referência territorial

`ma_ufs` e `ma_municipios_ibge` contêm a referência IBGE consultada em 06/11/2026: 27 UFs e 5.571 códigos na API de municípios. Referências não são prefeituras provisionadas. `dados-territoriais/catalogo-ibge.json` é o snapshot de origem e referência do modo demonstrativo. A interface conectada consulta o catálogo no banco.

`node scripts/gerar-catalogo-sql.mjs --check` confere o snapshot contra a migração. Para atualizar o catálogo depois de aplicada, criar **nova migração**, preservando a história existente; não reescrever a migração aplicada.

## Verificação e publicação

`npm test`, `npm run check`, `tests/backend/permissoes.sql` e `tests/backend/admin-geral.sql`. As fixtures SQL só podem rodar em PostgreSQL descartável; são revertidas. `supabase/auditoria/admin-geral-verificacao.sql` é uma consulta somente leitura para conferir o projeto real.

As cinco migrações de 06/11/2026 do Admin Geral foram aplicadas e verificadas no projeto `yyoozisgoginwepzvnvu` pelo SQL Editor. O frontend desta revisão está no workspace; ainda precisa ser publicado pelo fluxo GitHub Pages. As migrações históricas foram aplicadas manualmente, sem registro no histórico do CLI: reconciliar as versões antes de usar `supabase db push`.
