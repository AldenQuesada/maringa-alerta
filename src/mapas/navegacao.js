/* navegacao: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({$,INVENTARIO,TIPO,cidadeContexto,colaboradoresDisponiveis,esc,map,nomeTipo,nomesZonasOficiais,poligonos,render,state}){
function alertar(msg){
 const t=$("toast");t.textContent=msg;t.hidden=false;clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>{t.hidden=true;},4500);
}
function opts(el,items,selected,prefix) {
 el.innerHTML=(prefix||"")+items.map(x=>'<option value="'+esc(x.id??x)+'"'+(String(x.id??x)===String(selected)?' selected':'')+'>'+esc(x.nome??x)+'</option>').join("");
}
function municipSelector(){
 const el=$("municipio"),lista=state.app.db.municipios();
 opts(el,lista.map(x=>({id:x.id,nome:x.nome+" / "+x.uf})),state.app.prefeitura()?.id);
 el.disabled=true;
 el.title="Município fixado pelo Admin Geral nesta sessão de demonstração.";
 el.onchange=()=>{
  state.app=MaringaCrise.criar({municipioId:cidadeContexto(),escopoMunicipal:true});
  state.filtroZona="";state.filtroClasse="";state.texto="";state.camadaAtual="principal";
  $("busca").value="";$("filtro").value="";
  renderMunicipio();configurarCamadas();render();
  if(state.territorio){state.territorio.destroy();state.territorio=null;}
  if(AlertaGestaoDados.config.referencias(state.app.prefeitura()).catalogoBairros&&globalThis[AlertaGestaoDados.config.referencias(state.app.prefeitura()).catalogoBairros])
    state.territorio=globalThis[AlertaGestaoDados.config.referencias(state.app.prefeitura()).catalogoBairros].iniciar({map,L,simulatedLayers:poligonos.getLayers(),recolherInicial:TIPO==="ajuda"});
 };
}
function zoneSelect(){
 opts($("zona"),[...new Set([...state.app.zonas(),...nomesZonasOficiais,...colaboradoresDisponiveis().map(x=>x.zona).filter(Boolean),...INVENTARIO.registros(state.app.db).map(x=>x.zona).filter(Boolean)])].sort((a,b)=>a.localeCompare(b,"pt-BR",{numeric:true})),state.filtroZona,'<option value="">Todas as zonas</option>');
 $("zona").value=state.filtroZona;
}
function configurarCamadas(){
 const camadas=INVENTARIO.resumo(state.app.db),grupo=new Map();
 for(const x of camadas){if(x.id===(TIPO==="ajuda"?"solicitacoes":"voluntarios"))continue;if(!grupo.has(x.grupo))grupo.set(x.grupo,[]);grupo.get(x.grupo).push(x);}
 const opt=(id,n)=>'<option value="'+esc(id)+'"'+(id===state.camadaAtual?' selected':'')+'>'+esc(n)+'</option>';
 $("camada").innerHTML=opt("principal",TIPO==="ajuda"?"Pedidos de ajuda":"Colaboradores")+
  [...grupo].map(([name,items])=>'<optgroup label="'+esc(name)+'">'+items.map(x=>opt(x.id,x.nome+" ("+x.total+")")).join("")+'</optgroup>').join("");
 const principal=state.camadaAtual==="principal",xs=principal?[]:INVENTARIO.registros(state.app.db).filter(x=>x.modulo===state.camadaAtual);
 $("filtro-label").textContent=principal?(TIPO==="ajuda"?"Situação":"Pessoa"):"Situação ou tipo";
 if(principal)$("filtro").innerHTML=TIPO==="ajuda"?'<option value="">Todas as situações</option><option>Aguardando</option><option>Encaminhada</option><option>Cheguei</option><option>Atendida</option>':'<option value="">Física e jurídica</option><option value="FÍSICA">Pessoa física</option><option value="JURÍDICA">Pessoa jurídica</option>';
 else opts($("filtro"),INVENTARIO.classes(xs),state.filtroClasse,'<option value="">Todos os tipos e situações</option>');
 $("filtro").value=state.filtroClasse;
 $("list-title").textContent=principal?(TIPO==="ajuda"?"Pedidos registrados":"Ofertas de ajuda"):(camadas.find(x=>x.id===state.camadaAtual)?.nome||"Cadastros");
 $("busca").placeholder=principal?"Alimentos, telhas, limpeza...":"Buscar nome, tipo, zona ou recurso";
 $("command").hidden=!principal;
 zoneSelect();
}
function renderMunicipio(){
 if($("map-label"))$("map-label").textContent=nomeTipo+" · "+(state.app.prefeitura()?.nome||"Município");
 poligonos.clearLayers();
 const p=state.app.prefeitura(),centro=AlertaGestaoDados.config.centro(p);
 if(p?.limite_geojson){
  try{
   const geo=typeof p.limite_geojson==="string"?JSON.parse(p.limite_geojson):p.limite_geojson;
   const bounds=L.geoJSON(geo).getBounds();
   if(bounds?.isValid())map.fitBounds(bounds,{padding:[24,24],maxZoom:12});
  }catch(_){}
 }else if(centro)map.setView(centro,12);
 zoneSelect();setTimeout(()=>map.invalidateSize(),100);
}
return {alertar,opts,municipSelector,zoneSelect,configurarCamadas,renderMunicipio};
}
root.AlertaMapasNavegacao={criar};
})(globalThis);
