# Arquitetura modular canônica — Sistema Integrado de Gestão de Crise

## Escopo desta intervenção

A modularização reorganiza os **arquivos-fonte** sem criar interfaces, bancos, contas ou caminhos alternativos. Mantém as rotas já existentes: `/index.html` (Mapa de Evento), `/gestao/`, `/plataforma/`, `/mapas/` e `/atendimento/`.

### Componentes e contratos

| Área | Código entregue ao navegador | Fonte editável | Persistência canônica |
|---|---|---|---|
| Evento | `evento/app.js` | `src/evento/*` | Estado demonstrativo existente e leitor da Gestão |
| Administração Municipal | `gestao/gestao.js` | `src/gestao/*` | `gestao/dados.js` |
| Repositório municipal | `gestao/dados.js` | `src/cadastros/*` | Chave única `alerta_painel_gestao_v1` no navegador |
| Implantação territorial | `gestao/implantacao-ui.js` | `src/implantacao/*` | Mesmo repositório municipal |
| Admin Geral | `plataforma/app.js` | `src/plataforma/*` | Mesmo repositório municipal |
| Colaboradores e Ajuda | `mapas/app.js` | `src/mapas/*` | Mesmo repositório municipal |
| Atendimento | `atendimento/chat.js` | `src/atendimento/*` | `crise/core.js` → `gestao/dados.js` |
| Ocorrências | `cadastro-ocorrencia.js` | `src/ocorrencias/*` | Estado operacional existente |
| Regras de crise | `crise/core.js` | `src/crise/*` | Mesmo repositório municipal |
| Cabeçalho | `gestao/acoes-cabecalho.js` | `src/acoes-cabecalho/*` | Fontes já existentes |

## Regras imutáveis do fluxo

1. **Uma entrada:** o cadastro de colaboradores parte do Atendimento e grava em `voluntarios`. O Mapa de Evento é consumidor, não outro formulário de cadastro.
2. **Uma origem:** todos os cadastros municipais usam o adaptador de `gestao/dados.js`.
3. **Prefeituras:** o Admin Geral é dono do provisionamento; não criar prefecturas dentro de tabs municipais.
4. **Geoterritorialidade:** zonas numeradas e bairros em uma aba, com referência real, sem geometria fictícia.
5. **Uma única navegação:** as abas Gerais, Geoterritorialidade, Estruturas, Bases e Riscos reutilizam seus cadastros.
6. **Permissões:** não foram alteradas nesta intervenção, conforme escopo autorizado.

## Montagem determinística

`src/modulos.json` é o catálogo dos pacotes. Os arquivos de `src/` são as únicas fontes editáveis de cada controlador. O comando `node scripts/build-modulos.mjs` recompõe os arquivos de execução existentes por concatenação preservando rigorosamente a ordem e o escopo lexical originais. **Não usa eval no navegador, nem bibliotecas de terceiros.**

O comando `node scripts/build-modulos.mjs --check` compara cada destino **byte a byte** com o conteúdo reconstruído e reprova a publicação se houver divergência. `node --test tests/*.test.cjs gestao/tests/*.test.cjs crise/tests/*.test.cjs plataforma/tests/*.test.cjs` verifica regras funcionais.

O `index.html` não contém mais CSS e JavaScript operacionais gigantes embutidos; carrega `evento/style.css` e `evento/app.js`. O Service Worker armazena esses dois arquivos para evitar quebra na versão offline já existente.

## Estado de maturidade e limites

Esta entrega é uma **modularização física verificável de fontes**, com bundles compatíveis com o protótipo. Os trechos-fonte ainda compartilham o mesmo escopo lexical em cada bundle: isto preserva o comportamento e facilita a próxima extração de dependências explícitas, mas **não equivale a isolamento independente em runtime nem torna o software enterprise de produção**.

Continuam pendentes, fora do escopo desta rodada: API persistente central, autenticação/autorizações reais, sincronização entre dispositivos, entrega real por WhatsApp, observabilidade e implantação cartográfica homologada. Não declarar homologação institucional até concluir essas capacidades.

## Regras para futuras alterações

- **Não editar diretamente** bundles gerados: alterar apenas o `src/` correspondente, reconstruir e verificar.
- Não criar cópia de coleções, nem múltiplas telas para o mesmo cadastro.
- Não introduzir navegação profunda para modularizar código.
- Exigir teste de regressão e validação da versão publicada antes de afirmar funcionamento completo.
