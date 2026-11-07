function refreshTable(){
 const rows=selectedRows(),target=$("mi-rows"),counter=$("mi-count");
 if(!target)return;counter.textContent=rows.length+" registros";
 target.innerHTML=rows.length?rows.slice(0,650).map((x,i)=>{
  const geo=C.normalizeCoordinates(x.lat,x.lng),hasPolygon=!!x.geojson;
  const estado=x._pending?"Revisar importação":x.verificacao||"Pendente";
  const local=[x.bairro,x.zona].filter(Boolean).join(" · ")||x.endereco|| (geo||hasPolygon?"Com geometria":"Sem localização");
  return '<tr><td><strong>'+esc(x.nome)+'</strong><small>'+esc(x.fonte||"Cadastro municipal")+(x.codigo_cnes?" · CNES "+esc(x.codigo_cnes):"")+'</small></td>'+
  '<td>'+esc(x.tipo||"—")+'</td><td>'+esc(local)+'</td><td><span class="mi-state '+(x.verificacao==="Validado"?"ok":"pending")+'">'+esc(estado)+'</span></td>'+
  '<td><div class="mi-row-actions"><button type="button" data-map-index="'+i+'">Mapa</button><button type="button" data-edit-index="'+i+'">Editar</button></div></td></tr>';
 }).join(""):'<tr><td colspan="5" class="mi-empty">Nenhum registro. Importe dados oficiais ou confira os cadastros já existentes.</td></tr>';
 target.querySelectorAll("[data-map-index]").forEach(btn=>btn.onclick=()=>focusFeature(rows[Number(btn.dataset.mapIndex)]));
 target.querySelectorAll("[data-edit-index]").forEach(btn=>btn.onclick=()=>openEditor(rows[Number(btn.dataset.editIndex)]));
 renderMarkers();
}
function initMap(){
 if(!global.L||!$("mi-map")){$("mi-map").textContent="A biblioteca cartográfica não está disponível. A tabela permanece funcional.";return;}
 if(map){map.remove();map=null;}
 const p=ctx.db.municipioAtivo();
 const centro=globalThis.AlertaGestaoDados.config.centro(p);
 map=L.map("mi-map",{zoomControl:true}).setView(centro||[0,0],centro?12:2);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:"&copy; OpenStreetMap contributors"}).addTo(map);
 geoLayer=L.layerGroup().addTo(map);markerLayer=L.layerGroup().addTo(map);
 renderMarkers();setTimeout(()=>map.invalidateSize(),80);
}
function renderMarkers(){
 if(!map||!geoLayer||!markerLayer)return;
 geoLayer.clearLayers();markerLayer.clearLayers();
 const prefeitura=ctx.db.municipioAtivo(),geometry=stage.geo||prefeitura?.limite_geojson;
 if(geometry){try{
  const polygon=typeof geometry==="string"?JSON.parse(geometry):geometry;
  const g=L.geoJSON(polygon,{style:{color:"#f7be63",weight:2,fillOpacity:.045}}).addTo(geoLayer);
  if(g.getBounds().isValid())map.fitBounds(g.getBounds(),{padding:[15,15],maxZoom:13});
 }catch(_){log("Mapa","Geometria municipal não pôde ser desenhada.","warn");}}
 for(const x of selectedRows().slice(0,600)){
  const latlng=C.normalizeCoordinates(x.lat,x.lng);
  if(latlng){
   const marker=L.circleMarker([latlng.lat,latlng.lng],{radius:6,color:"#0b1826",weight:2,fillColor:tab==="saude"?"#39c7b1":"#f7b861",fillOpacity:.95});
   marker.bindPopup('<strong>'+esc(x.nome)+'</strong><br>'+esc(x.tipo||"")+'<br><small>'+esc(x.verificacao||"Pendente")+'</small>');
   marker.addTo(markerLayer);
  }else if(x.geojson&&["bairros","riscos","zonas"].includes(tab)){
   try{L.geoJSON(JSON.parse(x.geojson),{style:{color:tab==="riscos"?"#fd6571":"#55acdd",weight:1.5,fillOpacity:.09}}).addTo(geoLayer);}catch(_){}
  }
 }
}
function focusFeature(x){
 if(!x||!map)return;
 const point=C.normalizeCoordinates(x.lat,x.lng);
 if(point){map.flyTo([point.lat,point.lng],15);return;}
 if(x.geojson){
  try{const g=L.geoJSON(JSON.parse(x.geojson));if(g.getBounds().isValid())map.fitBounds(g.getBounds(),{padding:[20,20]});}
  catch(_){}
 }else notify("Registro sem coordenadas. Use Editar para cadastrar latitude e longitude verificadas.");
}
function openEditor(x){
 if(!x)return;activeEdit={...x};
 const target=$("mi-editor");if(!target)return;target.hidden=false;
 target.innerHTML='<h2>Conferir e editar registro</h2><p class="page-subtitle">Os dados importados podem ser ajustados antes de salvar. Não altere a localização sem confirmar a fonte.</p>'+
 '<form id="mi-edit-form"><div class="mi-fields">'+[
 ["nome","Nome","text"],["tipo","Tipo","text"],["endereco","Endereço público","text"],["bairro","Bairro","text"],
 ["zona","Zona operacional","text"],["lat","Latitude","text"],["lng","Longitude","text"],
 ["codigo_cnes","CNES","text"],["verificacao","Verificação","select"]
 ].map(([k,label,type])=>'<label>'+esc(label)+(type==="select"?
 '<select name="'+k+'">'+["Pendente","Em conferência","Validado","Rejeitado"].map(v=>'<option value="'+v+'"'+(String(x[k])===v?" selected":"")+'>'+v+'</option>').join("")+'</select>':
 '<input name="'+k+'" type="text" value="'+esc(x[k]??"")+'">')+'</label>').join("")+'</div>'+
 '<div class="mi-edit-actions"><button class="btn btn-primary" type="submit">Salvar conferência</button><button id="mi-cancel-edit" type="button" class="btn">Cancelar</button></div></form>';
 $("mi-cancel-edit").onclick=()=>{target.hidden=true;activeEdit=null;};
 $("mi-edit-form").onsubmit=async e=>{e.preventDefault();const form=new FormData(e.currentTarget),v={...activeEdit};
  for(const [k,value] of form.entries())v[k]=String(value).trim();
  const locationGiven=String(v.lat||"").trim()||String(v.lng||"").trim();
  const xy=C.normalizeCoordinates(v.lat,v.lng);
  if(locationGiven&&!xy){notify("Coordenadas inválidas ou fora do território configurado.");return;}
  if(xy){v.lat=xy.lat;v.lng=xy.lng;}
  if(!v.nome){notify("Informe o nome.");return;}
  const keys=stage.grupos[tab]||[],key=C.uniqueKey(activeEdit),idx=keys.findIndex(r=>C.uniqueKey(r)===key);
  if(idx>=0){keys[idx]=v;stage.grupos[tab]=keys;}
  else{
   try{
    const module=tab,old=ctx.db.registro(module,activeEdit.id);
    if(old){const schema=D.ESQUEMAS[module];const fields={};for(const f of schema.fields)fields[f.key]=v[f.key]??old[f.key]??"";
     await ctx.db.gravar(module,fields,old.id);}
    else addStage(tab,[v]);
   }catch(err){notify(err.message);return;}
  }
  target.hidden=true;activeEdit=null;notify("Conferência registrada.");renderTerritory();
 };
 target.scrollIntoView({behavior:"smooth",block:"nearest"});
}
const request=async(url,timeout=20000)=>{
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
 try{const r=await fetch(url,{headers:{Accept:"application/json"},signal:ctrl.signal,cache:"no-cache"});
  if(!r.ok)throw Error("HTTP "+r.status);
  return await r.json();
 }finally{clearTimeout(timer);}
};
