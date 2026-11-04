# Auditoria de cobertura · Sistema Integrado de Gestão de Crise
**Maringá Alerta / Maringá Unida** · 04/11/2026

## 1. Resultado

O produto agora é dividido em **três mapas especializados**, integrados pelo conceito territorial, mas **não** por uma API operacional comum em produção:

1. **Mapa de Evento** — aplicação original `/index.html`, preservada sem modificações nesta entrega. Gestão de ocorrências, urgência, responsáveis, zonas, equipes, alertas e simulações de mensagens.
2. **Mapa de Colaboradores** — nova aplicação `/mapas/?tipo=colaboradores`. Pessoas físicas/jurídicas, capacidades e equipamentos cadastrados, visibilidade por zona, filtros, preparação de brigadas com uma ação.
3. **Mapa da Ajuda** — nova aplicação `/mapas/?tipo=ajuda`. Pessoas/empresas afetadas, pedidos pós-evento, triagem e correspondência local de capacidades, solicitação intermunicipal preparada.

Entrada conversacional `/atendimento/`: **“Olá, bem-vindo ao Maringá Unida! Como você gostaria de se cadastrar?” → Colaborador / Receber ajuda**. O mesmo telefone pode estar associado a um colaborador e a vários pedidos de ajuda. Não é obrigatória uma escolha permanente de papel.

## 2. Auditoria dos objetivos aprovados

Legenda: **Implementado no protótipo** = código demonstrativo navegável, sem garantia de serviço real; **Parcial** = interface/decisão presente, integração faltante; **Pendente** = ainda não desenvolvido como serviço de produção.

| Objetivo | Estado verificado | Evidência/limitação |
|---|---|---|
| Mapa Operacional / de Evento, zonas e ocorrências | Implementado no protótipo anterior | `index.html`, Leaflet, zonas de demonstração, ferramentas operacionais. Preservado intocado nesta alteração. |
| Ocorrência confirmada aciona compatíveis e informa responsável | Parcial | Motor/fluxo de simulação `fluxo-ajuda.js`, `index.html`; guard/reservas devem migrar ao backend para condições reais. |
| Estado Cheguei → Terminei, sem burocracia | Implementado em simulação | Fluxo anterior e novo teste em `crise/core.js` / `atendimento/chat.js`. |
| Relatório de evento, chat interno, alertas, mapa de calor e histórico | Implementado no protótipo anterior | Funções demonstrativas conforme `GUIA_IMPLEMENTACAO.md`; canais e fontes podem ser simulados. |
| Gestão administrativa, prefeituras, usuários, zonas, recursos | Implementado em cadastro local | `gestao/`. Dados `localStorage`; sem autenticação segura/RLS ou sincronização entre dispositivos. |
| Novo Mapa de Colaboradores por zona | Implementado no protótipo novo | `mapas/?tipo=colaboradores` agrega marcadores por zona e filtra pessoa física/jurídica, capacidades e disponibilidade. |
| Cadastro completo PF/PJ de colaboradores | Implementado no protótipo novo | `gestao/dados.js`, `crise/core.js`: quatro campos mínimos, todos os serviços, equipamentos, empreendedorismo, materiais e “Outro”. |
| Novo Mapa da Ajuda pós-evento | Implementado no protótipo novo | `mapas/?tipo=ajuda`, pedidos com categoria, zona, urgência e situação. Detalhes residenciais não são exibidos nos marcadores. |
| A mesma pessoa colaborar e pedir ajuda | Implementado no protótipo novo | Reutilização do telefone no navegador; falta identificação/validação real. |
| Fluxo inicial Maringá Unida por WhatsApp | Parcial | `atendimento/` reproduz escolhas e perguntas; **não** é conectado ao WhatsApp Cloud API. |
| Pedir comida, telhas, dinheiro e outras ajudas | Implementado no protótipo novo | Catálogo de necessidades; não executa pagamentos e não expõe endereço no mapa. |
| Encontrar colaboração compatível por zona | Parcial | Correspondência local preliminar; não representa aceite, reserva transacional nem entrega real. Sem possibilidade de recursos qualificados para risco sem validação. |
| Ativar brigadas por zona em um clique | Parcial | `acionarBrigada` prepara lista e textos em uma ação; nenhum disparo real em massa. Links individuais `wa.me` são manuais. |
| Pedir ajuda a outra prefeitura em um clique | Parcial | `solicitarOutraPrefeitura` registra pedido local e prepara WhatsApp institucional quando disponível. Não existe API municipal de transmissão/recebimento, aceite ou comprovante. |
| Autorização real por prefeitura e perfil | Pendente | A sessão do protótipo é simulada e o armazenamento pode ser lido/alterado pelo navegador. Não armazenar dados reais de cidadãos. |
| Banco único com isolamentos reais por município | Pendente | Dados locais separados por `municipioId`, mas sem banco central, RLS, integridade transacional ou sincronização entre navegadores. |
| Mapa municipal oficial e zonas importadas para qualquer cidade | Parcial | Maringá tem zonas demonstrativas; o cadastro administrativo usa consulta ao IBGE e tentativa opcional de geocodificação. Falta geometria validada por município. |
| Entrega, confirmação e trilha de WhatsApp real | Pendente | Webhooks, autenticação do remetente, templates, opt-in, envio API, status, rate limits e idempotência. |
| LGPD e segurança operacional institucional | Pendente | Necessários controle de acesso, minimização, retenção, logs, criptografia, segregação de endereços e operação assistida. |

