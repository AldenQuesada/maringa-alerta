/* Navegação do mapa: restringe o afastamento à região de Maringá e restaura a vista inicial.
 * Enquadramento retangular aproximado do município (não substitui sua divisa legal).
 * Os limites abrangem os extremos municipais com pequena margem para telas diferentes.
 */
(function (global) {
  "use strict";

  // Limites de deslocamento amplos para toda a região de Maringá.
  // Retângulo de navegação aproximado: não é a fronteira municipal oficial.
  const AREA_MARINGA = Object.freeze([
    Object.freeze([-23.578, -52.123]),
    Object.freeze([-23.235, -51.813])
  ]);
  // Para a vista inicial, a referência são as seis zonas efetivamente desenhadas.
  const PADDING = 48;

  function instalar({ map, L, zonas, aoRestaurar }) {
    if (!map || !L || !map.zoomControl || typeof map.zoomControl.getContainer !== "function") {
      throw new TypeError("Mapa Leaflet com controle de zoom obrigatório.");
    }
    if (!Array.isArray(zonas) || !zonas.length || !zonas.every(z => Array.isArray(z) && z.length >= 3)) {
      throw new TypeError("É necessário informar os polígonos de todas as zonas da vista geral.");
    }

    const limitesMunicipio = L.latLngBounds(AREA_MARINGA);
    const limitesVisaoGeral = L.latLngBounds(zonas.flat());
    let zoomGeralAnterior = null;

    function margem() {
      const tamanho = map.getSize();
      return Math.max(16, Math.min(PADDING, Math.floor(Math.min(tamanho.x, tamanho.y) * 0.09)));
    }

    function zoomMinimo() {
      const p = margem();
      // false: exige que TODAS as zonas caibam dentro do mapa, com borda visível.
      const requerido = map.getBoundsZoom(limitesVisaoGeral, false, L.point(p * 2, p * 2));
      return Number.isFinite(requerido) ? Math.max(0, requerido) : 0;
    }

    function enquadrar({ animate = false } = {}) {
      const p = margem();
      // Sem maxBounds durante o fit para impedir que uma trava anterior
      // mova o centro e corte Vila Esperança ao norte.
      map.setMaxBounds(null);
      map.setMinZoom(0);
      map.fitBounds(limitesVisaoGeral, { padding: [p, p], animate });
      const atual = map.getZoom();
      zoomGeralAnterior = atual;
      map.setMinZoom(atual);
      // A trava não pode ser menor que a área realmente visível no zoom geral.
      // Ao aproximar o mapa, permite explorar o restante de Maringá.
      map.setMaxBounds(limitesMunicipio.pad(0.04).extend(map.getBounds().getNorthWest())
        .extend(map.getBounds().getSouthEast()).pad(0.02));
      map.options.maxBoundsViscosity = 1;
    }

    enquadrar();

    function restaurar() {
      if (typeof aoRestaurar === "function") aoRestaurar();
      enquadrar({ animate: true });
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

    map.on("resize", () => {
      // O zoom detalhado é preservado; apenas o modo vista geral
      // é reenquadrado quando a área útil do mapa muda.
      if (zoomGeralAnterior !== null && Math.abs(map.getZoom() - zoomGeralAnterior) < 0.01) {
        enquadrar();
      } else {
        map.setMaxBounds(limitesMunicipio.pad(0.04));
      }
    });

    return { restaurar, limites: limitesVisaoGeral, zoomMinimo, botao };
  }

  const api = { instalar, AREA_MARINGA };
  global.AlertaMapaNavegacao = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
