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
- **Ainda não:** as clínicas credenciadas para castração, cuja lista não é pública. O envio das ações aos inscritos está em "Alertas aos inscritos".

## Alertas aos inscritos (etapas E2 a E4)

Migração `20261111220000_alertas_envio.sql`. Somente acréscimos, com duas exceções pequenas e conferidas: `private.ma_inscritos` (criada por este módulo na E1) passa a reconhecer zonas, e o recebimento do WhatsApp ganha uma linha no ponto em que descartava retornos da Meta.

### Fluxo

1. O relato chega pelo WhatsApp e a gestão faz a triagem no mapa ("Confirmar e abrir ocorrência").
2. Na ficha da ocorrência confirmada, o bloco **Alerta do bairro** mostra quantos inscritos estão na área e quais bairros ela cobre.
3. Quem tem a capacidade `aprovar_alerta` escreve a mensagem e toca em **Aprovar e enviar**. Quem cria pode aprovar.
4. O servidor grava o alerta pelo caminho canônico (`ma_alerta_aprovar`) e põe as mensagens na fila (`ma_enviar_inscritos`).
5. O trabalhador do WhatsApp envia o modelo aprovado na Meta, uma mensagem por inscrito, depois das respostas das conversas.
6. A ficha mostra a situação: na fila, enviados, entregues, lidos e falhas.

As **Ações nos bairros** (feira de adoção, castração, castramóvel) usam o mesmo caminho: a ficha da ação tem **Enviar aos inscritos**.

### Quem recebe

- Inscritos ativos com o bairro dentro da área. No alerta, a área é a calculada na criação (bairro e vizinhos). Na ação, é o bairro da ação e os vizinhos.
- Inscritos que digitaram uma zona ("Zona 7", "zona 07") recebem quando a zona se sobrepõe a um bairro da área. Encostar só na divisa não conta.
- Repetir o envio não duplica: cada contato recebe uma vez por alerta ou ação. O botão passa a "Enviar aos novos inscritos".

### Travas no servidor

- O envio nasce **desligado** (`operacao.protecaoAnimal.envio.ativo=false`). Desligado, a ficha aprova o alerta e avisa; nada entra na fila e nada é reservado.
- Antes de cada mensagem, o servidor confere de novo o registro e a inscrição:
  - alerta ainda aprovado e ocorrência ainda confirmada;
  - ação ainda agendada e com data de hoje em diante;
  - inscrito ainda ativo.
  Se algo mudou, a mensagem é cancelada, não enviada.
- Mensagem que não sai em `validadeHoras` (24 h) expira.
- Ocorrência restrita (maus-tratos) não tem alerta, como antes.
- Leitor e operador não aprovam, não enviam e não veem o painel do envio.

### Saída

- Responder **SAIR**, ou tocar em **Parar alertas** no modelo, desativa a inscrição na hora, cancela o que estava na fila para o contato e responde com o texto de `envio.saida.resposta`.
- Só vale para quem está inscrito e para a mensagem exatamente "sair". Para quem não está inscrito, ou para frases como "quero sair de casa", a mensagem segue o fluxo normal.
- A exclusão definitiva do contato leva junto os envios dele.

### Página pública

- Endereço: `alerta/?m=<prefeitura>&c=alertas|acoes&id=<registro>`. É o link do botão do modelo.
- A página não acessa o banco. Ela chama a função `ma-aviso-publico`, que devolve só o que `wa.ma_wa_aviso_publico` libera:
  - tipo, mensagem, espécie, bairro, área e data de publicação;
  - desfecho, quando o caso foi encerrado.
- Não saem denunciante, telefone, coordenada nem caso restrito.
- A foto do relato aparece somente quando a aprovação marcou **Mostrar a foto do relato na página do alerta** e enquanto o caso está aberto.
- Textos da página: `envio.paginaPublica.textos`.

### Configuração (`operacao.protecaoAnimal.envio`)

| Chave | Uso |
|---|---|
| `ativo` | Liga o envio real |
| `validadeHoras` | Prazo para uma mensagem sair da fila |
| `situacoes` | Situação que permite envio: alerta "Aprovado", ação "Agendada" |
| `modelos` | Nome e idioma do modelo na Meta, campos do corpo e ordem dos botões, por coleção |
| `saida` | Palavras de saída, identificador do botão "Parar alertas" e resposta |
| `paginaPublica.textos` | Textos da página pública |

### Funções

| Função | Quem chama | Resultado |
|---|---|---|
| `ma_envio_painel(municipio, colecao, registro)` | ficha do mapa | Capacidade, envio ligado, alerta, área, inscritos e entregas |
| `ma_alerta_aprovar(municipio, incidente, mensagem, mostrar_foto)` | ficha do mapa | Cria e aprova o alerta pelo caminho canônico |
| `ma_enviar_inscritos(municipio, colecao, registro)` | ficha do mapa | `{na_fila, total}` |
| `ma_wa_reservar_envio()` e `ma_wa_resultado_envio(...)` | trabalhador do WhatsApp | Fila de envios |
| `ma_aviso_publico(...)` e `ma_aviso_foto(...)` | função `ma-aviso-publico` | Dados da página pública |

Nenhuma delas é executável sem login. A página pública passa pela função de servidor, conforme a regra do projeto.

### Modelos para aprovar na Meta

Cadastrar no WhatsApp Manager com os nomes exatos abaixo, idioma **Português (BR)**, categoria **Utilidade**. A Meta pode reclassificar. Mensagem de modelo é cobrada por mensagem entregue.

**`alerta_animal_bairro`**

