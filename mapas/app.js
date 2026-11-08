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
/* consultas: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({INVENTARIO,TIPO,filtrosCadastros,state}){
function colaboradoresDisponiveis(){
 if(state.app.db.tipo==="supabase")return state.app.oferentes();
 const municipio=state.app.prefeitura()?.id;
 const anterior=municipio?OperacaoRestauracao.ler(localStorage,`alerta_prototipo_v2_${municipio}_operacao`,municipio):null;
 return ColaboradoresReferencia.listar(state.app.oferentes(),anterior);
}
function dadosFiltrados(){
 const inventario=INVENTARIO.registros(state.app.db);
 if(state.camadaAtual!=="principal")return INVENTARIO.filtrar(inventario,{modulo:state.camadaAtual,zona:state.filtroZona,classe:state.filtroClasse,busca:state.texto}).filter(filtrosCadastros.aceita);

 const xs=TIPO==="ajuda"?state.app.pedidos():colaboradoresDisponiveis();
 return xs.filter(x=>{
  if(state.filtroZona&&!(x.registroAnterior?INVENTARIO.normal(x.zona||x.bairro)===INVENTARIO.normal(state.filtroZona):INVENTARIO.filtrar(inventario,{modulo:TIPO==="ajuda"?"solicitacoes":"voluntarios",zona:state.filtroZona}).some(item=>item.id===String(x.id))))return false;
  if(state.filtroClasse&&(TIPO==="ajuda"?x.status:x.tipo_pessoa)!==state.filtroClasse)return false;
  if(state.texto){
   const campos=TIPO==="ajuda"?[x.necessidade,x.descricao,x.zona]:
     [x.nome,x.ajudas,x.maquinas,x.empreendedores,x.materiais,x.contribuicao,x.outros,x.zona,x.bairro];
   if(!campos.flat().join(" ").toLocaleLowerCase("pt-BR").includes(state.texto.toLocaleLowerCase("pt-BR")))return false;
  }
  return true;
 });
}
function colaboradoresAjudaFiltrados(){
 const inventario=INVENTARIO.registros(state.app.db);
 const permitidos=state.filtroZona?new Set(INVENTARIO.filtrar(inventario,{modulo:"voluntarios",zona:state.filtroZona}).map(x=>x.id)):null;
 const busca=INVENTARIO.normal(state.texto);
 return colaboradoresDisponiveis().filter(p=>{
  if(permitidos&&!(p.registroAnterior?INVENTARIO.normal(p.zona||p.bairro)===INVENTARIO.normal(state.filtroZona):permitidos.has(String(p.id))))return false;
  return !busca||INVENTARIO.normal([p.nome,p.zona,p.bairro,p.contribuicao,p.ajudas,p.maquinas,p.empreendedores,p.materiais,p.outros].flat().filter(Boolean).join(" ")).includes(busca);
 });
}
return {colaboradoresDisponiveis,dadosFiltrados,colaboradoresAjudaFiltrados};
}
root.AlertaMapasConsultas={criar};
})(globalThis);
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
/* colaboradores: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({$,INVENTARIO,TIPO,alertar,caps,colaboradoresAjudaFiltrados,dadosFiltrados,esc,marcadores,pontoZona,pontosBairrosOficiais,render,state}){
function renderEquipePorBairro(xs){
 return renderEquipeNoElemento(xs,$("results"));
}
function renderEquipeNoElemento(xs,el){
 const grupos=new Map();
 for(const pessoa of xs){const bairro=String(pessoa.bairro||pessoa.zona||"Bairro não informado").trim();if(!grupos.has(bairro))grupos.set(bairro,[]);grupos.get(bairro).push(pessoa);}
 if(!xs.length){el.innerHTML='<div class="empty">Não há colaboradores cadastrados neste filtro.</div>';return;}
 el.innerHTML=[...grupos.entries()].map(([bairro,pessoas])=>{
  const presentes=pessoas.filter(x=>x.checkin_status==="presente"&&String(x.checkin_bairro||"").localeCompare(bairro,"pt-BR",{sensitivity:"base"})===0).length;
  const perc=Math.round(presentes*100/pessoas.length);
  return '<section class="team-bairro"><header><strong>'+esc(bairro)+'</strong><small>Colab: '+pessoas.length+' · Ativ: '+presentes+' · '+perc+'%</small></header>'+
   '<div class="team-progress"><span style="width:'+perc+'%"></span></div>'+
   pessoas.map(x=>'<div class="team-member"><div><b>'+esc(x.nome||"Colaborador")+'</b><small>'+esc(x.status_simulacao==="simulado"?"DEMONSTRAÇÃO · Não é colaborador real":x.checkin_status==="presente"?"Presente · GPS autodeclarado":x.checkin_status==="finalizado"?"Saída registrada":"Aguardando chegada")+'</small>'+
    (caps(x).length?'<small>'+esc(caps(x).slice(0,3).join(" · ")+(caps(x).length>3?" +"+(caps(x).length-3)+" capacidades":""))+'</small>':'')+
    (x.forma_entrega_doacao?'<small>Doação: '+esc(x.forma_entrega_doacao)+'</small>':'')+'</div>'+
    (x.status_simulacao==="simulado"?'<small>Simulação · sem check-in</small>':x.registroAnterior?'<small>Registro anterior</small>':x.checkin_status==="presente"?'<button type="button" data-saida="'+esc(x.id)+'">Registrar saída</button>':
    '<button type="button" data-checkin="'+esc(x.id)+'"'+(bairro==="Bairro não informado"?' disabled title="Cadastre o bairro antes"':'')+'>Check-in GPS</button>')+
    '</div>').join("")+'</section>';
 }).join("")+'<p class="presence-note">'+(root.AlertaNuvem?.ativo?'Check-in registrado no cadastro municipal: exige permissão GPS, precisão de até '+esc(root.AlertaRegrasOperacionais?.gpsPrecisaoMaxima??100)+' m e polígono de bairro compatível. A localização é autodeclarada.':'Check-in local experimental: exige permissão GPS, precisão de até '+esc(root.AlertaGestaoDados.parametros.gps.precisaoMaximaMetros)+' m e polígono de bairro compatível. Não comprova identidade nem sincroniza entre dispositivos.')+'</p>';
 el.querySelectorAll("[data-checkin]").forEach(b=>b.onclick=()=>void iniciarCheckin(b.dataset.checkin,b));
 el.querySelectorAll("[data-saida]").forEach(b=>b.onclick=async()=>{
  try{await state.app.registrarSaida(b.dataset.saida);render();alertar("Saída registrada.");}catch(err){alertar(err.message);}
 });
}
async function iniciarCheckin(id,button){
 const pessoa=state.app.oferentes().find(x=>x.id===id);
 const bairro=String(pessoa?.bairro||pessoa?.zona||"").trim();
 if(!bairro){alertar("Cadastre o bairro de origem do colaborador.");return;}
 if(!navigator.geolocation){alertar("Geolocalização indisponível neste dispositivo.");return;}
 button.disabled=true;button.textContent="Validando GPS...";
 try{
  const dados=await globalThis[AlertaGestaoDados.config.referencias(state.app.prefeitura()).catalogoBairros]?.carregar();
  const f=dados?.bairros?.features?.find(x=>String(x.properties?.nome||"").localeCompare(bairro,"pt-BR",{sensitivity:"base"})===0);
  if(!f)throw Error("Bairro não encontrado na malha territorial. Confira o cadastro; não foi registrado check-in.");
  const coords=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(p=>resolve(p.coords),reject,{enableHighAccuracy:true,maximumAge:0,timeout:20000}));
  await state.app.registrarCheckin({colaboradorId:id,bairro,lat:coords.latitude,lng:coords.longitude,precisao:coords.accuracy,geometry:f.geometry,origem:dados.bairros.source});
  render();alertar("Check-in registrado no bairro "+bairro+" neste navegador.");
 }catch(err){alertar("Check-in não confirmado: "+(err.message||"GPS indisponível"));button.disabled=false;button.textContent="Check-in GPS";}
}
function renderColaboradoresAjuda(){
 if(TIPO!=="ajuda"||state.camadaAtual!=="principal")return;
 const pessoas=colaboradoresAjudaFiltrados();
 $("list-title").textContent="Colaboradores e pedidos";
 $("list-count").textContent=pessoas.length+" colaboradores · "+dadosFiltrados().length+" pedidos";
 const secao=document.createElement("section");secao.className="ajuda-colaboradores";
 const titulo=document.createElement("h2");titulo.textContent="Colaboradores ("+pessoas.length+")";
 const nota=document.createElement("p");nota.className="presence-note";
 nota.textContent="Mesmos cadastros do Mapa de Colaboradores. A situação selecionada acima filtra os pedidos.";
 const lista=document.createElement("div");secao.append(titulo,nota,lista);$("results").prepend(secao);
 renderEquipeNoElemento(pessoas,lista);
 const registroPorId=new Map(INVENTARIO.registros(state.app.db).filter(x=>x.modulo==="voluntarios").map(x=>[x.id,x]));
 const ocupacao=new Map();
 for(const pessoa of pessoas){
  const registro=registroPorId.get(String(pessoa.id));
  const temCheckin=pessoa.checkin_status==="presente"&&pessoa.checkin_lat!=null&&pessoa.checkin_lng!=null&&pessoa.checkin_lat!==""&&pessoa.checkin_lng!==""&&Number.isFinite(Number(pessoa.checkin_lat))&&Number.isFinite(Number(pessoa.checkin_lng));
  const area=pessoa.bairro||registro?.bairro||pessoa.zona||registro?.zona;
  let base=temCheckin?{lat:Number(pessoa.checkin_lat),lng:Number(pessoa.checkin_lng)}:(pessoa.registroAnterior||pessoa.posicaoAnterior)&&Array.isArray(pessoa.posicaoAnterior||pessoa.pos)&&(pessoa.posicaoAnterior||pessoa.pos).length>=2&&(pessoa.posicaoAnterior||pessoa.pos).every(Number.isFinite)?{lat:(pessoa.posicaoAnterior||pessoa.pos)[0],lng:(pessoa.posicaoAnterior||pessoa.pos)[1]}:pontosBairrosOficiais.get(INVENTARIO.normal(area))||pontoZona(pessoa.zona||registro?.zona||area);
  let ilustrativo=false;
  if(!base&&pessoa.status_simulacao==="simulado"&&pontosBairrosOficiais.size){
   const opcoes=[...pontosBairrosOficiais.values()];let hash=0;for(const c of String(area||pessoa.id))hash=(hash*31+c.charCodeAt(0))>>>0;
   base=opcoes[hash%opcoes.length];ilustrativo=true;
  }
  if(!base)continue;
  const chave=base.lat+":"+base.lng,indice=(ocupacao.get(chave)||0);ocupacao.set(chave,indice+1);
  const ic=L.divIcon({html:'<div class="pessoa-azul"></div>',className:"pin collab pessoa-individual",iconSize:[20,20],iconAnchor:[10-((indice%5)-2)*14,10-Math.floor(indice/5)*14]});
  const local=temCheckin?"Último check-in registrado":ilustrativo?"Posição ilustrativa, região não confirmada":pessoa.registroAnterior||pessoa.posicaoAnterior?"Posição de demonstração anterior":"Localização aproximada da área";
  L.marker([base.lat,base.lng],{icon:ic,title:pessoa.nome}).bindTooltip('<strong>'+esc(pessoa.nome)+'</strong><br>'+esc(area||"Área não informada")+' · '+esc(local),{direction:"top"}).addTo(marcadores);
 }

}
return {renderEquipePorBairro,renderEquipeNoElemento,iniciarCheckin,renderColaboradoresAjuda};
}
root.AlertaMapasColaboradores={criar};
})(globalThis);
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
/* comandos: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({$,alertar,esc,opts,state}){
function setOutput(html){const el=$("command-output");if(el)el.innerHTML=html;}
function comandoBrigadas(){
 $("command-title").textContent="Ativar brigada da zona";
 $("command-content").innerHTML='<form id="brigada-form" class="command-fields"><label for="brigada-zona">Zona da brigada</label>'+
 '<select id="brigada-zona" required></select><label for="brigada-mensagem">Instrução para os colaboradores</label>'+
 '<textarea id="brigada-mensagem" maxlength="1000" placeholder="Ex.: Apoio à retirada de resíduos após vendaval."></textarea>'+
 '<button data-permission-collection="mobilizacoes" type="submit" class="btn btn-main">Preparar mobilização</button></form>'+
 '<div id="command-output" class="command-output" hidden></div><p class="notice">Um clique prepara a mobilização de todos os colaboradores e equipes disponíveis da zona. O envio individual pelo WhatsApp só ocorre após uma ação externa; a API de disparo ainda não está integrada.</p>';
 opts($("brigada-zona"),state.app.zonas(),state.filtroZona,'<option value="">Escolha a zona</option>');
 $("brigada-form").onsubmit=async e=>{
  e.preventDefault();
  try{
   const result=await state.app.acionarBrigada($("brigada-zona").value,$("brigada-mensagem").value);
   const out=$("command-output");out.hidden=false;
   out.innerHTML='<strong>Mobilização preparada</strong><p>'+result.destinatarios.length+' destinatários na zona '+esc($("brigada-zona").value)+'. Nenhuma mensagem foi enviada automaticamente.</p>'+
    (result.envios.map(x=>'<div class="output-item"><span>'+esc(x.nome)+' · '+esc(x.tipo)+'</span>'+(x.link?'<a href="'+esc(x.link)+'" target="_blank" rel="noopener noreferrer">Abrir WhatsApp</a>':'<span>Sem telefone</span>')+'</div>').join("")||'<div>Cadastre colaboradores ou equipes para essa zona.</div>');
   alertar("Mobilização registrada. Revise antes de enviar.");
  }catch(err){alertar(err.message);}
 };
}
function comandoPrefeituras(){
 $("command-title").textContent="Solicitar ajuda a outra prefeitura";
 $("command-content").innerHTML='<form id="inter-form" class="command-fields"><label for="inter-destino">Prefeitura destinatária</label>'+
 '<select id="inter-destino" required></select><label for="inter-recurso">Qual apoio ou recurso precisa?</label>'+
 '<textarea id="inter-recurso" required maxlength="1600" placeholder="Ex.: 2 caminhões basculantes, 1 retroescavadeira e 1 gerador."></textarea>'+
 '<button data-permission-collection="apoios" type="submit" class="btn btn-main">Preparar solicitação</button></form>'+
 '<div id="command-output" class="command-output" hidden></div>'+
 '<p class="notice">A solicitação é registrada no cadastro municipal. Se houver um telefone institucional cadastrado, abre-se um link de WhatsApp para revisão e envio manual. A troca entre prefeituras via API ainda não existe.</p>';
 const cidades=state.app.db.municipios().filter(x=>x.id!==state.app.prefeitura()?.id);
 opts($("inter-destino"),cidades,"",'<option value="">Selecione a prefeitura</option>');
 if(!cidades.length){
  $("inter-destino").disabled=true;
  $("inter-form").querySelector('button[type="submit"]').disabled=true;
  $("command-content").insertAdjacentHTML("beforeend",'<p class="notice">Cadastre outra prefeitura na <a href="../gestao/#prefeituras">Gestão</a> para preparar o pedido.</p>');
 }
 $("inter-form").onsubmit=async e=>{
  e.preventDefault();
  try{
   const x=await state.app.solicitarOutraPrefeitura($("inter-destino").value,$("inter-recurso").value);
   const out=$("command-output");out.hidden=false;
   out.innerHTML='<strong>Pedido preparado para '+esc(x.destino.nome)+'</strong>'+
    '<p>Registrado na prefeitura de origem; não transmitido ao destinatário.</p>'+
    (x.link?'<a class="btn" href="'+esc(x.link)+'" target="_blank" rel="noopener noreferrer">Revisar mensagem no WhatsApp</a>':
    '<p>Esta prefeitura não tem número institucional configurado. Cadastre-o antes de qualquer envio.</p>');
   alertar("Solicitação intermunicipal registrada no cadastro municipal.");
  }catch(err){alertar(err.message);}
 };
}
return {setOutput,comandoBrigadas,comandoPrefeituras};
}
root.AlertaMapasComandos={criar};
})(globalThis);
/* demonstracao: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({$,INVENTARIO,TIPO,cozinhasDemo,esc,map,novosColaboradoresDemo,pontosBairrosOficiais,state}){
function iniciarCozinhasDemo(){
 if(state.app.db.tipo==="supabase")return;
 if(TIPO!=="ajuda"||!AlertaGestaoDados.config.referencias(state.app.prefeitura()).mapaDemonstrativo)return;
 const candidatos=[...pontosBairrosOficiais.values()];
 state.cozinhasPontos=LogisticaDemo.selecionar(candidatos,20);
 cozinhasDemo.clearLayers();
 state.cozinhasPontos.forEach((p,i)=>{
  const nome="Cozinha "+String(i+1).padStart(2,"0")+" · simulação";
  const ic=L.divIcon({className:"cozinha-demo",html:'<span>🍲</span>',iconSize:[28,28],iconAnchor:[14,14]});
  L.marker([p.lat,p.lng],{icon:ic,title:nome,keyboard:true})
   .bindTooltip(esc(nome),{direction:"top"})
   .on("click",()=>abrirFichaCozinha(nome,p))
   .addTo(cozinhasDemo);
 });
 $("logistica-status").textContent=state.cozinhasPontos.length+" cozinhas demonstrativas";
 $("legenda-cozinhas").hidden=false;
 tentarIniciarCaminhao();
}
function abrirFichaCozinha(nome,ponto){
 const painel=$("painel-ajuda"),toggle=$("painel-ajuda-toggle"),ficha=$("ficha-cozinha");
 if(painel.hidden)toggle.click();
 $("ficha-cozinha-titulo").textContent=nome;
 const campos=[
  ["Responsável","Não informado"],
  ["Endereço","Não informado"],
  ["Região de referência",ponto.label+" · localização aproximada"],
  ["Telefone / WhatsApp","Não informado"],
  ["Capacidade","Quantidade de pessoas não informada"],
  ["Refeições por dia","Não informado"],
  ["Horário de funcionamento","Não informado"],
  ["Tipo de refeições","Não informado"],
  ["Itens necessários","Não informado"],
  ["Situação","A confirmar"]
 ];
 const lista=$("ficha-cozinha-dados");lista.replaceChildren();
 for(const [rotulo,valor] of campos){
  const linha=document.createElement("div"),dt=document.createElement("dt"),dd=document.createElement("dd");
  dt.textContent=rotulo;dd.textContent=valor;linha.append(dt,dd);lista.append(linha);
 }
 ficha.hidden=false;
 ficha.scrollIntoView({block:"nearest",behavior:"smooth"});
}
function tentarIniciarCaminhao(){
 if(state.app.db.tipo==="supabase")return;
 if(state.cicloAtivo&&!state.simulacaoIniciada&&state.cozinhasPontos.length&&INVENTARIO.registros(state.app.db).some(x=>x.modulo==="bases"&&x.categoria==="Centro de coleta de donativos"&&x.georreferenciado))iniciarCaminhaoDemo();
}
async function avisarNoDispositivo(mensagem){
 if(!("Notification" in window)||Notification.permission!=="granted")return;
 try{
  const registro="serviceWorker" in navigator?await navigator.serviceWorker.getRegistration():null;
  if(registro?.showNotification)await registro.showNotification("Simulação Pra Somar",{body:mensagem,tag:"pra-somar-demonstracao"});
  else new Notification("Simulação Pra Somar",{body:mensagem,tag:"pra-somar-demonstracao"});
 }catch(_){console.warn("Não foi possível exibir o aviso do navegador.");}
}
function iniciarCaminhaoDemo(){
 if(state.app.db.tipo==="supabase")return;
 if(state.simulacaoRodando)return;
 const base=INVENTARIO.registros(state.app.db).find(x=>x.modulo==="bases"&&x.categoria==="Centro de coleta de donativos"&&x.georreferenciado);
 if(!base||!state.cozinhasPontos.length){$("logistica-status").textContent="Aguarde o carregamento dos pontos para iniciar.";return;}
 state.cicloAtivo=true;state.simulacaoIniciada=true;state.simulacaoRodando=true;$("iniciar-caminhao").disabled=false;$("iniciar-caminhao").textContent="Parar simulação";
 const origem=[state.cozinhasPontos[0].lat,state.cozinhasPontos[0].lng],destino=[base.lat,base.lng];
 if(state.caminhaoDemo)map.removeLayer(state.caminhaoDemo);
 const ic=L.divIcon({className:"caminhao-demo",html:'<span>🚚</span>',iconSize:[36,36],iconAnchor:[18,18]});
 state.caminhaoDemo=L.marker(origem,{icon:ic,title:"Caminhão · simulação"}).bindTooltip("Caminhão em deslocamento simulado",{direction:"top"}).addTo(map);
 $("logistica-status").textContent="Caminhão em deslocamento simulado · 30 s";
 const inicio=performance.now();
 function passo(agora){
  const progresso=Math.min(1,(agora-inicio)/30000);
  state.caminhaoDemo.setLatLng(LogisticaDemo.interpolar(origem,destino,progresso));
  if(!state.cicloAtivo)return;
  if(progresso<1){state.frameCaminhao=requestAnimationFrame(passo);return;}
  state.simulacaoRodando=false;
  state.contadorDemo++;
  const ponto=state.cozinhasPontos[(state.contadorDemo-1)%state.cozinhasPontos.length];
  const icone=L.divIcon({className:"novo-colaborador-demo",html:'<span>+</span>',iconSize:[30,30],iconAnchor:[15,15]});
  L.marker([ponto.lat,ponto.lng],{icon:icone,title:"Novo colaborador simulado"}).bindTooltip("Novo colaborador · simulação",{direction:"top"}).addTo(novosColaboradoresDemo);
  $("logistica-status").textContent="Novo ciclo de demonstração";
  $("notificacao-texto").textContent="Simulação: caminhão chegou a "+base.nome+" e um novo colaborador apareceu no mapa. WhatsApp não conectado; nenhuma mensagem foi enviada.";
  $("notificacao-chegada").hidden=false;
  void avisarNoDispositivo("Caminhão chegou e novo colaborador apareceu. Dados simulados.");
  state.reinicioCaminhao=setTimeout(()=>{if(state.cicloAtivo)iniciarCaminhaoDemo();},100);
 }
 state.frameCaminhao=requestAnimationFrame(passo);
}
return {iniciarCozinhasDemo,abrirFichaCozinha,tentarIniciarCaminhao,avisarNoDispositivo,iniciarCaminhaoDemo};
}
root.AlertaMapasDemonstracao={criar};
})(globalThis);
/* Dois mapas standalone ligados aos cadastros locais; o mapa de eventos não é modificado. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const TIPO=new URLSearchParams(location.search).get("tipo")==="ajuda"?"ajuda":"colaboradores";
document.body.classList.toggle("mapa-ajuda",TIPO==="ajuda");
const cidadeContexto=()=>AlertaGestaoDados.config.selecionar(AlertaGestaoDados,sessionStorage);
const state={app:MaringaCrise.criar({municipioId:cidadeContexto(),escopoMunicipal:true}),filtroZona:"",filtroClasse:"",texto:"",camadaAtual:"principal",territorio:null,toastTimer:undefined,mostrarUnidades:true,zonasConsultadas:false,cozinhasPontos:[],caminhaoDemo:null,simulacaoRodando:false,simulacaoIniciada:false,cicloAtivo:true,frameCaminhao:null,reinicioCaminhao:null,contadorDemo:0};

const INVENTARIO=globalThis.AlertaInventarioMapas;
if($("map-data-status"))$("map-data-status").textContent=globalThis.AlertaNuvem?.ativo?"Cadastros municipais":"Dados locais · sem envio automático";

const nomeTipo=TIPO==="ajuda"?"Pra Somar "+(state.app.prefeitura()?.nome||"Município"):"Mapa de Colaboradores";
$("map-brand-title").textContent=TIPO==="ajuda"?(state.app.prefeitura()?.nome||"Município").toLocaleUpperCase("pt-BR")+" Pra Somar":AlertaGestaoDados.config.marca(state.app.prefeitura()).toLocaleUpperCase("pt-BR");
if($("pra-somar-brand-title"))$("pra-somar-brand-title").textContent=$("map-brand-title").textContent;
// Pra Somar já tem identificação no cabeçalho; retirar a caixa que encobre o mapa.
if(TIPO==="ajuda")document.querySelector(".map-info")?.remove();
document.title=nomeTipo+" | "+(state.app.prefeitura()?.nome||"Município")+" · Sistema Integrado de Crise";
$("nav-"+TIPO).classList.add("active");
$("title").textContent=TIPO==="ajuda"?"Pra Somar "+(state.app.prefeitura()?.nome||"Município"):"Colaboradores por zona";
$("eyebrow").textContent=TIPO==="ajuda"?"RECUPERAÇÃO PÓS-EVENTO":"REDE DE COLABORADORES";
$("subtitle").textContent=TIPO==="ajuda"?"Pessoas e empresas que precisam de apoio após uma crise.":"Pessoas físicas, empresas e recursos disponíveis antes da emergência.";
if($("map-label"))$("map-label").textContent=nomeTipo+" · "+(state.app.prefeitura()?.nome||"Município");
$("list-title").textContent=TIPO==="ajuda"?"Pedidos registrados":"Ofertas de ajuda";
$("filtro-label").textContent=TIPO==="ajuda"?"Situação":"Pessoa";
$("filtro").innerHTML=TIPO==="ajuda"?
 '<option value="">Todas as situações</option><option value="Aguardando">Aguardando</option><option value="Encaminhada">Encaminhada</option><option value="Cheguei">Cheguei</option><option value="Atendida">Atendida</option>':
 '<option value="">Física e jurídica</option><option value="FÍSICA">Pessoa física</option><option value="JURÍDICA">Pessoa jurídica</option>';

const map=L.map("map",{zoomControl:true,zoomSnap:0,zoomDelta:.5}).setView(AlertaGestaoDados.config.centro(state.app.prefeitura())||[0,0],AlertaGestaoDados.config.centro(state.app.prefeitura())?12:2);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
 maxZoom:18,subdomains:"abc",attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
const poligonos=L.layerGroup().addTo(map);
const marcadores=L.layerGroup().addTo(map);

const caps=x=>[x.ajudas,x.maquinas,x.empreendedores,x.materiais].flatMap(v=>Array.isArray(v)?v:typeof v==="string"?v.split(/[;,]/):[]).filter(Boolean);
/* Camadas geográficas do cadastro municipal, sem polígonos fictícios. */
const unidadesMunicipais=L.layerGroup().addTo(map);
const nomesZonasOficiais=[];
const pontosZonasOficiais=new Map();
const pontosBairrosOficiais=new Map();

