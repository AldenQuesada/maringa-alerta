# Auditoria 360 — Administração Geral e cadastro de prefeituras

Data: 06/11/2026, America/Sao_Paulo. Projeto conferido: `yyoozisgoginwepzvnvu` (`maringa-prasomar`). Escopo: banco real, autenticação e autorização, cadastro central, arquitetura do repositório, interface, testes e implantação.

O banco foi reforçado para o cadastro nacional. A identidade de administrador geral **já existia** e foi preservada. A área central foi implementada e validada no workspace; **o frontend desta revisão ainda não foi publicado**. As cinco novas migrações estão aplicadas no banco real. O sistema completo ainda não atende aos critérios de zero monólitos e zero hardcode.

## Veredito por requisito

| Requisito | Resultado | Evidência e limite |
|---|---|---|
| Banco preparado para todas as prefeituras | Aprovado para cadastro nacional | Catálogo com 27 UFs e 5.571 códigos retornados pela API IBGE; criação de todos eles exercitada em banco descartável. Não equivale a teste de carga operacional nacional. |
| Tabelas com guards | Aprovado para as fronteiras implementadas | Oito tabelas próprias com RLS; autorização no servidor; clientes sem escrita direta em cadastros, prefeituras, vínculos, catálogo e auditoria. Permissões por domínio ainda são amplas. |
| Admin de todo o sistema | Banco confirmado; interface implementada | Um admin global real reconhecido; gerência central de prefeituras, vínculos municipais e histórico. Frontend pendente de publicação e de teste autenticado na URL publicada. |
| Zero monólitos | Não atendido no sistema inteiro | Admin Geral extraído em oito módulos completos e serviço próprio. Demais bundles ainda compartilham escopo e responsabilidades. |
| Todas as funções modularizadas | Parcial | Fluxo administrativo e helpers de escrita separados. Concatenação dos fontes legados não garante isolamento de funções ou dependências. |
| Zero hardcode | Não atendido no sistema inteiro | Novo cadastro usa catálogo oficial, sem condição especial por cidade. Persistem bootstrap demonstrativo, importadores, mapas e rótulos específicos de Maringá. |

## Como o cadastro chega ao banco

1. Supabase Auth valida a sessão; `backend/boot.js` consulta `ma_meu_perfil` antes de iniciar a área central.
2. A autorização global vem de `private.ma_admins`. Campos de responsável, e-mail institucional e metadados editáveis do usuário não concedem acesso.
3. `backend/admin.js` consulta páginas de 25 prefeituras, sem baixar todos os cadastros operacionais nem todas as geometrias.
4. O formulário usa `ma_ufs` e `ma_municipios_ibge`; o usuário escolhe UF e município oficial. O código IBGE não é digitado livremente.
5. A gravação usa `ma_aplicar_alteracoes`, que encaminha para o executor privado. Ele verifica autenticação e, para cada operação, papel e prefeitura. O helper de prefeitura exige admin global.
6. O registro permanece em `public.ma_prefeituras`: ID interno, JSON canônico, código IBGE único, UF, situação, versão e data controlada no servidor. Não foi criada tabela paralela de prefeituras.
7. Constraints e trigger exigem município oficial, combinação código/UF, país BR, identidade coerente e situação válida. Código IBGE, UF e ID são imutáveis nas atualizações.
8. O criador recebe o vínculo municipal pelo trigger já existente. Uma prefeitura pode ficar em implantação, ativa ou suspensa; a API não permite sua exclusão.
9. Edição exige a versão lida originalmente. Uma alteração concorrente falha; lotes revertem integralmente em caso de erro. Após falha de requisição, a interface exige recarga antes de novas gravações.

`ma_cadastros` continua sendo o armazenamento operacional genérico de 23 coleções, com chave composta `(municipio_id, colecao, id)` e JSON. Somando o cadastro de prefeituras, são 24 coleções no adaptador. Esse modelo permite preservar os formulários atuais, mas ainda não representa todas as relações de domínio por chaves estrangeiras.

## Banco real: conferência posterior às correções

