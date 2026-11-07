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



  const BENS = new Set(["FORNECER ALIMENTAÇÃO","MATERIAL DE CONSTRUÇÃO","COMBUSTÍVEL"]);

  function linha(rotulo,valor) {
    return '<div class="cv-detail"><dt>' + esc(rotulo) + '</dt><dd>' +
      esc(String(valor == null || valor === "" ? "Não informado" : valor)) + '</dd></div>';
  }

  // Ausência de seleção é um estado válido: o usuário pode voltar ao painel de regiões.

  const state={rendererAtivo:null,ouvindoStorage:false};


  function montar({target, db, onEdit, onNew} = {}) {
    if (!target || !db || typeof db.lista !== "function")
      throw new Error("Central de Conversas requer a Gestão Municipal canônica.");
    const view={ativa:null,busca:""};


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
            '<div class="cv-panel-head cv-inbox-head"><div class="cv-heading-copy"><strong>Conversas</strong><small id="cv-visible-count">0 colaboradores</small></div>' +
              '<button class="cv-all" type="button" data-cv-all aria-label="Mostrar todas as conversas e regiões" title="Todas as conversas e regiões">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V10Z"/><path d="M9 21v-7h6v7"/></svg><span>Todas</span></button></div>' +
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





const {construirZonas}=AlertaConversasVistaFiltros.criar({SEM_ZONA,esc,get,norm,selecionadas,zonaDaPessoa});
const {renderLista}=AlertaConversasVistaLista.criar({arr,esc,get,nomePessoa,pessoaTipo,view,zonaDaPessoa});
const {renderChat}=AlertaConversasVistaConversa.criar({db,esc,fluxoCadastro,get,nomePessoa,zonaDaPessoa});
const {renderPerfil}=AlertaConversasVistaPerfil.criar({SEM_ZONA,esc,get,grupoOfertas,linha,nomePessoa,pessoaTipo,zonaDaPessoa});
const {renderDados}=AlertaConversasVistaPainel.criar({construirZonas:(...args)=>construirZonas(...args),consulta,filtrarPessoas,get,manterSelecao,raiz,renderChat:(...args)=>renderChat(...args),renderLista:(...args)=>renderLista(...args),renderPerfil:(...args)=>renderPerfil(...args),selecionadas,view});
    raiz.addEventListener("click",ev => {
      const botao = ev.target.closest("button");
      if (!botao || !raiz.contains(botao)) return;
      if (botao.hasAttribute("data-cv-open")) {
        view.ativa = botao.dataset.cvOpen;
        renderDados();
        if (typeof window !== "undefined" && window.matchMedia("(max-width:850px)").matches)
          raiz.querySelector(".cv-inbox-head")?.scrollIntoView({block:"start"});
      } else if (botao.hasAttribute("data-cv-all")) {
        // "Todas": nenhuma conversa ativa, sem busca nem filtro de região.
        view.ativa = null;
        selecionadas.clear();
        view.busca = "";
        buscarEl.value = "";
        renderDados();
        get("cv-conversation-list").scrollTop = 0;
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
    buscarEl.addEventListener("input",ev => {view.busca=ev.target.value;renderDados();});
    state.rendererAtivo = () => {if(raiz.isConnected)renderDados();};
    if (!state.ouvindoStorage && typeof window !== "undefined") {
      window.addEventListener("storage",ev => {
        if (ev.key === window.AlertaGestaoDados?.CHAVE) state.rendererAtivo?.();
      });
      state.ouvindoStorage=true;
    }
    renderDados();
  }
const {zonaDaPessoa,filtrarPessoas,manterSelecao}=AlertaConversasConsultas.criar({SEM_ZONA,arr,norm});
const {mensagensMunicipais,fluxoCadastro}=AlertaConversasRoteiro.criar({BENS,arr,pessoaTipo});
const {grupoOfertas}=AlertaConversasApresentacao.criar({arr,esc});
  return {montar,fluxoCadastro,zonaDaPessoa,filtrarPessoas,manterSelecao,SEM_ZONA};
});
