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

- `tests/whatsapp/comparar-copia.py`: 36 situações comparadas com uma fotografia dos textos, botões e imagem do simulador; adaptações reais explícitas.
- `fluxos.sql`: três fluxos completos, condições, cadastro existente, confirmação idempotente, isolamento do simulador e permissões.
- `canonico.sql`: imagem antes do texto, revisão/correção, telefone, múltiplas escolhas, ausência de oferta, foto e ordem de entrega.
- `catalogo.sql`: publicação imutável, referência inválida, fixação de versão e bloqueio de acesso anônimo.
- `edge.test.ts`: assinatura, parser, imagem, botões longos, erros do transporte e fotos recebidas.

As fixtures rodam somente em PostgreSQL descartável, com transações revertidas. Não enviam mensagens nem criam cidadãos em produção.

## Relato guiado pelo catálogo (versão `municipal-v5-relato-catalogo`)

Migração `20261112120000_relato_por_catalogo.sql`; tipos de Maringá em `supabase/seeds/ocorrencias-tipos.sql`.

O cidadão relata só por botões, do começo ao fim. Ninguém precisa interpretar texto livre.

```
Relatar uma ocorrência
  ├─ Categoria    botões lidos de operacao.ocorrenciaCategorias (só as que têm tipo no município)
  ├─ Tipo         botões lidos de ocorrenciaTipos da categoria escolhida
  ├─ Local        botão "Enviar localização" do WhatsApp, ou endereço digitado
  ├─ Foto         opcional
  └─ Confirmar    relato "Em triagem" com tipo, categoria, situação, ponto e foto
```

- **Uma lista só.** O WhatsApp e o mapa leem o mesmo catálogo `ocorrenciaTipos`. Um tipo cadastrado ou arquivado na Gestão aparece ou some no WhatsApp na hora, sem versão nova. Campos opcionais do tipo: `botao_whatsapp` (texto do botão, até 20 caracteres; sem ele, o nome) e `ordem_whatsapp`.
- **Categorias** (`operacao.ocorrenciaCategorias`, em ordem): Chuva e alagamento, Vento e tempestade, Deslizamento/erosão/desabamento, Incêndio, Proteção animal. Os tipos de Maringá seguem os grupos da Cobrade (hidrológicos, meteorológicos, geológicos e incêndios).
- **Proteção animal** deixou de ser item próprio do menu e virou uma categoria do relato. O menu tem quatro itens: Ser colaborador, Relatar ocorrência, Preciso de ajuda, Alertas do meu bairro. Esses três outros fluxos são copiados da v4 sem mudança.
- **Motor.**
  - Pergunta com `"catalog":{"source":"categorias"}` ou `{"source":"tipos","answer":"categoria"}`: as opções são resolvidas pelo servidor a cada pergunta (`wa.opcoes`), validadas contra a mesma lista e mostradas pelo nome no resumo.
  - Pergunta `"kind":"location"`: aceita a localização do WhatsApp (coordenadas conferidas) ou o endereço digitado, e manda o pedido de localização do WhatsApp (`location_request_message`). Só pode ser obrigatória.
  - Na gravação, `path` pega uma parte da resposta (`lat`, `lng`, `endereco`), e o contexto `profile_name` usa o nome do perfil do WhatsApp.
- **Servidor confere o relato** (`private.ma_relato_tipo`): o `tipo_id` precisa existir no município. O servidor preenche `tipo_nome`, `categoria` (`animal` para a categoria da proteção animal) e `situacao` (o `situacao_whatsapp` do tipo, ou o nome). A triagem de animais, a revisão por IA e a visibilidade restrita seguem iguais. O ponto é conferido; sem endereço digitado, o endereço registra as coordenadas. Sem nome no perfil, fica "Não informado". Relato sem `tipo_id` não muda.
- **Troca do canal:** por `ma_wa_usar_versao`, só com autorização. A migração não troca.
- **Teste:** `tests/whatsapp/relato-catalogo.sql`; transporte e leitura da localização em `tests/whatsapp/edge.test.ts`.
