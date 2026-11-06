/* Dois mapas standalone ligados aos cadastros locais; o mapa de eventos não é modificado. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const TIPO=new URLSearchParams(location.search).get("tipo")==="ajuda"?"ajuda":"colaboradores";
document.body.classList.toggle("mapa-ajuda",TIPO==="ajuda");
const cidadeContexto=()=>sessionStorage.getItem("alerta_contexto_municipal_demo_v1")||"maringa";
let app=MaringaCrise.criar({municipioId:cidadeContexto(),escopoMunicipal:true}),filtroZona="",filtroClasse="",texto="",camadaAtual="principal";
const INVENTARIO=globalThis.AlertaInventarioMapas;
let territorio=null;
let toastTimer;
const nomeTipo=TIPO==="ajuda"?"Pra Somar Maringá":"Mapa de Colaboradores";
document.title=nomeTipo+" | "+(app.prefeitura()?.nome||"Município")+" · Sistema Integrado de Crise";
$("nav-"+TIPO).classList.add("active");
$("title").textContent=TIPO==="ajuda"?"Pra Somar Maringá":"Colaboradores por zona";
$("eyebrow").textContent=TIPO==="ajuda"?"RECUPERAÇÃO PÓS-EVENTO":"REDE DE COLABORADORES";
$("subtitle").textContent=TIPO==="ajuda"?"Pessoas e empresas que precisam de apoio após uma crise.":"Pessoas físicas, empresas e recursos disponíveis antes da emergência.";
$("map-label").textContent=nomeTipo+" · "+(app.prefeitura()?.nome||"Município");
$("list-title").textContent=TIPO==="ajuda"?"Pedidos registrados":"Ofertas de ajuda";
$("filtro-label").textContent=TIPO==="ajuda"?"Situação":"Pessoa";
$("filtro").innerHTML=TIPO==="ajuda"?
 '<option value="">Todas as situações</option><option value="Aguardando">Aguardando</option><option value="Encaminhada">Encaminhada</option><option value="Cheguei">Cheguei</option><option value="Atendida">Atendida</option>':
 '<option value="">Física e jurídica</option><option value="FÍSICA">Pessoa física</option><option value="JURÍDICA">Pessoa jurídica</option>';
function alertar(msg){
 const t=$("toast");t.textContent=msg;t.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>{t.hidden=true;},4500);
}
function opts(el,items,selected,prefix) {
 el.innerHTML=(prefix||"")+items.map(x=>'<option value="'+esc(x.id??x)+'"'+(String(x.id??x)===String(selected)?' selected':'')+'>'+esc(x.nome??x)+'</option>').join("");
}
function municipSelector(){
 const el=$("municipio"),lista=app.db.municipios();
 opts(el,lista.map(x=>({id:x.id,nome:x.nome+" / "+x.uf})),app.prefeitura()?.id);
 el.disabled=true;
 el.title="Município fixado pelo Admin Geral nesta sessão de demonstração.";
 el.onchange=()=>{
  app=MaringaCrise.criar({municipioId:cidadeContexto(),escopoMunicipal:true});
  filtroZona="";filtroClasse="";texto="";camadaAtual="principal";
  $("busca").value="";$("filtro").value="";
  renderMunicipio();configurarCamadas();render();
  if(territorio){territorio.destroy();territorio=null;}
  if(app.prefeitura()?.id==="maringa"&&globalThis.MaringaBairros)
    territorio=MaringaBairros.iniciar({map,L,simulatedLayers:poligonos.getLayers()});
 };
}
function zoneSelect(){
 opts($("zona"),[...new Set([...app.zonas(),...nomesZonasOficiais,...INVENTARIO.registros(app.db).map(x=>x.zona).filter(Boolean)])].sort((a,b)=>a.localeCompare(b,"pt-BR",{numeric:true})),filtroZona,'<option value="">Todas as zonas</option>');
 $("zona").value=filtroZona;
}
function configurarCamadas(){
 const camadas=INVENTARIO.resumo(app.db),grupo=new Map();
 for(const x of camadas){if(x.id===(TIPO==="ajuda"?"solicitacoes":"voluntarios"))continue;if(!grupo.has(x.grupo))grupo.set(x.grupo,[]);grupo.get(x.grupo).push(x);}
 const opt=(id,n)=>'<option value="'+esc(id)+'"'+(id===camadaAtual?' selected':'')+'>'+esc(n)+'</option>';
 $("camada").innerHTML=opt("principal",TIPO==="ajuda"?"Pedidos de ajuda":"Colaboradores")+
  [...grupo].map(([name,items])=>'<optgroup label="'+esc(name)+'">'+items.map(x=>opt(x.id,x.nome+" ("+x.total+")")).join("")+'</optgroup>').join("");
 const principal=camadaAtual==="principal",xs=principal?[]:INVENTARIO.registros(app.db).filter(x=>x.modulo===camadaAtual);
 $("filtro-label").textContent=principal?(TIPO==="ajuda"?"Situação":"Pessoa"):"Situação ou tipo";
 if(principal)$("filtro").innerHTML=TIPO==="ajuda"?'<option value="">Todas as situações</option><option>Aguardando</option><option>Encaminhada</option><option>Cheguei</option><option>Atendida</option>':'<option value="">Física e jurídica</option><option value="FÍSICA">Pessoa física</option><option value="JURÍDICA">Pessoa jurídica</option>';
 else opts($("filtro"),INVENTARIO.classes(xs),filtroClasse,'<option value="">Todos os tipos e situações</option>');
 $("filtro").value=filtroClasse;
 $("list-title").textContent=principal?(TIPO==="ajuda"?"Pedidos registrados":"Ofertas de ajuda"):(camadas.find(x=>x.id===camadaAtual)?.nome||"Cadastros");
 $("busca").placeholder=principal?"Alimentos, telhas, limpeza...":"Buscar nome, tipo, zona ou recurso";
 $("command").hidden=!principal;
 zoneSelect();
}
const map=L.map("map",{zoomControl:true,zoomSnap:0,zoomDelta:.5}).setView([-23.42,-51.934],12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
 maxZoom:18,subdomains:"abc",attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
const poligonos=L.layerGroup().addTo(map);
const marcadores=L.layerGroup().addTo(map);
function renderMunicipio(){
 $("map-label").textContent=nomeTipo+" · "+(app.prefeitura()?.nome||"Município");
 poligonos.clearLayers();
 const p=app.prefeitura(),lat=Number(p?.lat),lng=Number(p?.lng);
 if(p?.limite_geojson){
  try{
   const geo=typeof p.limite_geojson==="string"?JSON.parse(p.limite_geojson):p.limite_geojson;
   const bounds=L.geoJSON(geo).getBounds();
   if(bounds?.isValid())map.fitBounds(bounds,{padding:[24,24],maxZoom:12});
  }catch(_){}
 }else if(p?.lat!==undefined&&p?.lng!==undefined&&Number.isFinite(lat)&&Number.isFinite(lng))map.setView([lat,lng],12);
 zoneSelect();setTimeout(()=>map.invalidateSize(),100);
}
function dadosFiltrados(){
 const inventario=INVENTARIO.registros(app.db);
 if(camadaAtual!=="principal")return INVENTARIO.filtrar(inventario,{modulo:camadaAtual,zona:filtroZona,classe:filtroClasse,busca:texto});

 const xs=TIPO==="ajuda"?app.pedidos():app.oferentes();
 return xs.filter(x=>{
  if(filtroZona&&!INVENTARIO.filtrar(inventario,{modulo:TIPO==="ajuda"?"solicitacoes":"voluntarios",zona:filtroZona}).some(item=>item.id===String(x.id)))return false;
  if(filtroClasse&&(TIPO==="ajuda"?x.status:x.tipo_pessoa)!==filtroClasse)return false;
  if(texto){
   const campos=TIPO==="ajuda"?[x.necessidade,x.descricao,x.zona]:
     [x.nome,x.ajudas,x.maquinas,x.empreendedores,x.materiais,x.contribuicao,x.outros,x.zona,x.bairro];
   if(!campos.flat().join(" ").toLocaleLowerCase("pt-BR").includes(texto.toLocaleLowerCase("pt-BR")))return false;
  }
  return true;
 });
}
const caps=x=>[x.ajudas,x.maquinas,x.empreendedores,x.materiais].flatMap(v=>Array.isArray(v)?v:typeof v==="string"?v.split(/[;,]/):[]).filter(Boolean);
/* Camadas geográficas do cadastro municipal, sem polígonos fictícios. */
const unidadesMunicipais=L.layerGroup().addTo(map);
const nomesZonasOficiais=[];
const pontosZonasOficiais=new Map();
let mostrarUnidades=true,zonasConsultadas=false;
function pontoZona(nome){return app.pontoDaZona(nome)||pontosZonasOficiais.get(INVENTARIO.normal(nome))||null;}
async function carregarZonasOficiais(){
 if(zonasConsultadas||app.prefeitura()?.id!=="maringa"||!globalThis.MaringaBairros)return;
 zonasConsultadas=true;
 try{
  const dados=await MaringaBairros.carregar();
  for(const feature of dados.zonasNumeradas?.features||[]){
   const nome=String(feature.properties?.nome||"").trim();
   if(!/^Zona\s*\d+$/i.test(nome))continue;
   const layer=L.geoJSON(feature,{
    style:{color:"#e7b94c",weight:1.6,fillColor:"#e7b94c",fillOpacity:.035,dashArray:"5 5"},
    onEachFeature:(_f,shape)=>{shape.bindTooltip(nome,{sticky:true});shape.on("click",()=>{filtroZona=nome;zoneSelect();render();});}
   });
   const bounds=layer.getBounds();if(!bounds?.isValid())continue;
   const centro=bounds.getCenter();
   pontosZonasOficiais.set(INVENTARIO.normal(nome),{lat:centro.lat,lng:centro.lng,label:nome});
   nomesZonasOficiais.push(nome);poligonos.addLayer(layer);
  }
  zoneSelect();render();
 }catch(error){zonasConsultadas=false;console.warn("Zonas numeradas indisponíveis",error);}
}
function renderUnidadesMunicipais(){
 unidadesMunicipais.clearLayers();
 const todos=INVENTARIO.registros(app.db).filter(x=>x.georreferenciado&&!x.privado);
 const visiveis=camadaAtual==="principal"&&mostrarUnidades?INVENTARIO.filtrar(todos,{zona:filtroZona,busca:texto}):[];
 const indicador=$("mostrar-unidades-texto");
 if(indicador)indicador.textContent="Mostrar unidades e recursos ("+todos.length+" georreferenciados)";
 for(const x of visiveis){
  const simbolo=x.modulo==="abrigos"?"🛏️":x.modulo==="bases"&&x.categoria==="Centro de coleta de donativos"?"📦":x.modulo==="riscos"?"⚠️":x.grupo==="Estruturas"?"🏥":"📍";
  const icon=L.divIcon({className:"pin canonical-map-pin",html:'<span class="canonical-pin">'+simbolo+"</span>",iconSize:[32,32],iconAnchor:[16,32]});
  const detalhes=[x.moduloNome,x.classe,x.precisao].filter(Boolean).map(esc).join(" · ");
  const local=x.endereco?"<p>"+esc(x.endereco)+"</p>":"";
  const fonte=x.fonteUrl?'<a href="'+esc(x.fonteUrl)+'" target="_blank" rel="noopener">Fonte</a>':"";
  L.marker([x.lat,x.lng],{icon,title:x.nome}).bindPopup("<strong>"+esc(x.nome)+"</strong>"+local+"<small>"+detalhes+"</small>"+fonte).addTo(unidadesMunicipais);
 }
 return visiveis.length;
}
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
   pessoas.map(x=>'<div class="team-member"><div><b>'+esc(x.nome||"Colaborador")+'</b><small>'+esc(x.checkin_status==="presente"?"Presente · GPS autodeclarado":x.checkin_status==="finalizado"?"Saída registrada":"Aguardando chegada")+'</small>'+
    (caps(x).length?'<small>'+esc(caps(x).slice(0,3).join(" · ")+(caps(x).length>3?" +"+(caps(x).length-3)+" capacidades":""))+'</small>':'')+
    (x.forma_entrega_doacao?'<small>Doação: '+esc(x.forma_entrega_doacao)+'</small>':'')+'</div>'+
    (x.checkin_status==="presente"?'<button type="button" data-saida="'+esc(x.id)+'">Registrar saída</button>':
    '<button type="button" data-checkin="'+esc(x.id)+'"'+(bairro==="Bairro não informado"?' disabled title="Cadastre o bairro antes"':'')+'>Check-in GPS</button>')+
    '</div>').join("")+'</section>';
 }).join("")+'<p class="presence-note">Check-in local experimental: exige permissão GPS, precisão de até 100 m e polígono de bairro compatível. Não comprova identidade nem sincroniza entre dispositivos.</p>';
 el.querySelectorAll("[data-checkin]").forEach(b=>b.onclick=()=>void iniciarCheckin(b.dataset.checkin,b));
 el.querySelectorAll("[data-saida]").forEach(b=>b.onclick=()=>{
  try{app.registrarSaida(b.dataset.saida);render();alertar("Saída registrada neste navegador.");}catch(err){alertar(err.message);}
 });
}
async function iniciarCheckin(id,button){
 const pessoa=app.oferentes().find(x=>x.id===id);
 const bairro=String(pessoa?.bairro||pessoa?.zona||"").trim();
 if(!bairro){alertar("Cadastre o bairro de origem do colaborador.");return;}
 if(!navigator.geolocation){alertar("Geolocalização indisponível neste dispositivo.");return;}
 button.disabled=true;button.textContent="Validando GPS...";
 try{
  const dados=await globalThis.MaringaBairros?.carregar();
  const f=dados?.bairros?.features?.find(x=>String(x.properties?.nome||"").localeCompare(bairro,"pt-BR",{sensitivity:"base"})===0);
  if(!f)throw Error("Bairro não encontrado na malha territorial. Confira o cadastro; não foi registrado check-in.");
  const coords=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(p=>resolve(p.coords),reject,{enableHighAccuracy:true,maximumAge:0,timeout:20000}));
  app.registrarCheckin({colaboradorId:id,bairro,lat:coords.latitude,lng:coords.longitude,precisao:coords.accuracy,geometry:f.geometry,origem:dados.bairros.source});
  render();alertar("Check-in registrado no bairro "+bairro+" neste navegador.");
 }catch(err){alertar("Check-in não confirmado: "+(err.message||"GPS indisponível"));button.disabled=false;button.textContent="Check-in GPS";}
}
function renderCards(xs) {
 const el=$("results");$("list-count").textContent=xs.length+" registro"+(xs.length===1?"":"s");
 if(camadaAtual!=="principal"){
  el.innerHTML=xs.map(x=>'<article class="result canonical-result"><div class="result-top"><strong>'+esc(x.nome)+'</strong><span class="result-tag">'+esc(x.classe)+'</span></div><small>'+esc(x.moduloNome)+' · '+esc(x.zona||x.bairro||"Sem zona vinculada")+'</small><small>'+esc(x.detalhes.slice(0,180))+'</small><div class="canonical-actions">'+(x.georreferenciado?'<button type="button" data-loc="'+esc(x.chave)+'">Localizar</button>':'<small>Sem coordenadas</small>')+'<a href="../gestao/#'+encodeURIComponent(x.modulo)+'" target="_blank" rel="noopener">Abrir cadastro</a></div></article>').join("")||'<p class="empty">Nenhum registro neste filtro.</p>';
  el.querySelectorAll("[data-loc]").forEach(b=>b.onclick=()=>{const x=xs.find(y=>y.chave===b.dataset.loc);if(x?.georreferenciado)map.flyTo([x.lat,x.lng],Math.max(map.getZoom(),15));});
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
 if(camadaAtual!=="principal"){
  if(!mostrarUnidades)return;
  for(const x of xs.filter(x=>x.georreferenciado)){
   const icon=x.modulo==="bases"&&x.categoria==="Centro de coleta de donativos"?"📦":x.modulo==="riscos"?"⚠️":"📍";
   const ic=L.divIcon({className:"pin canonical-map-pin",html:'<span class="canonical-pin">'+icon+'</span>',iconSize:[32,32],iconAnchor:[16,32]});
   L.marker([x.lat,x.lng],{icon:ic,title:x.nome}).bindPopup('<strong>'+esc(x.nome)+'</strong><p>'+esc(x.moduloNome)+' · '+esc(x.classe)+'</p><small>'+esc(x.precisao||"Localização cadastrada")+'</small>').addTo(marcadores);
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
   .addTo(marcadores).on("click",()=>{if(zona!=="Não informada"){filtroZona=zona;$("zona").value=zona;render();}});
 }
}
function counters(xs){
 if(camadaAtual!=="principal"){
  $("metric-one").textContent=xs.length;
  $("metric-two").textContent=new Set(xs.map(x=>x.zona).filter(Boolean)).size;
  $("metric-three").textContent=xs.filter(x=>x.georreferenciado).length;
  $("metric-one-label").textContent="Registros filtrados";
  $("metric-two-label").textContent="Zonas vinculadas";
  $("metric-three-label").textContent="No mapa";
  return;
 }
 const all=TIPO==="ajuda"?app.pedidos():app.oferentes();
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
function setOutput(html){const el=$("command-output");if(el)el.innerHTML=html;}
function comandoBrigadas(){
 $("command-title").textContent="Ativar brigada da zona";
 $("command-content").innerHTML='<form id="brigada-form" class="command-fields"><label for="brigada-zona">Zona da brigada</label>'+
 '<select id="brigada-zona" required></select><label for="brigada-mensagem">Instrução para os colaboradores</label>'+
 '<textarea id="brigada-mensagem" maxlength="1000" placeholder="Ex.: Apoio à retirada de resíduos após vendaval."></textarea>'+
 '<button type="submit" class="btn btn-main">Ativar brigada · simulação</button></form>'+
 '<div id="command-output" class="command-output" hidden></div><p class="notice">Um clique prepara a mobilização de todos os colaboradores e equipes disponíveis da zona. O envio individual pelo WhatsApp só ocorre após uma ação externa; a API de disparo ainda não está integrada.</p>';
 opts($("brigada-zona"),app.zonas(),filtroZona,'<option value="">Escolha a zona</option>');
 $("brigada-form").onsubmit=e=>{
  e.preventDefault();
  try{
   const result=app.acionarBrigada($("brigada-zona").value,$("brigada-mensagem").value);
   const out=$("command-output");out.hidden=false;
   out.innerHTML='<strong>Mobilização preparada</strong><p>'+result.destinatarios.length+' destinatários na zona '+esc($("brigada-zona").value)+'. Nenhuma mensagem foi enviada automaticamente.</p>'+
    (result.envios.map(x=>'<div class="output-item"><span>'+esc(x.nome)+' · '+esc(x.tipo)+'</span>'+(x.link?'<a href="'+esc(x.link)+'" target="_blank" rel="noopener noreferrer">Abrir WhatsApp ↗</a>':'<span>Sem telefone</span>')+'</div>').join("")||'<div>Cadastre colaboradores ou equipes para essa zona.</div>');
   alertar("Mobilização preparada na simulação.");
  }catch(err){alertar(err.message);}
 };
}
function comandoPrefeituras(){
 $("command-title").textContent="Solicitar ajuda a outra prefeitura";
 $("command-content").innerHTML='<form id="inter-form" class="command-fields"><label for="inter-destino">Prefeitura destinatária</label>'+
 '<select id="inter-destino" required></select><label for="inter-recurso">Qual apoio ou recurso precisa?</label>'+
 '<textarea id="inter-recurso" required maxlength="1600" placeholder="Ex.: 2 caminhões basculantes, 1 retroescavadeira e 1 gerador."></textarea>'+
 '<button type="submit" class="btn btn-main">Preparar solicitação</button></form>'+
 '<div id="command-output" class="command-output" hidden></div>'+
 '<p class="notice">A solicitação é registrada localmente. Se houver um telefone institucional cadastrado, abre-se um link de WhatsApp para revisão e envio manual. A troca entre prefeituras via API ainda não existe.</p>';
 const cidades=app.db.municipios().filter(x=>x.id!==app.prefeitura()?.id);
 opts($("inter-destino"),cidades,"",'<option value="">Selecione a prefeitura</option>');
 if(!cidades.length){
  $("inter-destino").disabled=true;
  $("inter-form").querySelector('button[type="submit"]').disabled=true;
  $("command-content").insertAdjacentHTML("beforeend",'<p class="notice">Cadastre outra prefeitura na <a href="../gestao/#prefeituras">Gestão</a> para simular o pedido.</p>');
 }
 $("inter-form").onsubmit=e=>{
  e.preventDefault();
  try{
   const x=app.solicitarOutraPrefeitura($("inter-destino").value,$("inter-recurso").value);
   const out=$("command-output");out.hidden=false;
   out.innerHTML='<strong>Pedido preparado para '+esc(x.destino.nome)+'</strong>'+
    '<p>Registrado na prefeitura de origem; não transmitido ao destinatário.</p>'+
    (x.link?'<a class="btn" href="'+esc(x.link)+'" target="_blank" rel="noopener noreferrer">Revisar mensagem no WhatsApp ↗</a>':
    '<p>Esta prefeitura não tem número institucional configurado. Cadastre-o antes de qualquer envio.</p>');
   alertar("Solicitação intermunicipal registrada localmente.");
  }catch(err){alertar(err.message);}
 };
}
function colaboradoresAjudaFiltrados(){
 const inventario=INVENTARIO.registros(app.db);
 const permitidos=filtroZona?new Set(INVENTARIO.filtrar(inventario,{modulo:"voluntarios",zona:filtroZona}).map(x=>x.id)):null;
 const busca=INVENTARIO.normal(texto);
 return app.oferentes().filter(p=>{
  if(permitidos&&!permitidos.has(String(p.id)))return false;
  return !busca||INVENTARIO.normal([p.nome,p.zona,p.bairro,p.contribuicao,p.ajudas,p.maquinas,p.empreendedores,p.materiais,p.outros].flat().filter(Boolean).join(" ")).includes(busca);
 });
}
function renderColaboradoresAjuda(){
 if(TIPO!=="ajuda"||camadaAtual!=="principal")return;
 const pessoas=colaboradoresAjudaFiltrados();
 $("list-title").textContent="Colaboradores e pedidos";
 $("list-count").textContent=pessoas.length+" colaboradores · "+dadosFiltrados().length+" pedidos";
 const secao=document.createElement("section");secao.className="ajuda-colaboradores";
 const titulo=document.createElement("h2");titulo.textContent="Colaboradores ("+pessoas.length+")";
 const nota=document.createElement("p");nota.className="presence-note";
 nota.textContent="Mesmos cadastros do Mapa de Colaboradores. A situação selecionada acima filtra os pedidos.";
 const lista=document.createElement("div");secao.append(titulo,nota,lista);$("results").prepend(secao);
 renderEquipeNoElemento(pessoas,lista);
 const registroPorId=new Map(INVENTARIO.registros(app.db).filter(x=>x.modulo==="voluntarios").map(x=>[x.id,x]));
 const grupos=new Map();
 for(const pessoa of pessoas){const zona=registroPorId.get(String(pessoa.id))?.zona||pessoa.zona;if(zona)grupos.set(zona,(grupos.get(zona)||0)+1);}
 for(const [zona,total] of grupos){
  const pt=pontoZona(zona);if(!pt)continue;
  const icon=L.divIcon({html:'<div class="bubble">'+total+'</div>',className:"pin collab",iconSize:[44,44],iconAnchor:[54,22]});
  L.marker([pt.lat,pt.lng],{icon,title:total+" colaboradores na zona "+zona})
   .bindPopup('<strong>'+esc(zona)+'</strong><p>'+total+' colaboradores</p><small>Marcador por zona, não representa endereço residencial.</small>')
   .addTo(marcadores).on("click",()=>{filtroZona=zona;$("zona").value=zona;render();});
 }
}
function render(){
 const xs=dadosFiltrados();
 renderCards(xs);renderMarkers(xs);renderColaboradoresAjuda();counters(xs);renderUnidadesMunicipais();
 if(camadaAtual==="principal"){
  $("command").hidden=false;
  if(TIPO==="ajuda")comandoPrefeituras();else comandoBrigadas();
 }else $("command").hidden=true;
}
if(TIPO==="ajuda"){
 const toggle=$("painel-ajuda-toggle"),painel=$("painel-ajuda");
 toggle.hidden=false;
 toggle.addEventListener("click",()=>{
  const fechado=!painel.hidden;
  painel.hidden=fechado;
  document.querySelector(".workspace").classList.toggle("painel-recolhido",fechado);
  toggle.textContent=fechado?"+":"−";
  toggle.setAttribute("aria-expanded",String(!fechado));
  toggle.setAttribute("aria-label",fechado?"Abrir painel":"Recolher painel");
  toggle.title=fechado?"Abrir painel":"Recolher painel";
  requestAnimationFrame(()=>map.invalidateSize());
 });
}
$("mostrar-unidades").onchange=e=>{mostrarUnidades=e.target.checked;render();};
$("camada").onchange=()=>{camadaAtual=$("camada").value;filtroClasse="";texto="";$("busca").value="";configurarCamadas();render();};
$("zona").onchange=()=>{filtroZona=$("zona").value;render();};
$("filtro").onchange=()=>{filtroClasse=$("filtro").value;render();};
$("busca").oninput=()=>{texto=$("busca").value;render();};
window.addEventListener("storage",event=>{if(event.key===AlertaGestaoDados.CHAVE)location.reload();});
municipSelector();renderMunicipio();configurarCamadas();render();
void carregarZonasOficiais();
const fontesPublicas=["../dados-territoriais/maringa-bases-riscos-publicos.json","../dados-territoriais/maringa-abrigos-publicos.json"];
void Promise.allSettled(fontesPublicas.map(url=>AlertaImportacaoPublica.carregar(app.db,{url}))).then(()=>{configurarCamadas();render();});
window.addEventListener("focus",()=>{configurarCamadas();render();});
if(app.prefeitura()?.id==="maringa"&&globalThis.MaringaBairros)
 territorio=MaringaBairros.iniciar({map,L});
})();
