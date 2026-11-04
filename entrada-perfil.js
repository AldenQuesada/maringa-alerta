/* Componente de entrada: seleção de perfil e foco, sem autenticação ou persistência. */
(function (global) {
  "use strict";

  const TIPOS = new Set(["admin", "responsavel", "visualizacao"]);
  const FOCAVEIS = "a[href], area[href], button, input:not([type='hidden']), select, textarea, [tabindex], [contenteditable='true']";

  function criar({ overlay, zonas = [], onEscolher, onFechar }) {
    if (!overlay || typeof overlay.querySelector !== "function") {
      throw new TypeError("AlertaEntrada.criar requer o elemento overlay.");
    }
    const dialog = overlay.querySelector("#role-modal") || overlay.querySelector('[role="dialog"]');
    const campoZona = dialog && dialog.querySelector("[data-entry-zone]");
    if (!dialog || !campoZona) {
      throw new TypeError("O diálogo de entrada precisa de um campo data-entry-zone.");
    }

    const documento = overlay.ownerDocument;
    const janela = documento.defaultView;
    const botoesPerfil = Array.from(dialog.querySelectorAll("[data-entry-role]"));
    let nomesZonas = [];
    let focoAnterior = null;
    let aberta = false;

    if (!dialog.hasAttribute("tabindex")) dialog.setAttribute("tabindex", "-1");

    function visivel(elemento) {
      if (!elemento || !elemento.isConnected || typeof elemento.getClientRects !== "function") return false;
      if (elemento.closest("[hidden], [inert]")) return false;
      const estilo = janela.getComputedStyle(elemento);
      return estilo.display !== "none" && estilo.visibility !== "hidden" &&
        estilo.visibility !== "collapse" && elemento.getClientRects().length > 0;
    }

    function habilitado(elemento) {
      return !elemento.matches(":disabled") && elemento.getAttribute("aria-disabled") !== "true";
    }

    function focar(elemento, preservarRolagem = false) {
      if (!visivel(elemento) || !habilitado(elemento) || typeof elemento.focus !== "function") return false;
      elemento.focus({ preventScroll: preservarRolagem });
      return documento.activeElement === elemento;
    }

    function controlesTabulaveis() {
      return Array.from(dialog.querySelectorAll(FOCAVEIS))
        .filter(elemento => elemento.tabIndex >= 0 && visivel(elemento) && habilitado(elemento))
        .map((elemento, ordem) => ({ elemento, ordem, indice: elemento.tabIndex }))
        .sort((a, b) => {
          const aPositivo = a.indice > 0;
          const bPositivo = b.indice > 0;
          if (aPositivo !== bPositivo) return aPositivo ? -1 : 1;
          return (aPositivo ? a.indice - b.indice : 0) || a.ordem - b.ordem;
        })
        .map(item => item.elemento);
    }

    function definirZonas(novasZonas) {
      const zonaAnterior = campoZona.value;
      nomesZonas = [...new Set((Array.isArray(novasZonas) ? novasZonas : [])
        .filter(nome => typeof nome === "string" && nome.trim().length > 0))];
      const fragmento = documento.createDocumentFragment();
      for (const nome of nomesZonas) {
        const opcao = documento.createElement("option");
        opcao.value = nome;
        opcao.textContent = nome;
        fragmento.appendChild(opcao);
      }
      if (!nomesZonas.length) {
        const opcao = documento.createElement("option");
        opcao.value = "";
        opcao.textContent = "Nenhuma zona cadastrada";
        fragmento.appendChild(opcao);
      }
      campoZona.replaceChildren(fragmento);
      campoZona.disabled = !nomesZonas.length;
      campoZona.value = nomesZonas.includes(zonaAnterior) ? zonaAnterior : (nomesZonas[0] || "");
      for (const botao of botoesPerfil) {
        if (botao.dataset.entryRole === "responsavel") botao.disabled = !nomesZonas.length;
      }
    }

    function abrir(perfilAtual) {
      if (!aberta) focoAnterior = documento.activeElement;
      if (perfilAtual && nomesZonas.includes(perfilAtual.zona)) campoZona.value = perfilAtual.zona;
      // Uma zona ainda válida permanece selecionada quando o perfil não informa outra.
      if (!nomesZonas.includes(campoZona.value)) campoZona.value = nomesZonas[0] || "";
      aberta = true;
      overlay.hidden = false;
      const tipo = perfilAtual && TIPOS.has(perfilAtual.tipo) ? perfilAtual.tipo : "admin";
      const preferido = botoesPerfil.find(botao => botao.dataset.entryRole === tipo);
      const administrador = botoesPerfil.find(botao => botao.dataset.entryRole === "admin");
      if (!focar(preferido) && !focar(administrador)) focar(controlesTabulaveis()[0] || dialog);
    }

    function fechar() {
      overlay.hidden = true;
      if (!aberta) return;
      aberta = false;
      const destino = focoAnterior;
      focoAnterior = null;
      if (destino && destino !== documento.body && destino !== documento.documentElement) focar(destino, true);
    }

    function cancelar() {
      if (!aberta) return;
      fechar();
      if (typeof onFechar === "function") onFechar();
    }

    overlay.addEventListener("click", evento => {
      if (!aberta || overlay.hidden) return;
      if (evento.target === overlay) {
        evento.preventDefault();
        evento.stopPropagation();
        cancelar();
        return;
      }
      const alvo = evento.target && (evento.target.nodeType === 1 ? evento.target : evento.target.parentElement);
      const fecharBotao = alvo && alvo.closest("[data-entry-close]");
      if (fecharBotao && dialog.contains(fecharBotao)) {
        evento.preventDefault();
        evento.stopPropagation();
        cancelar();
        return;
      }
      const botao = alvo && alvo.closest("[data-entry-role]");
      if (!botao || !dialog.contains(botao) || !habilitado(botao) || !TIPOS.has(botao.dataset.entryRole)) return;
      evento.preventDefault();
      evento.stopPropagation();
      const perfil = { tipo: botao.dataset.entryRole };
      if (perfil.tipo === "responsavel") {
        if (!nomesZonas.includes(campoZona.value)) {
          focar(campoZona);
          return;
        }
        perfil.zona = campoZona.value;
      }
      if (typeof onEscolher === "function") onEscolher(perfil);
      fechar();
    });

    overlay.addEventListener("keydown", evento => {
      if (!aberta || overlay.hidden) return;
      if (evento.key === "Escape") {
        evento.preventDefault();
        evento.stopPropagation();
        cancelar();
        return;
      }
      if (evento.key !== "Tab") return;
      const controles = controlesTabulaveis();
      if (!controles.length) {
        evento.preventDefault();
        focar(dialog);
        return;
      }
      const atual = documento.activeElement;
      const primeiro = controles[0];
      const ultimo = controles[controles.length - 1];
      if (evento.shiftKey && (atual === primeiro || !controles.includes(atual))) {
        evento.preventDefault();
        focar(ultimo);
      } else if (!evento.shiftKey && (atual === ultimo || !controles.includes(atual))) {
        evento.preventDefault();
        focar(primeiro);
      }
    });

    definirZonas(zonas);
    return { abrir, fechar, definirZonas };
  }

  global.AlertaEntrada = { criar };
})(typeof globalThis !== "undefined" ? globalThis : window);
