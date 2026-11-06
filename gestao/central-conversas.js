/* Central de Conversas · leitura da coleção municipal canônica "voluntarios".
 * Reconstrói o roteiro do formulário Pra Somar; NÃO representa histórico WhatsApp real.
 * Sem coleção, seed, sincronizador ou persistência paralela.
 */
(function (root, factory) {
  "use strict";
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.AlertaCentralConversas = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SEM_ZONA = "Sem zona atribuída";
  const esc = value => String(value == null ? "" : value).replace(/[&<>"']/g, ch =>
    ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const norm = value => String(value == null ? "" : value).normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR").trim();
  const arr = value => Array.isArray(value) ? value.filter(Boolean).map(String) :
    typeof value === "string" ? value.split(";").map(v => v.trim()).filter(Boolean) : [];
  const nomePessoa = p => String(p.nome || "Colaborador sem nome").trim();
  const pessoaTipo = value => String(value || "").toUpperCase() === "JURÍDICA" ? "Pessoa jurídica" :
    String(value || "").toUpperCase() === "FÍSICA" ? "Pessoa física" : String(value || "");
  function zonaDaPessoa(p, bairros) {
    if (String(p.zona || "").trim()) return String(p.zona).trim();
    const b = norm(p.bairro);
    if (!b) return SEM_ZONA;
    const correspondencias = (bairros || []).filter(x => norm(x.nome) === b && String(x.zona || "").trim());
    const zonas = [...new Set(correspondencias.map(x => x.zona))];
    return zonas.length === 1 ? zonas[0] : SEM_ZONA;
  }
  function filtrarPessoas(pessoas, bairros, selecionadas, busca) {
    const escolhidas = selecionadas instanceof Set ? selecionadas : new Set(selecionadas || []);
    const q = norm(busca);
    return pessoas.filter(p => {
      const z = zonaDaPessoa(p, bairros);
      if (escolhidas.size && !escolhidas.has(z) && !escolhidas.has("bairro:"+norm(p.bairro))) return false;
      if (!q) return true;
      return norm([p.nome,p.telefone,p.endereco,p.bairro,z,p.tipo_pessoa,p.contribuicao,
        ...arr(p.ajudas),...arr(p.maquinas),...arr(p.empreendedores),...arr(p.materiais)]
        .filter(Boolean).join(" ")).includes(q);
    });
  }
  const perguntaEndereco = "Informe seu endereço seguindo este formato:\nRua ou avenida, número, complemento (se houver), bairro, cidade/UF e CEP (se souber).\n\nExemplo: Av. XV de Novembro, 701, Centro, Maringá/PR, 87013-230.\n\nSe não houver número, escreva s/n. 👇";
  const intro = "Olá! Bem-vindo ao Maringá Alerta.\n\nUm sistema desenvolvido pela Prefeitura de Maringá para que todos possam somar esforços na recuperação da nossa cidade em caso de eventos climáticos e desastres naturais.\n\nEscolha uma opção para continuar:";
  const nomeIntro = "Programa de Apoio Social e Mobilização Voluntária de Maringá\n\n“Onde a boa vontade se transforma em ação”\n\nUnindo:\nEmpresas 🤝 Voluntários 🤝 Entidades\n\nPara começar, digite seu nome e sobrenome 👇";
  const BENS = new Set(["FORNECER ALIMENTAÇÃO","MATERIAL DE CONSTRUÇÃO","COMBUSTÍVEL"]);
  function fluxoCadastro(p) {
    const passos = [];
    const demonstrativo=p.status_simulacao==="simulado";
    const bot = texto => passos.push({tipo:"bot",texto});
    const respond = (key, formatter) => {
      const value = p[key];
      if (value === undefined || value === null || value === "" ||
          (Array.isArray(value) && !value.length)) {
        passos.push(demonstrativo?{tipo:"pessoa",texto:Array.isArray(value)?"0 (nenhuma dessas opções)":"Não informado (demonstração)"}:{tipo:"ausente",texto:"Resposta não consta no cadastro."});
        return;
      }
      const valor = typeof formatter === "function" ? formatter(value) :
        Array.isArray(value) ? value.join(", ") : String(value);
      passos.push({tipo:"pessoa",texto:String(valor)});
    };
    const multi = (key, pergunta) => {bot(pergunta);respond(key);};
    bot(intro);
    passos.push({tipo:"selecao",texto:"Ser colaborador"});
    bot(nomeIntro);
    respond("nome");
    bot("Muito obrigado, " + (p.nome || "colaborador") +
      "! Como você gostaria de se cadastrar?\n\n◾ Pessoa física\n◾ Pessoa jurídica\n\nToque em uma das opções abaixo. 👇");
    respond("tipo_pessoa",pessoaTipo);
    bot(perguntaEndereco);
    respond("endereco");
    bot("Qual é seu telefone com DDD?");
    respond("telefone");
    multi("ajudas","Que tipo de ajuda pode oferecer para pessoas atingidas?");
    multi("maquinas","MAQUINÁRIO, equipamentos e materiais disponíveis");
    multi("empreendedores","Que tipo de apoio pode oferecer para empreendedores?");
    const temOutro = ["ajudas","maquinas","empreendedores"].some(k => arr(p[k]).includes("OUTRO"));
    if (temOutro || String(p.outros || "").trim()) {
      bot("Especifique qual outra ajuda, equipamento ou apoio você pode oferecer.");
      respond("outros");
    }
    multi("materiais","MATERIAL CONSTRUÇÃO / COMBUSTÍVEL");
    const ofereceBens = ["ajudas","maquinas","materiais"].some(k => arr(p[k]).some(v => BENS.has(v)));
    if (ofereceBens || p.forma_entrega_doacao) {
      bot("Como você disponibiliza sua doação?");
      respond("forma_entrega_doacao");
    }
    const ofertas = [...new Set(["ajudas","maquinas","empreendedores","materiais"]
      .flatMap(k => arr(p[k])))];
    bot((demonstrativo?"Cadastro demonstrativo criado para testar o fluxo.":"Cadastro de colaborador localizado na Gestão Municipal.")+" ✅\n\nOfertas registradas: " +
      ofertas.length + ".\n\nAs mensagens acima foram reconstruídas a partir dos campos salvos; não são conversas WhatsApp enviadas ou recebidas.");
    return passos;
  }
  function linha(rotulo,valor) {
    return '<div class="cv-detail"><dt>' + esc(rotulo) + '</dt><dd>' +
      esc(String(valor == null || valor === "" ? "Não informado" : valor)) + '</dd></div>';
  }
  function grupoOfertas(titulo, lista) {
    const itens = arr(lista);
    return '<section class="cv-offers"><h4>' + esc(titulo) + '</h4>' +
      (itens.length ? '<div class="cv-offers-list">' +
        itens.map(v => '<span class="cv-offer">' + esc(v) + '</span>').join("") + '</div>' :
        '<p>Não informado</p>') + '</section>';
  }
  // Ausência de seleção é um estado válido: o usuário pode voltar ao painel de regiões.
  function manterSelecao(id, pessoas) {
    return id != null && pessoas.some(p => p.id === id) ? id : null;
  }
  let rendererAtivo = null;
  let ouvindoStorage = false;
  function montar({target, db, onEdit, onNew} = {}) {
    if (!target || !db || typeof db.lista !== "function")
      throw new Error("Central de Conversas requer a Gestão Municipal canônica.");
    let ativa = null;
    let busca = "";
    const selecionadas = new Set();
    target.innerHTML =
      '<section class="cv-root" aria-label="Central de Conversas">' +
        '<header class="cv-top"><div><div class="cv-eyebrow">GESTÃO MUNICIPAL · PRA SOMAR</div>' +
        '<h1>Central de Conversas</h1><p>Colaboradores da prefeitura e percurso de cadastro em uma única tela.</p></div>' +
        '<div class="cv-top-actions"><span id="cv-total" class="cv-total"></span>' +
        '<button class="cv-tool" type="button" data-cv-refresh>Atualizar</button>' +
        '<button class="cv-new" type="button" data-cv-new aria-label="Cadastrar novo colaborador">+ Novo colaborador</button></div></header>' +
        '<div class="cv-shell">' +
          '<aside class="cv-inbox" aria-label="Conversas dos colaboradores">' +
            '<div class="cv-panel-head"><div><strong>Conversas</strong><small id="cv-visible-count">0 colaboradores</small></div></div>' +
            '<div class="cv-search-wrap"><label for="cv-search">Buscar colaborador</label>' +
            '<input id="cv-search" type="search" placeholder="Nome, telefone, bairro ou oferta" autocomplete="off"></div>' +
            '<div id="cv-conversation-list" class="cv-inbox-list" aria-label="Lista de conversas"></div>' +
          '</aside>' +
          '<section class="cv-chat" aria-label="Fluxo de cadastro do colaborador">' +
            '<div id="cv-chat-head" class="cv-chat-head"></div>' +
            '<div id="cv-transcript" class="cv-transcript" aria-live="polite"></div>' +
            '<div class="cv-chat-foot">Visualização do cadastro · sem envio ou recebimento de mensagens</div>' +
          '</section>' +
          '<aside class="cv-inspector" tabindex="-1" aria-label="Zonas e dados do colaborador">' +
            '<div class="cv-panel-head"><div><strong>Filtrar por zona</strong>' +
            '<small>Marque uma ou mais zonas</small></div>' +
            '<button type="button" id="cv-clear" class="cv-clear" data-cv-clear>Limpar</button></div>' +
            '<div id="cv-zones" class="cv-zones"></div>' +
            '<div class="cv-inspector-divider"></div>' +
            '<div id="cv-profile" class="cv-profile"></div>' +
          '</aside>' +
        '</div>' +
        '<p class="cv-disclaimer">Os ajudantes demonstrativos usam a mesma coleção municipal, identificados como DEMONSTRAÇÃO, sem possibilidade de mobilização real. Os chats são simulações, não mensagens do WhatsApp.</p>' +
      '</section>';
    const raiz = target.querySelector(".cv-root");
    const buscarEl = raiz.querySelector("#cv-search");
    const get = id => raiz.querySelector("#" + id);
    function consulta() {
      const pessoas = db.lista("voluntarios").filter(p => p && p.id);
      const bairros = db.lista("bairros");
      return {pessoas,bairros,zonas:db.lista("zonas")};
    }
    function construirZonas(pessoas, bairros, zonas) {
      const nomes = new Set(zonas.map(z => String(z.nome || "").trim()).filter(Boolean));
      pessoas.forEach(p => nomes.add(zonaDaPessoa(p,bairros)));
      const lista = [...nomes].sort((a,b) => {
        if (a === SEM_ZONA) return 1;
        if (b === SEM_ZONA) return -1;
        return a.localeCompare(b,"pt-BR",{numeric:true});
      });
      const bairrosSemZona=[...new Set(pessoas.filter(p=>zonaDaPessoa(p,bairros)===SEM_ZONA&&p.bairro).map(p=>String(p.bairro).trim()))].sort((a,b)=>a.localeCompare(b,"pt-BR",{numeric:true}));
      const contagens = new Map(lista.map(z => [z,0]));
      pessoas.forEach(p => {
        const z = zonaDaPessoa(p,bairros);
        contagens.set(z,(contagens.get(z)||0)+1);
      });
      for (const valor of [...selecionadas]) {
        if (!contagens.has(valor) && !(valor.startsWith("bairro:") && pessoas.some(p=>zonaDaPessoa(p,bairros)===SEM_ZONA&&"bairro:"+norm(p.bairro)===valor))) selecionadas.delete(valor);
      }
      get("cv-zones").innerHTML = '<div class="cv-zone-all">' +
        (selecionadas.size ? esc(selecionadas.size + " zona(s) selecionada(s)") : "Todas as zonas") +
        ' · ' + pessoas.length + ' colaborador(es)</div>' +
        (lista.length ? lista.map(z => '<label class="cv-zone">' +
          '<input type="checkbox" data-cv-zone="' + esc(z) + '"' + (selecionadas.has(z)?" checked":"") + '>' +
          '<span class="cv-zone-name">' + esc(z) + '</span><span class="cv-zone-count">' + (contagens.get(z)||0) + '</span>' +
          '</label>').join("") : '<p class="cv-empty-small">Nenhuma zona cadastrada.</p>') +
        (bairrosSemZona.length?'<div class="cv-zone-all">Bairros ainda sem zona numerada</div>' + bairrosSemZona.map(b=>{
           const key="bairro:"+norm(b);
           const n=pessoas.filter(p=>zonaDaPessoa(p,bairros)===SEM_ZONA&&norm(p.bairro)===norm(b)).length;
           return '<label class="cv-zone"><input type="checkbox" data-cv-zone="' + esc(key) + '"' + (selecionadas.has(key)?" checked":"") + '><span class="cv-zone-name">' + esc(b) + '</span><span class="cv-zone-count">' + n + '</span></label>';
        }).join(""):"");
      get("cv-clear").disabled = selecionadas.size === 0;
    }
    function renderLista(pessoas,bairros) {
      get("cv-visible-count").textContent = pessoas.length + (pessoas.length===1?" colaborador":" colaboradores");
      get("cv-conversation-list").innerHTML = pessoas.length ? pessoas.map(p => {
        const z = zonaDaPessoa(p,bairros);
        const iniciais = nomePessoa(p).split(/\s+/).slice(0,2).map(v=>v[0]||"").join("").toLocaleUpperCase("pt-BR");
        const ofertas = ["ajudas","maquinas","empreendedores","materiais"].flatMap(k=>arr(p[k]));
        const subtitulo = ofertas.length ? ofertas.slice(0,2).join(" · ") : "Oferta não detalhada";
        const simulado=p.status_simulacao==="simulado";
        return '<button type="button" class="cv-person' + (ativa===p.id?" is-active":"") +
          '" data-cv-open="' + esc(p.id) + '" aria-pressed="' + (ativa===p.id?"true":"false") + '">' +
          '<span class="cv-avatar" aria-hidden="true">' + esc(iniciais) + '</span><span class="cv-person-main">' +
          '<strong>' + esc(nomePessoa(p)) + '</strong><small>' + esc(z) + " · " + esc(pessoaTipo(p.tipo_pessoa)||"Colaborador") +
          '</small><span>' + esc(simulado?'DEMONSTRAÇÃO · '+subtitulo:subtitulo) + '</span></span></button>';
      }).join("") : '<div class="cv-list-empty"><strong>Nenhum colaborador encontrado.</strong>' +
        '<p>Cadastre pessoas no módulo Colaboradores ou ajuste os filtros.</p></div>';
    }
    function renderChat(p) {
      if (!p) {
        get("cv-chat-head").innerHTML = '<div class="cv-chat-person"><strong>Nenhuma conversa selecionada</strong><span>Escolha uma região ou abra um colaborador</span></div>';
        get("cv-transcript").innerHTML = '<div class="cv-no-chat"><div aria-hidden="true">◉</div><strong>Nenhuma conversa selecionada</strong><p>Selecione um cadastro à esquerda para visualizar o percurso de atendimento.</p></div>';
        return;
      }
      const z = zonaDaPessoa(p,db.lista("bairros"));
      get("cv-chat-head").innerHTML =
        '<button type="button" class="cv-back" data-cv-back aria-label="Desmarcar conversa e voltar às regiões">Voltar às regiões</button>' +
        '<div class="cv-avatar cv-avatar-chat" aria-hidden="true">' +
        esc(nomePessoa(p).slice(0,1).toLocaleUpperCase("pt-BR")) + '</div><div class="cv-chat-person"><strong>' +
        esc(nomePessoa(p)) + '</strong><span>' + esc(z) + ' · Cadastro de colaborador</span></div>' +
        '<span class="cv-simulated">' + (p.status_simulacao==="simulado"?"Demonstração":"Fluxo reconstruído") + '</span>';
      const passos = fluxoCadastro(p);
      get("cv-transcript").innerHTML =
        '<div class="cv-flow-note">' + (p.status_simulacao==="simulado"?"SIMULAÇÃO: percurso montado a partir do ajudante demonstrativo do mapa; não houve conversa real.":"Histórico ilustrativo baseado nas respostas do cadastro. Campos não informados são identificados.") + '</div>' +
        '<div class="cv-message-stream">' + passos.map(m =>
          '<div class="cv-message cv-' + m.tipo + '"><div class="cv-message-label">' +
          (m.tipo==="bot"?"Prefeitura · Pra Somar":m.tipo==="pessoa"?"Dados do colaborador":m.tipo==="selecao"?"Opção do cadastro":"Campo sem registro") +
          '</div><div class="cv-message-body">' + esc(m.texto).replace(/\n/g,"<br>") + '</div></div>'
        ).join("") + '</div>';
      const el = get("cv-transcript");
      el.scrollTop = 0;
    }
    function renderPerfil(p,bairros) {
      if (!p) {
        get("cv-profile").innerHTML = '<div class="cv-profile-empty">Abra um cadastro para consultar os dados completos da pessoa.</div>';
        return;
      }
      const z = zonaDaPessoa(p,bairros);
      const status = p.checkin_status === "presente" ? "No local" :
        p.checkin_status === "finalizado" ? "Saída registrada" : "Sem check-in ativo";
      get("cv-profile").innerHTML =
        '<div class="cv-profile-head"><span>' + (p.status_simulacao==="simulado"?"CADASTRO DEMONSTRATIVO":"CADASTRO CANÔNICO") + '</span><h3>' + esc(nomePessoa(p)) +
        '</h3><p>' + esc(pessoaTipo(p.tipo_pessoa)||"Tipo não informado") + '</p></div>' +
        '<dl class="cv-profile-grid">' +
        linha("Telefone / WhatsApp",p.telefone) +
        linha("Endereço",p.endereco) +
        linha("Bairro",p.bairro) +
        linha("Zona",z===SEM_ZONA ? "Não atribuída" : z) +
        linha("Disponibilidade",p.disponibilidade) +
        linha("Presença",status) +
        (p.email ? linha("E-mail registrado",p.email) : "") +
        (p.forma_entrega_doacao ? linha("Doações",p.forma_entrega_doacao) : "") +
        (p.outros ? linha("Outra colaboração",p.outros) : "") +
        (p.contribuicao ? linha("Observações",p.contribuicao) : "") +
        '</dl>' +
        grupoOfertas("Ajuda a pessoas atingidas",p.ajudas) +
        grupoOfertas("Maquinário e equipamentos",p.maquinas) +
        grupoOfertas("Apoio a empreendedores",p.empreendedores) +
        grupoOfertas("Materiais",p.materiais) +
        '<button type="button" class="cv-edit" data-cv-edit="' + esc(p.id) + '">Editar cadastro original</button>';
    }
    function renderDados() {
      const {pessoas,bairros,zonas} = consulta();
      construirZonas(pessoas,bairros,zonas);
      const filtradas = filtrarPessoas(pessoas,bairros,selecionadas,busca);
      ativa = manterSelecao(ativa, filtradas);
      raiz.classList.toggle("is-conversation-open", ativa !== null);
      const exemplos=pessoas.filter(p=>p.status_simulacao==="simulado").length;
      get("cv-total").textContent = pessoas.length + (pessoas.length===1?" cadastro":" cadastros") + (exemplos?" · "+exemplos+" demonstrações":"");
      renderLista(filtradas,bairros);
      const pessoa = filtradas.find(p => p.id===ativa) || null;
      renderChat(pessoa);
      renderPerfil(pessoa,bairros);
    }
    raiz.addEventListener("click",ev => {
      const botao = ev.target.closest("button");
      if (!botao || !raiz.contains(botao)) return;
      if (botao.hasAttribute("data-cv-open")) {
        ativa = botao.dataset.cvOpen;
        renderDados();
        if (typeof window !== "undefined" && window.matchMedia("(max-width:850px)").matches)
          raiz.querySelector(".cv-chat")?.scrollIntoView({block:"start"});
      } else if (botao.hasAttribute("data-cv-back")) {
        // Volta à visão geral sem perder as zonas selecionadas ou a busca.
        ativa = null;
        renderDados();
        const painelRegioes = raiz.querySelector(".cv-inspector");
        if (painelRegioes) {
          painelRegioes.scrollTop = 0;
          get("cv-zones").scrollTop = 0;
          painelRegioes.focus({preventScroll:true});
          if (typeof window !== "undefined" && window.matchMedia("(max-width:850px)").matches)
            painelRegioes.scrollIntoView({block:"start"});
        }
      } else if (botao.hasAttribute("data-cv-clear")) {
        selecionadas.clear();
        renderDados();
      } else if (botao.hasAttribute("data-cv-refresh")) {
        renderDados();
      } else if (botao.hasAttribute("data-cv-edit")) {
        if (typeof onEdit === "function") onEdit(botao.dataset.cvEdit);
      } else if (botao.hasAttribute("data-cv-new")) {
        if (typeof onNew === "function") onNew();
      }
    });
    raiz.addEventListener("change",ev => {
      if (!ev.target.matches("[data-cv-zone]")) return;
      const z = ev.target.dataset.cvZone;
      if (ev.target.checked) selecionadas.add(z); else selecionadas.delete(z);
      renderDados();
    });
    buscarEl.addEventListener("input",ev => {busca=ev.target.value;renderDados();});
    rendererAtivo = () => {if(raiz.isConnected)renderDados();};
    if (!ouvindoStorage && typeof window !== "undefined") {
      window.addEventListener("storage",ev => {
        if (ev.key === window.AlertaGestaoDados?.CHAVE) rendererAtivo?.();
      });
      ouvindoStorage=true;
    }
    renderDados();
  }
  return {montar,fluxoCadastro,zonaDaPessoa,filtrarPessoas,manterSelecao,SEM_ZONA};
});