const fichaPonto=FichaPonto.criar({painel:$("painel-ajuda"),abrirPainel:()=>{if($("painel-ajuda").hidden)$("painel-ajuda-toggle").click();},obterRegistro:(modulo,id)=>state.app.db.registro(modulo,id),waLink:MaringaCrise.waLink});
const filtrosCadastros=FiltrosCadastros.montar({alvo:$("filtros-cadastros-municipais"),inventario:INVENTARIO,db:state.app.db,baseGestao:"../gestao/",recorte:x=>!state.filtroZona||INVENTARIO.filtrar([x],{zona:state.filtroZona}).length>0,aoMudar:()=>render(),localizar:x=>map.flyTo([x.lat,x.lng],Math.max(map.getZoom(),15))});

const cozinhasDemo=L.layerGroup().addTo(map);

const novosColaboradoresDemo=L.layerGroup().addTo(map);

const {alertar,opts,municipSelector,zoneSelect,configurarCamadas,renderMunicipio}=AlertaMapasNavegacao.criar({$,INVENTARIO,TIPO,cidadeContexto,colaboradoresDisponiveis:(...args)=>colaboradoresDisponiveis(...args),esc,map,nomeTipo,nomesZonasOficiais,poligonos,render:(...args)=>render(...args),state});
const {colaboradoresDisponiveis,dadosFiltrados,colaboradoresAjudaFiltrados}=AlertaMapasConsultas.criar({INVENTARIO,TIPO,filtrosCadastros,state});
const {pontoZona,carregarZonasOficiais,renderUnidadesMunicipais}=AlertaMapasTerritorio.criar({$,INVENTARIO,TIPO,esc,fichaPonto,filtrosCadastros,iniciarCozinhasDemo:(...args)=>iniciarCozinhasDemo(...args),nomesZonasOficiais,poligonos,pontosBairrosOficiais,pontosZonasOficiais,render:(...args)=>render(...args),state,unidadesMunicipais,zoneSelect:(...args)=>zoneSelect(...args)});
const {renderEquipePorBairro,renderEquipeNoElemento,iniciarCheckin,renderColaboradoresAjuda}=AlertaMapasColaboradores.criar({$,INVENTARIO,TIPO,alertar:(...args)=>alertar(...args),caps,colaboradoresAjudaFiltrados:(...args)=>colaboradoresAjudaFiltrados(...args),dadosFiltrados:(...args)=>dadosFiltrados(...args),esc,marcadores,pontoZona:(...args)=>pontoZona(...args),pontosBairrosOficiais,render:(...args)=>render(...args),state});
const {renderCards,renderMarkers,counters,render}=AlertaMapasResultados.criar({$,INVENTARIO,TIPO,alertar:(...args)=>alertar(...args),caps,colaboradoresDisponiveis:(...args)=>colaboradoresDisponiveis(...args),comandoBrigadas:(...args)=>comandoBrigadas(...args),comandoPrefeituras:(...args)=>comandoPrefeituras(...args),dadosFiltrados:(...args)=>dadosFiltrados(...args),esc,fichaPonto,map,marcadores,pontoZona:(...args)=>pontoZona(...args),renderColaboradoresAjuda:(...args)=>renderColaboradoresAjuda(...args),renderEquipePorBairro:(...args)=>renderEquipePorBairro(...args),renderUnidadesMunicipais:(...args)=>renderUnidadesMunicipais(...args),state});
const {setOutput,comandoBrigadas,comandoPrefeituras}=AlertaMapasComandos.criar({$,alertar:(...args)=>alertar(...args),esc,opts:(...args)=>opts(...args),state});
const {iniciarCozinhasDemo,abrirFichaCozinha,tentarIniciarCaminhao,avisarNoDispositivo,iniciarCaminhaoDemo}=AlertaMapasDemonstracao.criar({$,INVENTARIO,TIPO,cozinhasDemo,esc,map,novosColaboradoresDemo,pontosBairrosOficiais,state});
if(TIPO==="ajuda"){
 $("logistica-demo").hidden=state.app.db.tipo==="supabase";
 $("avisos-navegador").addEventListener("click",async()=>{
  if(!("Notification" in window)){alertar("Notificações do navegador indisponíveis neste dispositivo.");return;}
  try{
   const permissao=await Notification.requestPermission();
   if(permissao!=="granted"){alertar("Permissão para avisos não concedida.");return;}
   if("serviceWorker" in navigator)await navigator.serviceWorker.register("../sw.js");
   $("avisos-navegador").textContent="Avisos do navegador ativos";alertar("Avisos do navegador ativados para a simulação.");
  }catch(_){alertar("Não foi possível ativar avisos neste dispositivo.");}
 });
 $("iniciar-caminhao").addEventListener("click",()=>{
  if(state.cicloAtivo&&state.simulacaoIniciada){state.cicloAtivo=false;state.simulacaoRodando=false;cancelAnimationFrame(state.frameCaminhao);clearTimeout(state.reinicioCaminhao);$("iniciar-caminhao").textContent="Iniciar simulação";$("logistica-status").textContent="Simulação pausada";}
  else iniciarCaminhaoDemo();
 });
 $("notificacao-fechar").addEventListener("click",()=>{$("notificacao-chegada").hidden=true;});
 $("ficha-cozinha-fechar").addEventListener("click",()=>{$("ficha-cozinha").hidden=true;});
 const toggle=$("painel-ajuda-toggle"),painel=$("painel-ajuda"),recolher=$("painel-ajuda-recolher");
 recolher.hidden=false;
 recolher.addEventListener("click",()=>toggle.click());
 toggle.addEventListener("click",()=>{
  const fechado=!painel.hidden;
  painel.hidden=fechado;
  toggle.hidden=!fechado;
  document.querySelector(".workspace").classList.toggle("painel-recolhido",fechado);
  toggle.textContent=fechado?"+":"−";
  toggle.setAttribute("aria-expanded",String(!fechado));
  toggle.setAttribute("aria-label",fechado?"Abrir painel":"Recolher painel");
  toggle.title=fechado?"Abrir painel":"Recolher painel";
  requestAnimationFrame(()=>map.invalidateSize());
 });
 // Abre com os painéis recolhidos; o + mantém acesso aos filtros.
 toggle.click();
}
$("mostrar-unidades").onchange=e=>{state.mostrarUnidades=e.target.checked;render();};
$("camada").onchange=()=>{state.camadaAtual=$("camada").value;state.filtroClasse="";state.texto="";$("busca").value="";configurarCamadas();render();};
$("zona").onchange=()=>{state.filtroZona=$("zona").value;render();};
$("filtro").onchange=()=>{state.filtroClasse=$("filtro").value;render();};
$("busca").oninput=()=>{state.texto=$("busca").value;render();};
window.addEventListener("storage",event=>{if(event.key===AlertaGestaoDados.CHAVE)location.reload();});
PainelEventos.iniciar({painel:$("eventos-painel"),barra:$("eventos-painel-head"),abrir:$("eventos-open"),fechar:$("eventos-close"),area:document.querySelector(".map-area"),aoAbrir:()=>filtrosCadastros.abrir()});
if(!globalThis.AlertaNuvem?.ativo&&globalThis.AlertaSessao&&globalThis.AlertaSessaoUI&&state.app.prefeitura())AlertaSessaoUI.criar({target:$("session-anchor"),sessao:AlertaSessao.criar({municipioId:state.app.prefeitura().id}),municipio:state.app.prefeitura().nome,zonas:state.app.zonas(),aoMudar:()=>{}});
municipSelector();renderMunicipio();configurarCamadas();render();
// O mesmo controlador atende Pra Somar e Colaboradores, sem usar a posição
// acidentalmente persistida pelas versões anteriores.
window.AlertaMapaNavegacao.instalarVistaSalva({limites:AlertaGestaoDados.config.limites(state.app.prefeitura()),
 map,L,identificador:TIPO==="ajuda"?"pra-somar":"colaboradores",
 // Cada mapa usa sua própria referência canônica aprovada pelo usuário.
 vistaInicial:AlertaGestaoDados.config.vistaMapa(state.app.prefeitura(),TIPO),
 arrasteNoMinimo:true
});
void carregarZonasOficiais();
const fontesPublicas=(AlertaGestaoDados.config.referencias(state.app.prefeitura()).publicas||[]).map(path=>"../"+path);
void Promise.allSettled(fontesPublicas.map(url=>AlertaImportacaoPublica.carregar(state.app.db,{url}))).then(()=>{configurarCamadas();render();if(TIPO==="ajuda")tentarIniciarCaminhao();});
window.addEventListener("focus",()=>{configurarCamadas();render();});
if(AlertaGestaoDados.config.referencias(state.app.prefeitura()).catalogoBairros&&globalThis[AlertaGestaoDados.config.referencias(state.app.prefeitura()).catalogoBairros])
 state.territorio=globalThis[AlertaGestaoDados.config.referencias(state.app.prefeitura()).catalogoBairros].iniciar({map,L,recolherInicial:TIPO==="ajuda"});
})();
