# Maringá Alerta — guia de implementação para o Codex

Este documento acompanha a evolução do protótipo existente neste repositório. Ele preserva as funcionalidades e decisões anteriores e registra o fluxo simples definido por Alden para a próxima revisão. A interface continua em `index.html`, sem build step; as regras de ajuda ficam em `fluxo-ajuda.js` e o cache do aplicativo em `sw.js`. A publicação permanece no GitHub Pages do mesmo projeto.

**Estado desta revisão:** protótipo em validação, com dados e WhatsApp simulados. O checklist da seção 9 define o que verificar; itens não assinalados não são resultados de testes. O endereço publicado só incorpora alterações depois que a revisão chega à branch usada pelo Pages e o deploy termina.

URL ao vivo: https://aldenquesada.github.io/maringa-alerta/
Repositório: https://github.com/AldenQuesada/maringa-alerta

## 1. Contexto do projeto

Maringá Alerta é o protótipo de uma plataforma para diferentes prefeituras organizarem a participação cidadã antes, durante e depois de desastres. Maringá é a referência inicial; o produto real deve nascer multi-tenant. A ideia operacional permanece:

1. Moradores se cadastram pelo WhatsApp da prefeitura e informam como podem ajudar: motosserra, caminhão, mão de obra, alimentos, roupas, transporte e outras capacidades.
2. Moradores relatam ocorrências pelo WhatsApp, podendo enviar texto, foto e localização. O cadastro de voluntário não é requisito para relatar um problema.
3. **Uma ocorrência confirmada dispara automaticamente o acionamento.** O sistema consulta os guards previamente cadastrados, seleciona pessoas próximas, compatíveis e disponíveis e avisa o responsável da região em paralelo.
4. Cada zona tem responsável, substituto e coordenador. Essa estrutura informa quem recebe avisos e acompanha o campo; ninguém precisa aprovar cada convite para o fluxo normal começar.
5. A pessoa que foi ajudar confirma **“Cheguei”** e depois **“Terminei”** pelo WhatsApp. Não há aceite obrigatório, foto obrigatória, prova de contribuição, nota de qualidade ou validação de supervisor.
6. O término libera aquela participação. Se ainda houver ajuda necessária, a ocorrência continua aberta; quando as condições cadastradas de conclusão estiverem satisfeitas, o sistema a resolve e retira seu marcador do mapa ativo.
7. O sistema pode convidar a pessoa para outra ocorrência compatível. Agradecimentos e relatórios usam os registros já existentes, sem exigir outra tarefa do voluntário. Reconhecimento público continua como funcionalidade, com participação opcional.

**Configuração antes; execução automática durante.** Compatibilidade, disponibilidade, quantidade necessária, responsáveis e prevenção de conflitos são regras internas. Um convite enviado não conta como presença. Atividades incompatíveis com voluntariado comum seguem o encaminhamento especializado configurado, também sem uma fila de aprovação da ajuda.

Esta etapa continua sendo um protótipo: nenhum convite ou aviso sai de verdade pelo WhatsApp, nenhum serviço de emergência é despachado pelo sistema e os dados usados para demonstrar a operação são fictícios. A simulação local de **Maringá** e **Município Exemplo** permite revisar a troca de prefeitura e a separação de registros no navegador. Ela não implementa autenticação, autorização ou isolamento seguro entre municípios.

O protótipo deve ficar claro e navegável antes da implantação real. Depois, os mesmos fluxos passam a usar backend, banco e API oficial do WhatsApp Business ou provedor que opere por essa API. O backend faz parte do produto multi-prefeitura; não deve ser planejado como um projeto independente das regras operacionais. A integração real deverá preservar a experiência simples já validada aqui.

## 2. Convenção de nomenclatura: "zonas", não "bairros"

Decisão mantida: o protótipo usa o termo **zona** para as áreas de cobertura. Os nomes atuais servem à demonstração; os retângulos desenhados no mapa não foram homologados como limites administrativos oficiais. A implantação de cada prefeitura deverá receber suas geometrias e nomenclatura. Não apresentar o desenho atual como uma delimitação oficial de bairros.

Na interface, manter **zona**. Os identificadores legados `bairros`, `bairro` e `.bairro-label` ainda podem existir internamente; uma renomeação posterior deve migrar também os dados salvos e todas as referências, sem quebrar o protótipo. Preservar os seis rótulos de Maringá: Zona 7, Jardim Alvorada, Conjunto Requião, Jardim Universo, Vila Esperança e Centro Cívico. O Município Exemplo usa nomes de zonas próprios sobre a mesma base cartográfica de demonstração; não atribuir validade geográfica oficial a essa configuração.

## 3. Arquitetura atual (ler o código real antes de alterar)

O projeto permanece simples e sem etapa de build:

| Arquivo | Responsabilidade |
|---|---|
| `index.html` | Interface, Leaflet, cadastros, painéis, adaptação do fluxo de ajuda, conversas e persistência local da demonstração |
| `prototipo.css` | Ajustes de layout, controles da demonstração, menu móvel e conversa de chegada/término |
| `fluxo-ajuda.js` | Regras de seleção, chegada, término, disponibilidade e prioridade; sem DOM, envio externo ou banco real |
| `sw.js` | Cache do shell do aplicativo, com rede primeiro e fallback adequado ao tipo de recurso |
| `tests/fluxo-ajuda.test.cjs` | Verificações do núcleo de regras em Node, incluindo concorrência lógica e repetição de ações |
| `tests/integracao-fluxo.test.cjs` | Verificações do acionamento automático da equipe quando há voluntários insuficientes |

Dentro de `index.html`:

- CSS no `<head>`, com tokens de cor em `:root` (`--bg`, `--panel`, `--fg`, `--red`, `--blue`, `--green`, `--yellow`, `--accent`).
- Mapa com Leaflet 1.9.4 e tiles do OpenStreetMap usados pelo protótipo, com filtro CSS para o visual escuro. Preservar zoom, arrasto, tooltips, polígonos e camadas existentes. A disponibilidade do mapa depende também dos recursos externos; não substituir o provedor sem verificar a configuração necessária.
- `bairros`: zonas com `nome`, `center`, `poly`, `equipamentos` e `equipe` (`responsavel`, `substituto`, `coordenador`). Cada pessoa da equipe tem identificador, nome, cargo, posição, horário e contato de demonstração.
- `ocorrencias`: fatos confirmados ou históricos, com protocolo, tipo, zona, posição, gravidade, responsabilidade e estado. `confirmado: true` indica a confirmação da ocorrência que permite o acionamento; `confirmadoEm` continua representando a primeira chegada ao local. Não confundir os dois.
- `o.participacoes`: registros individuais de convite, chegada e término, vinculados por `voluntarioId`. Os estados principais são `convidado`, `no_local` e `concluida`. O núcleo também trata recusa; a conversa desta revisão demonstra os dois comandos Cheguei e Terminei. `voluntariosProx` permanece como compatibilidade para as telas antigas, sem servir de prova de presença.
- `voluntarios`: cadastro, contribuições, zona, preferências e disponibilidade. `ativo` é derivado das reservas/participações; encerrar uma ajuda não pode liberar uma pessoa que ainda tenha vínculo ativo incompatível.
- `activeZone`: nome da zona ou `null` para todas. As camadas Leaflet continuam separadas em `ocLayer`, `volLayer` e `officialLayer`.
- UI preservada: sidebar de zonas e módulos, barra de contexto, painel lateral de ocorrência/zona e janela arrastável de colaboradores. O menu também deve ser acessível no celular.
- A demonstração permite criar um cenário de teste e pausar a geração periódica aleatória. Dados meteorológicos, posições e mensagens continuam simulados e identificados como tal.

### Persistência e inicialização

A simulação guarda registros de operação, participações e mensagens no navegador, em contexto separado por prefeitura. Ao recarregar, restaurar o estado existente; só gerar dados iniciais quando não houver uma simulação salva. Preservar protocolos e `idCounter`.

Salvar somente dados serializáveis. Referências Leaflet (`marker`, `polyLayer`) não entram no JSON: são reconstruídas ao restaurar a página, assim como a ligação entre a ocorrência e o responsável atual da zona. A criação/restauração inicial fica depois da declaração das estruturas de mensagens, auditoria e alertas, evitando usar essas estruturas antes da inicialização.

Essa persistência serve à revisão do protótipo no mesmo navegador. Não sincroniza dispositivos e não oferece proteção entre usuários. Na implementação real, os guards e as reservas serão executados no backend com escopo de prefeitura e transações consistentes.

Antes de alterar uma função, localizar suas definições e chamadas com `rg`. Preservar a estrutura existente e separar novas regras somente quando isso facilitar a validação; não introduzir framework ou build tool apenas para organizar esta revisão.

## 4. Funcionalidades já implementadas (não refazer, só evoluir)

As funcionalidades abaixo fazem parte do protótipo existente e devem ser preservadas. Esta revisão simplifica o atendimento e corrige sua lógica, mantendo os módulos, os cadastros, o mapa e os recursos já aprovados. A publicação e a validação desta revisão seguem as seções 7 e 9.

### 4.1 Chegada e término pelo WhatsApp simulado

O acionamento começa com uma ocorrência confirmada. `AlertaFluxo.ativar()` seleciona pessoas compatíveis, próximas e disponíveis; a adaptação de interface registra os convites e o aviso ao responsável regional. Os guards impedem participação simultânea incompatível e respeitam a configuração territorial. Riscos que exigem recurso especializado recebem encaminhamento de demonstração, sem mobilizar um voluntário comum para a intervenção.

O voluntário tem apenas duas confirmações obrigatórias na atividade:

- **Cheguei:** `AlertaFluxo.chegar()` registra a presença daquela pessoa. A primeira chegada preenche `confirmadoEm` e a ocorrência passa a `em_atendimento`.
- **Terminei:** `AlertaFluxo.terminar()` conclui aquela participação. A disponibilidade é recalculada; o sistema pode oferecer outra ajuda próxima e compatível. Nenhum supervisor precisa validar a contribuição.

A ocorrência mantém `reportadoEm`, `confirmadoEm` e `resolvidoEm`. Ela só é resolvida quando as participações/necessidades previstas estiverem concluídas e não houver pendência técnica que mantenha o atendimento aberto. **O término de uma pessoa não encerra automaticamente o trabalho das demais.**

Ao resolver a ocorrência, calcular `tempoChegada`, `tempoAtendimento` e `tempoReal` para manter a compatibilidade dos KPIs, relatórios e página pública. Retirar o marcador do mapa ativo, mantendo o histórico consultável. Durante o atendimento, o marcador continua no mapa; selecionar outra zona e voltar não pode fazê-lo desaparecer.

Após cada confirmação, atualizar pelo mesmo caminho o estado, marcadores, tooltips, KPIs, lista de zonas, colaboradores, heatmap e painéis abertos. O sistema registra horários e agradece automaticamente. Duplo clique ou repetição de mensagem não pode produzir duas chegadas, dois términos ou liberação incorreta.

### 4.2 Mapa de gravidade de ocorrências (implementado)

Cada tipo em `tiposOcorrencia` tem um `gravBase` (1 a 3) e uma lista `resp` de responsabilidades possíveis (ver 4.3). Ao gerar uma ocorrência, `sortGravidade(gravBase)` sorteia a gravidade final com 15% de chance de cair um nível e 15% de subir um nível, para não ficar sempre igual ao tipo.

A camada de calor usa a biblioteca `leaflet.heat` (carregada via cdnjs, `leaflet-heat.js` versão 0.2.0, depois do script principal do Leaflet). A função `rebuildHeat()` reconstrói os pontos do heatmap a partir de todas as ocorrências `"ativa"` ou `"em_atendimento"` dentro do escopo atual (zona selecionada ou todas), com peso `gravidade/3`. É chamada sempre que uma ocorrência é criada, resolvida, ou a zona selecionada muda.

