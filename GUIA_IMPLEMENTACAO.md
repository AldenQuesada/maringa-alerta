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

## 4. Funcionalidades aprovadas para implementar agora

### 4.1 Confirmação de presença na área + contador de tempo até resolução

Hoje, uma ocorrência tem `reportadoEm` (quando foi reportada) e, ao resolver, calcula `tempoReal` como minutos desde `reportadoEm`. Isso mistura dois tempos diferentes: tempo até a equipe chegar, e tempo até resolver depois de chegar. Precisamos separar os dois.

Adicionar ao objeto de ocorrência:
- `confirmadoEm`: timestamp (ou `null` se ainda não confirmado). Marca o momento em que o responsável (ou substituto/coordenador) confirma presença física no local.
- Um novo status intermediário: `"ativa"` (aguardando confirmação de presença) → `"em_atendimento"` (presença confirmada, equipe no local) → `"resolvida"`.

Mudanças de UI no painel de ocorrência (`openOcorrencia`):
- Enquanto `status === "ativa"`: mostrar botão "Confirmar presença na área" além do botão de resolver (ou no lugar dele até a presença ser confirmada; decisão de fluxo: resolver só deve ficar disponível depois da presença confirmada, para refletir a realidade operacional).
- Ao clicar em "Confirmar presença": setar `confirmadoEm = Date.now()`, mudar `status` para `"em_atendimento"`, atualizar o badge (nova cor, por exemplo amarelo/laranja para "EM ATENDIMENTO"), e a partir daí mostrar dois contadores separados e ao vivo (atualizando a cada poucos segundos, não só ao abrir o painel):
  - "Tempo até a equipe chegar": `confirmadoEm - reportadoEm`, fixo depois de confirmado.
  - "Tempo em atendimento": `agora - confirmadoEm`, correndo em tempo real enquanto `status === "em_atendimento"`.
- Ao clicar em "Marcar como resolvida" (só disponível depois da presença confirmada): setar `resolvidoEm = Date.now()`, `status = "resolvida"`, e guardar os dois tempos finais: `tempoChegada = confirmadoEm - reportadoEm` (em minutos) e `tempoAtendimento = resolvidoEm - confirmadoEm` (em minutos). O `tempoReal` que já existe pode ser a soma dos dois, ou ser substituído por esses dois campos; ajustar os lugares que leem `tempoReal` (cálculo do tempo médio nos KPIs, texto final do card).
- No marcador do mapa (`ocIcon()`), diferenciar visualmente ocorrência "ativa" (vermelho pulsante, como já é) de "em atendimento" (sugiro laranja/âmbar pulsante, pulso mais lento, para comunicar "equipe já está lá, aguardando resolução").
- No tooltip de hover da ocorrência, incluir a nova informação de status e, se já confirmada, há quanto tempo a equipe está no local.

Critério de aceite: abrir uma ocorrência ativa, confirmar presença, ver o relógio de atendimento correndo, esperar alguns segundos, resolver, e ver no histórico os dois tempos (chegada e atendimento) salvos corretamente, sem quebrar o cálculo de tempo médio dos KPIs por zona.

### 4.2 Mapa de gravidade de ocorrências (quantidade e gravidade)

Hoje todas as ocorrências têm o mesmo peso visual. Precisamos de uma camada de gravidade, combinando dois fatores: quantidade de ocorrências por área e gravidade de cada uma.

Passo 1, classificar gravidade por tipo de ocorrência. Adicionar um campo `gravidade` (1 a 3, ou "baixa"/"média"/"alta") a cada tipo em `tiposOcorrencia`. Sugestão de classificação, mas revisar com a Alden antes de fechar: "Família ilhada" e "Rede elétrica exposta" são altas; "Telhado destruído", "Deslizamento de barranco" e "Poste de energia caído" são médias; "Árvore caída sobre via" e "Alagamento residencial" variam (podem ser médias ou altas dependendo do caso, então considerar sortear a gravidade dentro de uma faixa para esses tipos, em vez de fixar).

Passo 2, adicionar uma camada de heatmap. Usar a biblioteca `Leaflet.heat` (pacote `leaflet.heat`, disponível no cdnjs, versão fixa, carregada como script adicional depois do Leaflet principal). Cada ocorrência ativa entra no heatmap com uma intensidade proporcional à gravidade (por exemplo: baixa = 0.4, média = 0.7, alta = 1.0). O heatmap deve recalcular sempre que uma ocorrência é criada ou resolvida (ocorrência resolvida sai do heatmap, assim como já sai do mapa de pontos).

Passo 3, adicionar um toggle na UI (um botão ou chip, por exemplo no canto da legenda ou ao lado dos filtros) para ligar/desligar a camada de calor, para não competir visualmente com os pontos individuais por padrão. Sugestão: começar com o heatmap desligado por padrão, e os pontos vermelhos/âmbar continuam sendo a visão principal; o heatmap é uma lente adicional para visão geral de "onde está mais grave agora".

Passo 4, no card de cada zona na sidebar e no resumo de zona no painel lateral, mostrar um indicador agregado de gravidade da zona (por exemplo: soma ponderada das gravidades das ocorrências ativas daquela zona, exibida como rótulo "Gravidade: baixa/média/alta" com uma cor correspondente, não apenas a contagem numérica que já existe).

