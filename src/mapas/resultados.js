/* resultados: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({$,INVENTARIO,TIPO,alertar,caps,colaboradoresDisponiveis,comandoBrigadas,comandoPrefeituras,dadosFiltrados,esc,fichaPonto,map,marcadores,pontoZona,renderColaboradoresAjuda,renderEquipePorBairro,renderUnidadesMunicipais,state}){
function renderCards(xs) {
 const el=$("results");$("list-count").textContent=xs.length+" registro"+(xs.length===1?"":"s");
 if(state.camadaAtual!=="principal"){
  el.innerHTML=xs.map(x=>'<article class="result canonical-result"><div class="result-top"><strong>'+esc(x.nome)+'</strong><span class="result-tag">'+esc(x.classe)+'</span></div><small>'+esc(x.moduloNome)+' · '+esc(x.zona||x.bairro||"Sem zona vinculada")+'</small><small>'+esc(x.detalhes.slice(0,180))+'</small><div class="canonical-actions">'+(x.georreferenciado?'<button type="button" data-loc="'+esc(x.chave)+'">Localizar</button>':'<small>Sem coordenadas</small>')+'<a href="../gestao/#'+encodeURIComponent(x.modulo)+'" target="_blank" rel="noopener">Abrir cadastro</a></div></article>').join("")||'<p class="empty">Nenhum registro neste filtro.</p>';
  el.querySelectorAll("[data-loc]").forEach(b=>b.onclick=async()=>{const x=xs.find(y=>y.chave===b.dataset.loc);if(x?.georreferenciado)map.flyTo([x.lat,x.lng],Math.max(map.getZoom(),15));});
  return;
 }
 if(TIPO==="colaboradores"){renderEquipePorBairro(xs);return;}
 if(!xs.length){el.innerHTML='<div class="empty">Nenhum registro neste filtro.<p>Cadastre pelo WhatsApp simulado ou use a Gestão para adicionar dados.</p><a class="btn" href="../atendimento/" target="_blank" rel="noopener">Abrir atendimento</a></div>';return;}
 el.innerHTML=xs.map((x,i)=>{
  const tags=TIPO==="ajuda"?(x.status||"Aguardando"):(x.tipo_pessoa||"Colaborador");
  const subtitulo=TIPO==="ajuda"?
    '<strong>'+esc(x.necessidade==="Outro"?"Pedido de ajuda":x.necessidade||"Pedido")+'</strong><small>Zona: '+esc(x.zona||"Não indicada")+' · '+esc(x.urgencia||"Normal")+'</small>'+
    '<small>Detalhes e endereço reservados ao atendimento.</small><small>'+esc(x.atribuido_a?"Há colaborador compatível indicado (simulação)":"Sem colaborador encaminhado")+'</small>':
    '<strong>'+esc(x.tipo_pessoa==="JURÍDICA"?"Empresa / organização":"Pessoa física")+'</strong>'+
    '<small>Zona: '+esc(x.zona||"Não indicada")+'</small>'+
    '<small>'+esc(caps(x).slice(0,5).join(" · ")||x.contribuicao||"Contribuição a detalhar")+'</small>';
  return '<button type="button" class="result" data-result="'+esc(x.id)+'"><div class="result-top"><span>Registro '+(i+1).toString().padStart(2,"0")+'</span>'+
    '<span class="result-tag'+(TIPO==="ajuda"&&x.urgencia==="Crítica"?" urgente":x.tipo_pessoa==="JURÍDICA"?" pj":"")+'">'+esc(tags)+'</span></div>'+subtitulo+'</button>';
 }).join("");
 el.querySelectorAll("[data-result]").forEach(btn=>btn.onclick=()=>{
  const chosen=xs.find(x=>x.id===btn.dataset.result);
  const pt=pontoZona(chosen?.zona);
  if(pt){map.flyTo([pt.lat,pt.lng],Math.max(map.getZoom(),13));alertar("Localização aproximada da zona "+(chosen.zona||"indicada")+".");}
 });
}
function renderMarkers(xs){
 marcadores.clearLayers();
 if(state.camadaAtual!=="principal"){
  if(!state.mostrarUnidades)return;
  for(const x of xs.filter(x=>x.georreferenciado)){
   const icon=INVENTARIO.simbolo(x);
   const ic=L.divIcon({className:"pin canonical-map-pin",html:'<span class="canonical-pin">'+icon+'</span>',iconSize:[32,32],iconAnchor:[16,32]});
   L.marker([x.lat,x.lng],{icon:ic,title:x.nome}).bindTooltip('<strong>'+esc(x.nome)+'</strong><br>'+esc(x.endereco||"Endereço não informado"),{direction:"top"}).on("click",()=>fichaPonto.abrir(x)).addTo(marcadores);
  }
  return;
 }
 const grupos=new Map();
 for(const x of xs){const zona=x.zona||"Não informada";grupos.set(zona,(grupos.get(zona)||0)+1);}
 for(const [zona,quantidade] of grupos.entries()){
  const pt=pontoZona(zona);if(!pt)continue;
  const tipoClass=TIPO==="ajuda"?"help":"collab";
  const ic=L.divIcon({html:'<div class="bubble">'+quantidade+'</div>',className:"pin "+tipoClass,iconSize:[44,44],iconAnchor:[22,22]});
  L.marker([pt.lat,pt.lng],{icon:ic,title:quantidade+" registros na zona "+zona})
   .bindPopup('<strong>'+esc(zona)+'</strong><p>'+quantidade+' '+(TIPO==="ajuda"?"pedidos de ajuda":"colaboradores")+'</p><small>Marcador por zona, não representa endereço residencial.</small>')
   .addTo(marcadores).on("click",()=>{if(zona!=="Não informada"){state.filtroZona=zona;$("zona").value=zona;render();}});
 }
}
function counters(xs){
 if(state.camadaAtual!=="principal"){
  $("metric-one").textContent=xs.length;
  $("metric-two").textContent=new Set(xs.map(x=>x.zona).filter(Boolean)).size;
  $("metric-three").textContent=xs.filter(x=>x.georreferenciado).length;
  $("metric-one-label").textContent="Registros filtrados";
  $("metric-two-label").textContent="Zonas vinculadas";
  $("metric-three-label").textContent="No mapa";
  return;
 }
 const all=TIPO==="ajuda"?state.app.pedidos():colaboradoresDisponiveis();
 const zonas=new Set(all.map(x=>x.zona).filter(Boolean)).size;
 $("metric-one").textContent=all.length;
 $("metric-two").textContent=zonas;
 $("metric-three").textContent=TIPO==="ajuda"?
  all.filter(x=>x.status==="Aguardando").length:
  all.filter(x=>x.checkin_status==="presente"&&x.checkin_bairro&&String(x.checkin_bairro).localeCompare(String(x.bairro||x.zona||""),"pt-BR",{sensitivity:"base"})===0).length;
 $("metric-one-label").textContent=TIPO==="ajuda"?"Pedidos":"Colaboradores";
 $("metric-two-label").textContent="Zonas com registros";
 $("metric-three-label").textContent=TIPO==="ajuda"?"Aguardando":"Check-ins GPS";
}
function render(){
 const xs=dadosFiltrados();
 renderCards(xs);renderMarkers(xs);renderColaboradoresAjuda();counters(xs);renderUnidadesMunicipais();
 if(state.camadaAtual==="principal"){
  $("command").hidden=false;
  if(TIPO==="ajuda")comandoPrefeituras();else comandoBrigadas();
 }else $("command").hidden=true;
}
return {renderCards,renderMarkers,counters,render};
}
root.AlertaMapasResultados={criar};
})(globalThis);