O heatmap começa desligado por padrão (variável `heatOn`). Há um botão na legenda (`#heat-toggle`, texto "🔥 Mapa de gravidade: desligado/ligado") que adiciona ou remove `heatLayer` do mapa.

O resumo por gravidade (alta/média/baixa) e por responsabilidade (pública/privada/mista) das ocorrências abertas no escopo atual aparece no rodapé da sidebar esquerda (`#sidebar-footer`, função `renderResumo`), atualizado junto com `updateKpis()`.

Isso já está feito. Se for evoluir: a sugestão de heatmap por janela de horário (ver item 3 do backlog, seção 5) ainda não foi implementada.

### 4.3 Classificação de responsabilidade: pública, privada, mista (implementado)

Cada tipo em `tiposOcorrencia` tem uma lista `resp` com os valores possíveis, repetidos para pesar a distribuição (por exemplo `["publica","publica","mista"]` faz "pública" sair duas vezes mais que "mista" nesse tipo). Ao gerar a ocorrência, `pick(t.resp)` sorteia o valor final e grava em `o.responsabilidade`.

As cores e rótulos vêm de `RESP_LABEL` e `RESP_COLOR` (pública = azul, privada = roxo, mista = verde; não usar essas cores para outra coisa no resto da UI, para não confundir com gravidade ou status). O badge aparece no painel de detalhe da ocorrência, lado a lado com o badge de gravidade, via a função `badgeChip(label, color)`. O tooltip do marcador também mostra a responsabilidade.

A contagem por responsabilidade das ocorrências abertas (no escopo atual) está no resumo da sidebar, junto com a gravidade (ver 4.2).

Isso já está feito. Ainda não implementado: filtro clicável por responsabilidade (chips do tipo "mostrar só públicas") — listado como melhoria futura, não foi pedido explicitamente ainda.

## 4.4 Administração interna: responsáveis, coordenadores, equipes da prefeitura e colaboradores (implementado)

Adicionado um modal de administração (botão "⚙ Administração" na sidebar esquerda) com três abas:

- **Responsáveis & coordenadores**: edita os campos `nome`, `cargo`, `telefone` de cada responsável, substituto e coordenador (a lista vem de `todosFuncionarios()`, que achata `bairros[].equipe` em um array único). Como esses objetos são os mesmos referenciados em `o.responsavel`, nos marcadores do mapa e no chat interno, editar aqui propaga para todo o sistema sem recarregar a página.
- **Equipes da prefeitura**: um cadastro novo, independente dos responsáveis, representando equipes de campo com recursos físicos (`equipesPrefeitura`, cada item com `nome`, `zona`, `recursos` — lista de `{tipo, qtd, emUso}` —, `membros`, `status`). Dá para editar, remover e adicionar equipes (campo de recursos aceita texto livre tipo "Motosserra x2, Caminhão x1", convertido para a estrutura). A tabela mostra quanto cada equipe tem disponível vs. em uso, e sinaliza em vermelho quando a zona tem ocorrência ativa mas a equipe não tem recurso livre ("sem equip. livre") — essa é a resposta operacional a "estatísticas do que cada equipe tem, o que falta".
- **Colaboradores**: lista somente leitura dos voluntários cadastrados via WhatsApp (não dá para cadastrar colaborador aqui de propósito, porque a entrada real é pelo número de WhatsApp; o botão "Simular cadastro via WhatsApp" no mapa continua sendo a porta de entrada). Dá para remover um cadastro.

Persistência: `saveAdminState()` e `loadAdminState()` continuam sendo os pontos de leitura/gravação dos dados administrativos. A revisão usa contexto local por prefeitura e deve preservar as edições já salvas no contexto de Maringá durante a migração das chaves legadas. Os colaboradores e os dados de operação fazem parte da persistência da simulação. Isso não é um banco real nem sincroniza dispositivos; a futura API substituirá essa camada mantendo os contratos do produto.

## 4.5 Fotos e relatório da ocorrência como recursos opcionais

O relatório e os anexos permanecem disponíveis, mas **não são requisito para a pessoa dizer “Terminei”**. A exigência anterior de duas fotos foi retirada do fluxo de conclusão. Não pedir justificativa para concluir sem foto.

O recurso opcional conserva os dados úteis:

- foto da situação atual (`o.relatorio.fotoAtual`), quando enviada;
- foto da situação final (`o.relatorio.fotoFinal`), quando enviada;
- observações e pendências (`o.relatorio.pendencias`);
- identificação de quem adicionou o registro (`o.relatorio.preenchidoPor`);
- escolha de exibir os anexos na visão pública (`o.relatorio.fotosPublicas`), desmarcada por padrão.

A interface deve aceitar nenhuma foto, uma foto ou duas fotos, renderizando somente os anexos existentes. Salvar o registro opcional não deve alterar indevidamente as participações nem criar uma segunda autorização para o encerramento. Necessidades ainda abertas continuam sendo acompanhadas; o voluntário não fica preso ao atendimento para preencher a documentação.

As ocorrências resolvidas continuam acessíveis em “Resolvidas recentes”, no rodapé da sidebar (`renderResumo`). O histórico de demonstração pode não ter anexos ou relatório. Essa ausência não indica contribuição insuficiente nem falha de quem ajudou.

## 4.6 Chat interno e fluxo de ajuda pelo WhatsApp simulado

O Chat interno preserva a lista de funcionários e colaboradores (`chatContatos()`) e as conversas por contato em `chatHistorico`. A simulação de ajuda permite acompanhar um convite e enviar **Cheguei** e **Terminei** com contexto explícito de pessoa e ocorrência. Os avisos ao responsável regional chegam automaticamente; não dependem de ele abrir o chat ou aprovar a mobilização.

