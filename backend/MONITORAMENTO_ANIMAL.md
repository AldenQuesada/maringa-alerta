# Monitoramento animal: banco (etapa A) e WhatsApp (etapa B)

Migração `20261108194500_monitoramento_animal.sql`. Somente acréscimos: nenhuma tabela, política, função ou regra existente é alterada. A ocorrência continua sendo `incidentes` e o relato continua sendo `relatos`; não existe uma segunda fonte de ocorrências.

## O que a migração acrescenta

| Item | Onde | Observação |
|---|---|---|
| Coleções `animais` e `alertas` | `public.ma_cadastros` | Gravação somente por `ma_aplicar_alteracoes` |
| Permissões | `private.ma_permissoes` | Iguais às de `relatos`: hoje só o administrador municipal acessa operações. A ampliação para operadores pertence à fase 2 |
| Capacidades | `private.ma_capacidades_papel` | `triar_animais`, `ver_restritos` e `aprovar_alerta`. Liberam ações dentro do papel; não substituem `ma_permitido` |
| Contratos | `ma_configuracao` 'contratos' | Campos obrigatórios e listas de `animais` e `alertas` |
| Transições | `ma_configuracao` 'operacao' → `transicoes` | `animais`: Perdido, Encontrado, Em atendimento, Em abrigo, Reunido com o tutor, Adotado, Óbito. `alertas`: Rascunho, Aprovado, Cancelado |
| Regras do módulo | `ma_configuracao` 'operacao' → `protecaoAnimal` | Categoria dos tipos, coleções restritas, desfechos válidos e nomes das capacidades |
| Relações | `ma_configuracao` 'relacoes' | `incidentes.animal_id` → `animais`, `animais.unidade_id` → `unidades`, `alertas.incidente_id` → `incidentes` |
| Esquemas | `ma_configuracao` 'interface' | Formulários de `animais` e `alertas`. Nenhum grupo novo na navegação da Gestão |
| Perfil do mapa | `ma_configuracao` 'mapas' | Título, camadas, filtros, legenda e câmera de referência do mapa Monitoramento animal |
| Modelo de instalação | `ma_configuracao` 'modelos' | Quatro tipos de ocorrência e o evento permanente, aplicados por prefeitura |

## Instalação por prefeitura

```sql
select public.ma_instalar_protecao_animal('maringa');
```

Exige administrador municipal. Cria, pelo caminho canônico e sem duplicar, os tipos `animal-perdido`, `animal-encontrado`, `animal-ferido` e `animal-maus-tratos` e o evento `protecao-animal-rotina`. Cada tipo guarda `categoria`, `situacao_whatsapp`, `cor`, `icone`, `gravidade_padrao`, `visibilidade` e `exige_desfecho`. Para ajustar nomes, cores ou o modelo, edite as linhas no banco. Não é preciso mexer em JavaScript.

## Guards no servidor

- **Visibilidade derivada do tipo.** Relatos de animal (`categoria='animal'`) e ocorrências de tipos da categoria `animais` recebem `visibilidade` do tipo; o valor enviado pelo cliente é ignorado. Uma vez restrito, o registro não volta a ser público por edição. Se a prefeitura ainda não instalou os tipos, o relato de animal fica restrito.
- **Leitura e gravação restritas.** A política restritiva `protecao_animal_restrito` soma-se às existentes: registros restritos das coleções em `colecoesRestritas` só são lidos ou gravados com `ver_restritos`. A projeção territorial acompanha a mesma visibilidade. A definição do tipo continua legível.
- **Tornar público um tipo restrito** exige `ver_restritos`.
- **Triagem.** Mudar a situação de uma ocorrência de animal exige `triar_animais`.
- **Desfecho.** Tipos com `exige_desfecho` só chegam a "Resolvida" com desfecho da lista `protecaoAnimal.desfechos`.
- **Alertas.**
  - Exigem ocorrência existente, confirmada e não restrita.
  - O servidor define autoria, data e área. O cliente não altera esses dados.
  - A aprovação exige `aprovar_alerta`. Quem criou o alerta pode aprová-lo.
  - Alerta aprovado não pode ter a mensagem editada.
  - Não existe estado "enviado": o envio real pertence à fase de alertas.
