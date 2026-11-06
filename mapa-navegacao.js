/* Navegação dos três mapas.
 * Enquanto o enquadramento institucional não for confirmado em código, preservar
 * controles do Leaflet e permitir a calibração manual sem alterar cadastros.
 * Preferências antigas de câmera (localStorage) não são usadas como padrão.
 */
(function(global){
 "use strict";
 const AREA_MARINGA=Object.freeze([
  Object.freeze([-23.578,-52.123]),
  Object.freeze([-23.235,-51.813])
 ]);
 const PADDING=24;
 function margem(map){
  const size=map.getSize();
  return Math.max(12,Math.min(PADDING,Math.floor(Math.min(size.x,size.y)*.035)));
 }
 function emCalibracao(){
  return typeof global.location?.search==="string"&&
    new URLSearchParams(global.location.search).get("calibrar")==="1";
 }
 function liberarNavegacao(map,L){
  // Busca, filtros e seleção de território usam a câmera programaticamente.
  // Arraste manual só no modo de calibração; fora dele, conforme aprovado, fica bloqueado.
  if(emCalibracao())map.dragging?.enable?.();
  else map.dragging?.disable?.();
  map.setMaxBounds(L.latLngBounds(AREA_MARINGA).pad(.08));
  map.options.maxBoundsViscosity=1;
  map.zoomControl.getContainer().classList?.remove("camera-original-fixa");
 }
 function botaoInicio(map,L,restaurar){
  const el=L.DomUtil.create("a","leaflet-control-zoom-home",map.zoomControl.getContainer());
  el.href="#";el.setAttribute("role","button");
  el.setAttribute("aria-label","Voltar à posição original");
  el.title="Voltar à posição original";
  el.innerHTML='<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="7"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/></svg>';
  L.DomEvent.disableClickPropagation(el);
  L.DomEvent.on(el,"click",e=>{L.DomEvent.stop(e);restaurar();});
  L.DomEvent.on(el,"keydown",e=>{
   if(e.key===" "||e.key==="Spacebar"){L.DomEvent.stop(e);restaurar();}
  });
  return el;
 }
 function referenciaVisivel(map,identificador){
  // O modo ?calibrar=1 deixa o enquadramento legível para posterior incorporação
  // explícita ao código; nunca altera dados municipais nem salva câmera por engano.
  if(!emCalibracao())return;
  const pai=map.getContainer?.()?.parentElement,doc=global.document;
  if(!pai||!doc)return;
  const output=doc.createElement("output");
  output.className="mapa-camera-referencia";
  output.setAttribute("aria-label","Coordenadas exatas do enquadramento atual");
  output.dataset.mapa=identificador;
  pai.appendChild(output);
  const atualizar=()=>{
   const centro=map.getCenter(),zoom=map.getZoom();
   const lat=centro.lat.toFixed(7),lng=centro.lng.toFixed(7),z=zoom.toFixed(4);
   output.textContent="Câmera "+identificador+": "+lat+", "+lng+" · zoom "+z;
   // O hash torna os valores também consultáveis pela URL, sem alterar o caminho.
   if(global.history?.replaceState&&global.location?.href){
    try {
     const url=new URL(global.location.href);
     url.hash="camera="+lat+","+lng+","+z;
     global.history.replaceState(global.history.state,"",url.href);
    }catch(_){}
   }
  };
  map.on("moveend zoomend resize",atualizar);
  atualizar();
 }
 function instalar({map,L,zonas,aoRestaurar,identificador="evento"}){
  if(!map||!L||!map.zoomControl?.getContainer)
   throw new TypeError("Mapa Leaflet com controle de zoom obrigatório.");
  if(!Array.isArray(zonas)||!zonas.length||!zonas.every(z=>Array.isArray(z)&&z.length>=3))
   throw new TypeError("É necessário informar os polígonos da vista geral.");
  const bounds=L.latLngBounds(zonas.flat());
  let home=null,ultimoZoom=null;
  function enquadrar(){
   const p=margem(map);
   map.setMaxBounds(L.latLngBounds([]));
   map.setMinZoom(0);
   map.fitBounds(bounds,{padding:[p,p],animate:false});
   home={lat:map.getCenter().lat,lng:map.getCenter().lng,zoom:map.getZoom()};
   ultimoZoom=home.zoom;
   map.setMinZoom(home.zoom);
   liberarNavegacao(map,L);
  }
  enquadrar();
  const restaurar=()=>{
   if(typeof aoRestaurar==="function")aoRestaurar();
   map.setView([home.lat,home.lng],home.zoom,{animate:false});
  };
  const botao=botaoInicio(map,L,restaurar);
  map.on("resize",()=>{
   // A vista geral precisa considerar a largura após abrir/recolher painéis.
   if(Math.abs(map.getZoom()-ultimoZoom)<.01)enquadrar();
   else liberarNavegacao(map,L);
  });
  referenciaVisivel(map,identificador);
  return {restaurar,limites:bounds,botao,zoomMinimo:()=>ultimoZoom};
 }
 function instalarVistaSalva({map,L,identificador="colaboradores"}){
  if(!map||!L||!map.zoomControl?.getContainer)throw new TypeError("Mapa Leaflet inválido.");
  const c=map.getCenter();
  const home={lat:c.lat,lng:c.lng,zoom:map.getZoom()};
  map.setMinZoom(home.zoom);
  liberarNavegacao(map,L);
  const restaurar=()=>map.setView([home.lat,home.lng],home.zoom,{animate:false});
  const botao=botaoInicio(map,L,restaurar);
  map.on("resize",()=>liberarNavegacao(map,L));
  referenciaVisivel(map,identificador);
  return {restaurar,botao,zoomMinimo:()=>home.zoom};
 }
 const api={instalar,instalarVistaSalva,AREA_MARINGA};
 global.AlertaMapaNavegacao=api;
 if(typeof module==="object"&&module.exports)module.exports=api;
})(typeof globalThis!=="undefined"?globalThis:window);