| Item | Valor observado |
|---|---:|
| UFs de referência | 27 |
| Códigos no catálogo IBGE | 5.571 |
| Prefeituras efetivamente cadastradas | 1 |
| Administradores gerais | 1 |
| Vínculos municipais existentes | 1 |
| Cadastros operacionais existentes | 252 |
| Tabelas próprias em `public` e `private` | 8 |
| Tabelas próprias sem RLS | 0 |
| Escrita direta de cliente em prefeitura/cadastro/auditoria | Bloqueada |
| Anônimo executando listagem de administradores | Bloqueado |

A referência nacional não provisionou 5.571 ambientes. Nenhuma conta, prefeitura de teste ou vínculo foi criado em produção nesta revisão. Os 252 cadastros foram preservados. As sondagens anônimas REST de prefeituras, cadastros, auditoria e listagem de administradores retornaram HTTP 401.

O perfil do admin existente foi validado com consulta somente leitura, usando a identidade já cadastrada sob o papel `authenticated`. Isso comprova a autorização no banco; não substitui um teste completo de login por e-mail no frontend publicado.

Consulta reexecutável: `supabase/auditoria/admin-geral-verificacao.sql`. Evidência visual: `evidencias-admin/banco-verificado.jpg`.

## Tabelas e fronteiras de segurança

| Tabela | Leitura de cliente | Escrita de cliente |
|---|---|---|
| `ma_prefeituras` | Admin global ou vínculo municipal válido | Apenas RPC com admin global, versão e validação oficial |
| `ma_cadastros` | Vínculo da própria prefeitura não suspensa | Apenas RPC; admin/operador da prefeitura e versão |
| `ma_vinculos` | Próprio vínculo; diretório via RPC só para admin global | RPC administrativa; conta com e-mail confirmado; papel anterior conferido |
| `ma_ufs` | Usuário autenticado | Indisponível |
| `ma_municipios_ibge` | Usuário autenticado | Indisponível |
| `ma_auditoria` | Somente admin global | Indisponível; triggers registram alterações |
| `private.ma_admins` | Sem acesso direto | Sem acesso direto; provisionamento técnico privado |
| `private.ma_convites_iniciais` | Sem acesso direto | Sem acesso direto; consumo pelo trigger de confirmação |

Todas têm RLS. O catálogo é comum aos usuários autenticados; não contém dados operacionais privados. As tabelas privadas não precisam de política permissiva: a ausência de acesso direto é intencional.

As funções privilegiadas usam `search_path` fixo. A escrita controlada usa `SECURITY DEFINER` no executor privado, com guards explícitos em cada operação; a função pública é `SECURITY INVOKER`. Portanto, não se depende apenas de RLS para autorizar a escrita. Helpers internos não são executáveis pelos clientes. Essas proteções não limitam o proprietário do banco ou uma credencial de serviço privilegiada.

A suspensão bloqueia consultas e gravações municipais subsequentes. A revogação é consultada no servidor, sem depender de cargos em JWT. Dados já vistos ou carregados em memória pelo usuário não podem ser apagados retroativamente; a aplicação ainda não tem atualização em tempo real para todas as revogações.

## Falhas encontradas e corrigidas

| Prioridade | Problema anterior | Correção |
|---|---|---|
| Alta | DML direto permitia contornar a exigência de versão da RPC | Revogados INSERT/UPDATE/DELETE diretos; escrita passa pela transação com guard |
| Alta | CHECKs JSON podiam aceitar identidade nula por resultado SQL desconhecido | Novas constraints exigem que a expressão inteira seja verdadeira |
| Alta | Código IBGE validado pelo formato, sem catálogo nacional vinculante | Catálogo oficial, FK código/UF e trigger de nome oficial |
| Alta | Administração central dependia da carga do repositório municipal | Guard anterior aos dados e serviço administrativo independente; suporta banco sem prefeitura |
| Média | Bootstrap de admin global dependia do município fundador | Novo trigger de confirmação cria somente a autorização global prevista no convite privado |
| Média | Ausência de gestão administrativa segura de vínculos pela aplicação | RPC restrita ao admin global, e-mail confirmado, papéis permitidos e conflito de versão do vínculo |
| Média | Alterações sem trilha central de metadados | Auditoria por trigger em prefeitura, cadastro, vínculo e admin |
| Média | Tela central e fontes acoplados; carregamento amplo | Oito módulos completos, paginação e projeção reduzida |
| Média | Cadastro limitado por validações locais e referências regionais | Seleção oficial de qualquer UF/município; remoção da limitação a código de UF 41 no modelo |
| Baixa | FK de prefeitura sem índice com as duas colunas | Índice `ma_prefeituras_ibge_uf`, confirmado no catálogo real do PostgreSQL |

