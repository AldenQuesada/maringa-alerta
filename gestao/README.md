# Estrutura administrativa vigente · correção de 04/11/2026

O painel principal usa `index.html` + `painel-unificado.js` + `painel-unificado.css`. A versão anterior `gestao.js` permanece apenas para histórico, **não é carregada pela página**.

**Cabeçalho central, sempre três botões:** Mapa de Colaboradores / Mapa de Evento / Mapa da Ajuda. Todos abrem aplicações independentes; o Mapa de Evento original continua em `../index.html` sem alterações.

**Sidebar:** Visão geral, Prefeituras, Colaboradores, Pedidos de ajuda e Mobilização.

**Nova Prefeitura / Editar Prefeitura:** uma única ficha, com seções internas de território; responsáveis e hierarquia; equipes municipais; instituições e serviços; recursos; configurações. Não existe menu para cadastrar separadamente administrador, responsável, substituto, coordenador ou operador. O salvamento integral ocorre uma vez pelo botão **Salvar Prefeitura** (`dados.js: salvarFichaPrefeitura`) e preserva ofertas e pedidos já recebidos.

**Colaboradores:** a tela é de **consulta**, sem Novo/Editar. O cadastro é feito pelo fluxo Maringá Unida no WhatsApp (no presente, `../atendimento/` é uma **simulação local**, não integrada à API oficial). Pedidos de ajuda seguem o mesmo princípio.

**Mobilização:** as ações estão nos mapas, não em uma lista de cadastros fragmentados. As mensagens externas e a cooperação real entre municípios dependem de backend e conectores oficiais.

**Validação:** `node --test gestao/tests/*.test.cjs crise/tests/*.test.cjs tests/*.test.cjs`. Esta reorganização não deve modificar `../index.html`, `../fluxo-ajuda.js`, nem o mapa de navegação aprovado.

---

# Histórico de versões do Painel de Gestão

## Separação estabelecida

- **Mapa Operacional existente:** `/index.html` no GitHub Pages. Preservar sem alterações nesta entrega.
- **Novo painel de gestão:** `/gestao/`. Contém sidebar de cadastros, conteúdo administrativo central e botão **Mapa Operacional** no centro do cabeçalho.
- O botão abre a URL do mapa original em uma janela independente no desktop, ou nova aba em navegadores móveis/onde popups não são permitidos.
- Não existe iframe nem cópia da interface operacional na área administrativa.

## Componentes

- `gestao/index.html`: layout, cabeçalho, sidebar, área central, formulário lateral.
- `gestao/gestao.css`: design responsivo, menu recolhível e tabelas/formulários.
- `gestao/dados.js`: schemas reutilizáveis para cadastros, isolamento municipal local, validação e CRUD.
- `gestao/gestao.js`: navegação, interfaces dinâmicas, edição, seleção de município, consulta opcional ao IBGE, mapa de prefeitura e sessão.
- `gestao/tests/gestao-dados.test.cjs`: contratos de cadastro, separação municipal e preservação do mapa original.

## Cadastros incluídos

Prefeituras; zonas; bases e riscos; administradores; responsáveis; substitutos; coordenadores; operadores; equipes; integrantes; voluntários; saúde; emergência; parceiros; veículos; equipamentos; estoques; abrigos; pontos críticos; tipos de ocorrência; canais; regras de acionamento.

Cadastros de categorias da mesma natureza compartilham a mesma coleção local: usuários são diferenciados por papel, instituições por categoria.

## Limitações desta etapa

O painel foi criado como **nova aplicação de interface e cadastro local**. Os registros são persistidos no `localStorage` do navegador com escopo municipal e não alimentam o Mapa Operacional original. A sessão usa os componentes de demonstração já presentes no repositório, sem autenticação segura nem autorização no servidor. O módulo de prefeitura oferece seleção pelo catálogo IBGE quando a rede responde e geocodificação não garantida por serviço externo; apenas Maringá tem coordenadas iniciais locais.

Na fase de integração, substituir `AlertaGestaoDados.criar()` por repositório/API autenticado com PostgreSQL, PostGIS, vínculos por prefeitura, RLS e autorização por função. O mapa original passará a consumir esses mesmos dados por API, mantendo sua interface e fluxo aprovados. Não ativar acesso real de cidadãos/equipes sem o backend.

Não adicionar mecanismos de aprovação de rotina: ocorrência confirmada continua acionando ajuda compatível automaticamente e avisando o responsável regional. Voluntário continua confirmando somente chegada e término.

## Validação

```bash
node --test gestao/tests/gestao-dados.test.cjs
node --test tests/*.test.cjs
```

Critérios do painel: botão operacional central no cabeçalho; login no canto direito; sidebar com apenas cadastros; conteúdo central com busca/CRUD; funcionamento móvel; criação de segunda prefeitura sem contaminar os cadastros de Maringá; alterações limitadas à pasta `gestao/`.

## Atualização: Sistema Integrado de Gestão de Crise (04/11/2026)

Esta etapa acrescentou **dois mapas standalone** e um atendimento conversacional demonstrativo, preservando a interface original de eventos.

| Mapa | URL | Função |
|---|---|---|
| Evento | `/index.html` | Ocorrências e comando operacional original, intocado |
| Colaboradores | `/mapas/?tipo=colaboradores` | Pessoas físicas/jurídicas, equipamentos, ofertas por zona e preparação de brigadas |
| Ajuda | `/mapas/?tipo=ajuda` | Pedidos pós-evento, status, correspondência e solicitação a outras prefeituras |

Entrada conversacional: `/atendimento/` (**simulação**, não um número WhatsApp oficial). A UI da Gestão continua dedicada à administração, com três atalhos de mapas no cabeçalho. Novos módulos do sidebar: **Pedidos de ajuda**, **Mobilizações de brigadas** e **Apoio entre prefeituras**. O cadastro de colaboradores agora contempla as categorias completas da seção 5.4 do Plano Diretor.

Fonte compartilhada de demonstração: `gestao/dados.js` + `crise/core.js` com `localStorage`, isolado por município **somente no navegador**. As ações de brigadas e entre prefeituras preparam registros/mensagens, **não enviam** mensagens ou pedidos por API. As necessidades financeiras não desencadeiam pagamentos. O mapa não publica endereço nem telefone de solicitantes.

Consulte `/AUDITORIA_SISTEMA_INTEGRADO_CRISE.md` para o estado funcional e as integrações reais que faltam. Testes: `node --test crise/tests/crise.test.cjs gestao/tests/gestao-dados.test.cjs tests/*.test.cjs`.