**Veredito:** a proposta já dispõe de uma **experiência de protótipo** cobrindo os três mapas, o atendimento e os comandos solicitados. **Não é correto afirmar que os três mapas e a mensageria funcionam em produção municipal real.** O painel estático público contém apenas dados de demonstração do navegador, e ações externas requerem revisão/envio manual.

## 3. Regras de atendimento e fluxo canônico

```text
Olá, bem-vindo ao Maringá Unida!
Como você gostaria de se cadastrar?
  [Colaborador]  [Receber ajuda]

Colaborador
  → Pessoa FÍSICA ou JURÍDICA
  → Nome/razão social, endereço e telefone/WhatsApp
  → Zona/região
  → Ajuda a atingidos (múltipla)
  → Máquinas/equipamentos e materiais (múltipla)
  → Apoio a empreendedores (múltipla)
  → Material de construção / combustível
  → OUTRO especificado
  → Disponibilidade
  → Cadastro no Mapa de Colaboradores

Receber ajuda
  → Reutilizar cadastro existente, se disponível
  → Nome, pessoa física/jurídica, endereço e telefone
  → Zona, tipo de necessidade e descrição opcional
  → Urgência
  → Pedido no Mapa da Ajuda
  → Correspondência de capacidade, se segura
  → Acompanhamento de encaminhamento e conclusão

Após qualquer fluxo
  → [Também preciso de ajuda]
  → [Também quero colaborar]
  → [Novo atendimento]
```

O **telefone é apenas uma chave de correspondência demonstrativa**. Em produção, deve ser substituído por identidade e vínculo verificados por canal, evitando revelar dados a quem controla outro telefone ou navegador.

**Financeiro:** “Preciso de dinheiro” cria pedido de apoio financeiro e triagem institucional. Não existe transferência, chave Pix pública ou promessa de pagamento automático. Pedidos médicos e resgates exigem fluxo próprio da autoridade competente; o algoritmo genérico de matching não deve substituir protocolos oficiais.

## 4. Separação dos três mapas

- **Colaboradores:** capacidade e prontidão territoriais antes e durante o evento, sem exposição de endereço particular.
- **Evento:** risco e comando operacional, ocorrências e acionamento imediato. Preservar interface e obrigações aprovadas.
- **Ajuda:** consequências do evento, necessidades materiais, reconstrução, apoio humano, empresas atingidas, encaminhamento e recuperação.

A relação esperada em produção é **colaborador ↔ recurso ↔ zona ↔ missão de evento ↔ pedido pós-evento**, resolvida por API e banco multi-tenant. A versão atual não deve duplicar missão de evento no mapa da ajuda nem transformar pedidos de ajuda em ocorrência policial sem triagem.

## 5. Fluxos de mobilização e apoio intermunicipal

**Brigada em um clique:** coordenador autorizado escolhe zona → motor encontra colaboradores/equipes disponíveis → valida habilitações e conflitos → cria operação idempotente → **envia mensagens pela API oficial em lote** → registra os destinatários, status, retornos, Cheguei e Terminei. O novo protótipo realiza somente as etapas de seleção, criação local de campanha e preparação de mensagens.

**Ajuda a outra prefeitura em um clique:** município de origem → recurso/categoria/urgência → município de destino → mensagem institucional assinada → entrega, recebimento e confirmação → aceite/recusa/disponibilidade → alocação intermunicipal e rastreabilidade. O novo protótipo prepara o pedido, mas ainda não faz transmissão institucional.

## 6. Próximos requisitos obrigatórios para produção

1. Backend autenticado, PostgreSQL + PostGIS, RLS, permissões por município/zona, proteção de endereços e logs.
2. WhatsApp Business Platform/Cloud API oficial, canal institucional de cada município, webhook com verificação de assinatura, idempotência, templates, consentimentos e rastreamento de entrega.
3. Serviço de campanhas de brigadas com filas duráveis, qualificação, conflito de recursos, limites e registros operacionais.
4. Serviço de cooperação intermunicipal com mensagens assinadas, recebimento/aceite, histórico e fluxos de disponibilidade.
5. Integrar Mapa de Evento com os mesmos cadastros e recursos compartilhados, **sem reconstruir sua UI**.
6. Geometria municipal oficial, zona configurável, geocodificação de endereços privados, exibição apenas de agregações adequadas.
7. Controles de qualidade, procedimentos de recuperação, testes de concorrência, segurança e homologação com Defesa Civil.

## 7. Validação desta entrega

- `node --test crise/tests/crise.test.cjs` cobre as decisões novas do núcleo de colaboração e ajuda.
- `node --test gestao/tests/gestao-dados.test.cjs` e testes legados sob `tests/` preservam o fluxo anterior.
- O repositório deve manter `index.html`, `fluxo-ajuda.js` e `mapa-navegacao.js` sem alteração nesta entrega.
- **Atenção:** testes de unidade não provam envio por WhatsApp, acesso real de prefeituras, segurança ou atendimento real a vítimas.
