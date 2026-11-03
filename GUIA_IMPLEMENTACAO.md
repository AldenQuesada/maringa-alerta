# Maringá Alerta — guia de implementação para o Codex

Este documento descreve o estado atual do protótipo e especifica, com critério de aceite, tudo que falta construir. Foi escrito para quem vai continuar o desenvolvimento sem o contexto da conversa original. Leia o repositório antes de começar: o arquivo principal é `index.html`, uma página única (HTML + CSS + JS inline), sem build step, sem backend, publicada via GitHub Pages.

URL ao vivo: https://aldenquesada.github.io/maringa-alerta/
Repositório: https://github.com/AldenQuesada/maringa-alerta

## 1. Contexto do projeto

Maringá Alerta é um painel de resposta a emergências para a Prefeitura de Maringá (PR). A ideia operacional:

1. Moradores que podem ajudar (motosserra, caminhão, mão de obra, roupas, comida, etc.) se cadastram mandando mensagem para um número de WhatsApp da prefeitura, dizendo em que podem ajudar.
2. Quando acontece um evento climático grave, moradores reportam ocorrências pelo WhatsApp com foto e localização.
3. O painel mostra essas ocorrências no mapa, identifica os voluntários cadastrados perto de cada uma e os convoca.
4. Cada zona da cidade tem um responsável, um substituto e um coordenador, todos funcionários da prefeitura, que se deslocam até a ocorrência e coordenam a ajuda.
5. Conforme as ocorrências são resolvidas, elas saem do mapa.
6. No final, os colaboradores recebem reconhecimento público da prefeitura.

Importante: este protótipo não tem backend real. Toda a "comunicação por WhatsApp" é simulada no front-end (textos de banner, geração periódica de eventos aleatórios). Antes de ir para produção, isso precisa ser substituído por integração real com a API do WhatsApp Business (ou um provedor como Twilio, Z-API, Evolution API) e um banco de dados real. Este guia cobre apenas a evolução do protótipo visual e funcional; a integração de backend é um projeto separado e deve ser tratada como tal.

## 2. Convenção de nomenclatura: "zonas", não "bairros"

Decisão tomada nesta conversa: o protótipo usa o termo **zona** para as áreas de cobertura, não "bairro". Motivo: não existe fonte oficial (prefeitura, IBGE) confirmando o número exato de bairros de Maringá; os números encontrados em buscas divergem demais para serem confiáveis (de poucas regiões a centenas, provavelmente contando loteamentos comerciais). Usar "zona" evita a aparência de estar afirmando uma divisão administrativa real que não foi verificada.

Ação pendente: renomear no código e na interface todas as ocorrências de "bairro" para "zona" (variável `bairros`, textos `Bairro`, `bairro`, classes como `.bairro-label`, `.zi-count`, etc.). Isso é um find-and-replace cuidadoso, não uma reescrita de lógica. As 6 zonas atuais (Zona 7, Jardim Alvorada, Conjunto Requião, Jardim Universo, Vila Esperança, Centro Cívico) podem continuar com esses nomes como rótulos de zona, ou ser renumeradas como "Zona 1" a "Zona 6" se a Alden preferir; perguntar antes de decidir isso, não assumir.

## 3. Arquitetura atual (ler o código real antes de alterar)

Quase tudo vive em `index.html`. A única exceção é `sw.js` (service worker, seção 5bis.3), que precisa ser um arquivo próprio na raiz do site por exigência da própria API de Service Worker do navegador — não pode ser inline.

