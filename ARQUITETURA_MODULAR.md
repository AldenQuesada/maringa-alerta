# Arquitetura modular — Sistema Integrado de Gestão de Crise

Estado local em 06/11/2026. O diagnóstico inicial está em `AUDITORIA_ADMIN_GERAL_2026-11-06.md`; o acompanhamento atual está em `CORRECOES_AUDITORIA_EM_ANDAMENTO.md`.

## Domínios com dependências explícitas

| Área | Fontes editáveis | Responsabilidades |
|---|---|---|
| Admin Geral | `src/plataforma/`, `backend/admin.js` | Prefeituras, acessos, auditoria, território, editor, serviço demo e composição; guard de admin antes das consultas remotas |
| Repositório remoto | `src/backend/` | Consultas paginadas, diferenças e composição transacional; carga dos cadastros limitada ao município solicitado |
| Repositório local | `src/cadastros/` | Contexto municipal, esquemas, estado, consultas, escrita, importação, implantação e composição |
| Implantação territorial | `src/implantacao-core/` | Texto, CNES, arquivos, conciliação e contexto IBGE/UF por município |
| Assistência | `src/crise/` | Consultas, presença, colaboradores, compatibilidade, pedidos, mobilização, utilidades e composição |
| Atendimento | `src/atendimento/` | Contrato das perguntas, anexos, gravação assíncrona e controlador da conversa |
| Gestão Municipal | `src/gestao/{navegacao,painel,tabelas,prefeitura,roteador,operacoes,app}.js` | Navegação, consultas e renderização por domínio; contexto de interface explícito |
| Implantação visual | `src/implantacao/` | Prévia, território, mapa, editor, importação, pessoas e composição |
| Mapas auxiliares | `src/mapas/` | Navegação, consultas, território, colaboradores, resultados, comandos, demonstração e composição |
| Cadastro de ocorrências | `src/ocorrencias/` | Etapas, revisão/duplicidade, mapa e formulário |
| Ações do cabeçalho | `src/acoes-cabecalho/` | Alertas, tarefas, emergência, diálogo e composição |
| Central de Conversas | `src/conversas/` | Consultas, roteiro municipal, apresentação, filtros, lista, conversa, perfil, painel e composição |
| Controladores do Evento | `src/evento/controladores/` | 28 controladores completos, com estado privado e dependências declaradas |
| Formulário da Gestão | `src/gestao/formulario.js` | Campos, abertura/edição, consultas IBGE e restauração de foco |
| Referências municipais | `src/gestao/referencias.js`, `src/gestao/catalogo-territorial.js`, `src/gestao/catalogo-bairros-ui.js` | Importação configurada, consulta/cache por cidade e apresentação do catálogo no cadastro existente |
| Serviços do Evento | `src/evento/{administracao-local,auditoria-local,fila-local,formatacao,regioes-demonstrativas,territorio}.js` | Persistência de demonstração, trilha local, fila, funções puras, geração opt-in e recorte territorial |
| Configuração e fixtures | `config/` | Município de bootstrap, referências por IBGE, identidade visual, fixtures e correspondência de recursos |

Cada módulo listado possui escopo próprio. As fábricas recebem seus serviços e contexto explicitamente. Os nomes públicos legados, como `MaringaCrise`, permanecem como contratos de compatibilidade; não selecionam uma prefeitura.

O modo conectado usa Supabase como fonte canônica. Armazenamento local e fixtures não substituem o banco remoto. A trilha de hashes da demonstração não é uma auditoria imutável de servidor. As chaves antigas de armazenamento foram preservadas para não abandonar registros existentes.

## Contratos preservados

- As rotas existentes são `/index.html`, `/gestao/`, `/plataforma/`, `/mapas/` e `/atendimento/`.
- O Admin Geral provisiona as prefeituras. O contexto municipal é validado contra as prefeituras disponíveis.
- Cadastro de colaboradores, pedidos e relatos reutiliza as coleções existentes. Um relato permanece em triagem; não vira ocorrência confirmada automaticamente.
- Pacotes de implantação precisam identificar o código IBGE da prefeitura de destino. Um pacote de outra cidade é recusado antes da gravação.
- Referências cartográficas, CNES e identidade visual são vinculadas por IBGE. Ausência de referência não autoriza usar a de outra cidade.
- O Atendimento aguarda a persistência antes de confirmar; impede confirmação repetida durante a gravação e preserva respostas quando ela falha.
- O catálogo territorial consulta a rota municipal documentada pela [API de localidades do IBGE](https://servicodados.ibge.gov.br/api/docs/localidades). Não há fallback para distrito de outra prefeitura.

## Montagem e validação

`src/modulos.json` identifica fontes e destinos. Editar as fontes; gerar os bundles com `npm run build`. Os bundles podem conter diversos módulos completos no mesmo arquivo entregue ao navegador: tamanho do bundle não equivale a acoplamento de responsabilidades.

Com Node.js 22 ou posterior:

```sh
npm ci
npm run build
npm run check
npm test
```

`check` compara os 16 bundles byte a byte, verifica a sintaxe de cada fonte isoladamente e confere as versões por conteúdo dos recursos nas cinco páginas canônicas e no Service Worker. Arquivos que só funcionam após concatenação não passam pelo build. LinkeDOM é uma dependência de desenvolvimento usada nos testes de DOM, sem inclusão no navegador. A CI instala dependências e também executa verificações SQL em PostgreSQL descartável.

## Composição dos controladores legados

Os trechos numerados que abriam/fechavam funções entre arquivos foram substituídos por módulos completos. Gestão, implantação, mapas, ocorrências e cabeçalho recebem contexto e serviços por fábrica. A Central de Conversas também tem módulos próprios e usa a prefeitura ativa nas mensagens.

No Evento, `controladores.js` monta os 28 controladores. Cada contrato declara o módulo proprietário de cada dependência; referências de estado permanecem vivas por getters/setters explícitos. A composição valida dependências antes de inicializar, preserva a ordem de inicialização e impede registrar eventos duas vezes. Não usa `eval` nem um escopo léxico compartilhado entre arquivos. Há dependências entre domínios operacionais, documentadas nesses contratos; modularização não significa ausência de acoplamento.

## Configuração e compatibilidade

`config/parametros.js` concentra os limites de GPS, importação, anexos e busca de duplicidade. `config/municipios.js` concentra referências por IBGE. Dados de eventos históricos e demonstrações ficam em arquivos de configuração próprios, com importação restrita ao município correspondente. Colaboradores fictícios novos exigem opção de demonstração; a migração de dados já existentes continua preservada. Abrir um cadastro municipal existente não reinsere a prefeitura de bootstrap.

Nomes públicos e chaves antigas de armazenamento são mantidos por compatibilidade. Constantes de protocolos, rótulos e apresentação não são seletores de município. Não interpretar a busca por literais como uma certificação absoluta de “zero hardcodes” em todo o sistema.

## Limites da validação

A separação dos controladores legados identificados nesta rodada está concluída no workspace. Os testes locais e a inspeção do Chrome em modo demonstrativo estão registrados em `CORRECOES_AUDITORIA_EM_ANDAMENTO.md`. A homologação autenticada, o SMTP e a publicação permanecem separados: a validação local não comprova permissões nem entrega de e-mail em produção. A liberação do Mapa de Evento para novas prefeituras continua explícita até sua homologação operacional.