As confirmações invocam as regras de `fluxo-ajuda.js` e atualizam a operação. Uma resposta aleatória do chat interno não pode confirmar presença, concluir uma ajuda ou representar a decisão real de alguém. Mensagens e participações são preservadas na simulação local, sem envio externo.

Ao receber uma resposta atrasada, atualizar apenas a conversa à qual ela pertence; não renderizar a resposta de um contato na conversa de outro que o usuário abriu depois. Um convite novo após o término é uma oferta de ajuda, não uma transferência forçada para outra ocorrência.

A integração real usará o canal oficial, webhooks e registros no backend. O protótipo demonstra o comportamento e a interface, sem conta conectada ou disparo verdadeiro pelo WhatsApp.

## 4.7 Distâncias reais entre pontos (implementado)

As distâncias são calculadas com `map.distance(latlngA, latlngB)` do Leaflet (distância geodésica em metros) sobre posições de demonstração. O cálculo não representa tempo de deslocamento nem verificação de rota segura. Isso está em dois lugares: cada voluntário mobilizado no painel de ocorrência mostra a distância real até o ponto da ocorrência, e o cartão do responsável no mesmo painel mostra a distância real entre a posição atual dele (que já era simulada via ping de WhatsApp) e a ocorrência. Função auxiliar: `fmtDist(metros)`, que mostra em metros até 999m e em km com uma decimal a partir de 1000m.

Ainda não implementado: distância equipe-da-prefeitura ↔ ocorrência (as equipes de recursos, seção 4.4, não têm posição própria no mapa ainda, só a zona; adicionar um campo `pos` a cada equipe seria o próximo passo natural se isso for necessário).

## 5. Backlog aprovado (preservado, com prioridade definida por Alden)

Estas funcionalidades foram aprovadas anteriormente e continuam no escopo. A simplificação do atendimento muda as regras de interação, sem descartar seus objetivos. Antes de implementar um item, conferir o que já existe nesta revisão para evitar mecanismos duplicados.

1. **Timeline da ocorrência**: histórico visual de etapas (reportada → equipe avisada → presença confirmada → resolvida) com o horário de cada uma, dentro do painel de detalhe. Com os campos `reportadoEm`, `confirmadoEm`, `resolvidoEm` já propostos na seção 4.1, isso é principalmente um componente de UI que lê esses três timestamps e desenha uma linha do tempo vertical ou horizontal.
2. **Log/chat simulado do WhatsApp**: ~~dentro do painel de ocorrência...~~ — **implementado como o Chat interno (seção 4.6)**, de forma mais ampla do que o item original pedia: não é só dentro do painel de ocorrência, é um módulo próprio que conversa com qualquer funcionário ou colaborador, inclusive os avisos de alerta meteorológico (seção 5bis.9) e de SLA (seção 5bis.4) chegam por lá.
3. **Heatmap de densidade por horário**: evolução de "onde as ocorrências se concentraram" ao longo do tempo do evento, não só o instante atual. Pode reaproveitar a camada de heatmap da seção 4.2, adicionando um controle de tempo (slider) que filtra ocorrências por janela de horário.
4. **Exportar relatório do evento**: ~~gerar um resumo (zona por zona...)~~ — **superado pela seção 5bis.10**, que entrega isso (resumo por zona, ranking de colaboradores, impressão via `window.print()`) com mais dados ainda, incluindo o cruzamento com a prontidão pré-evento. Não reimplementar; só evoluir o relatório que já existe (`renderRelatorioEvento`) se faltar algo.
5. **Modo replay do evento**: acelerar o tempo para assistir como as ocorrências surgiram e foram resolvidas ao longo do evento todo, útil para apresentações e para pós-mortem. Requer guardar um log de eventos (criação, confirmação, resolução) com timestamp e reproduzir em escala de tempo acelerada.
6. **Alerta quando ocorrência nova surge perto de um responsável**: o aviso automático ao responsável regional integra o acionamento. Preservar a evolução de destaque visual ou som para proximidade de quem está em campo, sem tornar sua resposta uma aprovação obrigatória; o som depende da interação prévia permitida pelo navegador.
7. **Reconhecimento e ranking de colaboradores**: preservar o recurso com contagens simples de chegada e término informados. Convites enviados são mostrados separadamente e não contam como presença. Não criar nota de qualidade, prova de contribuição ou pontuação por rapidez; a publicação do nome é opcional. O agradecimento usa as duas confirmações já feitas, sem nova etapa para o voluntário.

## 5bis. Módulos de gestão de desastres preservados

Os dez módulos a seguir pertencem ao protótipo existente e continuam disponíveis. Esta seção incorpora a revisão do fluxo de ajuda e distingue demonstração de implementação real. Cadastro, veículo, combustível, alertas, mapa, status público, equipes, administração e relatórios permanecem no produto. O protótipo permite revisar a experiência; não certifica uma operação municipal real.

### 5bis.1 — Triagem e priorização automática

O botão “Fila de prioridade” mantém a lista de ocorrências abertas, incluindo as que já estão em atendimento. A classe de gravidade domina a ordenação; tempo de espera ordena ocorrências dentro da classe. Uma ocorrência média antiga não ultrapassa automaticamente uma ocorrência grave por acumular pontos, e a chegada de alguém não reduz por si só o risco registrado.

`calcPrioridade(o)` usa a regra do núcleo de ajuda. A responsabilidade pública, privada ou mista permanece visível para encaminhamento e organização, sem reduzir mecanicamente a prioridade de um risco grave em propriedade privada. O texto explicativo da fila deve acompanhar essa regra e não manter a fórmula antiga.

### 5bis.2 — Controle de acesso por papel (simulado)

A escolha de perfil permite revisar a interface como administrador, responsável de uma zona ou visualizador. Os controles administrativos e de atuação por zona continuam úteis para demonstrar a organização; não representam autenticação real.

A hierarquia de perfis não deve criar uma fila de aprovações do atendimento. Acionamento, aviso regional e processamento das confirmações seguem as regras já configuradas. O voluntário não recebe pedidos de permissão a cada chegada ou término.