Dentro de `index.html`:
- CSS no `<head>`, com tokens de cor em `:root` (`--bg`, `--panel`, `--fg`, `--red`, `--blue`, `--green`, `--yellow`, `--accent`).
- Mapa com Leaflet 1.9.4 (via cdnjs), tiles do OpenStreetMap padrão (`tile.openstreetmap.org`, sem necessidade de chave de API), com um filtro CSS (`invert + hue-rotate`) em `.leaflet-tile-pane` para dar o visual escuro. Não trocar para tiles que exigem API key (CartoDB `basemaps.cartocdn.com` já causou esse problema uma vez: parou de carregar sem aviso claro).
- Estruturas de dados principais, todas em memória (arrays JS, recriadas a cada reload da página):
  - `bairros` (renomear para `zonas`): array de objetos com `nome`, `center`, `poly` (polígono lat/lng), `equipamentos`, `equipe` (`responsavel`, `substituto`, `coordenador`, cada um com `nome`, `cargo`, `pos`, `ultimoPing`, `tel`).
  - `ocorrencias`: array de objetos com `id`, `tipo`, `icone`, `bairro` (nome da zona), `pos`, `reportadoEm` (timestamp), `tempoEstimado`, `status` (`"ativa"` ou `"resolvida"`), `responsavel`, `fotoTag`, `voluntariosProx` (ids), `marker` (referência Leaflet).
  - `voluntarios`: array de objetos com `id`, `nome`, `ajuda`, `bairro`, `pos`, `ativo` (bool), `marker`.
  - `activeZone`: string (nome da zona) ou `null` (= "Todas as zonas").
- Camadas Leaflet separadas: `ocLayer` (ocorrências), `volLayer` (voluntários), `officialLayer` (responsável/substituto/coordenador da zona ativa).
- UI: sidebar esquerda com lista de zonas (clicável, isola a zona no mapa), barra superior que mostra o evento (modo "Todas") ou a zona ativa com os 3 cartões de equipe (modo zona), painel lateral direito com detalhe da ocorrência ou da zona, janela flutuante arrastável com lista de colaboradores (voluntários).
- Toda geração de dados é simulada: `gerarOcorrencia()` cria ocorrências aleatórias a cada ~7s se houver menos de 14 ativas; `setInterval` de 20s simula pings de localização dos responsáveis via WhatsApp.

Antes de editar qualquer função, use Ctrl+F / grep para achar todos os lugares onde ela é chamada. O arquivo é longo (quase 800 linhas) mas é um único arquivo; não fragmente em múltiplos arquivos sem necessidade real, a menos que vá crescer muito mais.

## 4. Funcionalidades já implementadas (não refazer, só evoluir)

Os três itens abaixo foram implementados nesta sessão, direto no protótipo, e já estão no `index.html` publicado. A descrição detalhada de cada um continua nas subseções 4.1 a 4.3 porque explica o raciocínio e os nomes de campo usados; não é mais um pedido pendente, é a documentação do que existe.

### 4.1 Confirmação de presença na área + contador de tempo até resolução (implementado)

Cada ocorrência agora tem três timestamps: `reportadoEm`, `confirmadoEm` (null até a presença ser confirmada) e `resolvidoEm` (null até resolver). O `status` evoluiu de um booleano implícito para três estados: `"ativa"` (aguardando equipe) → `"em_atendimento"` (presença confirmada, equipe no local) → `"resolvida"`.

No painel de ocorrência (`openOcorrencia`, por volta da linha 700 do `index.html`):
- Em `"ativa"`: mostra só o botão "Confirmar presença na área" (`#presence-btn`). Não há botão de resolver ainda; isso é deliberado, para refletir que a equipe precisa chegar antes de poder encerrar.
- Ao confirmar presença: seta `confirmadoEm = Date.now()`, muda `status` para `"em_atendimento"`, atualiza o ícone do marcador no mapa (cor âmbar, `STATUS_COLOR.em_atendimento`) e re-renderiza o painel.
- Em `"em_atendimento"`: mostra dois campos, "Tempo até chegada" (fixo, calculado como `confirmadoEm - reportadoEm`) e "Em atendimento há" (`#live-atendimento`, atualizado a cada 5 segundos por um `setInterval` global que verifica `currentPanelOcId`), além do botão "Marcar como resolvida" (`#resolve-btn`).
- Ao resolver: seta `resolvidoEm`, `tempoChegada`, `tempoAtendimento` e `tempoReal` (soma dos dois), libera os voluntários mobilizados, remove o marcador do mapa, dispara o banner de reconhecimento e atualiza KPIs, lista de zonas, colaboradores e heatmap.
- O ícone do marcador (`ocIcon(status)`) e o tooltip (`refreshOcTooltip(o)`) mudam de cor e texto conforme o status, usando a variável CSS `--oc` no elemento `.oc-pulse`.

