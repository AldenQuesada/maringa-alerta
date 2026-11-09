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
  - A aprovação exige `aprovar_alerta` e outra pessoa, diferente de quem criou.
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
