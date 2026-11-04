/* Navegação do mapa: restringe o afastamento à região de Maringá e restaura a vista inicial.
 * Enquadramento retangular aproximado do município (não substitui sua divisa legal).
 * Os limites abrangem os extremos municipais com pequena margem para telas diferentes.
 */
(function (global) {
  "use strict";

  // Extremos aproximados do contorno municipal, com base na malha do IBGE.
  // Fonte de referência: https://www.teraserv.com.br/ferramentas/coordenadas-de-municipios/pr/maringa
  // O contorno continua retangular; não representa a divisa poligonal legal.
  const AREA_MARINGA = Object.freeze([
    Object.freeze([-23.5583, -52.1001]),
    Object.freeze([-23.2540, -51.8358])
  ]);
  const PADDING = 32; // folga visual nas quatro bordas da visão geral

  function instalar({ map, L, aoRestaurar }) {
    if (!map || !L || !map.zoomControl || typeof map.zoomControl.getContainer !== "function") {
      throw new TypeError("Mapa Leaflet com controle de zoom obrigatório.");
    }
    const limites = L.latLngBounds(AREA_MARINGA);
    let zoomGeralAnterior = null;

    // false: calcula o zoom em que TODO o município cabe DENTRO da tela.
    // true faria o inverso e foi a causa do corte da parte norte.
    function zoomMinimo() {
      const zoom = map.getBoundsZoom(limites, false, L.point(PADDING * 2, PADDING * 2));
      return Number.isFinite(zoom) ? Math.max(0, zoom) : Math.max(0, map.getMinZoom());
    }

    function limitesDeNavegacao(zoomGeral) {
      // A própria tela pode ser mais larga/alta que a área municipal,
      // principalmente no celular. Incluímos a vista geral nos limites
      // para evitar reposicionamento/corte causado por setMaxBounds.
      const centro = map.project(limites.getCenter(), zoomGeral);
      const meiaTela = map.getSize().divideBy(2);
      const noroeste = map.unproject(centro.subtract(meiaTela), zoomGeral);
      const sudeste = map.unproject(centro.add(meiaTela), zoomGeral);
      return limites.pad(0.12).extend(noroeste).extend(sudeste);
    }

    function adequarLimites({ recenter = false, animate = false } = {}) {
      const estavaNaVisaoGeral = zoomGeralAnterior !== null &&
        Math.abs(map.getZoom() - zoomGeralAnterior) < 0.01;
      const novoZoomGeral = zoomMinimo();
      zoomGeralAnterior = novoZoomGeral;
      map.options.maxBoundsViscosity = 1;
      map.setMaxBounds(limitesDeNavegacao(novoZoomGeral));
      map.setMinZoom(novoZoomGeral);
      if (recenter || estavaNaVisaoGeral) {
        // fitBounds também ajusta o centro para abarcar norte, sul, leste e oeste.
        map.fitBounds(limites, { padding: [PADDING, PADDING], animate });
      }
    }

    adequarLimites({ recenter: true });

    function restaurar() {
      if (typeof aoRestaurar === "function") aoRestaurar();
      adequarLimites({ recenter: true, animate: true });
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

    map.on("resize", () => adequarLimites());

    return { restaurar, limites, zoomMinimo, botao };
  }

  const api = { instalar, AREA_MARINGA };
  global.AlertaMapaNavegacao = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