Isso já está feito. Se for evoluir: considerar permitir que mais de uma pessoa da equipe (substituto, coordenador) confirme presença separadamente, em vez de um único campo `confirmadoEm` para a ocorrência toda; hoje o modelo assume que a confirmação é da ocorrência, não de uma pessoa específica.

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

Persistência: tudo que é editado no modal de administração é salvo em `localStorage` (chave `maringa_admin_v1`, funções `saveAdminState()` / `loadAdminState()`), então sobrevive a um F5 na mesma máquina/navegador. Isso não é um banco de dados real nem sincroniza entre dispositivos; é um atalho de protótipo. Quando a integração com backend acontecer, essa camada de `localStorage` deve ser substituída por chamadas de API, mantendo as mesmas funções de leitura/escrita como ponto único de troca.

## 4.5 Relatório final obrigatório antes de resolver uma ocorrência (implementado)

O fluxo de uma ocorrência em `"em_atendimento"` mudou: clicar em "Marcar como resolvida" não resolve mais direto, abre um formulário (`#report-form`) que exige:
- foto da situação atual (`input type="file"`, lida com `FileReader` e guardada como data URL em `o.relatorio.fotoAtual`);
- foto da situação final (mesma mecânica, `o.relatorio.fotoFinal`);
- o que ficou pendente (textarea, `o.relatorio.pendencias`, com "Nenhuma" como padrão se vazio);
- quem preencheu (select com responsável/substituto/coordenador da zona, `o.relatorio.preenchidoPor`).

Só depois de enviar as duas fotos (validação simples, sem elas o formulário mostra erro e não resolve) a ocorrência vira `"resolvida"`. O relatório preenchido fica visível depois, ao reabrir a ocorrência resolvida (as fotos aparecem como miniaturas). Como o marcador sai do mapa ao resolver, o acesso de volta às ocorrências resolvidas é pela lista "Resolvidas recentes" no rodapé da sidebar (`renderResumo`, até 5 mais recentes do escopo atual), que abre o painel de detalhe normalmente.

As ocorrências de histórico (seedadas no carregamento da página, que representam eventos de antes da sessão atual) não têm relatório, de propósito — não faria sentido inventar fotos para elas — e aparecem como "sem relatório" na lista.

## 4.6 Chat interno simulando WhatsApp (implementado)

Botão "💬 Chat interno" na sidebar abre um modal com lista de contatos (todos os funcionários internos + todos os colaboradores cadastrados, função `chatContatos()`) e uma conversa por contato. É puramente front-end: `chatHistorico` é um objeto em memória (`{idDoContato: [mensagens]}`), não persiste entre reloads e não envia nada de verdade. Ao enviar uma mensagem, o sistema simula uma resposta automática do contato depois de 1,4 a 3 segundos, sorteada de uma lista de frases plausíveis (`respostasAuto`). Serve para demonstrar a experiência de coordenação, não é uma integração real com a API do WhatsApp — isso seria um projeto de backend separado (ver seção 1).

## 4.7 Distâncias reais entre pontos (implementado)

As distâncias que antes eram números aleatórios (`Math.floor(rnd(150,900))+"m"`) agora são calculadas de verdade com `map.distance(latlngA, latlngB)` do Leaflet (distância geodésica em metros). Isso está em dois lugares: cada voluntário mobilizado no painel de ocorrência mostra a distância real até o ponto da ocorrência, e o cartão do responsável no mesmo painel mostra a distância real entre a posição atual dele (que já era simulada via ping de WhatsApp) e a ocorrência. Função auxiliar: `fmtDist(metros)`, que mostra em metros até 999m e em km com uma decimal a partir de 1000m.