- **Área do alerta.** `ma_area_alerta(municipio, bairro)` devolve o bairro e os vizinhos cujas geometrias se tocam (PostGIS), com permissão de leitura de `alertas`.

## RPCs

| RPC | Resultado |
|---|---|
| `ma_instalar_protecao_animal(municipio)` | `{"criados": n}`; idempotente |
| `ma_capacidades_operacionais(municipio)` | Capacidades do usuário na prefeitura, para a interface mostrar ou esconder ações. O servidor continua decidindo |
| `ma_area_alerta(municipio, bairro)` | Lista `{id, nome, origem}` dos bairros da área |

## Testes

`tests/backend/monitoramento-animal.sql` usa dois administradores, um operador e um leitor fictícios, em transação descartada. Ele cobre:

- instalação e idempotência;
- capacidades;
- área por fronteira;
- visibilidade forjada e restrição permanente;
- leitura e projeção ocultas sem capacidade;
- desfecho obrigatório;
- transições de `animais`;
- vínculo inexistente;
- autoria, área e aprovação dos alertas;
- ausência de acesso para operador e leitor.

O job SQL do CI executa essa suíte depois de `territorio.sql`.

## Cadastro para receber alertas

Migration `20261111120000_alertas_inscricoes.sql`. Somente acréscimos.

- **Pelo WhatsApp, uma vez só.** O item "Alertas do meu bairro" do menu pergunta o que a pessoa quer fazer. Em "Receber alertas", pede nome e bairro. Em "Parar de receber", vai direto para a confirmação.
- **Um cadastro por contato.** Entrada e saída gravam o mesmo registro da coleção `inscritos`. Sair marca `ativo=false` e mantém nome e bairro; voltar reativa o mesmo registro.
- **Bairro ligado pelo servidor.** O gatilho `private.ma_inscritos` compara o bairro digitado com os bairros cadastrados, sem acento nem pontuação e com "jd", "vl", "pq" e "conj" por extenso. Com uma correspondência única, grava `bairro_id`. Sem ela, `bairro_id` fica vazio para a Gestão ligar; a pessoa não é questionada de novo.
- **Entrada e saída datadas pelo servidor:** `entrou_em` e `saiu_em`.
- **Telefones protegidos.** `inscritos` tem as mesmas permissões de `voluntarios`.
- **Motor do WhatsApp.** As listas de coleções de `wa.project` e `wa.publish_structure` ganharam só `inscritos`; o resto das funções é reescrito idêntico a partir da definição vigente.
- **Versão `municipal-v4-alertas`.** É a cópia da versão publicada mais recente mais o fluxo novo. O canal só muda por `ma_wa_usar_versao`.
- **Teste:** `tests/whatsapp/alertas.sql`.

## Lugares e ações da proteção animal

Migração `20261111190000_protecao_animal_lugares_acoes.sql`. Somente acréscimos.

- **Catálogo:** sete tipos novos na categoria `animais`.
  - Lugares: Secretaria de Proteção e Bem-Estar Animal, Centro de Bem-Estar Animal, Centro de Controle de Zoonoses.
  - Serviços: Feira de adoção, Castração gratuita.
  - Recursos: Castramóvel, Unidade móvel nos bairros.
