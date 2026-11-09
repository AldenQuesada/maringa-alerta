# Monitoramento animal: banco (etapa A)

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

- **Visibilidade derivada do tipo.** Relatos de animal (`categoria='animal'`) e ocorrências de tipos da categoria `animais` recebem `visibilidade` do tipo; o valor enviado pelo cliente é ignorado. Uma vez restrito, o registro não volta a ser público por edição.
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
- **Fluxo `animal` do WhatsApp** (etapa B). Até ele existir, os relatos de animal só chegam por gravação autorizada.
