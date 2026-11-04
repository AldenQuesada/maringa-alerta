/* Navegação do mapa: restringe o afastamento à região de Maringá e restaura a vista inicial.
 * Enquadramento retangular aproximado do município (não substitui sua divisa legal).
 * Os limites abrangem os extremos municipais com pequena margem para telas diferentes.
 */
(function (global) {
  "use strict";

  const AREA_MARINGA = Object.freeze([
    Object.freeze([-23.578, -52.123]),
    Object.freeze([-23.235, -51.813])
  ]);
  const ZOOM_INICIAL = 13;

  function instalar({ map, L, centro = [-23.4205, -51.9333], zoom = ZOOM_INICIAL, aoRestaurar }) {
    if (!map || !L || !map.zoomControl || typeof map.zoomControl.getContainer !== "function") {
      throw new TypeError("Mapa Leaflet com controle de zoom obrigatório.");
    }
    const limites = L.latLngBounds(AREA_MARINGA);
    const destino = L.latLng(centro);

    // Máxima resistência ao arrastar para além dos limites; impede zoom-out excessivo.
    map.options.maxBoundsViscosity = 1;
    map.setMaxBounds(limites);

    function zoomMinimo() {
      const requerido = map.getBoundsZoom(limites, true);
      return Math.max(zoom, Number.isFinite(requerido) ? Math.ceil(requerido) : zoom);
    }
    function adequarLimites() {
      const minimo = zoomMinimo();
      map.setMinZoom(minimo);
      if (map.getZoom() < minimo) map.setZoom(minimo, { animate: false });
    }

    adequarLimites();
    map.setView(destino, Math.max(zoom, map.getMinZoom()), { animate: false });

    function restaurar() {
      if (typeof aoRestaurar === "function") aoRestaurar();
      adequarLimites();
      map.setView(destino, Math.max(zoom, map.getMinZoom()), { animate: true });
    }

    // O terceiro comando pertence ao mesmo bloco + / − do Leaflet.
    const barra = map.zoomControl.getContainer();
    const botao = L.DomUtil.create("a", "leaflet-control-zoom-home", barra);
    botao.href = "#";
    botao.setAttribute("role", "button");
    botao.setAttribute("aria-label", "Voltar à vista inicial de Maringá");
    botao.title = "Voltar à vista inicial de Maringá";
    botao.innerHTML = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>';

    L.DomEvent.disableClickPropagation(botao);
    L.DomEvent.on(botao, "click", function (evento) {
      L.DomEvent.stop(evento);
      restaurar();
    });
    // Links ativam Enter nativamente; Space completa a operação de botão.
    L.DomEvent.on(botao, "keydown", function (evento) {
      if (evento.key === " " || evento.key === "Spacebar") {
        L.DomEvent.stop(evento);
        restaurar();
      }
    });

    map.on("resize", adequarLimites);

    return { restaurar, limites, zoomMinimo, botao };
  }

  const api = { instalar, AREA_MARINGA, ZOOM_INICIAL };
  global.AlertaMapaNavegacao = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