Ainda não implementado: distância equipe-da-prefeitura ↔ ocorrência (as equipes de recursos, seção 4.4, não têm posição própria no mapa ainda, só a zona; adicionar um campo `pos` a cada equipe seria o próximo passo natural se isso for necessário).

## 5. Backlog aprovado (ordem sugerida, mas a Alden decide prioridade final)

Estas foram propostas e aprovadas em conversa anterior. Implementar depois dos itens da seção 4, ou intercalado se fizer sentido técnico.

1. **Timeline da ocorrência**: histórico visual de etapas (reportada → equipe avisada → presença confirmada → resolvida) com o horário de cada uma, dentro do painel de detalhe. Com os campos `reportadoEm`, `confirmadoEm`, `resolvidoEm` já propostos na seção 4.1, isso é principalmente um componente de UI que lê esses três timestamps e desenha uma linha do tempo vertical ou horizontal.
2. **Log/chat simulado do WhatsApp**: ~~dentro do painel de ocorrência...~~ — **implementado como o Chat interno (seção 4.6)**, de forma mais ampla do que o item original pedia: não é só dentro do painel de ocorrência, é um módulo próprio que conversa com qualquer funcionário ou colaborador, inclusive os avisos de alerta meteorológico (seção 5bis.9) e de SLA (seção 5bis.4) chegam por lá.
3. **Heatmap de densidade por horário**: evolução de "onde as ocorrências se concentraram" ao longo do tempo do evento, não só o instante atual. Pode reaproveitar a camada de heatmap da seção 4.2, adicionando um controle de tempo (slider) que filtra ocorrências por janela de horário.
4. **Exportar relatório do evento**: ~~gerar um resumo (zona por zona...)~~ — **superado pela seção 5bis.10**, que entrega isso (resumo por zona, ranking de colaboradores, impressão via `window.print()`) com mais dados ainda, incluindo o cruzamento com a prontidão pré-evento. Não reimplementar; só evoluir o relatório que já existe (`renderRelatorioEvento`) se faltar algo.
5. **Modo replay do evento**: acelerar o tempo para assistir como as ocorrências surgiram e foram resolvidas ao longo do evento todo, útil para apresentações e para pós-mortem. Requer guardar um log de eventos (criação, confirmação, resolução) com timestamp e reproduzir em escala de tempo acelerada.
6. **Alerta quando ocorrência nova surge perto de um responsável**: quando uma nova ocorrência é gerada dentro de um raio pequeno da posição atual de um responsável/coordenador que está em campo, disparar um destaque visual ou som (respeitando que autoplay de som só funciona depois de interação do usuário na página).
7. **Ranking de colaboradores**: pontuação por tempo de resposta, quantidade de ajudas prestadas, para alimentar o reconhecimento público ("ato oficial da prefeitura"). Fonte de dados: quantas vezes um voluntário apareceu em `voluntariosProx` de ocorrências resolvidas, e com que rapidez.

## 5bis. Visão de gestão de desastres — implementado nesta sessão

A seção 5bis original listava dez lacunas de arquitetura ("pensando como gestão de desastres, não como gestor de tela") como recomendação, sem código. A Alden pediu para implementar tudo, em sequência, direto no protótipo, e isso foi feito. Esta seção documenta o que existe de verdade no `index.html` para cada um dos dez itens, incluindo o que é simulação de protótipo versus o que precisaria de trabalho real de backend/segurança antes de qualquer uso em produção. **Nenhum destes substitui autenticação, backend ou política jurídica reais — são demonstrações funcionais da ideia, não a implementação final.**

### 5bis.1 — Triagem e priorização automática (implementado)

