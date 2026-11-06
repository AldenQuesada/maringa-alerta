# Organização vigente — Admin Geral separado das Prefeituras (04/11/2026)

**Admin Geral é de toda a plataforma:** `/plataforma/`. Ele cria/edita Maringá, Londrina e outros municípios selecionados pelo IBGE, controla status, administrator municipal de referência e georreferenciamento inicial. Não pertence à Prefeitura de Maringá. O painel abaixo recebe somente o município atribuído.

**Ambiente municipal:** `/gestao/`. O grupo Prefeitura e Território começa por **Território municipal** (somente leitura dos identificadores centrais), seguido de Bairros, Zonas, Bases e Áreas de risco. **Não há Criar Prefeitura ou Implantar Maringá no menu municipal.** O grupo Pessoas e Hierarquia mantém RH e vínculos de responsabilidades locais. Todos os demais grupos do sidebar continuam como antes. Os três mapas permanecem.

**Estado atual:** sessão de demonstração em `sessionStorage` e coleções locais em `localStorage`, sem autenticação ou controle de acesso real. Não utilizar dados sensíveis. Backend exclusivo da plataforma com `platform_users`, `municipalities`, memberships e RLS é requisito para produção. O banco do LifeSinal não é utilizado nem alterado. Consulte `/plataforma/README.md`.

---

# Painel de gestão do Maringá Alerta

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


## Implantação territorial georreferenciada de Maringá (04/11/2026)

**Entrada única:** Painel de Gestão → Prefeituras e território → **Implantar Maringá**. Dentro da mesma tela: Brasil/Paraná/Maringá (IBGE 4115200), consulta IBGE Localidades/Malhas, consulta CNES, importação de GeoJSON ou CSV municipal, prévia em tabela e mapa, conferência, salvamento consolidado. Também é possível alcançar o fluxo pelo botão na tela Prefeituras.

**Usuários e hierarquia:** agora um único item **Pessoas e hierarquia** com filtros por função/órgão/zona e formulário de pessoa com função principal, papéis adicionais e substituto. Não se atribuem automaticamente cargos a nomes encontrados em notícias.

**Escopo rigorosamente preservado:** os grupos Equipes e comunidade, Ajuda e mobilização, Rede de emergência, Infraestrutura e recursos, Regras e comunicação, os três mapas e a sessão permanecem na estrutura anterior. Cadastros históricos de administradores, responsáveis, substitutos, coordenadores e operadores continuam na coleção única `usuarios`, embora os atalhos separados sejam substituídos por um único item.

**Fontes**: IBGE `/api/v1/localidades/municipios/4115200` e `/api/v3/malhas/municipios/4115200` (GeoJSON); DEMAS `/cnes/estabelecimentos` filtrado por município, status ativo, limite 20 e `offset` como número de página. Se a chamada remota falhar ou a base municipal não tiver API pública compatível, usar o arquivo oficial exportado (CNES CSV ou GeoJSON municipal). A interface evidencia os erros e **não insere registros não conferidos** como operacionais.

**Identificadores e não duplicação:** CNES recebe `externalId: cnes:<código>`; bairros e outros registros exigem nome e geometria compatível; importação em lote não substitui cadastros validados manualmente e não toca coleções de voluntários, equipes e pedidos. Referências institucionais Copel/Sanepar/Polícias/Bombeiros podem ser preparadas sem localização e ficar em estado **Pendente**, jamais declaradas unidades georreferenciadas.

**Status técnico:** implementado como **protótipo em GitHub Pages com persistência local (localStorage)**. Nem importações nem alterações são compartilhadas entre dispositivos ou usuários; não há backend geoespacial, PostGIS, autenticação/RLS, sincronização de prefeituras ou WhatsApp oficial. Para implantação municipal real, requer backend, autorização institucional, curadoria das bases e validação territorial por órgãos responsáveis.

**Teste de implementação:** `node --test gestao/tests/*.test.cjs crise/tests/*.test.cjs tests/*.test.cjs` e verificação sintática dos arquivos `gestao/implantacao-core.js`, `gestao/implantacao-ui.js`.

## Central de Conversas · colaboradores (06/11/2026)

- **Acesso:** Gestão municipal → Atendimento → **Central de Conversas**, rota \`/gestao/#conversas\`.
- **Fonte única:** lista municipal \`db.lista("voluntarios")\`, da mesma coleção utilizada no Mapa de Colaboradores, sem criar pessoas, mensagens ou coleções paralelas.
- **Três painéis:** conversas à esquerda; roteiro de cadastro Pra Somar ao centro; seleção múltipla das zonas e ficha completa do colaborador à direita.
- **Filtro de zona:** usa a zona registrada; caso ausente, somente o vínculo exato do bairro cadastrado com uma zona; sem inferir geografia e sem incluir outra prefeitura.
- **Reconstrução:** mensagens do roteiro são geradas para visualização com valores efetivamente disponíveis no cadastro. Ausência de dados é sinalizada; **não se trata de mensagens WhatsApp reais**.
- **Ações:** busca por nome, contato, bairro e oferta, atualização dos registros, criação e edição diretamente no formulário canônico de Colaboradores.
- **Limites atuais:** leitura local no navegador, sem sincronização, autenticação real ou histórico externo. Os voluntários gerados aleatoriamente pelo antigo mapa demonstrativo não são promovidos a cadastros verificados.
- **Validação:** \`gestao/tests/central-conversas.test.cjs\`, checagem de sintaxe e build modular canônico.
