/* territorio: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({$,INVENTARIO,TIPO,esc,fichaPonto,filtrosCadastros,iniciarCozinhasDemo,nomesZonasOficiais,poligonos,pontosBairrosOficiais,pontosZonasOficiais,render,state,unidadesMunicipais,zoneSelect}){
function pontoZona(nome){return state.app.pontoDaZona(nome)||pontosZonasOficiais.get(INVENTARIO.normal(nome))||null;}
async function carregarZonasOficiais(){
 if(state.zonasConsultadas||!AlertaGestaoDados.config.referencias(state.app.prefeitura()).catalogoBairros||!globalThis[AlertaGestaoDados.config.referencias(state.app.prefeitura()).catalogoBairros])return;
 state.zonasConsultadas=true;
 try{
  const dados=await globalThis[AlertaGestaoDados.config.referencias(state.app.prefeitura()).catalogoBairros].carregar();
  for(const feature of dados.bairros?.features||[]){
   const nome=String(feature.properties?.nome||"").trim();
   if(!nome)continue;
   const bounds=L.geoJSON(feature).getBounds();if(!bounds?.isValid())continue;
   const centro=bounds.getCenter();pontosBairrosOficiais.set(INVENTARIO.normal(nome),{lat:centro.lat,lng:centro.lng,label:nome});
  }
  for(const feature of dados.zonasNumeradas?.features||[]){
   const nome=String(feature.properties?.nome||"").trim();
   if(!/^Zona\s*\d+$/i.test(nome))continue;
   const layer=L.geoJSON(feature,{
    style:{color:"#e7b94c",weight:1.6,fillColor:"#e7b94c",fillOpacity:.035,dashArray:"5 5"},
    onEachFeature:(_f,shape)=>{shape.bindTooltip(nome,{sticky:true});shape.on("click",()=>{state.filtroZona=nome;zoneSelect();render();});}
   });
   const bounds=layer.getBounds();if(!bounds?.isValid())continue;
   const centro=bounds.getCenter();
   pontosZonasOficiais.set(INVENTARIO.normal(nome),{lat:centro.lat,lng:centro.lng,label:nome});
   nomesZonasOficiais.push(nome);poligonos.addLayer(layer);
  }
  zoneSelect();render();if(TIPO==="ajuda")iniciarCozinhasDemo();
 }catch(error){state.zonasConsultadas=false;console.warn("Zonas numeradas indisponíveis",error);}
}
function renderUnidadesMunicipais(){
 unidadesMunicipais.clearLayers();
 const todos=INVENTARIO.registros(state.app.db).filter(x=>x.georreferenciado&&!x.privado);
 const visiveis=state.camadaAtual==="principal"&&state.mostrarUnidades&&filtrosCadastros.mostrar()?filtrosCadastros.rows().filter(x=>x.georreferenciado&&!x.privado).filter(x=>INVENTARIO.filtrar([x],{zona:state.filtroZona,busca:state.texto}).length):[];
 const indicador=$("mostrar-unidades-texto");
 if(indicador)indicador.textContent="Mostrar unidades e recursos ("+todos.length+" georreferenciados)";
 for(const x of visiveis){
  const simbolo=INVENTARIO.simbolo(x);
  const icon=L.divIcon({className:"pin canonical-map-pin",html:'<span class="canonical-pin">'+simbolo+"</span>",iconSize:[32,32],iconAnchor:[16,32]});
  const detalhes=[x.moduloNome,x.categoria,x.situacao,x.precisao,x.horario,x.telefone,x.detalhes].filter(Boolean).map(esc).join(" · ");
  const local=x.endereco?"<p>"+esc(x.endereco)+"</p>":"";
  const fonte=x.fonteUrl?'<a href="'+esc(x.fonteUrl)+'" target="_blank" rel="noopener">Fonte</a>':"";
  L.marker([x.lat,x.lng],{icon,title:x.nome}).bindTooltip("<strong>"+esc(x.nome)+"</strong><br>"+esc(x.endereco||"Endereço não informado"),{direction:"top"}).on("click",()=>fichaPonto.abrir(x)).addTo(unidadesMunicipais);
 }
 return visiveis.length;
}
return {pontoZona,carregarZonasOficiais,renderUnidadesMunicipais};
}
root.AlertaMapasTerritorio={criar};
})(globalThis);