Botão "📋 Fila de prioridade" na sidebar abre uma lista de todas as ocorrências abertas (ativas ou em atendimento) ordenada por `calcPrioridade(o)`: gravidade × 100, mais até 2 pontos por minuto de espera (limitado a 60 min), mais 10 pontos se a responsabilidade é pública, menos 150 pontos se já tem equipe confirmada no local (porque já está sendo atendida). Clicar num item da fila abre o painel de detalhe daquela ocorrência direto. A fila respeita a zona selecionada (mostra só a zona ativa, ou todas se "Todas as zonas" estiver selecionado).

### 5bis.2 — Controle de acesso por papel (implementado, simulado — não é segurança real)

Ao abrir a página, um modal pede para escolher um papel: **Administrador geral** (acesso total), **Responsável de uma zona** (escolhe a zona num select) ou **Modo visualização** (sem poder agir). A escolha fica em `sessionStorage` (chave `maringa_role`), não em servidor, e não há senha nem verificação real de identidade — é uma simulação de UX para mostrar como o sistema se comportaria com RBAC, não RBAC de verdade. Com base no papel:
- `canAdmin()`, `canActZone(zona)` e `isViewOnly()` controlam o que aparece: o botão "🔒 Log de auditoria" só existe para admin geral; o botão "⚙ Administração" desaparece em modo visualização; dentro da Administração, um responsável só vê e edita a sua própria zona (funcionários e equipes de outras zonas ficam ocultos, e os botões de criar/remover equipe desaparecem — só admin geral cria ou remove).
- No painel de ocorrência, se `!canActZone(o.bairro)`, os botões de confirmar presença / resolver / acionar serviço oficial ficam desabilitados e aparece um aviso explicando o motivo.
- Qualquer pessoa com acesso ao DevTools do navegador consegue burlar isso (é só JavaScript no cliente). Antes de qualquer piloto real com a prefeitura, isso precisa de autenticação de verdade (login com senha ou SSO) e checagem de permissão no backend, não só no front-end.

### 5bis.3 — Modo offline / baixa conectividade (implementado parcialmente)

Um `sw.js` (service worker) cacheia o arquivo principal (`index.html`) na primeira visita, então o app abre mesmo sem internet depois disso (cache-first com fallback pro próprio `index.html`). Um banner fixo no rodapé do mapa aparece quando `navigator.onLine` é falso e desaparece quando a conexão volta. Mensagens do chat interno enviadas offline entram numa fila (`localStorage`, chave `maringa_fila_offline_v1`) e são "reenviadas" (dentro da simulação) quando o evento `online` dispara.

Limitação clara: só o chat tem fila offline. O envio do relatório final (que depende de arquivos de foto escolhidos pelo usuário, via `<input type="file">`) não é enfileirado — se a conexão cair no meio do envio do relatório, ele se perde, porque arquivos não sobrevivem a um reload e persistir um `File` inteiro em `localStorage` (teria que ser convertido pra base64) ficaria pesado demais para esse protótipo. Se isso for pra produção, o caminho certo é IndexedDB para guardar os arquivos binários da fila offline, não `localStorage`.

### 5bis.4 — Alerta de SLA / escalonamento (implementado)

Um `setInterval` de 15 segundos verifica todas as ocorrências `"ativa"` com `gravidade===3` (alta). Se o tempo de espera (`minutosDesde(o.reportadoEm)`) passar de `SLA_LIMITE_MIN` (hoje 2 minutos — ajustado para o relógio acelerado do protótipo; num evento real isso seria configurável, algo como 20 a 30 minutos) e a ocorrência ainda não tiver sido escalada (`o._escalado`), o sistema injeta uma mensagem de alerta no chat do coordenador da zona e mostra um banner vermelho no mapa. Cada ocorrência só escala uma vez (`o._escalado = true` evita repetição).

### 5bis.5 — Log de auditoria imutável (implementado)