- **Lugares:** ficam no cadastro `unidades`, com `categoria` "Animais". A Gestão os mostra em "Lugares da proteção animal". Com latitude e longitude, entram na camada de unidades do mapa.
- **Ações:** ficam no cadastro novo `acoes` (feira de adoção, castramóvel, unidade móvel), com nome, tipo, data, horário, endereço, bairro e situação (Agendada, Realizada ou Cancelada). O mapa mostra as agendadas de hoje em diante, na camada "Ações nos bairros". Permissões iguais às dos alertas.
- **Guarda no servidor (`private.ma_protecao_animal_catalogo`):** liga o nome do tipo ao catálogo da categoria de `operacao.protecaoAnimal.categoriaTipos` e recusa tipo desconhecido ou de outro domínio. Nas ações, exige data `AAAA-MM-DD` válida, liga o bairro e assume "Agendada" quando a situação vem vazia. Unidades de outras áreas não passam por essa regra.
- **Menu da Gestão:** grupo "Proteção animal" com Ações nos bairros, Lugares da proteção animal e Inscritos em alertas.
- **Lugares cadastrados (fontes públicas de 11/11/2026), no seed `supabase/seeds/protecao-animal-lugares.sql`:**
  - Sebea: Av. Centenário, 449, Zona 08. Sem coordenada; a busca de endereço não acha o número.
  - Cbea: Rua Duzentos, s/n, Ebenezer. Sem coordenada; não está confirmado se fica no mesmo terreno do Centro de Zoonoses.
  - Centro de Controle de Zoonoses: Estrada 200, 1391, com o ponto do CNES 9944184.
- **Ainda não:** o envio de alertas das ações (etapas E3 e E4) e as clínicas credenciadas para castração, cuja lista não é pública.

## Limites conhecidos

- **Contatos do WhatsApp.** O detalhe de contatos da Central de Conversas (`ma_contato_detalhe`) é uma função `security definer` anterior a este módulo. Ela pode mostrar a conversa de um denunciante a quem acessa as conversas. Ajustar essa função altera código existente; por isso, fica para decisão explícita.

## Fluxo `animal` do WhatsApp (etapa B)

Migração `20261108201500_whatsapp_fluxo_animal.sql`. Cria a versão `municipal-v3-animal`, cópia exata da versão publicada mais recente com um fluxo a mais, **Proteção animal**. Os fluxos existentes não mudam.

- **O canal não troca sozinho.** A migração só prepara e publica a versão (operação `animal_flow_prepared`). A troca é um ato operacional, feito por administrador com `ma_wa_usar_versao(canal, versao)`, depois de conferir no simulador.
- **Perguntas:** situação, espécie, local, descrição, foto (opcional) e identificação. O nome só é perguntado se a pessoa quiser se identificar.
- **Situações = tipos do banco.** As quatro opções são os valores de `situacao_whatsapp` do modelo `protecao-animal`; o teste confere a igualdade. Mudar um lado exige mudar o outro.
- **Saída:** um relato "Em triagem", `categoria='animal'`, telefone do próprio contato do WhatsApp. Na opção de sigilo, o nome gravado é "Anônimo" e `anonimo=true`. A visibilidade vem do tipo: maus-tratos nasce restrito.
- **Motor sem mudança.** Usa só os operadores já existentes (`eq`) e o contexto `contact`.

Teste: `tests/whatsapp/animal.sql`, no job do CI depois de `canonico.sql`.

## Mapa Monitoramento animal (etapa C)

Página nova `mapas/monitoramento-animal.html`, duplicada do mapa de Ajuda. Os mapas Evento, Colaboradores e Ajuda não foram alterados; eles ainda não têm link para a página nova.

