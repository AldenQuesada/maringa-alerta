# Auditoria do banco e da arquitetura — 06/11/2026

**Parecer: base de integração funcional, ainda não pronta para operação enterprise.** Pode continuar o desenvolvimento de cadastros e consultas, mas funções críticas de despacho, estoque, mobilização e dados pessoais precisam das correções abaixo.

## Escopo e confiança

Revisão do commit `2c895659025ea7492328270ae63957c65b8b3655`, das três migrações, adaptador Supabase, geração de bundles, persistência e regras do navegador. Nesta auditoria, 197 testes JavaScript passaram. Não executei testes destrutivos nem alterei o banco.

**Limitação:** a nova consulta ao projeto yyoozisgoginwepzvnvu pelo conector foi recusada por falta de permissão. A aba SQL disponível está sob controle de outro chat e não foi tomada. Portanto, este é um relatório de arquitetura e segurança das migrações, com dados de produção observados na etapa anterior; não é certificação da configuração atual do servidor. Não foi concluída nova contagem global das tabelas internas do Supabase, nem nova consulta a policies, grants e advisors efetivamente instalados.

## Quantas tabelas

As migrações versionadas definem **cinco tabelas próprias**:

| Schema | Tabela | Função | Proteção definida |
|---|---|---|---|
| public | ma_prefeituras | Municípios | RLS; leitura por acesso; escrita por administrador da plataforma |
| public | ma_vinculos | Usuários e papéis municipais | RLS; usuário consulta seu próprio vínculo; sem escrita direta concedida |
| public | ma_cadastros | 24 coleções em JSONB | RLS municipal; admin e operador podem escrever/excluir |
| private | ma_admins | Administradores da plataforma | RLS e acesso direto revogado |
| private | ma_convites_iniciais | Provisionamento inicial | RLS e acesso direto revogado |

Não confundir 24 coleções lógicas com 24 tabelas. Também existem tabelas gerenciadas por Supabase, como Auth e Storage; seu total não foi recontado nesta execução.

Última verificação de produção, na etapa anterior desta conversa: 252 registros em ma_cadastros (113 bairros, 61 zonas, 61 instituições, 17 bases), além da prefeitura. Não apresento esse número como uma nova consulta ao banco.

## Achados prioritários

### Alta — validação de negócio insuficiente no servidor

`src/cadastros/01-novo-estado.js`, função gravar, valida campos obrigatórios e vínculos circulares de eventos no navegador. A migração de fundação valida apenas estrutura básica do JSON, identidade, município e coleção. Um cliente autenticado pode enviar JSON diretamente sem as validações dos formulários. RLS restringe linhas; não substitui validação do conteúdo.

Ação: contratos e validações por domínio no banco/serviço; chaves estrangeiras para relações relevantes; estados e transições permitidos; testes diretos da API para payloads inválidos. JSONB pode permanecer para campos flexíveis, sem concentrar nele toda a integridade operacional.

### Alta — concorrência otimista contornável pela escrita direta

`ma_aplicar_alteracoes` é SECURITY INVOKER, aplica RLS, faz lote atômico e exige versão para atualizar/excluir. Isso é positivo. Contudo, a migração também concede INSERT/UPDATE/DELETE diretamente em ma_cadastros a authenticated. Um operador autorizado pode usar a Data API diretamente, sem o predicado de versão da RPC. O gatilho incrementa a versão, mas não exige a versão esperada.

Ação: desenhar um caminho de escrita único com controle de versão efetivamente obrigatório. Revogar grants isoladamente quebraria a RPC invoker; a mudança exige desenho conjunto de privilégios e funções, sem simplesmente trocar para SECURITY DEFINER e ampliar acesso.

### Alta — permissões muito amplas para futuras operações

`private.ma_acesso` concede escrita municipal a admin e operador sem diferenciar coleção ou ação. O operador pode excluir registros do próprio município. Leitores com vínculo podem ler todas as coleções municipais, inclusive futuras solicitações e relatos com dados pessoais. Não é exposição anônima, mas falta autorização por função e domínio.

Ação: matriz de permissões aprovada, segregação de dados sensíveis, políticas por coleção/ação e testes de usuários com poderes distintos.

### Alta — ausência de trilha operacional persistente no modelo próprio

As tabelas guardam versão e data, mas não histórico completo de antes/depois e autor da alteração. `src/evento/11-auditoria-local.js` mantém auditoria em localStorage; isso não é trilha central confiável. Logs da plataforma, cuja retenção não foi verificada, não foram tratados como substituto de auditoria de negócio.

Ação: eventos de auditoria gravados pelo servidor, com autor, município, operação, registro, data e correlação, com acesso de escrita restrito e retenção definida.

