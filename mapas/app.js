/* Dois mapas standalone ligados aos cadastros locais; o mapa de eventos não é modificado. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const TIPO=new URLSearchParams(location.search).get("tipo")==="ajuda"?"ajuda":"colaboradores";
const cidadeContexto=()=>sessionStorage.getItem("alerta_contexto_municipal_demo_v1")||"maringa";
let app=MaringaCrise.criar({municipioId:cidadeContexto(),escopoMunicipal:true}),filtroZona="",filtroClasse="",texto="";
let territorio=null;
let toastTimer;
const nomeTipo=TIPO==="ajuda"?"Mapa da Ajuda":"Mapa de Colaboradores";
document.title=nomeTipo+" | "+(app.prefeitura()?.nome||"Município")+" · Sistema Integrado de Crise";
$("nav-"+TIPO).classList.add("active");
$("title").textContent=TIPO==="ajuda"?"Ajuda pós-evento":"Colaboradores por zona";
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
  filtroZona="";filtroClasse="";texto="";
  $("busca").value="";$("filtro").value="";
  renderMunicipio();render();
  if(territorio){territorio.destroy();territorio=null;}
  if(app.prefeitura()?.id==="maringa"&&globalThis.MaringaBairros)
    territorio=MaringaBairros.iniciar({map,L,simulatedLayers:poligonos.getLayers()});
 };
}
function zoneSelect(){
 opts($("zona"),app.zonas(),filtroZona,'<option value="">Todas as zonas</option>');
 $("zona").value=filtroZona;
}
const map=L.map("map",{zoomControl:true,zoomSnap:0,zoomDelta:.5}).setView([-23.42,-51.934],12);
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
 maxZoom:18,subdomains:"abc",attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);
const shapes=[
 ["Zona 7",[[-23.392,-51.950],[-23.392,-51.930],[-23.408,-51.930],[-23.408,-51.950]]],
 ["Jardim Alvorada",[[-23.380,-51.922],[-23.380,-51.902],[-23.396,-51.902],[-23.396,-51.922]]],
 ["Conjunto Requião",[[-23.428,-51.966],[-23.428,-51.946],[-23.446,-51.946],[-23.446,-51.966]]],
 ["Jardim Universo",[[-23.435,-51.933],[-23.435,-51.913],[-23.452,-51.913],[-23.452,-51.933]]],
 ["Vila Esperança",[[-23.374,-51.962],[-23.374,-51.941],[-23.392,-51.941],[-23.392,-51.962]]],
 ["Centro Cívico",[[-23.415,-51.946],[-23.415,-51.927],[-23.430,-51.927],[-23.430,-51.946]]]
];
const poligonos=L.layerGroup().addTo(map);
const marcadores=L.layerGroup().addTo(map);
function renderMunicipio(){
 $("map-label").textContent=nomeTipo+" · "+app.prefeitura()?.nome;
 zoneSelect();
 poligonos.clearLayers();
 if(app.prefeitura()?.id==="maringa"){
  for(const [nome,pts] of shapes) {
   const pol=L.polygon(pts,{color:"#ebb236",weight:1.5,opacity:.85,fillColor:"#efb642",fillOpacity:.06,dashArray:"6 5"});
   pol.on("click",()=>{filtroZona=nome;$("zona").value=nome;render();});
   pol.bindTooltip(nome,{direction:"center",permanent:true,className:"zone-tooltip"});
   pol.addTo(poligonos);
  }
  const bounds=L.latLngBounds(shapes.flatMap(x=>x[1]));
  map.fitBounds(bounds,{padding:[30,30],maxZoom:13});
 }else{
  const p=app.prefeitura(),lat=Number(p?.lat),lng=Number(p?.lng);
  if(Number.isFinite(lat)&&Number.isFinite(lng)&&p.lat!==undefined)map.setView([lat,lng],11);
 }
 setTimeout(()=>map.invalidateSize(),100);
}
function dadosFiltrados(){
 const xs=TIPO==="ajuda"?app.pedidos():app.oferentes();
 return xs.filter(x=>{
  if(filtroZona&&x.zona!==filtroZona)return false;
  if(filtroClasse&&(TIPO==="ajuda"?x.status:x.tipo_pessoa)!==filtroClasse)return false;
  if(texto){
   const campos=TIPO==="ajuda"?[x.necessidade,x.descricao,x.zona]:
     [x.ajudas,x.maquinas,x.empreendedores,x.materiais,x.contribuicao,x.outros,x.zona];
   if(!campos.flat().join(" ").toLocaleLowerCase("pt-BR").includes(texto.toLocaleLowerCase("pt-BR")))return false;
  }
  return true;
 });
}
const caps=x=>[x.ajudas,x.maquinas,x.empreendedores,x.materiais].flatMap(v=>Array.isArray(v)?v:typeof v==="string"?v.split(/[;,]/):[]).filter(Boolean);
function renderCards(xs) {
 const el=$("results");$("list-count").textContent=xs.length+" registro"+(xs.length===1?"":"s");
 if(!xs.length){el.innerHTML='<div class="empty">Nenhum registro neste filtro.<p>Cadastre pelo WhatsApp simulado ou use a Gestão para adicionar dados.</p><a class="btn" href="../atendimento/" target="_blank" rel="noopener">Abrir atendimento</a></div>';return;}
 el.innerHTML=xs.map((x,i)=>{
  const tags=TIPO==="ajuda"?(x.status||"Aguardando"):(x.tipo_pessoa||"Colaborador");
  const subtitulo=TIPO==="ajuda"?
    '<strong>'+esc(x.necessidade||"Pedido")+'</strong><small>Zona: '+esc(x.zona||"Não indicada")+' · '+esc(x.urgencia||"Normal")+'</small>'+
    '<small>Detalhes e endereço reservados ao atendimento.</small><small>'+esc(x.atribuido_a?"Há colaborador compatível indicado (simulação)":"Sem colaborador encaminhado")+'</small>':
    '<strong>'+esc(x.tipo_pessoa==="JURÍDICA"?"Empresa / organização":"Pessoa física")+'</strong>'+
    '<small>Zona: '+esc(x.zona||"Não indicada")+'</small>'+
    '<small>'+esc(caps(x).slice(0,5).join(" · ")||x.contribuicao||"Contribuição a detalhar")+'</small>';
  return '<button type="button" class="result" data-result="'+esc(x.id)+'"><div class="result-top"><span>Registro '+(i+1).toString().padStart(2,"0")+'</span>'+
    '<span class="result-tag'+(TIPO==="ajuda"&&x.urgencia==="Crítica"?" urgente":x.tipo_pessoa==="JURÍDICA"?" pj":"")+'">'+esc(tags)+'</span></div>'+subtitulo+'</button>';
 }).join("");
 el.querySelectorAll("[data-result]").forEach(btn=>btn.onclick=()=>{
  const chosen=xs.find(x=>x.id===btn.dataset.result);
  const pt=app.pontoDaZona(chosen?.zona);
  if(pt){map.flyTo([pt.lat,pt.lng],Math.max(map.getZoom(),13));alertar("Localização aproximada da zona "+(chosen.zona||"indicada")+".");}
 });
}
function renderMarkers(xs){
 marcadores.clearLayers();
 const grupos=new Map();
 for(const x of xs){const zona=x.zona||"Não informada";grupos.set(zona,(grupos.get(zona)||0)+1);}
 for(const [zona,quantidade] of grupos.entries()){
  const pt=app.pontoDaZona(zona);if(!pt)continue;
  const tipoClass=TIPO==="ajuda"?"help":"collab";
  const ic=L.divIcon({html:'<div class="bubble">'+quantidade+'</div>',className:"pin "+tipoClass,iconSize:[44,44],iconAnchor:[22,22]});
  L.marker([pt.lat,pt.lng],{icon:ic,title:quantidade+" registros na zona "+zona})
   .bindPopup('<strong>'+esc(zona)+'</strong><p>'+quantidade+' '+(TIPO==="ajuda"?"pedidos de ajuda":"colaboradores")+'</p><small>Marcador por zona, não representa endereço residencial.</small>')
   .addTo(marcadores).on("click",()=>{if(zona!=="Não informada"){filtroZona=zona;$("zona").value=zona;render();}});
 }
}
function counters(xs){
 const all=TIPO==="ajuda"?app.pedidos():app.oferentes();
 const zonas=new Set(all.map(x=>x.zona).filter(Boolean)).size;
 $("metric-one").textContent=all.length;
 $("metric-two").textContent=zonas;
 $("metric-three").textContent=TIPO==="ajuda"?
  all.filter(x=>x.status==="Aguardando").length:
  all.filter(x=>x.disponibilidade!=="Indisponível").length;
 $("metric-one-label").textContent=TIPO==="ajuda"?"Pedidos":"Colaboradores";
 $("metric-two-label").textContent="Zonas com registros";
 $("metric-three-label").textContent=TIPO==="ajuda"?"Aguardando":"Disponíveis";
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
function render(){
 const xs=dadosFiltrados();
 renderCards(xs);renderMarkers(xs);counters(xs);
 if(TIPO==="ajuda")comandoPrefeituras();else comandoBrigadas();
}
$("zona").onchange=()=>{filtroZona=$("zona").value;render();};
$("filtro").onchange=()=>{filtroClasse=$("filtro").value;render();};
$("busca").oninput=()=>{texto=$("busca").value;render();};
window.addEventListener("storage",event=>{if(event.key===AlertaGestaoDados.CHAVE)location.reload();});
municipSelector();renderMunicipio();render();
if(app.prefeitura()?.id==="maringa"&&globalThis.MaringaBairros)
 territorio=MaringaBairros.iniciar({map,L,simulatedLayers:poligonos.getLayers()});
})();
