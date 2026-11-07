/* mapa: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({$,esc,global,log,notify,selectedRows,stage,state}){
function initMap(){
 if(!global.L||!$("mi-map")){$("mi-map").textContent="A biblioteca cartográfica não está disponível. A tabela permanece funcional.";return;}
 if(state.map){state.map.remove();state.map=null;}
 const p=state.ctx.db.municipioAtivo();
 const centro=globalThis.AlertaGestaoDados.config.centro(p);
 state.map=L.map("mi-map",{zoomControl:true}).setView(centro||[0,0],centro?12:2);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:"&copy; OpenStreetMap contributors"}).addTo(state.map);
 state.geoLayer=L.layerGroup().addTo(state.map);state.markerLayer=L.layerGroup().addTo(state.map);
 renderMarkers();setTimeout(()=>state.map.invalidateSize(),80);
}
function renderMarkers(){
 if(!state.map||!state.geoLayer||!state.markerLayer)return;
 state.geoLayer.clearLayers();state.markerLayer.clearLayers();
 const prefeitura=state.ctx.db.municipioAtivo(),geometry=stage.geo||prefeitura?.limite_geojson;
 if(geometry){try{
  const polygon=typeof geometry==="string"?JSON.parse(geometry):geometry;
  const g=L.geoJSON(polygon,{style:{color:"#f7be63",weight:2,fillOpacity:.045}}).addTo(state.geoLayer);
  if(g.getBounds().isValid())state.map.fitBounds(g.getBounds(),{padding:[15,15],maxZoom:13});
 }catch(_){log("Mapa","Geometria municipal não pôde ser desenhada.","warn");}}
 for(const x of selectedRows().slice(0,globalThis.AlertaGestaoDados.parametros.implantacao.marcadoresVisiveis)){
  const latlng=state.C.normalizeCoordinates(x.lat,x.lng);
  if(latlng){
   const marker=L.circleMarker([latlng.lat,latlng.lng],{radius:6,color:"#0b1826",weight:2,fillColor:state.tab==="saude"?"#39c7b1":"#f7b861",fillOpacity:.95});
   marker.bindPopup('<strong>'+esc(x.nome)+'</strong><br>'+esc(x.tipo||"")+'<br><small>'+esc(x.verificacao||"Pendente")+'</small>');
   marker.addTo(state.markerLayer);
  }else if(x.geojson&&["bairros","riscos","zonas"].includes(state.tab)){
   try{L.geoJSON(JSON.parse(x.geojson),{style:{color:state.tab==="riscos"?"#fd6571":"#55acdd",weight:1.5,fillOpacity:.09}}).addTo(state.geoLayer);}catch(_){}
  }
 }
}
function focusFeature(x){
 if(!x||!state.map)return;
 const point=state.C.normalizeCoordinates(x.lat,x.lng);
 if(point){state.map.flyTo([point.lat,point.lng],15);return;}
 if(x.geojson){
  try{const g=L.geoJSON(JSON.parse(x.geojson));if(g.getBounds().isValid())state.map.fitBounds(g.getBounds(),{padding:[20,20]});}
  catch(_){}
 }else notify("Registro sem coordenadas. Use Editar para cadastrar latitude e longitude verificadas.");
}
return {initMap,renderMarkers,focusFeature};
}
root.AlertaImplantacaoMapa={criar};
})(globalThis);
