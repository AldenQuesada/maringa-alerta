# Administração Geral — Sistema Integrado de Gestão de Crise

## Separação canônica inspirada na arquitetura multi-tenant do LifeSinal

**Admin Geral é da plataforma inteira, não da Prefeitura de Maringá nem da marca Maringá Alerta.** É a camada de provisionamento e governo de municípios: Brasil → UF → município → ambiente municipal e atribuições locais.

A arquitetura do LifeSinal consultada como referência separa tabelas como `platform_users`, `states`, `municipalities`, `user_scope_memberships` e `access_roles`. O projeto de gestão de crise **não usa o banco do LifeSinal**.

### Rotas
- `/plataforma/`: Administração Geral global. Dashboard, municípios e georreferenciamento inicial.
- `/gestao/`: painel da Prefeitura atribuída; nenhum botão Criar Prefeitura ou Implantar Maringá; substituído por Território municipal (identificação somente leitura).
- `/gestao/#pessoas`: Usuários e Hierarquia da Prefeitura (RH e operação local).
- `/mapas/?tipo=colaboradores` e `/mapas/?tipo=ajuda`: mapas do município ativo na sessão local.
- `/index.html`: mapa de evento demonstrativo de Maringá, preservado. Não é reutilizado falsamente para Londrina.

### Fluxo de provisionamento (protótipo)
1. Entrar na sessão **demonstrativa** do Admin Geral (não autentica; sem segredo ou senha).
2. Prefeituras → Nova Prefeitura: país BR, UF, município selecionado na lista oficial IBGE, código IBGE não editável, nome/contato do administrador municipal de referência, status inicial `implantacao`.
3. Salvar: uma Prefeitura por código IBGE, sem duplicar Maringá existente.
4. Georreferenciamento: consultar malha IBGE por código oficial, conferir retorno, gravar geometria/centro/bbox e procedência na coleção `prefeituras`; outras instituições e zonas operacionais exigem implantação separada.
5. Editar/ativar/suspender município; entrar em seu ambiente municipal no mesmo navegador. Seleção da Prefeitura é fixada em `sessionStorage` nesta aba; a coleção local permanece identificada por `municipioId`.
6. Administradores municipais vinculam pessoas, órgãos, zonas e recursos apenas no próprio contexto.

### Segurança e limites

**Não existe autenticação real no GitHub Pages.** O usuário que abre `/plataforma/` pode ativar uma sessão demonstrativa local; isso NÃO protege os dados nem habilita uso operacional. Contas e atribuições exibidas são metadados locais, não convites enviados nem identidades verificadas. Não insira CPF, dados privados ou credenciais reais.

O armazenamento em `localStorage` está disponível a scripts da mesma origem; filtros por `municipioId` no navegador não são isolamento seguro. Para produção, implantar um backend exclusivo desta plataforma com:

- `countries`, `states`, `municipalities` e status;
- `platform_users` autenticados e `municipality_memberships` por usuário/role;
- Admin Geral com permissão explícita server-side para provisionar município;
- Admin Municipal limitado por RLS e pelo vínculo de município validado pelo servidor;
- registro de auditoria, convites autenticados, soft deletion e revisão de importações cartográficas;
- identidade e credenciais não vinculadas apenas ao e-mail digitado no formulário.

O Supabase conectado contém projeto LifeSinal, mas **nenhum projeto de backend próprio de Maringá Alerta foi identificado**. Não fazer alterações no banco LifeSinal. Contrato para backend real deve ser implementado quando houver projeto de produção próprio.

### Verificação

`node --test plataforma/tests/*.test.cjs gestao/tests/*.test.cjs crise/tests/*.test.cjs tests/*.test.cjs`.

Os testes validam provisionamento de Londrina, status, deduplicação IBGE, acesso municipal de demonstração e ausência de dados de Maringá na Prefeitura de Londrina; não provam segurança de servidor nem entrega de mensagens.