## Admin Geral entregue

As responsabilidades foram separadas em `src/plataforma/ui.js`, `servico-demo.js`, `prefeituras.js`, `editor.js`, `acessos.js`, `auditoria.js`, `territorio.js` e `app.js`. O bundle `plataforma/app.js` é gerado a partir desses fontes. Cada módulo tem escopo próprio, com dependências compartilhadas explícitas; não depende de variáveis lexicais abertas em outro arquivo.

A interface oferece visão geral, busca e filtro de prefeituras, cadastro em duas etapas, edição no cadastro existente, situação, vínculos municipais, consulta dos administradores globais, histórico e limite territorial pelo código IBGE. O botão de inclusão tem + amarelo e rótulo acessível; barras de rolagem escuras; formulário responsivo; sem setas decorativas.

O admin global pode conceder, alterar e revogar papéis municipais de contas confirmadas. A tela não cria contas Auth nem envia e-mails; o usuário deve concluir o login antes do vínculo. Não há botão de autopromoção global. O admin global pode gerenciar a prefeitura centralmente, mas o acesso aos cadastros operacionais exige também vínculo municipal.

O teste visual local cadastrou Adamantina/SP e depois atualizou a situação no mesmo registro, sem duplicação. Isso ocorreu exclusivamente no modo demonstrativo, claramente identificado; o banco real continuou com uma prefeitura. A tela foi conferida também em um quadro de 390 px. Evidências: `evidencias-admin/admin-geral-preview.jpg` e `evidencias-admin/admin-geral-mobile.jpg`.

## Pendências que impedem aprovação integral

| Prioridade | Pendência | Evidência / próximo trabalho |
|---|---|---|
| Alta | Frontend novo ainda não publicado | Publicar o workspace pelo fluxo GitHub Pages e validar login real, cadastro, acesso municipal e revogação na URL final. Nenhum commit/push foi feito nesta revisão. |
| Alta | Permissões operacionais amplas | `private.ma_acesso` diferencia escrita por admin/operador, sem matriz específica por coleção, campo ou ação. Definir e implementar as regras de domínio antes de liberar públicos distintos. |
| Alta | Regras críticas continuam no modelo JSON/cliente | `ma_cadastros` garante identidade e escopo, mas não todas as referências entre equipes, instituições, estoques e ocorrências. Extrair relações críticas e invariantes para o servidor. |
| Alta | Operação nacional não homologada | Não houve teste de carga, concorrência entre milhares de usuários, recuperação de backup, RPO/RTO ou despacho/reserva transacional de recursos. Cadastro nacional não prova capacidade operacional nacional. |
| Média | Acoplamento fora do Admin Geral | `evento/app.js` tem 2.230 linhas; `gestao/gestao.js`, 463; `mapas/app.js`, 509. O problema não é só tamanho: fontes legados compartilham escopo e funções misturam estado, renderização, mapas e eventos. Extrair módulos de domínio e interfaces de serviço. |
| Média | Hardcodes municipais ativos | `gestao/gestao.js` contém regras para IBGE `4115200`, importações e caminhos de Maringá; `gestao/dados.js` contém bootstrap e implantação municipal específica; `evento/app.js` mantém nome, marca e fallback municipal fixos. Externalizar configuração por prefeitura e separar pacotes de referência de regras genéricas. |
| Média | Carga ampla no repositório municipal | `backend/repositorio.js` ainda busca todas as linhas visíveis de `ma_cadastros` e todas as prefeituras visíveis, em páginas de 500, reunindo-as em memória. Limitar por contexto, coleção e necessidade da tela. O novo serviço administrativo já evita essa carga. |
| Média | Histórico de migrations do CLI não reconciliado | Migrações foram aplicadas manualmente pelo SQL Editor. Antes de `db push`, conferir equivalência e registrar as oito versões aplicadas; não reaplicar DDL de tabelas existentes. |
| Média | Proteção contra senhas vazadas desativada | Security Advisor real: zero erros e um aviso, `Leaked Password Protection Disabled`. O fluxo atual usa link por e-mail; revisar a configuração Auth conforme os métodos realmente oferecidos. |
| Média | Onboarding externo depende de configuração de e-mail | Conferir SMTP e URLs de retorno do Auth antes de convidar administradores de outras instituições; a existência da conta global não comprova entrega de e-mails para todos os destinatários. |
| Média | Observabilidade e retenção de histórico limitadas | Nova auditoria registra ator, tabela, registro, operação e nomes de campos, sem valores anteriores, alertas, exportação externa ou política de retenção. Não reconstrói histórico anterior à instalação. |