Como as regras atuais rodam no navegador, elas podem ser alteradas por quem controla o cliente. Na implantação real, identidade, autorização e isolamento por prefeitura serão conferidos no servidor em cada operação, sem aumentar os passos do voluntário.

### 5bis.3 — Modo offline / baixa conectividade (parcial)

`sw.js` usa rede primeiro para evitar que uma versão antiga continue aparecendo durante a evolução do protótipo. O shell próprio inclui a interface e o núcleo de regras. Quando houver falha de rede, usar o recurso correspondente em cache; o fallback para `index.html` é apropriado a navegação, não a pedidos de JavaScript ou imagem.

O banner de conectividade permanece. A fila de mensagens do chat pode ser reprocessada dentro da simulação quando a conexão voltar, sem perder mensagens porque a conversa ainda não foi recriada em memória e sem duplicar o efeito de uma confirmação.

Persistência local não equivale a WhatsApp offline nem garante o funcionamento de todas as dependências externas, dos tiles ou de outro dispositivo. Arquivos apenas selecionados num campo de upload não sobrevivem a uma recarga; registros e anexos efetivamente salvos dependem do espaço disponível no navegador. Isso não impede o voluntário de concluir sua participação sem anexos.

A implementação real precisará de armazenamento e sincronização próprios para os dados que devam sobreviver à falta de conexão, além da fila de integração no servidor. O escopo de continuidade deve ser testado separadamente da simples abertura do HTML.

### 5bis.4 — Alerta de espera e escalonamento (simulado)

O protótipo verifica ocorrências ativas de gravidade alta ainda sem chegada e avisa o coordenador da zona quando a espera alcança o limite de demonstração (`SLA_LIMITE_MIN`). O banner e a mensagem interna mostram a situação. O campo `_escalado` evita repetir o mesmo aviso indefinidamente.

Esse acompanhamento é automático e não suspende os convites enquanto aguarda aprovação. Os prazos, contatos e alternativas de atendimento serão configuração de cada prefeitura. O valor curto do protótipo não é um SLA operacional proposto, e o aviso simulado não confirma que um órgão externo recebeu ou assumiu o atendimento.

### 5bis.5 — Histórico e cadeia de auditoria local

O módulo conserva a cadeia de hashes das entradas (`ts`, `ator`, `acao`, `detalhe`, `prev`, `hash`) e a função `auditPush()`. A gravação precisa ser sequencial para que duas ações próximas não usem acidentalmente o mesmo hash anterior. Chegadas, términos, acionamentos e edições relevantes alimentam esse histórico automaticamente.

O botão de verificar integridade recalcula a cadeia; a simulação de adulteração continua disponível para demonstrar o efeito de alterar uma entrada sem recalcular os hashes. A interface deve descrever esse teste como verificação local, sem afirmar que o navegador torna o histórico imutável.

O cliente pode alterar dados e recalcular toda a cadeia. Na implementação real, o registro deve ser preservado no servidor e protegido de forma adequada. O voluntário não precisa preencher um relatório para produzir a trilha do atendimento.

### 5bis.6 — Exibição de fotos e dados de demonstração

O registro opcional de fotos mantém a escolha “Permitir que o morador veja estas fotos na página pública de status”, desmarcada por padrão. `o.relatorio.fotosPublicas` controla a exibição na visão pública. A ausência de fotos não impede término, relatório consolidado ou reconhecimento.

Isso é uma demonstração de apresentação, não proteção de arquivos: o protótipo carrega dados no cliente. Textos antigos sobre guardar fotos por 90 dias não implementam exclusão automática. A implantação deverá definir finalidade, acesso, retenção e descarte de cada tipo de dado; não transformar um prazo escrito na interface em promessa de funcionalidade.

### 5bis.7 — Página pública de status (visão simulada)

A rota `#status` esconde o painel interno e mostra a busca por protocolo, como `MA-10042`. A visão do morador apresenta tipo, zona e andamento, com fotos apenas quando existirem e estiverem marcadas para exibição. O link de demonstração permite voltar ao painel; na implantação real, o acompanhamento será entregue ao morador pelo canal correspondente.

Essa separação é visual: os dados ainda estão no mesmo aplicativo do navegador. Não confundir o que a tela deixa de mostrar com segurança real. A implementação real precisará de uma projeção pública adequada e controle de acesso ao acompanhamento individual.

### 5bis.8 — Encaminhamento para equipes e serviços competentes

O painel conserva os contatos de emergência e a possibilidade de registrar que um serviço foi acionado. Um link `tel:` abre o discador quando suportado; uma anotação manual registra o que foi informado. Nenhum dos dois comprova despacho ou atendimento pelo serviço externo.

Na revisão, os guards encaminham os tipos de risco incompatíveis com voluntários comuns para a equipe competente de demonstração. A interface pode simular chegada e término dessa equipe, deixando clara a origem simulada. O responsável regional recebe aviso sem aprovar cada etapa. Na implantação real, contatos e integrações precisam corresponder à cobertura e às competências cadastradas de cada município.

### 5bis.9 — Alertas meteorológicos e pré-ativação ("o cérebro") (implementado)

Este módulo atende ao objetivo de saber com quem a prefeitura pode contar *antes* da crise. Os alertas e as respostas usados aqui são simulados. A ausência de integração homologada neste protótipo não prova inexistência de fonte oficial disponível. A etapa real deverá verificar a documentação e as condições de acesso das fontes candidatas da seção 6.

O que foi construído, simulado, seguindo o mesmo padrão usado para o WhatsApp no resto do protótipo:

