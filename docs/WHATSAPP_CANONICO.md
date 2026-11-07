# WhatsApp municipal: catálogo canônico

O canal usa o catálogo publicado no PostgreSQL. Perguntas, respostas, opções, botões, textos de validação, mensagens de conclusão, imagem institucional e cálculos de resumo são dados versionados. O transporte não contém cópia editorial nem decide o caminho de um atendimento.

## Hierarquia

- Canal municipal (`wa.channels`): município, número Meta, versão publicada e habilitação.
  - Catálogo imutável (`wa.versions`): textos, ações, identidade, imagens e computações declarativas.
    - Colaborador (`wa.flows`): 19 perguntas em `wa.nodes`.
      - Identificação: nome, pessoa física/jurídica, endereço, telefone.
      - Ofertas: ajuda a pessoas, máquinas, empreendedores, outros e materiais.
      - Doação: forma de entrega, quando aplicável.
      - Ponto público: consentimento; tipo, nome, responsável, endereço, telefone, serviço, horário e capacidade, quando autorizado.
      - Revisão, correção e gravação de colaborador/ponto consentido.
    - Relato de ocorrência: 6 perguntas.
      - Orientação de segurança, nome, telefone, local, pessoas no local, descrição e foto opcional.
      - Revisão e gravação para triagem.
    - Pedido de ajuda: 4 perguntas.
      - Nome, endereço, telefone e necessidade escrita pelo cidadão.
      - Revisão e gravação como Aguardando.

## Módulos e fronteiras

1. Webhook: verifica HMAC e persiste eventos com identificador único.
2. Inbox: ordena mensagens por remetente e impede reprocessamento.
3. Motor (`wa.step`, `wa.advance`, `wa.validate`): executa condições e regras do catálogo.
4. Apresentação (`wa.render`, `wa.variables`): monta cópia, botões e sequência de mídia a partir do banco.
5. Persistência (`wa.project`): grava no cadastro canônico e registra conclusão atômica por protocolo; identidade vinculada ao remetente verificado.
6. Outbox: sequência, reserva exclusiva, janela de atendimento, recibos e proteção contra duplicação.
7. Worker/transport: traduz envelopes de texto, imagem e opções para o protocolo Meta.

A imagem Pra Somar é a arte original convertida de WebP para PNG, sem redesenho. Seu URL, SHA-256, legenda, dimensões e vínculo à primeira pergunta ficam no catálogo. O bucket público `ma-whatsapp-catalogo` contém somente peças institucionais; fotos dos cidadãos permanecem no bucket privado `ma-whatsapp`.

A Meta limita títulos de botões. Quando necessário, o adaptador utiliza lista com título curto e descrição canônica integral; ambos são lidos do banco. A conclusão real utiliza protocolo real e remove apenas referências que afirmavam ser demonstração ou que nenhuma mensagem real havia sido enviada.

## Publicação e versões

A migração `20261107121719_whatsapp_copia_canonica.sql` prepara e publica o catálogo imutável `municipal-v2-canonico`, sem trocar o canal automaticamente. Publicar o worker e conferir a imagem antes de ativar a versão. A ativação deve conferir a versão anterior, registrar `wa.operations` e atualizar somente sessões ainda no menu sem respostas. Conversas em andamento preservam sua versão e obtêm a versão atual ao reiniciar.

As dez migrações iniciais do WhatsApp documentam a fundação já implantada. Elas não devem ser reaplicadas no projeto existente. O histórico remoto usa os timestamps do serviço de migrações; compare nomes e definições antes de sincronizar históricos. Banco novo: aplicar todas as migrações em ordem.

## Verificação

- `tests/whatsapp/copy.py`: 36 situações comparadas com uma fotografia dos textos, botões e imagem do simulador; adaptações reais explícitas.
- `fluxos.sql`: três fluxos completos, condições, cadastro existente, confirmação idempotente, isolamento do simulador e permissões.
- `canonico.sql`: imagem antes do texto, revisão/correção, telefone, múltiplas escolhas, ausência de oferta, foto e ordem de entrega.
- `catalogo.sql`: publicação imutável, referência inválida, fixação de versão e bloqueio de acesso anônimo.
- `edge.test.ts`: assinatura, parser, imagem, botões longos, erros do transporte e fotos recebidas.

As fixtures rodam somente em PostgreSQL descartável, com transações revertidas. Não enviam mensagens nem criam cidadãos em produção.
