/* Camadas territoriais versionadas do Paraná Interativo e GeoMaringá.
 * Usada nos três mapas. Nunca confundir zonas cartográficas com zonas
 * operacionais do gabinete de crise.
 */
(function (root) {
"use strict";
const SCRIPT=document.currentScript?.src||"";
const ROOT=new URL("./",SCRIPT||location.href);
const asset=file=>new URL(file,ROOT).href;
const stringify=x=>String(x??"");
const esc=x=>stringify(x).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let memory=null;
async function json(url,required=false){
 const r=await fetch(url,{cache:"no-cache"});
 if(!r.ok){if(required)throw Error("Arquivo não disponível: "+url);return null;}
 return r.json();
}
function infoFrom(data,source,kind){
 if(!data||data.type!=="FeatureCollection"||!Array.isArray(data.features)||!data.features.length)throw Error("Camada vazia");
 const valid=data.features.filter(f=>f.type==="Feature"&&f.geometry&&["Polygon","MultiPolygon"].includes(f.geometry.type)&&f.properties?.nome);
 if(!valid.length)throw Error("Camada sem polígonos nomeados");
 return {features:valid,source,kind,count:valid.length};
}
async function carregar(force=false){
 if(memory&&!force)return memory;
 memory=(async()=>{
  let manifest=null;try{manifest=await json(asset("maringa-municipal-fonte.json"));}catch(_){}
  let bairros=null,zonas=null,zonasNumeradas=null;
  try{
   const estadual=await json(asset("maringa-bairros.geojson"),true);
   const grupos=new Map();
   for(const f of estadual.features || []){
    const nome=String(f.properties?.nome || "").trim();
    if(!/^\d+$/.test(nome) || !["Polygon","MultiPolygon"].includes(f.geometry?.type))continue;
    const numero=Number(nome), coordenadas=f.geometry.type==="Polygon"?[f.geometry.coordinates]:f.geometry.coordinates;
    if(!grupos.has(numero))grupos.set(numero,{type:"Feature",id:"paranainterativo-zona-"+numero,properties:{id:"paranainterativo-zona-"+numero,nome:"Zona "+numero},geometry:{type:"MultiPolygon",coordinates:[]}});
    grupos.get(numero).geometry.coordinates.push(...coordenadas);
   }
   if(grupos.size)zonasNumeradas=infoFrom({type:"FeatureCollection",features:[...grupos.values()]} ,"Paraná Interativo / Paranacidade · camada Bairro", "estadual-numerada");
  }catch(_){}
  if(manifest?.camadas?.["bairros-municipais"]?.status==="sucesso"){
   try{bairros=infoFrom(await json(asset("maringa-bairros-municipais.geojson"),true),
    "GeoMaringá / Prefeitura de Maringá","municipal");}catch(_){}
  }
  if(!bairros){
   try{
    bairros=infoFrom(await json(asset("maringa-bairros-ibge2022.geojson"),true),
      "IBGE / Censo 2022 · Divisões intramunicipais","ibge2022");
   }catch(_){}
  }
  if(!bairros){
   bairros=infoFrom(await json(asset("maringa-bairros.geojson"),true),
      "Paraná Interativo / Paranacidade (classificação numérica)","estadual");
  }
  if(manifest?.camadas?.["zonas-cartograficas"]?.status==="sucesso"){
   try{zonas=infoFrom(await json(asset("maringa-zonas-cartograficas.geojson"),true),
    "GeoMaringá / Prefeitura de Maringá","cartografica");}catch(_){}
  }
  return {bairros,zonas,zonasNumeradas,manifest};
 })().catch(err=>{memory=null;throw err;});
 return memory;
}
function iniciar({map,L,simulatedLayers=[]}){
 if(!map||!L)throw Error("Mapa Leaflet obrigatório");
 const control=L.control({position:"topleft"});
 let layerB=null,layerZ=null,selected=null,visibleB=true,visibleZ=false,showDemo=true,isDestroyed=false,data=null;
 const cover=L.layerGroup().addTo(map);
 function find(name){
  const needle=String(name||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  for(const group of [data?.bairros,data?.zonas]){
   const f=group?.features.find(x=>stringify(x.properties?.nome).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()===needle);
   if(f)return {f,group};
  }
  return null;
 }
 function shapeStyle(kind){
  return kind==="bairros"?{color:"#3daae4",weight:1.4,opacity:.9,fillColor:"#2da4dc",fillOpacity:.08}
   :{color:"#d5a642",weight:1.7,opacity:.9,fillColor:"#dda744",fillOpacity:.045,dashArray:"4 5"};
 }
 function toLayer(group,kind){
  if(!group)return null;
  const layer=L.geoJSON({type:"FeatureCollection",features:group.features},{
   style:()=>shapeStyle(kind),
   onEachFeature(feature,shape){
    const p=feature.properties||{};
    const prefix=kind==="bairros"?"Bairro":"Zona cartográfica";
    shape.bindTooltip(esc(p.nome),{sticky:true,direction:"top"});
    shape.bindPopup('<strong>'+prefix+': '+esc(p.nome)+'</strong><p>'+esc(group.source)+'</p>'+
      '<small>Este limite não representa uma zona operacional homologada da Defesa Civil.</small>');
    shape.on("click",()=>{highlight(shape,feature,kind);});
   }
  });
  cover.addLayer(layer);
  return layer;
 }
 function highlight(layer,feature,kind){
  if(selected){try{selected.layer.setStyle(shapeStyle(selected.kind));}catch(_){}}
  selected={layer,kind};layer.setStyle({color:"#ffdf77",weight:3.4,fillColor:"#ffb020",fillOpacity:.2});
  if(layer.getBounds?.().isValid()){map.fitBounds(layer.getBounds(),{padding:[30,30],maxZoom:15});}
  const field=control.getContainer()?.querySelector('input[name="busca-bairro"]');
  if(field)field.value=stringify(feature.properties?.nome);
 }
 function updateDemo(){
  for(const l of simulatedLayers){
   if(!l)continue;
   if(showDemo){if(!map.hasLayer(l))map.addLayer(l);}
   else if(map.hasLayer(l))map.removeLayer(l);
  }
 }
 function update(){
  if(layerB){if(visibleB)cover.addLayer(layerB);else cover.removeLayer(layerB);}
  if(layerZ){if(visibleZ)cover.addLayer(layerZ);else cover.removeLayer(layerZ);}
  updateDemo();
  const count=control.getContainer()?.querySelector(".territory-count");
  if(count&&data){
   const a=data.bairros.count,src=data.bairros.source;
   const z=data.zonas?data.zonas.count:"indisponível";
   count.textContent=a+" polígonos de bairros · "+src+" | Zonas cartográficas: "+z;
  }
 }
 control.onAdd=()=>{
  const box=L.DomUtil.create("div","maringa-territorio-control");
  box.innerHTML='<div class="territory-head"><strong>Território de Maringá</strong><span class="territory-status">Carregando...</span></div>'+
  '<label class="territory-search">Localizar bairro/zona <input type="search" name="busca-bairro" list="territory-list" placeholder="Digite o nome da área..." autocomplete="off"></label>'+
  '<label class="territory-search">Todos os bairros <select name="selecionar-bairro" aria-label="Escolha um bairro cadastrado"><option value="">Selecione um bairro</option></select></label>'+
  '<datalist id="territory-list"></datalist>'+
  '<div class="territory-options"><label><input type="checkbox" name="bairros" checked> Bairros (polígonos)</label>'+
  '<label><input type="checkbox" name="zonas"> Zonas cartográficas</label>'+
  '<label><input type="checkbox" name="demo" checked> 6 zonas operacionais demonstrativas</label></div>'+
  '<small class="territory-count">Aguardando fonte territorial</small>';
  L.DomEvent.disableClickPropagation(box);L.DomEvent.disableScrollPropagation(box);
  box.querySelector('[name="bairros"]').onchange=e=>{visibleB=e.target.checked;update();};
  box.querySelector('[name="zonas"]').onchange=e=>{visibleZ=e.target.checked;update();};
  box.querySelector('[name="demo"]').onchange=e=>{showDemo=e.target.checked;update();};
  const search=box.querySelector('[name="busca-bairro"]');
  const select=box.querySelector('[name="selecionar-bairro"]');
  select.onchange=()=>{if(select.value)focus(select.value);};
  search.onchange=()=>focus(search.value);
  search.onkeydown=e=>{if(e.key==="Enter"){e.preventDefault();focus(search.value);}};
  return box;
 };
 control.addTo(map);
 const mounted=carregar().then(result=>{
  if(isDestroyed)return null;data=result;
  layerB=toLayer(result.bairros,"bairros");
  layerZ=toLayer(result.zonas,"zonas");
  const el=control.getContainer();if(!el)return result;
  el.querySelector(".territory-status").textContent="Fonte pública";
  el.querySelector('[name="zonas"]').disabled=!layerZ;
  const options=[...result.bairros.features,...(result.zonas?.features||[])].map(x=>x.properties.nome);
  const sorted=[...new Set(options)].sort((a,b)=>a.localeCompare(b,"pt-BR"));
  el.querySelector("#territory-list").innerHTML=sorted.map(x=>'<option value="'+esc(x)+'"></option>').join("");
  const select=el.querySelector('[name="selecionar-bairro"]');
  if(select)select.innerHTML='<option value="">'+esc(result.bairros.count)+' bairros — selecione</option>'+
   [...new Set(result.bairros.features.map(x=>x.properties.nome))]
     .sort((a,b)=>a.localeCompare(b,"pt-BR"))
     .map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join("");
  update();
  const bairroSolicitado=new URLSearchParams(location.search).get("bairro");
  if(bairroSolicitado)setTimeout(()=>focus(bairroSolicitado),80);
  return result;
 }).catch(error=>{
  if(isDestroyed)return null;
  const el=control.getContainer();
  if(el){el.querySelector(".territory-status").textContent="Indisponível";
   el.querySelector(".territory-count").textContent="Fonte indisponível: "+error.message;}
  // Nunca ocultar demonstração caso arquivo real falhe.
  showDemo=true;updateDemo();
  return null;
 });
 function focus(nome){
  const found=find(nome);
  if(!found)return false;
  const kind=found.group===data.bairros?"bairros":"zonas";
  const target=(kind==="bairros"?layerB:layerZ);
  const layers=target?.getLayers()||[];
  const shape=layers.find(x=>x.feature===found.f||x.feature?.id===found.f.id);
  if(!shape)return false;
  if(kind==="bairros"&&!visibleB){visibleB=true;const cb=control.getContainer()?.querySelector('[name="bairros"]');if(cb)cb.checked=true;update();}
  if(kind==="zonas"&&!visibleZ){visibleZ=true;const cb=control.getContainer()?.querySelector('[name="zonas"]');if(cb)cb.checked=true;update();}
  highlight(shape,found.f,kind);
  return true;
 }
 return {ready:mounted,focus,destroy(){isDestroyed=true;cover.clearLayers();map.removeLayer(cover);map.removeControl(control);},
  getDados:()=>data};
}
root.MaringaBairros={carregar,iniciar};
})(typeof globalThis!=="undefined"?globalThis:window);