- Botão "🌦 Alertas & Prontidão" abre um modal com duas abas. **Alertas ativos**: lista os alertas emitidos (`alertasClimaticos`), cada um com fonte (INMET/SIMEPAR/Defesa Civil PR, sorteada), tipo, nível (amarelo/laranja/vermelho), zonas afetadas e janela de horas; um botão "🔔 Simular novo alerta" gera um novo.
- Ao gerar um alerta, `dispararPreAtivacao(alerta)` roda a parte que importa: para cada funcionário e colaborador das zonas afetadas, registra um status `"pendente"` em `prontidao[alertaId][pessoaId]`, injeta uma mensagem no chat interno dessa pessoa perguntando se ela estará disponível, e depois de 3 a 12 segundos (simulando o tempo real de alguém responder um WhatsApp) sorteia uma resposta: confirmado (55%), indisponível (27%) ou sem resposta (18%).
- Aba **Prontidão por zona** mostra, para cada zona com alerta ativo, uma barra de progresso (confirmados em verde, indisponíveis em vermelho, sem resposta em cinza) e a lista de pessoas com seus status — essa é a resposta direta a "saber com quem podemos contar antes da crise".
- Zonas com alerta em vigor (`zonasComAlertaAtivo()`, calculado por `emitidoEm + janelaHoras`) ficam marcadas no mapa com a borda laranja tremulante em vez da amarela padrão, e com um ícone 🌦 na lista de zonas da sidebar.

### 5bis.10 — Relatório pós-evento analítico

O relatório consolidado permanece no botão “Relatório do evento”, separado dos anexos opcionais de cada ocorrência. Ele agrega ocorrências totais, resolvidas e abertas, tempos registrados, colaboradores cadastrados e prontidão, além do resumo por zona.

Contar separadamente convites enviados, chegadas e participações concluídas. `voluntariosProx` sozinho não informa quantas pessoas compareceram. O reconhecimento usa os registros já enviados, sem avaliação de qualidade, comprovante adicional ou competição por rapidez. Dados de prontidão e participação são indicadores da simulação, sem alegação de efeito causal ou atendimento real.

“Imprimir / salvar PDF” continua usando `window.print()` e a folha `@media print` dedicada. Preservar essa exportação e seus resumos; novas regras de cálculo devem ser refletidas nos rótulos das tabelas.

## 5ter. Cadastro conversacional de voluntário via WhatsApp (implementado)

O botão "📲 Simular cadastro via WhatsApp" não gera mais um voluntário aleatório instantâneo; abre um modal de chat que reproduz, pergunta por pergunta, o fluxo de cadastro especificado por Alden para o cadastro por WhatsApp. É uma máquina de estados simples (`cadastroPassos`, `cadastroState`, `cadastroResponder`) que valida cada resposta antes de avançar.

Perguntas, na ordem:

1. **Nome e sobrenome** (texto livre).
2. **CPF** — validado de verdade com o algoritmo de dígito verificador (`validaCPF`), não só o formato; se o CPF não bate, a conversa pede de novo antes de avançar.
3. **Endereço** (texto livre, guardado como está — sem geocodificação real).
4. **Zona** — lista numerada das 6 zonas, a pessoa escolhe pelo número (continua a convenção "zona" da seção 2; isso também resolve a zona de forma confiável, já que geocodificar o endereço de texto livre não é viável neste protótipo).
5. **Como pode contribuir** — lista numerada de 10 opções (`tiposContribuicao`: motosserra, caminhão/transporte de carga, transporte de pessoas, mão de obra, comida, roupas/cobertores, gerador, resgate de animais, primeiros socorros, abrigo temporário); aceita múltipla escolha digitando os números separados por vírgula (ex.: `1,4,6`), exatamente como pedido.
6. **Preferência de alerta** — antes do evento, durante, só depois, ou todas as fases (`alertaPreferencia`). O núcleo de acionamento deve respeitar a fase compatível; o comportamento de pré-ativação também precisa ser conferido no checklist da revisão.
7. **Disposição para outra zona** — só a própria zona ou outras zonas da mesma prefeitura (`disponibilidadeZona`). O acionamento respeita essa preferência ao buscar pessoas compatíveis e disponíveis, ordenadas pela distância calculada. Não vincular recursos de outra prefeitura apenas por estarem próximos.
8. **Veículo próprio** — texto livre ou "não". Se a pessoa tem veículo, uma pergunta extra aparece:
9. **Reembolso de combustível** — só perguntado se a pessoa disse que tem veículo; sim (reembolso) ou não (doação do combustível), espelhando a regra original de Alden ("se o dono pede reembolso, a prefeitura repõe; se não pede, vira doação").
10. **Confirmação do cadastro e preferência de uso dos dados** — preserva a etapa de confirmação existente no protótipo. A recusa impede concluir o cadastro; não afirmar que todo conteúdo digitado foi apagado da conversa ou do navegador sem implementar e verificar isso. As finalidades, bases legais e informações necessárias para o cadastro real serão definidas na implantação. Essa etapa de preparação não reaparece a cada ajuda, chegada ou término.

Ao final, o sistema calcula `itensQueFaltamNaZona(zona)` (função que compara quantos colaboradores daquela zona já oferecem cada tipo essencial — `itensEssenciaisZona`, com mínimos definidos por tipo — contra o mínimo desejado) e manda uma mensagem de encerramento com: confirmação do cadastro, nome e telefone do responsável e do coordenador da zona, e o que está faltando na zona com um convite para encaminhar o número para outra pessoa que possa cobrir aquilo. Isso é a "sugestão dinâmica" pedida. O mesmo cálculo de falta aparece em dois outros lugares para ficar visível sem precisar reabrir o cadastro: na faixa superior quando uma zona está selecionada (`updateZoneStrip`) e na aba Colaboradores da Administração, que agora abre com um resumo por zona antes da tabela de pessoas.

Dados do cadastro em `voluntarios[]`: `cpf`, `endereco`, `contribuicoes`, `alertaPreferencia`, `disponibilidadeZona`, `temVeiculo`, `tipoVeiculo`, `aceitaReembolso`, `consentimentoLGPD` e `cadastradoEm`, além do contexto de prefeitura usado na revisão. A tabela administrativa usa `maskCPF()`. A conversa pode conter o texto digitado; mascarar uma tabela não elimina os dados do cliente. Usar somente dados fictícios para revisar esse cadastro.

