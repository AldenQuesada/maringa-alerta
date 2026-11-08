/* Navegação dos três mapas, com câmera institucional e limite mínimo de zoom.
 * As três telas permitem arraste desde a origem e preservam sua câmera canônica.
 * Preferências antigas de câmera (localStorage) não são usadas como padrão.
 */
(function(global){
 "use strict";
 function areaPadrao(){
  const config=global.AlertaMunicipiosConfiguracao||(typeof require==='function'?require('./config/municipios.js'):null);
  const box=config?.demonstracao?.bbox_navegacao;
  return box?[[box[0],box[2]],[box[1],box[3]]]:null;
 }
 const PADDING=24;
 function margem(map){
  const size=map.getSize();
  return Math.max(12,Math.min(PADDING,Math.floor(Math.min(size.x,size.y)*.035)));
 }
 function emCalibracao(){
  return typeof global.location?.search==="string"&&
    new URLSearchParams(global.location.search).get("calibrar")==="1";
 }
 function atualizarArraste(map,arrasteNoMinimo=false){
  // As telas principais habilitam arraste desde a origem explicitamente.
  if(arrasteNoMinimo||emCalibracao()||map.getZoom()>map.getMinZoom()+0.001)map.dragging?.enable?.();
  else map.dragging?.disable?.();
 }
 function liberarNavegacao(map,L,limites,arrasteNoMinimo=false){
  // Filtros e buscas continuam podendo centralizar pelo Leaflet.
  atualizarArraste(map,arrasteNoMinimo);
  // Com arraste livre o limite pedido é de escala, não de deslocamento. maxBounds
  // empurrava a câmera aprovada para outro centro em monitores largos.
  map.setMaxBounds(limites&&!arrasteNoMinimo?L.latLngBounds(limites).pad(.08):L.latLngBounds([]));
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
 function instalar({map,L,zonas,aoRestaurar,identificador="evento",limites=areaPadrao(),vistaInicial=null,arrasteNoMinimo=false}){
  if(!map||!L||!map.zoomControl?.getContainer)
   throw new TypeError("Mapa Leaflet com controle de zoom obrigatório.");
  // Uma câmera aprovada prevalece sobre polígonos, dados e tamanho da tela.
  if(vistaInicial)return instalarVistaSalva({map,L,limites,identificador,aoRestaurar,vistaInicial,arrasteNoMinimo});
  if(!Array.isArray(zonas)||!zonas.every(z=>Array.isArray(z)&&z.length>=3))
   throw new TypeError("É necessário informar os polígonos da vista geral.");
  if(!zonas.length)return instalarVistaSalva({map,L,limites,identificador,aoRestaurar,arrasteNoMinimo});
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
   liberarNavegacao(map,L,limites,arrasteNoMinimo);
  }
  enquadrar();
  map.on("zoomend",()=>atualizarArraste(map,arrasteNoMinimo));
  const restaurar=()=>{
   if(typeof aoRestaurar==="function")aoRestaurar();
   map.setView([home.lat,home.lng],home.zoom,{animate:false});
  };
  const botao=botaoInicio(map,L,restaurar);
  map.on("resize",()=>{
   // A vista geral precisa considerar a largura após abrir/recolher painéis.
   if(Math.abs(map.getZoom()-ultimoZoom)<.01)enquadrar();
   else liberarNavegacao(map,L,limites,arrasteNoMinimo);
  });
  referenciaVisivel(map,identificador);
  return {restaurar,limites:bounds,botao,zoomMinimo:()=>ultimoZoom};
 }
 function instalarVistaSalva({limites=areaPadrao(),map,L,identificador="colaboradores",vistaInicial=null,arrasteNoMinimo=false,aoRestaurar}){
  if(!map||!L||!map.zoomControl?.getContainer)throw new TypeError("Mapa Leaflet inválido.");
  // Somente a câmera institucional expressamente aprovada pode definir o padrão.
  // Na calibração, não aplicar essa câmera para permitir reposicionamento manual.
  const fixar=(!emCalibracao()&&vistaInicial&&
    [vistaInicial.lat,vistaInicial.lng,vistaInicial.zoom].every(Number.isFinite)&&
    (!limites||(vistaInicial.lat>=limites[0][0]&&vistaInicial.lat<=limites[1][0]))&&
    (!limites||(vistaInicial.lng>=limites[0][1]&&vistaInicial.lng<=limites[1][1]))&&
    vistaInicial.zoom>=2&&vistaInicial.zoom<=18);
  if(fixar){
    if(arrasteNoMinimo)map.setMaxBounds(L.latLngBounds([]));
    map.setMinZoom(0);
    map.setView([vistaInicial.lat,vistaInicial.lng],vistaInicial.zoom,{animate:false,reset:arrasteNoMinimo});
  }
  const c=map.getCenter();
  const home={lat:c.lat,lng:c.lng,zoom:map.getZoom()};
  map.setMinZoom(home.zoom);
  // O limite vale também para pinça no celular, sem afastamento elástico.
  if(arrasteNoMinimo)map.options.bounceAtZoomLimits=false;
  liberarNavegacao(map,L,limites,arrasteNoMinimo);
  let tamanho=map.getSize(),centroAtual={lat:home.lat,lng:home.lng};
  map.on("moveend",()=>{
   const atual=map.getSize();
   // Leaflet emite moveend antes de resize. Não salvar esse deslocamento de layout.
   if(atual.x===tamanho.x&&atual.y===tamanho.y){
    const centro=map.getCenter();centroAtual={lat:centro.lat,lng:centro.lng};
   }
  });
  const restaurar=()=>{if(aoRestaurar)aoRestaurar();centroAtual={lat:home.lat,lng:home.lng};map.setView([home.lat,home.lng],home.zoom,{animate:false,reset:arrasteNoMinimo});};
  const botao=botaoInicio(map,L,restaurar);
  map.on("zoomend",()=>atualizarArraste(map,arrasteNoMinimo));
  map.on("resize",()=>{
    liberarNavegacao(map,L,limites,arrasteNoMinimo);
    if(arrasteNoMinimo){
      map.setView([centroAtual.lat,centroAtual.lng],map.getZoom(),{animate:false,reset:true});
      tamanho=map.getSize();
      return;
    }
    // Mudança de tamanho do painel não pode deslocar a vista inicial aprovada.
    if(fixar&&Math.abs(map.getZoom()-home.zoom)<.0001)
      map.setView([home.lat,home.lng],home.zoom,{animate:false});
    tamanho=map.getSize();
  });
  referenciaVisivel(map,identificador);
  return {restaurar,botao,zoomMinimo:()=>home.zoom};
 }
 const api={instalar,instalarVistaSalva,get AREA_MARINGA(){return areaPadrao();}};
 global.AlertaMapaNavegacao=api;
 if(typeof module==="object"&&module.exports)module.exports=api;
})(typeof globalThis!=="undefined"?globalThis:window);