### Média — nem tudo fica no banco

O adaptador conectado confirma os cadastros no Supabase antes de atualizar a memória e bloqueia novas gravações após resultado incerto. Entretanto, `mapas/ficha-ponto.js` salva rascunhos e lembretes no localStorage; auditoria local e modo demonstrativo também usam armazenamento local. Atendimento WhatsApp continua simulado. A cartografia pública é carregada de arquivos versionados; a interface não depende exclusivamente das geometrias do banco.

Ação: explicitar quais dados são apenas preferências de dispositivo; migrar rascunhos operacionais e auditoria para serviços próprios; separar demonstração de produção. Sessão de autenticação no dispositivo não é, por si, um defeito.

### Média — existem valores e regras fixos no código

`backend/repositorio.js` prefere o município maringa; `src/cadastros/01-novo-estado.js` contém bootstrap e padrões municipais; `src/mapas/00-camadas.js` limita a fonte territorial a Maringá. `src/cadastros/00-contexto-part*.js` define campos, opções e categorias. O convite inicial também vincula diretamente ao município maringa.

Ação: mover configurações municipais e regras operacionais variáveis para cadastros versionados. Não é necessário colocar todo texto visual ou componente no banco. URL pública e chave publishable no frontend são configuração pública esperada, não segredo exposto.

### Média — modularização física, ainda com acoplamento de monólito

Há fontes separadas por domínio e build determinístico, o que facilita manutenção. Porém, `scripts/build-modulos.mjs` concatena os arquivos em ordem; `evento/app.js` tem 2.230 linhas e usa estado/funções compartilhados. Dividir arquivos não estabelece contratos independentes. `ma_cadastros` também concentra os domínios numa tabela genérica.

Ação: módulos com interfaces explícitas, separação entre apresentação, casos de uso e repositório, testes independentes por domínio. Um monólito modular bem estruturado pode atender ao produto; microserviços não são condição obrigatória de maturidade.

### Média — crescimento e atualização entre dispositivos

`backend/repositorio.js` busca todas as linhas acessíveis, em páginas de 500, reconstrói estado e faz cópias JSON e diferenças no cliente. Adequado para a carga pequena atual; falta evidência de comportamento sob grande volume e concorrência. Atualização depende de recarregar; não existe sincronização automática implementada.

Ação: consultas por necessidade, filtros e paginação no servidor, índices guiados por consultas reais, invalidação de dados e testes de carga com metas explícitas. Realtime é uma opção, não requisito universal.

## Controles positivos encontrados

- RLS definida nas cinco tabelas próprias; acesso anônimo revogado nas tabelas públicas da aplicação.
- Papéis baseados em vínculos no servidor, sem autoatribuição por campos editáveis do usuário.
- Helpers privilegiados em schema privado, com search_path fixo e execução restringida.
- Login PKCE, chave publishable no cliente, operações em lote e tratamento de conflito.
- Testes de isolamento de banco versionados e CI existente; os testes de banco não foram novamente executados nesta auditoria.
- Build verifica correspondência entre fonte e arquivos publicados; 197 testes JavaScript aprovados nesta execução.

A proteção RLS precisa ser avaliada junto com grants e políticas, conforme a [documentação oficial Supabase](https://supabase.com/docs/guides/database/postgres/row-level-security). A existência de RLS não equivale a certificação enterprise.

## O que falta verificar no ambiente

Inventário real de tabelas, funções, views, grants e schemas expostos; configuração Auth/MFA; advisors atuais; backups e restauração testada; RPO/RTO; retenção e monitoramento; recuperação de incidentes; limites de capacidade; ambientes separados; histórico de migrações. O README informa aplicação manual das migrações: reconciliar esse histórico antes de automatizar novos db push. Ausência de evidência não significa que um recurso do provedor esteja desativado.

## Condição para avançar

1. Antes de dados pessoais e ações críticas: concluir inventário vivo e corrigir autorização, validação e concorrência do servidor; implantar auditoria persistente.
2. Antes de despacho e mobilização reais: implementar estados transacionais, reservas e idempotência, sem tratar a simulação do frontend como operação concluída.
3. Antes de operação institucional: testar restauração, capacidade e incidentes, definir monitoramento e ambientes.
4. Pode avançar agora: consultas, revisão cadastral e interfaces das próximas funções, mantendo ações ainda não implementadas claramente indisponíveis.

**Conclusão:** não está tudo no banco; a UI ainda contém regras e persistência próprias; existem hardcodes e acoplamento. A fundação permite evolução, mas não autoriza declarar prontidão enterprise ou operação crítica.