Implementado como uma cadeia de hash simples: cada entrada (`{ts, ator, acao, detalhe, prev, hash}`) guarda o hash SHA-256 (via `crypto.subtle.digest`, nativo do navegador) do seu próprio conteúdo concatenado com o hash da entrada anterior. A função `auditPush(ator, acao, detalhe)` é chamada em: confirmar presença, enviar relatório final, acionar serviço oficial, editar ou criar ou remover funcionário/equipe na Administração, remover cadastro de colaborador, e emitir alerta meteorológico. O modal "🔒 Log de auditoria" tem um botão "Verificar integridade" que recalcula a cadeia inteira e aponta a primeira entrada que não bate — e um botão "⚠ Simular adulteração (demo)" que edita a primeira entrada sem recalcular o hash, só para provar visualmente que a verificação pega a adulteração.

Isso é tamper-evident (mostra que algo foi alterado), não tamper-proof (não impede a alteração): como tudo roda no navegador do próprio usuário e o log vive em `localStorage`, qualquer pessoa com acesso ao DevTools pode editar o array `auditLog` E recalcular os hashes corretamente, escondendo o rastro — porque o código que recalcula os hashes também está exposto no cliente. Um log de auditoria de verdade precisa rodar no servidor, fora do controle de quem está sendo auditado.

### 5bis.6 — Privacidade dos dados de moradores (implementado como política + flag, não como automação)

O formulário de relatório final (seção 4.5) ganhou um checkbox "Permitir que o morador veja estas fotos na página pública de status", desmarcado por padrão, com um texto de política ao lado ("fotos ficam arquivadas por 90 dias, usadas só para atendimento e prestação de contas"). O valor vai para `o.relatorio.fotosPublicas` e é respeitado pela página pública (seção 5bis.7): só mostra as fotos se a flag estiver marcada. Os 90 dias são só o texto da política mostrada na tela — nada no código apaga fotos depois desse prazo, porque isso exigiria um job agendado no servidor, que este protótipo (sem backend) não tem como rodar.

### 5bis.7 — Página pública de status (implementado)

Rota por hash: `#status` esconde o painel interno (`#app-view`) e mostra uma página separada (`#status-view`) com um campo de busca por protocolo. Cada ocorrência recebe um `protocolo` tipo `MA-10042` no momento em que é criada (`gerarOcorrencia`). A busca não expõe nome de responsável, telefone, nem localização de ninguém — só o tipo de ocorrência, a zona, uma linha do tempo de três passos (recebida / equipe confirmou presença / atendimento concluído) e, se a ocorrência foi resolvida e a flag `fotosPublicas` estiver marcada, as duas fotos do relatório. Tem um botão "👁 Ver status público (demo)" na sidebar interna só para facilitar a demonstração; numa implantação real, esse link sairia direto na mensagem de WhatsApp enviada ao morador, não dentro do painel interno.

### 5bis.8 — Ponte com serviços oficiais de emergência (implementado)

No painel de qualquer ocorrência com `gravidade===3` (alta) e ainda não resolvida, aparece uma caixa vermelha com links `tel:192` (SAMU), `tel:193` (Bombeiros) e `tel:199` (Defesa Civil) — como é um site normal fora de qualquer sandbox de artifact, esses links de fato abrem o discador no celular. Tem um botão "Marcar que já acionei um serviço oficial" que pede (via `prompt()`) qual serviço foi chamado e grava `o.acionamentoOficial = {servico, quando}`, registrado também no log de auditoria.

### 5bis.9 — Alertas meteorológicos e pré-ativação ("o cérebro") (implementado)

Este foi pedido separadamente pela Alden como a peça central: saber com quem a prefeitura pode contar *antes* da crise, não só depois que a ocorrência chega. Antes de implementar, foi feita uma verificação: **não existe hoje um endpoint público e documentado do INMET para avisos ativos.** Nenhuma integração real foi feita — ver seção 6 (fontes reais) antes de tentar conectar isso a um provedor de verdade.

