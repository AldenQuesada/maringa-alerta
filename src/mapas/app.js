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
if($("map-data-status"))$("map-data-status").textContent=globalThis.AlertaNuvem?.ativo?"Cadastros municipais no Supabase":"Dados locais · sem envio automático";

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
 // Referência exata escolhida pelo usuário: Pra Somar, não Colaboradores.
 vistaInicial:TIPO==="ajuda"?AlertaGestaoDados.config.referencias(state.app.prefeitura()).vistaAjuda||null:null
});
void carregarZonasOficiais();
const fontesPublicas=(AlertaGestaoDados.config.referencias(state.app.prefeitura()).publicas||[]).map(path=>"../"+path);
void Promise.allSettled(fontesPublicas.map(url=>AlertaImportacaoPublica.carregar(state.app.db,{url}))).then(()=>{configurarCamadas();render();if(TIPO==="ajuda")tentarIniciarCaminhao();});
window.addEventListener("focus",()=>{configurarCamadas();render();});
if(AlertaGestaoDados.config.referencias(state.app.prefeitura()).catalogoBairros&&globalThis[AlertaGestaoDados.config.referencias(state.app.prefeitura()).catalogoBairros])
 state.territorio=globalThis[AlertaGestaoDados.config.referencias(state.app.prefeitura()).catalogoBairros].iniciar({map,L,recolherInicial:TIPO==="ajuda"});
})();
