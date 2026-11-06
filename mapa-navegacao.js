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
  const PADDING = 24;


  // A posição original é apenas uma preferência de câmera local, sem dados de cadastros.
  function lerVista(storage,key){
    if(!storage||!key)return null;
    try {
      const v=JSON.parse(storage.getItem(key)||"null");
      if(!v||v.version!==1||![v.lat,v.lng,v.zoom].every(Number.isFinite)
        ||v.lat < AREA_MARINGA[0][0]-.15||v.lat>AREA_MARINGA[1][0]+.15
        ||v.lng<AREA_MARINGA[0][1]-.15||v.lng>AREA_MARINGA[1][1]+.15
        ||v.zoom<2||v.zoom>19
        ||!Array.isArray(v.bounds)||v.bounds.length!==2
        ||v.bounds.some(p=>!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n))))
         return null;
      return v;
    }catch(_){return null;}
  }
  function capturarVista(map,storage,key){
    if(!storage||!key)return null;
    const c=map.getCenter(),b=map.getBounds();
    const v={version:1,lat:c.lat,lng:c.lng,zoom:map.getZoom(),
      bounds:[[b.getSouth(),b.getWest()],[b.getNorth(),b.getEast()]]};
    try{storage.setItem(key,JSON.stringify(v));return v;}catch(_){return null;}
  }
  function aplicarVista(map,L,v){
    map.setMaxBounds(L.latLngBounds([]));map.setMinZoom(0);
    map.setView([v.lat,v.lng],v.zoom,{animate:false});
    map.setMinZoom(v.zoom);
    map.setMaxBounds(L.latLngBounds(v.bounds).pad(.1));
    map.options.maxBoundsViscosity=1;
  }
  function botaoFixar(map,L,aoFixar){
    const b=L.DomUtil.create("a","leaflet-control-zoom-save",map.zoomControl.getContainer());
    b.href="#";b.setAttribute("role","button");
    b.setAttribute("aria-label","Fixar esta posição como original");
    b.title="Fixar esta posição como original";b.textContent="⌖";
    L.DomEvent.disableClickPropagation(b);
    L.DomEvent.on(b,"click",e=>{L.DomEvent.stop(e);aoFixar();});
    L.DomEvent.on(b,"keydown",e=>{if(e.key===" "||e.key==="Spacebar"){L.DomEvent.stop(e);aoFixar();}});
    return b;
  }

  function instalar({ map, L, zonas, aoRestaurar, armazenamento=null, chaveVista=null }) {
    if (!map || !L || !map.zoomControl || typeof map.zoomControl.getContainer !== "function") {
      throw new TypeError("Mapa Leaflet com controle de zoom obrigatório.");
    }
    if (!Array.isArray(zonas) || !zonas.length || !zonas.every(z => Array.isArray(z) && z.length >= 3)) {
      throw new TypeError("É necessário informar os polígonos de todas as zonas da vista geral.");
    }

    const limitesMunicipio = L.latLngBounds(AREA_MARINGA);
    const limitesVisaoGeral = L.latLngBounds(zonas.flat());
    let zoomGeralAnterior = null;
    let vistaSalva=lerVista(armazenamento,chaveVista);

    function margem() {
      const tamanho = map.getSize();
      return Math.max(12, Math.min(PADDING, Math.floor(Math.min(tamanho.x, tamanho.y) * 0.035)));
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
      map.setMaxBounds(L.latLngBounds([]));
      map.setMinZoom(0);
      map.fitBounds(limitesVisaoGeral, { padding: [p, p], animate: false });
      const atual = map.getZoom();
      zoomGeralAnterior = atual;
      map.setMinZoom(atual);
      // A trava não pode ser menor que a área realmente visível no zoom geral.
      // Ao aproximar o mapa, permite explorar o restante de Maringá.
      map.setMaxBounds(limitesMunicipio.pad(0.04).extend(map.getBounds().getNorthWest())
        .extend(map.getBounds().getSouthEast()).pad(0.02));
      map.options.maxBoundsViscosity = 1;
    }

    if(vistaSalva){aplicarVista(map,L,vistaSalva);zoomGeralAnterior=vistaSalva.zoom;}
    else enquadrar();

    function restaurar() {
      if (typeof aoRestaurar === "function") aoRestaurar();
      if(vistaSalva){aplicarVista(map,L,vistaSalva);zoomGeralAnterior=vistaSalva.zoom;}
      else enquadrar({ animate: true });
    }
    const botaoSalvar=armazenamento&&chaveVista?botaoFixar(map,L,()=>{
      const nova=capturarVista(map,armazenamento,chaveVista);
      if(!nova)return;
      vistaSalva=nova;zoomGeralAnterior=nova.zoom;aplicarVista(map,L,nova);
      botaoSalvar.title="Posição original salva. Toque novamente para atualizar.";
    }):null;

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
      if(vistaSalva){
        if(Math.abs(map.getZoom()-vistaSalva.zoom)<.01)aplicarVista(map,L,vistaSalva);
        else map.setMaxBounds(L.latLngBounds(vistaSalva.bounds).pad(.1));
        return;
      }
      if (zoomGeralAnterior !== null && Math.abs(map.getZoom() - zoomGeralAnterior) < 0.01) {
        enquadrar();
      } else {
        map.setMaxBounds(limitesMunicipio.pad(0.04));
      }
    });

    return { restaurar, limites: limitesVisaoGeral, zoomMinimo, botao, botaoSalvar };
  }

  // Os mapas standalone usam a mesma regra, sem recriar o mapa nem os seus registros.
  function instalarVistaSalva({map,L,armazenamento,chaveVista}){
    let vista=lerVista(armazenamento,chaveVista);
    if(vista)aplicarVista(map,L,vista);
    else map.options.maxBoundsViscosity=1; // Antes de fixar, a pessoa pode ajustar livremente o enquadramento.
    const centro=map.getCenter(),inicio={lat:centro.lat,lng:centro.lng,zoom:map.getZoom()};
    function restaurar(){
      if(vista)aplicarVista(map,L,vista);
      else map.setView([inicio.lat,inicio.lng],inicio.zoom,{animate:false});
    }
    const home=L.DomUtil.create("a","leaflet-control-zoom-home",map.zoomControl.getContainer());
    home.href="#";home.setAttribute("role","button");home.setAttribute("aria-label","Voltar à posição original");
    home.title="Voltar à posição original";home.textContent="⌂";
    L.DomEvent.disableClickPropagation(home);
    L.DomEvent.on(home,"click",e=>{L.DomEvent.stop(e);restaurar();});
    L.DomEvent.on(home,"keydown",e=>{if(e.key===" "||e.key==="Spacebar"){L.DomEvent.stop(e);restaurar();}});
    const salvar=botaoFixar(map,L,()=>{
      const nova=capturarVista(map,armazenamento,chaveVista);
      if(!nova)return;
      vista=nova;aplicarVista(map,L,nova);
      salvar.title="Posição original salva. Toque novamente para atualizar.";
    });
    return {restaurar,botao:home,botaoSalvar:salvar};
  }

  const api = { instalar, instalarVistaSalva, AREA_MARINGA };
  global.AlertaMapaNavegacao = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
