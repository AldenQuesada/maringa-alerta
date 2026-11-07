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

`check` compara os bundles byte a byte e verifica a versão dos recursos do Atendimento. LinkeDOM é uma dependência de desenvolvimento usada nos testes de DOM, sem inclusão no navegador. A CI instala dependências e também executa verificações SQL em PostgreSQL descartável.

## Extrações ainda pendentes

O controlador principal do Mapa de Evento ainda compartilha variáveis entre trechos de renderização, ocorrências, administração, escalonamento e atendimento simulado. Também permanecem trechos lexicais nos controladores da Gestão, implantação visual, mapas auxiliares, cadastro de ocorrências e ações do cabeçalho. Os serviços extraídos acima não eliminam esses acoplamentos restantes.

Não declarar “zero monólitos” para todo o sistema. A publicação depende da revisão final, validação visual e homologação autenticada; os testes locais não comprovam esses itens. A liberação do Mapa de Evento para novas prefeituras continua explícita até sua homologação operacional.