Os voluntários de demonstração (gerados na primeira inicialização de um contexto sem estado salvo, para o protótipo não abrir vazio) ganharam os mesmos campos com valores sintéticos neutros (`cpf:null`, `endereco:null`, `consentimentoLGPD:true`) só para o resto do código não quebrar ao ler esses campos — eles não passaram pelo fluxo de cadastro de verdade, e isso é intencional: não faria sentido inventar CPF de gente que não existe.

**Limitações para quem for evoluir isso:**

- Conferir a preferência de alerta em todos os pontos de entrada: acionamento de ocorrência e `dispararPreAtivacao()`. A aplicação em um desses caminhos não comprova a aplicação no outro.
- A validação de dígitos do CPF não confirma identidade ou titularidade. A existência de um cadastro não comprova competência para uma atividade especializada; esse requisito pertence ao guard configurado para o tipo de recurso.
- `itensEssenciaisZona` tem valores de mínimo escolhidos de forma razoável mas arbitrária (não vieram de nenhum padrão oficial de defesa civil); antes de qualquer uso real, isso merece revisão com quem entende a operação de verdade.

## 6. Fontes candidatas para integração futura de alertas

O protótipo não tem uma fonte de alertas homologada. As opções já relacionadas neste guia permanecem como candidatas a avaliar na implantação. Confirmar cobertura, atualização, formato, licença, disponibilidade e condições de acesso na documentação oficial antes de conectar o produto.