Constantes de protocolo, lista de papéis, tamanho de página, país de atuação e dados oficiais versionados são contratos ou referências, não automaticamente defeitos de hardcode. O problema auditado são regras de negócio condicionadas a uma cidade e valores de operação que deveriam ser configuráveis.

O Performance Advisor inicialmente apontou zero erros/avisos e seis informações, incluindo a FK sem índice. O índice foi criado e conferido diretamente; o Advisor não foi reexecutado após essa última criação. As informações de índices ainda não utilizados não justificam remover índices recém-criados sem observar uso real.

## Validação executada

- `npm test`: **205 testes aprovados**, zero falhas, zero testes ignorados.
- `npm run check`: bundles sincronizados com os fontes.
- `node scripts/gerar-catalogo-sql.mjs --check`: **5.571 referências oficiais conferidas**.
- `git diff --check`: aprovado.
- PostgreSQL 16 local descartável: bootstrap, oito migrações e os scripts `tests/backend/permissoes.sql` e `tests/backend/admin-geral.sql` aprovados. A CI está configurada para repetir os scripts em PostgreSQL 17; a execução remota desta revisão ainda não ocorreu.
- Banco descartável: cadastro de todas as referências das 27 UFs, isolamento entre prefeituras, anônimo/leitor/operador/admin, suspensão, revogação, conta não confirmada, tentativa de elevação global, escrita direta, helpers privados, conflitos de versão e rollback de lote misto. Fixtures revertidas.
- Testes do serviço/boot: paginação, projeção reduzida, escape de filtro, preservação de dados e versão, erro de gravação, catálogo paginado, vínculo esperado, bloqueio anterior à carga e admin sem município.
- Banco real: contagens, RLS, grants, perfil existente, sondagens anônimas e índice. Não foram executadas fixtures de teste em produção.
- Navegador local: criação/edição no cadastro canônico demonstrativo, formulário em etapas e largura de 390 px. Nenhum teste visual autenticado de gravação foi feito no banco de produção.

## Migrações aplicadas nesta revisão

1. `20261106231833_admin_catalogo_guards.sql` — referência nacional e integridade de identidade.
2. `20261106231835_admin_auditoria.sql` — histórico de metadados e seus guards.
3. `20261106231836_admin_acessos.sql` — gestão restrita de vínculos e diretório administrativo.
4. `20261106233100_escrita_controlada.sql` — revogação de DML direto e executor autorizado por operação.
5. `20261106233717_indice_prefeitura_ibge_uf.sql` — índice da FK territorial.

As três migrações anteriores permanecem inalteradas. Futuras atualizações do catálogo precisam de nova migração, sem reescrever a história aplicada.

## Fontes e documentos

- [API oficial de municípios do IBGE](https://servicodados.ibge.gov.br/api/v1/localidades/municipios), consultada em 06/11/2026; snapshot em `dados-territoriais/catalogo-ibge.json`. A contagem de 5.571 é a quantidade de entradas retornadas pelo serviço.
- [API oficial de UFs do IBGE](https://servicodados.ibge.gov.br/api/v1/localidades/estados).
- [Supabase: Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security) e [funções de banco](https://supabase.com/docs/guides/database/functions), referências para a revisão de RLS e privilégios.
- [Supabase: proteção de senhas](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection), referência do aviso do Advisor.
- Contratos locais: `plataforma/README.md`, `backend/README.md` e `ARQUITETURA_MODULAR.md`.