Critério de aceite: gerar várias ocorrências de tipos diferentes, ligar o heatmap e ver áreas com ocorrências de alta gravidade mais "quentes" visualmente que áreas com só ocorrências de baixa gravidade, mesmo que a segunda tenha mais pontos. Resolver uma ocorrência deve fazer o heatmap atualizar na hora.

### 4.3 Classificação de responsabilidade: pública, privada, mista

Cada ocorrência (ou cada zona, decidir qual nível faz mais sentido operacionalmente, provavelmente ocorrência é o nível certo porque a responsabilidade pode variar mesmo dentro da mesma zona) precisa de um campo `responsabilidade` com um destes três valores:
- `"publica"`: a solução é 100% responsabilidade da prefeitura (por exemplo, poste de energia caído em via pública, árvore caída em rua).
- `"privada"`: a solução é responsabilidade do proprietário/morador (por exemplo, telhado destruído de uma casa particular, sem risco à via pública).
- `"mista"`: envolve tanto a prefeitura quanto o particular (por exemplo, árvore de propriedade privada que caiu sobre a rua, exigindo remoção da prefeitura mas reparo do terreno pelo proprietário).

Implementação:
- Adicionar `responsabilidade` ao objeto de cada tipo em `tiposOcorrencia`, com um valor padrão sugerido por tipo (mas isso pode variar caso a caso, então ao gerar uma ocorrência, sortear com uma distribuição plausível em vez de fixar sempre o mesmo valor por tipo; por exemplo, "Árvore caída sobre via" é majoritariamente pública mas pode ser mista).
- Mostrar a classificação no painel de detalhe da ocorrência, como um badge adicional ao lado do badge de status (ativa/em atendimento/resolvida), com cores distintas (sugestão: azul para pública, roxo para privada, um gradiente ou padrão listado azul/roxo para mista; escolher cores que não colidam com as já usadas para status e gravidade).
- Adicionar um filtro por responsabilidade na sidebar ou na barra de filtros (pode ser um conjunto de chips como "Pública", "Privada", "Mista", combináveis com a seleção de zona), para a prefeitura conseguir ver rapidamente "o que é problema nosso agora" versus "o que é problema do morador mas estamos ajudando".
- Nos KPIs (tanto gerais quanto por zona), adicionar uma contagem por responsabilidade (quantas ativas são públicas, privadas, mistas), já que isso afeta diretamente o planejamento de recursos da prefeitura.

Critério de aceite: cada ocorrência nova nasce com uma classificação de responsabilidade visível no painel e no tooltip; filtrar por "pública" esconde ocorrências privadas e mistas do mapa e da lista; os KPIs por zona mostram a quebra por responsabilidade.

## 5. Backlog aprovado (ordem sugerida, mas a Alden decide prioridade final)

Estas foram propostas e aprovadas em conversa anterior. Implementar depois dos itens da seção 4, ou intercalado se fizer sentido técnico.

1. **Timeline da ocorrência**: histórico visual de etapas (reportada → equipe avisada → presença confirmada → resolvida) com o horário de cada uma, dentro do painel de detalhe. Com os campos `reportadoEm`, `confirmadoEm`, `resolvidoEm` já propostos na seção 4.1, isso é principalmente um componente de UI que lê esses três timestamps e desenha uma linha do tempo vertical ou horizontal.
2. **Log/chat simulado do WhatsApp**: dentro do painel de ocorrência, mostrar uma sequência de mensagens simuladas (morador reportando, prefeitura respondendo, equipe confirmando chegada) como se fosse uma conversa real de WhatsApp, usando bolhas de mensagem. É puramente decorativo/narrativo no protótipo (sem integração real), mas ajuda a vender a visão do produto.
3. **Heatmap de densidade por horário**: evolução de "onde as ocorrências se concentraram" ao longo do tempo do evento, não só o instante atual. Pode reaproveitar a camada de heatmap da seção 4.2, adicionando um controle de tempo (slider) que filtra ocorrências por janela de horário.
4. **Exportar relatório do evento**: gerar um resumo (zona por zona: ocorrências, tempos médios, equipe envolvida, colaboradores) em um formato que possa ser impresso ou salvo como imagem/PDF para apoiar o ato oficial de reconhecimento. Como a página roda dentro de um ambiente que não permite diálogo de impressão do navegador quando hospedada como artifact, mas isso aqui já é um site GitHub Pages normal, `window.print()` funciona normalmente; pode usar uma folha de estilo `@media print` dedicada.
5. **Modo replay do evento**: acelerar o tempo para assistir como as ocorrências surgiram e foram resolvidas ao longo do evento todo, útil para apresentações e para pós-mortem. Requer guardar um log de eventos (criação, confirmação, resolução) com timestamp e reproduzir em escala de tempo acelerada.
6. **Alerta quando ocorrência nova surge perto de um responsável**: quando uma nova ocorrência é gerada dentro de um raio pequeno da posição atual de um responsável/coordenador que está em campo, disparar um destaque visual ou som (respeitando que autoplay de som só funciona depois de interação do usuário na página).
7. **Ranking de colaboradores**: pontuação por tempo de resposta, quantidade de ajudas prestadas, para alimentar o reconhecimento público ("ato oficial da prefeitura"). Fonte de dados: quantas vezes um voluntário apareceu em `voluntariosProx` de ocorrências resolvidas, e com que rapidez.

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
