/* Área administrativa independente. A janela operacional original permanece intocada. */
(function () {
"use strict";
const {$}={ $: id => document.getElementById(id) };
const D=window.AlertaGestaoDados;
if(!D){document.getElementById("page").textContent="Não foi possível carregar os cadastros.";return;}
// Município recebido do Admin Geral fica fixo nesta aba (sessionStorage).
// Apenas isolamento de demonstração; autorizações reais exigem backend e RLS.
const CIDADE_DEMO=sessionStorage.getItem("alerta_contexto_municipal_demo_v1")||"maringa";
const db=D.criar(undefined,{municipioId:CIDADE_DEMO});
const PAGE=document.getElementById("page");
const NAV=document.getElementById("sidebar-nav");
const FRAME=document.getElementById("app-frame");
const DRAWER=document.getElementById("drawer-overlay");
const FORM=document.getElementById("cadastro-form");
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ICONS={
  dashboard:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  building:'<path d="M4 21V5l8-3 8 3v16M2 21h20M9 8h2m-2 4h2m2-4h2m-2 4h2m-5 9v-5h4v5"/>',
  layers:'<path d="m12 2 9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5"/>',
  pin:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  shield:'<path d="m12 2 8 4v6c0 5-4 8-8 10-4-2-8-5-8-10V6z"/><path d="m9 12 2 2 4-4"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M10 3.2a4 4 0 1 1 0 7.6M17 7a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.9"/>',
  wrench:'<path d="M14 6a6 6 0 0 0-8 8l-4 4a2 2 0 0 0 3 3l4-4a6 6 0 0 0 8-8l-5 5-3-3z"/>',
  hospital:'<path d="M5 21V3h14v18M2 21h20M12 7v8M8 11h8M10 21v-4h4v4"/>',
  siren:'<path d="M5 16h14l-1-8a6 6 0 0 0-12 0l-1 8zM3 20h18M12 1v2M3 4l2 2M21 4l-2 2"/>',
  truck:'<path d="M3 5h12v12H3zM15 9h4l3 4v4h-7zM7 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4M19 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4"/>',
  box:'<path d="m12 2 9 5-9 5-9-5zM3 7v10l9 5 9-5V7M12 12v10"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  list:'<path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  external:'<path d="M14 5h5v5M19 5l-9 9"/><path d="M19 13v6H5V5h6"/>',
  chevron:'<path d="m9 18 6-6-6-6"/>',
  chat:'<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5z"/><path d="M8 11h9M8 14h6"/>'
};
const icon=(id,css="")=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="'+css+'" aria-hidden="true">'+(ICONS[id]||ICONS.list)+'</svg>';
const icons={territorio:"layers",implantacao:"pin",bairros:"layers",pessoas:"users",solicitacoes:"list",mobilizacoes:"bell",apoios:"building",inicio:"dashboard",eventos:"pin",prefeituras:"building",zonas:"layers",bases:"pin",riscos:"shield",administradores:"shield",responsaveis:"user",substitutos:"user",coordenadores:"users",operadores:"user",equipes:"wrench",integrantes:"users",voluntarios:"users",saude:"hospital",emergencias:"siren",parceiros:"building",veiculos:"truck",equipamentos:"wrench",estoques:"box",abrigos:"hospital",pontos:"pin",ocorrencias:"list",canais:"bell",regras:"shield"};
let atual="inicio",pesquisa="",edicao=null,ultimoFoco=null,toastTimer=null,geoTipo="zonas",drawerModulo=null;
const cidadesPorUf=new Map();
const municipio=db.municipioAtivo();
function renderMunicipios(){
 const select=$("municipio-switch"),lista=db.municipios();
 select.innerHTML=lista.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nome)+" · "+esc(x.uf)+"</option>").join("");
 select.value=db.municipioAtivo()?.id||"";
 select.disabled=true;select.title="O município é atribuído pelo Admin Geral da plataforma.";
}
function renderNav(){
 NAV.innerHTML='<div class="nav-group"><div class="nav-group-title">Atendimento</div><a class="nav-item'+(atual==="conversas"?" active":"")+'" href="#conversas" data-nav="conversas" aria-current="'+(atual==="conversas"?"page":"false")+'" title="Central de Conversas">'+icon("chat")+'<span class="nav-label">Central de Conversas</span></a></div>'+D.GROUPS.map(g=>'<div class="nav-group"><div class="nav-group-title">'+esc(g.label)+'</div>'+
   g.items.map(id=>'<a class="nav-item'+((atual===id||(id==="territorio"&&PREF_SECTIONS.has(atual)))?" active":"")+'" href="#'+esc(id)+'" data-nav="'+esc(id)+'" aria-current="'+((atual===id||(id==="territorio"&&PREF_SECTIONS.has(atual)))?"page":"false")+'" title="'+esc(id==="inicio"?"Visão geral":D.ESQUEMAS[id].label)+'">'+icon(icons[id])+'<span class="nav-label">'+esc(id==="inicio"?"Visão geral":D.ESQUEMAS[id].label)+"</span></a>").join("")+"</div>").join("");
 NAV.querySelectorAll("[data-nav]").forEach(el=>el.onclick=()=>{
  FRAME.classList.remove("mobile-open");
  if(location.hash==="#"+el.dataset.nav) {pesquisa="";render();}
 });
}
function topo(titulo,subtitulo,acao){
 return '<div class="heading-row"><div><div class="eyebrow">'+esc(PREF_SECTIONS.has(atual)?"GESTÃO MUNICIPAL":db.municipioAtivo()?.nome||"Municípios")+'</div><h1 class="page-title">'+esc(titulo)+'</h1><p class="page-subtitle">'+esc(subtitulo)+'</p></div>'+
 (acao?'<div class="heading-actions"><button class="btn btn-primary" type="button" data-new="'+esc(acao)+'">'+icon("plus")+ 'Novo cadastro</button></div>':"")+"</div>";
}
function resumoCard(nome,valor,icone,nota){
 return '<div class="metric"><div class="metric-top">'+esc(nome)+icon(icone)+'</div><div class="metric-value">'+esc(valor)+'</div><div class="metric-foot">'+esc(nota)+'</div></div>';
}
