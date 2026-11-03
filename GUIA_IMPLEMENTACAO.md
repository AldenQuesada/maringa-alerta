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

Tudo vive em `index.html`:
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
2. **Log/chat simulado do WhatsApp**: dentro do painel de ocorrência, mostrar uma sequência de mensagens simuladas (morador reportando, prefeitura respondendo, equipe confirmando chegada) como se fosse uma conversa real de WhatsApp, usando bolhas de mensagem. É puramente decorativo/narrativo no protótipo (sem integração real), mas ajuda a vender a visão do produto.
3. **Heatmap de densidade por horário**: evolução de "onde as ocorrências se concentraram" ao longo do tempo do evento, não só o instante atual. Pode reaproveitar a camada de heatmap da seção 4.2, adicionando um controle de tempo (slider) que filtra ocorrências por janela de horário.
4. **Exportar relatório do evento**: gerar um resumo (zona por zona: ocorrências, tempos médios, equipe envolvida, colaboradores) em um formato que possa ser impresso ou salvo como imagem/PDF para apoiar o ato oficial de reconhecimento. Como a página roda dentro de um ambiente que não permite diálogo de impressão do navegador quando hospedada como artifact, mas isso aqui já é um site GitHub Pages normal, `window.print()` funciona normalmente; pode usar uma folha de estilo `@media print` dedicada.
5. **Modo replay do evento**: acelerar o tempo para assistir como as ocorrências surgiram e foram resolvidas ao longo do evento todo, útil para apresentações e para pós-mortem. Requer guardar um log de eventos (criação, confirmação, resolução) com timestamp e reproduzir em escala de tempo acelerada.
6. **Alerta quando ocorrência nova surge perto de um responsável**: quando uma nova ocorrência é gerada dentro de um raio pequeno da posição atual de um responsável/coordenador que está em campo, disparar um destaque visual ou som (respeitando que autoplay de som só funciona depois de interação do usuário na página).
7. **Ranking de colaboradores**: pontuação por tempo de resposta, quantidade de ajudas prestadas, para alimentar o reconhecimento público ("ato oficial da prefeitura"). Fonte de dados: quantas vezes um voluntário apareceu em `voluntariosProx` de ocorrências resolvidas, e com que rapidez.

## 5bis. O que falta pensando como gestão de desastres, não só como tela

Os itens 4.1 a 4.7 e o backlog da seção 5 resolvem fluxo de ocorrência e coordenação de equipe. Mas um sistema de resposta a desastres de verdade precisa de mais camadas, que ainda não existem nem no protótipo nem no backlog anterior. Listando por ordem de impacto, não de facilidade:

1. **Triagem e priorização automática**: hoje todas as ocorrências ativas aparecem com o mesmo peso na lista; quem decide o que atender primeiro é o olho humano olhando o mapa. Um sistema de verdade precisa de uma fila ordenada por gravidade + tempo de espera + proximidade de equipe disponível, não só o mapa visual. Sem isso, a "gravidade" da seção 4.2 é só decorativa.
2. **Controle de acesso por papel**: qualquer pessoa que abra o link hoje consegue abrir a Administração e editar qualquer coisa, inclusive dados de outros funcionários. Antes de qualquer uso real (mesmo um teste piloto com a prefeitura), isso precisa de login e permissão (responsável só edita a própria zona; só um admin geral vê tudo).
3. **Modo offline / baixa conectividade**: depois de um ciclone, é comum faltar internet móvel justamente nas áreas mais afetadas. O sistema real precisa degradar graciosamente (SMS como alternativa ao WhatsApp, fila de mensagens que envia quando a rede voltar) em vez de assumir que todo mundo está sempre online.
4. **Alerta de SLA / escalonamento**: se uma ocorrência de gravidade alta fica "aguardando equipe" por mais de X minutos sem ninguém confirmar presença, alguém acima (coordenador regional, secretário) precisa ser avisado automaticamente. Hoje nada escala sozinho; alguém precisa notar olhando o painel.
5. **Log de auditoria imutável**: para o "ato de reconhecimento oficial" e para qualquer prestação de contas pública depois do evento, cada mudança de status, cada relatório enviado e cada mensagem trocada deveria ficar num registro que não pode ser editado depois (hoje, editar o `nome` de um responsável na Administração reescreve o histórico sem deixar rastro de quem mudou o quê e quando).
6. **Privacidade dos dados de moradores**: fotos de "situação atual/final" de uma propriedade privada, e a localização de quem pediu ajuda, são dados sensíveis. Antes de ir a produção, isso precisa de uma política clara de quem pode ver o quê e por quanto tempo essas fotos ficam guardadas.
7. **Página pública de status**: os moradores que reportaram uma ocorrência não têm hoje como saber se alguém já viu o pedido deles, só esperam. Uma página pública simples (sem exigir login, talvez acessada por um link enviado no próprio WhatsApp) mostrando "sua ocorrência foi recebida, equipe a caminho, tempo estimado X" reduz ligação duplicada e ansiedade.
8. **Ponte com os serviços oficiais de emergência (193 Corpo de Bombeiros, 199 Defesa Civil estadual, 192 SAMU)**: casos de risco à vida reportados no sistema (por exemplo "família ilhada") precisam de um caminho claro para acionar esses serviços, não só a equipe da prefeitura; hoje o sistema não distingue "a prefeitura resolve isso" de "isso é uma emergência que precisa de socorro agora".
9. **Previsão e pré-posicionamento**: hoje as equipes só reagem depois que a ocorrência é reportada. Cruzar o sistema com previsão meteorológica (INMET/Simepar) permitiria pré-posicionar equipamento nas zonas de maior risco antes do evento piorar.
10. **Relatório pós-evento consolidado**: depois que o evento acaba, a prefeitura precisa de um documento único (não só a lista de ocorrências) com o que funcionou, o que não funcionou, tempo médio de resposta por zona, e isso é insumo tanto para prestação de contas quanto para o próximo evento. É diferente do "exportar relatório do evento" do item 4 do backlog, que é mais operacional; este é analítico/estratégico.

Nenhum destes foi implementado. Listar aqui é uma recomendação de arquitetura, não uma tarefa fechada; antes de qualquer um deles entrar em desenvolvimento, vale decidir com a Alden quais fazem sentido para a fase atual (protótipo de demonstração) versus quais só importam se isso for usado de verdade por uma prefeitura.

## 6. Como publicar (processo já em uso, manter)

```
cd ~/maringa-alerta
git add -A
git commit -m "mensagem clara do que mudou"
git push
```

O GitHub Pages já está ativo no repositório, branch `main`, raiz `/`. Qualquer push em `main` atualiza https://aldenquesada.github.io/maringa-alerta/ automaticamente em 1 a 2 minutos. Não é necessário repetir a configuração de Pages; ela já foi feita via `gh api repos/AldenQuesada/maringa-alerta/pages`.

Antes de cada push, verificar a sintaxe do JavaScript inline (por exemplo, extraindo o bloco `<script>...</script>` e rodando `node --check` nele, como já foi feito nesta sessão) para não publicar uma página quebrada.

## 7. O que não fazer

- Não trocar o provedor de tiles do mapa por um que exija chave de API sem confirmar antes que a chave está disponível e configurada; isso já quebrou o mapa uma vez (CartoDB `dark_all`).
- Não fragmentar o projeto em build tools (webpack, bundlers, frameworks de frontend) sem necessidade comprovada; o ponto forte do protótipo atual é não precisar de nada além de um navegador e um `git push`.
- Não inventar dados de funcionários públicos reais. Todos os nomes de responsáveis/substitutos/coordenadores no protótipo são fictícios, criados para fins de demonstração; isso deve continuar assim até que a prefeitura forneça uma lista real de servidores para substituir.
- Não remover a separação entre a geração de dados simulados (toda a lógica de `gerarOcorrencia`, `gerarVoluntarios`, pings de WhatsApp) e a lógica de UI; quando a integração real com WhatsApp/backend acontecer, essa separação vai facilitar trocar "dados simulados" por "dados reais vindos de uma API" sem reescrever a interface inteira.
