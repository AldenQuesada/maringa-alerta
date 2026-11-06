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
$("map-brand-title").textContent=TIPO==="ajuda"?"MARINGÁ Pra Somar":"MARINGÁ ALERTA";
// Pra Somar já tem identificação no cabeçalho; retirar a caixa que encobre o mapa.
if(TIPO==="ajuda")document.querySelector(".map-info")?.remove();
document.title=nomeTipo+" | "+(app.prefeitura()?.nome||"Município")+" · Sistema Integrado de Crise";
$("nav-"+TIPO).classList.add("active");
$("title").textContent=TIPO==="ajuda"?"Pra Somar Maringá":"Colaboradores por zona";
$("eyebrow").textContent=TIPO==="ajuda"?"RECUPERAÇÃO PÓS-EVENTO":"REDE DE COLABORADORES";
$("subtitle").textContent=TIPO==="ajuda"?"Pessoas e empresas que precisam de apoio após uma crise.":"Pessoas físicas, empresas e recursos disponíveis antes da emergência.";
if($("map-label"))$("map-label").textContent=nomeTipo+" · "+(app.prefeitura()?.nome||"Município");
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
    territorio=MaringaBairros.iniciar({map,L,simulatedLayers:poligonos.getLayers(),recolherInicial:TIPO==="ajuda"});
 };
}
function zoneSelect(){
 opts($("zona"),[...new Set([...app.zonas(),...nomesZonasOficiais,...colaboradoresDisponiveis().map(x=>x.zona).filter(Boolean),...INVENTARIO.registros(app.db).map(x=>x.zona).filter(Boolean)])].sort((a,b)=>a.localeCompare(b,"pt-BR",{numeric:true})),filtroZona,'<option value="">Todas as zonas</option>');
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
 if($("map-label"))$("map-label").textContent=nomeTipo+" · "+(app.prefeitura()?.nome||"Município");
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
function colaboradoresDisponiveis(){
 const municipio=app.prefeitura()?.id;
 const anterior=municipio?OperacaoRestauracao.ler(localStorage,`alerta_prototipo_v2_${municipio}_operacao`,municipio):null;
 return ColaboradoresReferencia.listar(app.oferentes(),anterior);
}
function dadosFiltrados(){
 const inventario=INVENTARIO.registros(app.db);
 if(camadaAtual!=="principal")return INVENTARIO.filtrar(inventario,{modulo:camadaAtual,zona:filtroZona,classe:filtroClasse,busca:texto}).filter(filtrosUnidades.aceita);

 const xs=TIPO==="ajuda"?app.pedidos():colaboradoresDisponiveis();
 return xs.filter(x=>{
  if(filtroZona&&!(x.registroAnterior?INVENTARIO.normal(x.zona||x.bairro)===INVENTARIO.normal(filtroZona):INVENTARIO.filtrar(inventario,{modulo:TIPO==="ajuda"?"solicitacoes":"voluntarios",zona:filtroZona}).some(item=>item.id===String(x.id))))return false;
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