| Candidato | O que verificar |
|---|---|
| [Google Weather API — alertas](https://developers.google.com/maps/documentation/weather/weather-alerts?hl=pt-br) | Cobertura útil por município, fontes, atribuição, credenciais e custos |
| Portal e catálogos oficiais do INMET | Interfaces, feeds e formatos oficialmente disponíveis e adequados ao caso de uso |
| SIMEPAR | Dados e condições institucionais ou técnicas para as prefeituras atendidas |
| CEMADEN | Dados de risco relevantes, cobertura territorial e condições de integração |
| [INMET-API-REST, projeto de terceiros](https://github.com/Felipeandradee/INMET-API-REST) | Escopo, manutenção e origem dos dados; não apresentar como API oficial nem assumir adequação operacional |

A etapa de pesquisa deverá documentar o que foi efetivamente verificado. Falha em acessar uma página ou ausência de integração no repositório não demonstram que uma fonte oficial inexiste. Até a homologação, os nomes e mensagens de fontes exibidos no protótipo devem permanecer identificados como simulação.

## 7. Como revisar e publicar no mesmo projeto

O projeto continua no repositório `AldenQuesada/maringa-alerta`, com o endereço https://aldenquesada.github.io/maringa-alerta/. Não criar outro site para substituir este protótipo.

Preparar alterações em uma branch de trabalho, comparar com a base atual e preservar mudanças recentes, inclusive as do service worker. A revisão deve mostrar quais fluxos mudaram e quais verificações foram executadas. Quando a revisão for integrada à branch publicada, o GitHub Pages atualizará o mesmo endereço; acompanhar o resultado do deploy antes de afirmar que a atualização está no ar.

### Verificações técnicas desta revisão

- Verificar a sintaxe do JavaScript inline de `index.html`, de `fluxo-ajuda.js` e de `sw.js`.
- Executar os testes do núcleo e do acionamento com `node --test tests/*.test.cjs`.
- Percorrer o roteiro da seção 9 e registrar os resultados realmente obtidos, incluindo limites da verificação.
- Conferir que o service worker inclui o novo arquivo próprio e usa uma nova versão de cache, sem devolver HTML como fallback de JavaScript.

O projeto permanece sem etapa de build. O fluxo Git já utilizado continua válido, com os arquivos efetivamente alterados selecionados para commit:

```bash
git add index.html fluxo-ajuda.js prototipo.css sw.js GUIA_IMPLEMENTACAO.md tests/
git commit -m "Simplificar o fluxo de ajuda no protótipo"
git push
```

Na branch de trabalho, `git push` envia a revisão; isso não equivale a publicar a branch principal. Evitar sobrescrever mudanças de outra pessoa ou afirmar que um teste passou apenas porque a página abriu.

## 8. O que não fazer

- Não trocar o provedor de tiles do mapa por um que exija chave de API sem confirmar antes que a chave está disponível e configurada; isso já quebrou o mapa uma vez (CartoDB `dark_all`).
- Não fragmentar o projeto em build tools (webpack, bundlers, frameworks de frontend) sem necessidade comprovada; o ponto forte do protótipo atual é não precisar de nada além de um navegador e um `git push`.
- Não inventar dados de funcionários públicos reais. Todos os nomes de responsáveis/substitutos/coordenadores no protótipo são fictícios, criados para fins de demonstração; isso deve continuar assim até que a prefeitura forneça uma lista real de servidores para substituir.
- Não remover a separação entre a geração de dados simulados (toda a lógica de `gerarOcorrencia`, `gerarVoluntarios`, pings de WhatsApp) e a lógica de UI; quando a integração real com WhatsApp/backend acontecer, essa separação vai facilitar trocar "dados simulados" por "dados reais vindos de uma API" sem reescrever a interface inteira.
- Não apresentar perfis, cadeia local de auditoria ou troca de prefeitura do protótipo como segurança real. São demonstrações de comportamento no navegador; a proteção efetiva será implementada no backend.
- Não inventar nem supor que existe uma integração real com INMET/SIMEPAR/CEMADEN (seção 5bis.9). O que existe hoje é simulado; antes de conectar a uma fonte real, confirme a documentação oficial da fonte escolhida (não um endpoint encontrado sem fonte primária) e esteja preparado para precisar de acordo institucional, não de uma chamada HTTP simples.
- Não usar CPF ou outros dados pessoais reais para testar o cadastro. A máscara na tela e o armazenamento local não substituem os controles que serão definidos para o produto real.
- Ao editar o arquivo inline `<script>` deste `index.html` (ele tem mais de 2000 linhas e vários template literals aninhados, principalmente na página pública de status e no relatório do evento), rode uma verificação de sintaxe antes de publicar — por exemplo, extrair o conteúdo das tags `<script>` para um arquivo `.js` separado e rodar `node --check` nele. O histórico do projeto contém uma falha causada por um backtick de template literal fora do lugar; preservar essa verificação antes de publicar.

## 9. Roteiro de revisão do protótipo

Usar dados fictícios. As caixas abaixo são critérios a verificar, não resultados já obtidos.

### Teste do fluxo principal

1. Abrir a configuração de Maringá e manter a geração aleatória pausada para acompanhar um caso sem interferência.
2. Criar uma ocorrência de teste confirmada, como distribuição de água e alimentos. Ver os convites compatíveis e o aviso automático ao responsável da zona, sem aprovação intermediária.
3. Abrir o WhatsApp simulado de uma pessoa convidada e confirmar **Cheguei**. Conferir a presença individual, o horário e o marcador da ocorrência em atendimento.
4. Confirmar **Terminei** para essa pessoa. Conferir a liberação daquela participação e, quando existir, o convite para outra ajuda. Se houver outra pessoa ou necessidade em andamento, a ocorrência original deve continuar aberta.
5. Concluir as demais participações necessárias. Acompanhar o encerramento automático e o agradecimento, sem foto, relatório ou nota obrigatória. Depois, abrir o histórico e experimentar os anexos opcionais.
6. Recarregar a página e verificar a continuidade. Alternar para Município Exemplo, criar um registro de teste e voltar a Maringá para conferir a separação local dos contextos.

### Critérios para considerar esta revisão pronta para avaliação

- [ ] O fluxo principal funciona apenas com chegada e término, sem aceite prévio obrigatório.
- [ ] Uma ocorrência confirmada gera convites e aviso regional automaticamente; convite enviado e presença aparecem como estados diferentes.
- [ ] A mesma pessoa não recebe alocações incompatíveis simultâneas, e repetir uma confirmação não duplica seu efeito.
- [ ] O término individual preserva o trabalho das demais pessoas e as pendências da ocorrência.
- [ ] Risco incompatível com voluntário comum segue o encaminhamento especializado de demonstração.
- [ ] Ocorrências em atendimento continuam visíveis ao filtrar zonas; encerradas continuam consultáveis no histórico.
- [ ] Fotos, relatório, veículo, combustível, cadastros, equipes, alertas, prontidão, chat, fila, mapa e status público continuam acessíveis.
- [ ] O menu abre e fecha no celular; os botões principais podem ser usados por toque e teclado.
- [ ] Recarregar preserva a operação, participações e conversas; trocar de prefeitura mantém os registros no contexto correspondente.
- [ ] As preferências de fase e zona são respeitadas nos pontos de acionamento e pré-ativação.
- [ ] As regras do núcleo passam nos testes, e os resultados da revisão de interface ficam registrados.
- [ ] O usuário consegue percorrer e ajustar a experiência antes da construção da versão real.

### O que pertence à implementação real

A revisão do protótipo não equivale à conclusão destes itens:

| Área | Implementação posterior necessária |
|---|---|
| Multi-tenancy real | Identidade, autorização no servidor e isolamento de banco, arquivos, filas e demais superfícies por prefeitura |
| Coordenação real | Guards persistidos no banco, reservas transacionais, processamento idempotente e dados compartilhados entre dispositivos |
| Comunicação | WhatsApp oficial conectado, recebimento de mensagens e confirmações por webhooks, rastreamento e contingência |
| Dados operacionais | Responsáveis, contatos, geometrias, capacidades e fontes oficiais definidos com cada município |
| Continuidade e operação | Persistência durável, sincronização, restauração, observabilidade e validação operacional do escopo implantado |

A implementação real deve conservar os mesmos dois passos de quem ajuda. A complexidade necessária à operação fica nas regras e nos serviços do sistema, sem acrescentar burocracia ao voluntário.


### Verificação executada nesta revisão

- Os 16 testes passaram com `node --test tests/*.test.cjs`. Cobrem confirmação prévia, compatibilidade, preferência/zona, duas ocorrências usando os mesmos candidatos, chegada/término repetidos, término parcial, próximo convite, insuficiência de recursos, pendência técnica, encaminhamento especializado e contextos municipais distintos. A regressão de capacidade parcial foi verificada: o adaptador aciona a equipe uma única vez quando faltam voluntários, e a conclusão respeita ambas as ordens de término entre equipe e voluntário.
- A sintaxe do JavaScript inline e dos arquivos JavaScript foi conferida, e `git diff --check` não encontrou erros de espaços no diff.
- Na prévia local, uma ocorrência de distribuição recebeu dois convites e aviso regional. O primeiro término não encerrou a segunda participação; o segundo concluiu a ocorrência sem fotos nem aprovação. Após recarregar, a consulta pública encontrou o mesmo protocolo resolvido.
- O contexto Município Exemplo não encontrou o protocolo de Maringá. Ao voltar, a simulação de Maringá foi recuperada.
- O encaminhamento especializado foi testado com deslizamento: nenhum voluntário comum foi convocado; chegada e término da equipe de demonstração encerraram o atendimento.
- O menu e a conversa foram percorridos em uma prévia com largura de 390 px. Isso verifica o layout responsivo, sem substituir testes em aparelhos físicos.
- O provedor de tiles exibiu bloqueio de acesso na prévia de navegador usada para revisão. Marcadores e operações do painel funcionaram; o carregamento do fundo cartográfico nessa prévia ficou limitado. O provedor existente foi preservado. Esse resultado não comprova indisponibilidade do endereço publicado para outros navegadores.

Os itens do checklist continuam sendo critérios de revisão do conjunto. Não interpretar os testes acima como homologação de produção, validação completa de todos os módulos, teste de isolamento real entre tenants ou confirmação da publicação no GitHub Pages.
