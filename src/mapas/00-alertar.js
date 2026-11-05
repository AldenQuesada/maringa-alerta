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