O que foi construído, simulado, seguindo o mesmo padrão usado para o WhatsApp no resto do protótipo:
- Botão "🌦 Alertas & Prontidão" abre um modal com duas abas. **Alertas ativos**: lista os alertas emitidos (`alertasClimaticos`), cada um com fonte (INMET/SIMEPAR/Defesa Civil PR, sorteada), tipo, nível (amarelo/laranja/vermelho), zonas afetadas e janela de horas; um botão "🔔 Simular novo alerta" gera um novo.
- Ao gerar um alerta, `dispararPreAtivacao(alerta)` roda a parte que importa: para cada funcionário e colaborador das zonas afetadas, registra um status `"pendente"` em `prontidao[alertaId][pessoaId]`, injeta uma mensagem no chat interno dessa pessoa perguntando se ela estará disponível, e depois de 3 a 12 segundos (simulando o tempo real de alguém responder um WhatsApp) sorteia uma resposta: confirmado (55%), indisponível (27%) ou sem resposta (18%).
- Aba **Prontidão por zona** mostra, para cada zona com alerta ativo, uma barra de progresso (confirmados em verde, indisponíveis em vermelho, sem resposta em cinza) e a lista de pessoas com seus status — essa é a resposta direta a "saber com quem podemos contar antes da crise".
- Zonas com alerta em vigor (`zonasComAlertaAtivo()`, calculado por `emitidoEm + janelaHoras`) ficam marcadas no mapa com a borda laranja tremulante em vez da amarela padrão, e com um ícone 🌦 na lista de zonas da sidebar.

### 5bis.10 — Relatório pós-evento analítico (implementado)

Botão "📊 Relatório do evento" na sidebar (distinto do relatório por ocorrência da seção 4.5, que é operacional). Agrega: total de ocorrências, resolvidas, ainda abertas, tempo médio geral, total de colaboradores cadastrados, e o percentual de prontidão confirmada somando todas as respostas registradas em `prontidao` (seção 5bis.9) — ligando o antes (prontidão) com o depois (desempenho real). Tem uma tabela de desempenho por zona (total/resolvidas/abertas/tempo médio) e um ranking dos colaboradores que mais foram mobilizados em ocorrências resolvidas (conta aparições em `voluntariosProx`), que é a base de dados para o reconhecimento oficial da prefeitura. Botão "🖨 Imprimir / salvar PDF" chama `window.print()` com uma folha `@media print` dedicada que esconde todo o resto da página e imprime só o relatório.

## 6. Fontes reais para integração futura de alertas meteorológicos (pesquisado nesta sessão, não implementado)

Antes de simular o módulo da seção 5bis.9, foi feita uma busca para não inventar um endpoint que não existe. Resultado: não há documentação oficial de um endpoint público do INMET para avisos ativos. Os caminhos reais identificados, cada um com uma ressalva:

- **Google Weather API / Public Alerts** — endpoint que devolve alertas para uma latitude/longitude, agregando várias fontes incluindo INMET e o CENAD (Centro Nacional de Gerenciamento de Riscos e Desastres). Exige chave de API própria do Google e é um intermediário (não é o INMET direto); ver [documentação em português](https://developers.google.com/maps/documentation/weather/weather-alerts?hl=pt-br).
- **INMET-API-REST** (projeto de terceiros no GitHub, não oficial) — [repositório](https://github.com/Felipeandradee/INMET-API-REST). A busca não trouxe detalhe se ele cobre avisos/alertas ou só dados de estações; teria que ser inspecionado diretamente antes de confiar nele para algo crítico.
- **Portal oficial do INMET** (`portal.inmet.gov.br`) — não foi possível confirmar nesta busca se há documentação de API de avisos ali; é o primeiro lugar a checar antes de qualquer integração, em vez de usar um endpoint não documentado encontrado por fora.
- **SIMEPAR** (Sistema Meteorológico do Paraná) — é a fonte institucional mais relevante para Maringá especificamente, mas historicamente opera por convênio com prefeituras/órgãos públicos, não como API pública aberta para qualquer desenvolvedor. Precisa de contato institucional direto, não só leitura de documentação.
- **CEMADEN** (Centro Nacional de Monitoramento e Alertas de Desastres Naturais) — cobre risco geo-hidrológico (deslizamento, alagamento), mais focado em monitoramento de risco do que previsão meteorológica; também tende a ser acesso institucional, não API pública simples.

Recomendação: antes de substituir a simulação da seção 5bis.9 por uma integração real, (1) checar a documentação oficial do INMET diretamente no portal, (2) se não houver nada público e direto, avaliar a Google Weather API como ponte (mais rápida de integrar, mas com custo de API key e dependência de terceiro) versus abrir contato institucional com o SIMEPAR (mais lento, mas é a fonte certa para uma prefeitura do Paraná). Essa decisão depende de prazo e de quem na prefeitura consegue abrir esse contato — não é uma decisão só técnica.

## 7. Como publicar (processo já em uso, manter)

```
cd ~/maringa-alerta
git add -A
git commit -m "mensagem clara do que mudou"
git push
```

O GitHub Pages já está ativo no repositório, branch `main`, raiz `/`. Qualquer push em `main` atualiza https://aldenquesada.github.io/maringa-alerta/ automaticamente em 1 a 2 minutos. Não é necessário repetir a configuração de Pages; ela já foi feita via `gh api repos/AldenQuesada/maringa-alerta/pages`.

Antes de cada push, verificar a sintaxe do JavaScript inline (por exemplo, extraindo o bloco `<script>...</script>` e rodando `node --check` nele, como já foi feito nesta sessão) para não publicar uma página quebrada.

## 8. O que não fazer

- Não trocar o provedor de tiles do mapa por um que exija chave de API sem confirmar antes que a chave está disponível e configurada; isso já quebrou o mapa uma vez (CartoDB `dark_all`).
- Não fragmentar o projeto em build tools (webpack, bundlers, frameworks de frontend) sem necessidade comprovada; o ponto forte do protótipo atual é não precisar de nada além de um navegador e um `git push`.
- Não inventar dados de funcionários públicos reais. Todos os nomes de responsáveis/substitutos/coordenadores no protótipo são fictícios, criados para fins de demonstração; isso deve continuar assim até que a prefeitura forneça uma lista real de servidores para substituir.
- Não remover a separação entre a geração de dados simulados (toda a lógica de `gerarOcorrencia`, `gerarVoluntarios`, pings de WhatsApp) e a lógica de UI; quando a integração real com WhatsApp/backend acontecer, essa separação vai facilitar trocar "dados simulados" por "dados reais vindos de uma API" sem reescrever a interface inteira.
- Não apresentar o controle de acesso por papel (seção 5bis.2) nem o log de auditoria (seção 5bis.5) como segurança real em qualquer material para a prefeitura ou para fora deste repositório. Os dois são simulações de front-end, fáceis de burlar por qualquer pessoa com o DevTools do navegador aberto. Isso é adequado para demonstrar a ideia, não para proteger dados reais de servidores ou moradores.
- Não inventar nem supor que existe uma integração real com INMET/SIMEPAR/CEMADEN (seção 5bis.9). O que existe hoje é simulado; antes de conectar a uma fonte real, confirme a documentação oficial da fonte escolhida (não um endpoint encontrado sem fonte primária) e esteja preparado para precisar de acordo institucional, não de uma chamada HTTP simples.
- Ao editar o arquivo inline `<script>` deste `index.html` (ele tem mais de 2000 linhas e vários template literals aninhados, principalmente na página pública de status e no relatório do evento), rode uma verificação de sintaxe antes de publicar — por exemplo, extrair o conteúdo das tags `<script>` para um arquivo `.js` separado e rodar `node --check` nele. Um backtick de template literal fora do lugar já quebrou essa página uma vez nesta sessão (ver histórico de commits) e só foi pego por esse tipo de verificação.