- **Mesma base do mapa de Ajuda:** cabeçalho, ações rápidas, painel lateral recolhível (abre recolhido, com o botão +), painel "Filtros" de unidades municipais, malha de bairros e zonas numeradas, controles e retorno à posição original.
- **Câmera:** a da Ajuda, lida de `config/cameras-mapas.js` pelo nome indicado no perfil (`"camera":"ajuda"`). O arquivo de câmeras não muda.
- **Tudo vem do banco:** título, camadas, filtros e estados encerrados vêm de `ma_configuracao` 'mapas'. Tipos, cores, ícones e legenda vêm de `ocorrenciaTipos` da categoria `animais`. As unidades de atendimento vêm do catálogo territorial (`ma_catalogo_territorial` e `ma_territorio_listar`). Sem perfil no banco, a página mostra o erro e não monta o mapa.
- **Posição:** ocorrências usam as coordenadas registradas. Relatos do WhatsApp não têm GPS: aparecem no centro do bairro citado no endereço, com contorno tracejado e a indicação "localização aproximada". Sem bairro reconhecido, entram só na lista ("sem posição").
- **Somente leitura nesta etapa.** A ficha mostra os dados; as ações de triagem são a etapa D.
- **Módulos** (`src/monitoramento-animal/`, bundle `mapas/monitoramento-animal.js`): `perfil`, `geometria`, `consultas`, `territorio`, `camadas`, `filtros`, `ficha`, `resultados`, `app`.
- **CSS próprio:** `mapas/monitoramento-animal.css`, cópia de `mapas/style.css` com os acréscimos do módulo. Mudar um não afeta o outro.

Testes: `tests/monitoramento-animal.test.cjs` (perfil, geometria, consultas e paridade com o fluxo do WhatsApp) e `tests/browser/monitoramento-animal.spec.cjs` (câmera da Ajuda, 390 e 320 px, filtros, marcadores, ficha e perfil ausente), no job `mapas-mobile` do CI.

## Etapa D: triagem e configuração completa no banco

Migração `20261110120000_monitoramento_animal_triagem.sql`. Somente acréscimos ao módulo; nenhum mapa, CSS ou fluxo existente muda.

### Textos e cores
- Toda a copy do mapa fica em `ma_configuracao` `mapas` → `monitoramento-animal.textos` (página, filtros, lista, legenda, mapa, ficha e triagem).
- O HTML declara só a chave (`data-texto`, `data-texto-aria-label`, `data-texto-title`, `data-texto-placeholder`). O módulo `textos.js` preenche a partir do banco.
- Texto ausente é erro visível com o nome da chave. Não existe texto de reserva no código.
- As cores ficam em `monitoramento-animal.cores` (`contornoZona` e `destaqueRestrito`) e são validadas na abertura. A cor de cada tipo continua no próprio tipo de ocorrência.
- Ficam fora do banco, de propósito:
  - a tela de carregamento, que aparece antes do login;
  - as abas de navegação, compartilhadas com os mapas existentes;
  - as mensagens de erro de configuração ausente.

### Triagem
- As regras ficam em `operacao.protecaoAnimal.triagem`: ações por coleção, situação de origem e de destino, exigências (`bairro_id`, `motivo`, `desfecho`), motivos de arquivamento, evento padrão e responsabilidade padrão.
- Única porta de gravação: `public.ma_triar_animal(municipio, colecao_alvo, registro, acao, status_esperado, detalhe)`. Ela roda com a permissão de quem chama (security invoker) e:
  - exige a capacidade `triar_animais`;
  - recusa um registro que mudou desde que foi aberto (`status_esperado`, código 40001);
  - valida a ação, a situação de origem, o motivo e o desfecho contra o banco;
  - ao confirmar um relato, cria a ocorrência com:
    - o tipo derivado da situação do WhatsApp;
    - a posição oficial, um ponto interno da geometria do bairro escolhido (a tela não envia coordenadas);
    - o vínculo `origem_relato`;
  - grava tudo em um lote, por `ma_aplicar_alteracoes`, com contratos, transições e histórico.
- Fotos e dados do denunciante ficam no relato de origem, que mantém a própria visibilidade.
- A trava `ma_protecao_animal` também passou a exigir a capacidade para mudar a situação de um relato de animal, mesmo pelo caminho genérico. Ela registra `triado_por` e `triado_em` pelo servidor.
- A tela mostra as ações só para quem tem a capacidade (`ma_capacidades_operacionais`). Sem ela, a ficha mostra que a conta só consulta.

### Limite conhecido
Depois de uma ação, a página recarrega para ler os dados confirmados, porque a camada de dados da gestão não oferece recarga parcial. A confirmação aparece depois da recarga.