- Corpo:

  ```
  Alerta da Proteção Animal no seu bairro.

  {{1}}

  Se você viu este animal, responda a esta mensagem.
  ```

- Exemplo de `{{1}}`: `Cão caramelo de porte médio, coleira azul, fugiu na Rua Néo Alves Martins. Atende por Thor.`
- Rodapé: `Para não receber mais, responda SAIR.`
- Botão 1, visitar site: **Ver o animal**.
  - URL dinâmica: `https://aldenquesada.github.io/maringa-alerta/alerta/?{{1}}`.
  - Exemplo: `https://aldenquesada.github.io/maringa-alerta/alerta/?m=maringa&c=alertas&id=alerta-exemplo`.
- Botão 2, resposta rápida: **Parar alertas**.

**`acao_animal_bairro`**

- Corpo:

  ```
  Proteção Animal no seu bairro: {{1}}.

  Quando: {{2}}
  Onde: {{3}}

  Toque em Ver detalhes para saber mais.
  ```

- Exemplos:
  - `{{1}}`: `Feira de adoção da Praça da Catedral`
  - `{{2}}`: `22/11/2026, 9h às 13h`
  - `{{3}}`: `Praça da Catedral, Zona 1`
- Rodapé: `Para não receber mais, responda SAIR.`
- Botão 1, visitar site: **Ver detalhes**. A URL dinâmica é a mesma do modelo anterior.
- Botão 2, resposta rápida: **Parar alertas**.

A ordem dos botões precisa ser essa: o servidor envia o link no botão 0 e a saída no botão 1 (`modelos.*.botoes`).

### Para ligar

1. Os dois modelos aprovados na Meta.
2. O canal na versão que tem "Alertas do meu bairro" no menu (`ma_wa_usar_versao`). Sem isso, a inscrição só existe pela Gestão.
3. Ligar o envio:

   ```sql
   update public.ma_configuracao set documento=jsonb_set(documento,'{protecaoAnimal,envio,ativo}','true'),versao=versao+1 where id='operacao';
   ```

   Para desligar, o mesmo comando com `'false'`: a fila para na hora.

### Testes

- `tests/whatsapp/envio.sql` cobre:
  - público por bairro, vizinho e zona;
  - modelo montado pelo banco;
  - fila sem duplicar;
  - envio desligado;
  - reserva e retorno da Meta;
  - cancelamento por saída do inscrito ou por caso encerrado;
  - página pública sem dados pessoais e foto só com a escolha da aprovação;
  - ações, SAIR, botão de saída e exclusão do contato.
- `tests/whatsapp/edge.test.ts` cobre o envio de modelo, o botão de resposta rápida, a fila de alertas do trabalhador e a função da página pública.
- `tests/browser/monitoramento-animal.spec.cjs` cobre o bloco da ficha. `tests/browser/alerta-publico.spec.cjs` cobre a página pública.

## Revisão por IA dos relatos

Migração `20261111230000_revisao_ia.sql`. É o passo do fluxo em que, quando o relato entra pelo WhatsApp, a IA revisa e entrega um relatório antes de a gestão decidir.

- **Fila.** Todo relato de animal novo entra em `wa.revisoes`. O agendador do banco chama a função `ma-animal-revisao` a cada minuto, mas só quando a revisão está ligada e há algo na fila.
- **O que vai para a IA:** situação, espécie, endereço, bairro, descrição e se há foto (sim ou não). Não vão nome, telefone, anonimato nem a foto.
- **O que volta,** conferido e limitado pelo servidor antes de gravar no relato (`revisao_ia`):
  - resumo;
  - urgência (Alta, Média ou Baixa);
  - se a situação escolhida combina com a descrição;
  - o que falta para agir;
  - uma sugestão de texto de alerta, só para animal perdido ou encontrado.
- **Na ficha do relato:** bloco "Relatório da IA", com o aviso de que foi gerado por IA. A triagem continua igual e a decisão é da gestão.
- **No alerta:** a sugestão vem escrita no formulário do alerta da ocorrência gerada pelo relato. A gestão confere, edita e aprova.
- **Falhas:** resposta fora do formato, recusa do modelo ou erro da API voltam para a fila, até 3 tentativas. Só o código do erro é guardado, nunca o texto. Um relato que saiu da triagem antes da vez dele não é revisado. A fila expira em 48 h.
- **Configuração** (`operacao.protecaoAnimal.revisaoIA`): `ativo`, `modelo` (`claude-opus-5-5`), `esforco` (`medium`), `instrucoes` (o texto que orienta a IA), `tentativas` e `validadeHoras`. Ajustar o texto da IA é editar `instrucoes` no banco.
- **Para ligar:**
  1. Cadastrar a chave da API da Anthropic como segredo `ANTHROPIC_API_KEY` nas funções do Supabase (Project Settings, Edge Functions, Secrets).
  2. Ligar a revisão:

     ```sql
     update public.ma_configuracao set documento=jsonb_set(documento,'{protecaoAnimal,revisaoIA,ativo}','true'),versao=versao+1 where id='operacao';
     ```

  Cada relato revisado é uma chamada paga à API da Anthropic. As denúncias de maus-tratos também passam pela revisão, sem dados de quem denunciou.
- **Testes:**
  - `tests/whatsapp/revisao.sql`: fila só de animais, desligada, sem dados pessoais, formato recusado, gravação limpa, reserva vencida, tentativas, fora da triagem e sugestão no painel.
  - `tests/whatsapp/edge.test.ts`: a fila da função.
  - `tests/browser/monitoramento-animal.spec.cjs`: o relatório na ficha e a sugestão editável.

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
