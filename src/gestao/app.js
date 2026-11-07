/* Composição da Gestão Municipal e seus controladores. */
(function () {
"use strict";
const {$}={ $: id => document.getElementById(id) };
const D=window.AlertaGestaoDados;
if(!D){document.getElementById("page").textContent="Não foi possível carregar os cadastros.";return;}
// Município recebido do Admin Geral fica fixo nesta aba (sessionStorage).
// Apenas isolamento de demonstração; autorizações reais exigem backend e RLS.
const municipioId=D.config.selecionar(D,sessionStorage);
const db=D.criar(undefined,{municipioId});
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
  chat:'<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5z"/><path d="M8 11h9M8 14h6"/>'
};
const icon=(id,css="")=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="'+css+'" aria-hidden="true">'+(ICONS[id]||ICONS.list)+'</svg>';
const icons={territorio:"layers",implantacao:"pin",bairros:"layers",pessoas:"users",solicitacoes:"list",mobilizacoes:"bell",apoios:"building",inicio:"dashboard",eventos:"pin",prefeituras:"building",zonas:"layers",bases:"pin",riscos:"shield",administradores:"shield",responsaveis:"user",substitutos:"user",coordenadores:"users",operadores:"user",equipes:"wrench",integrantes:"users",voluntarios:"users",saude:"hospital",emergencias:"siren",parceiros:"building",veiculos:"truck",equipamentos:"wrench",estoques:"box",abrigos:"hospital",pontos:"pin",ocorrencias:"list",canais:"bell",regras:"shield"};
let toastTimer=null;
const municipio=db.municipioAtivo();
const {importarBasesERiscosPublicos,importarUnidadesCNES}=AlertaGestaoReferencias.criar({db,config:D.config,carregarPublica:(...args)=>globalThis.AlertaImportacaoPublica.carregar(...args),fetch:(...args)=>fetch(...args),onChange:()=>render(),onError:message=>toast(message)});

const PREF_TABS=[["territorio","Gerais"],["geoterritorialidade","Geoterritorialidade"],["estruturas","Estruturas"],["bases","Bases"],["riscos","Riscos"]];
const STRUCT_MODULES=[["saude","Unidades de saúde"],["emergencias","Emergência e segurança"],["parceiros","Órgãos e concessionárias"]];
const PREF_SECTIONS=new Set([...PREF_TABS.map(x=>x[0]),"pessoas",...STRUCT_MODULES.map(x=>x[0])]);

const state={atual:"inicio",pesquisa:"",geoTipo:"zonas",estruturaTipo:"saude"};
const {renderMunicipios,renderNav,topo,resumoCard}=AlertaGestaoNavegacao.criar({$,D,FRAME,NAV,PREF_SECTIONS,db,esc,icon,icons,render:(...args)=>render(...args),state});
const {renderInicio}=AlertaGestaoPainel.criar({PAGE,db,esc,icon,resumoCard:(...args)=>resumoCard(...args),topo:(...args)=>topo(...args)});
const {tabelaLinhas,mapaPreview,renderModulo}=AlertaGestaoTabelas.criar({$,D,PAGE,db,esc,icon,icons,state,topo:(...args)=>topo(...args)});
const {renderPrefTabs,structures,responsible,gabinete,renderTerritorioMunicipal,renderEstruturas,renderGeoterritorialidade}=AlertaGestaoPrefeitura.criar({$,PAGE,PREF_TABS,STRUCT_MODULES,db,esc,icon,importarUnidadesCNES,render:(...args)=>render(...args),state,topo:(...args)=>topo(...args)});
const {render}=AlertaGestaoRoteador.criar({D,PAGE,PREF_SECTIONS,abrirDrawer:(...args)=>abrirDrawer(...args),db,renderEstruturas:(...args)=>renderEstruturas(...args),renderGeoterritorialidade:(...args)=>renderGeoterritorialidade(...args),renderInicio:(...args)=>renderInicio(...args),renderModulo:(...args)=>renderModulo(...args),renderNav:(...args)=>renderNav(...args),renderPrefTabs:(...args)=>renderPrefTabs(...args),renderTerritorioMunicipal:(...args)=>renderTerritorioMunicipal(...args),state,topo:(...args)=>topo(...args)});
const {geocodificarPrefeitura,toast,excluir}=AlertaGestaoOperacoes.criar({$,db,render:(...args)=>render(...args),renderModulo:(...args)=>renderModulo(...args),renderMunicipios:(...args)=>renderMunicipios(...args),state,toastTimer});
const drawer=AlertaGestaoFormulario.criar({db,D,document,esc,structures,getCurrentPage:()=>state.atual,onDenied:toast});
const {abrirDrawer,fecharDrawer}=drawer;
FORM.addEventListener("submit",async e=>{
 e.preventDefault();const modulo=drawer.modulo||state.atual;
 const submit=$("drawer-save");if(submit.disabled)return;
 const data={};
 for(const [k,v] of new FormData(FORM).entries()){if(Object.hasOwn(data,k))data[k]=[].concat(data[k],v);else data[k]=v;}
 for(const f of D.ESQUEMAS[modulo].fields)if(f.type==="multi")data[f.key]=Array.isArray(data[f.key])?data[f.key]:data[f.key]?[data[f.key]]:[];
 submit.disabled=true;
 try{
  const item=await db.gravar(modulo,data,drawer.edicao);
  const novo=!drawer.edicao;
  fecharDrawer();
  if(modulo==="prefeituras")renderMunicipios();
  render();if(modulo==="bairros")window.dispatchEvent(new Event("gestao:bairros-atualizados"));toast("Cadastro salvo.");
  if(novo&&modulo==="prefeituras")geocodificarPrefeitura(item);
 }catch(err){$("form-error").textContent=err.message;}finally{submit.disabled=false;}
});
PAGE.addEventListener("click",async e=>{
 if(e.target.closest('[data-importar-tornado]')){try{if(db.tipo==="supabase")throw Error("Eventos demonstrativos não são enviados ao Supabase.");const reference=D.config.referencias(db.municipioAtivo()).eventoHistorico;
if(!reference||!globalThis[reference.adaptador])throw Error("Não há evento de referência configurado para esta prefeitura.");
globalThis[reference.adaptador].importar(db);render();toast('Evento histórico disponível no cadastro.');}catch(err){toast(err.message||'Não foi possível importar.');}return;}

 const novo=e.target.closest("[data-new]");
 const edit=e.target.closest("[data-edit]");
 const del=e.target.closest("[data-delete]");
 const canon=e.target.closest("[data-canon-edit]");
 const geoEdit=e.target.closest("[data-geo-edit]");
 if(canon){abrirDrawer(canon.dataset.id,canon.dataset.canonEdit);return;}
 if(geoEdit){abrirDrawer(geoEdit.dataset.geoEdit,geoEdit.dataset.geoModule||state.geoTipo);return;}
 if(novo){
  e.preventDefault();
  if(state.atual==="inicio")location.hash="#"+novo.dataset.new;
  else abrirDrawer(null,novo.dataset.new);
  return;
 }
 if(edit){abrirDrawer(edit.dataset.edit);return;}
 if(del){excluir(del.dataset.delete);return;}
});
window.addEventListener("gestao:referencia-territorial",e=>{
 const {modulo,source}=e.detail||{};
 if(state.atual!=="geoterritorialidade"||!["zonas","bairros"].includes(modulo)||!source)return;
 abrirDrawer(null,modulo,source);
});
$("drawer-close").onclick=fecharDrawer;
$("drawer-cancel").onclick=fecharDrawer;
DRAWER.addEventListener("click",e=>{if(e.target===DRAWER)fecharDrawer();});
document.addEventListener("keydown",e=>{
 if(DRAWER.hidden)return;
 if(e.key==="Escape"){e.preventDefault();fecharDrawer();}
 if(e.key==="Tab"){
  const items=[...DRAWER.querySelectorAll("button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])")].filter(x=>!x.closest("[hidden]"));
  if(!items.length)return;
  if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1).focus();}
  else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0].focus();}
 }
});
$("toggle-sidebar").onclick=()=>{
 const isMobile=window.matchMedia("(max-width:850px)").matches;
 if(isMobile){FRAME.classList.toggle("mobile-open");$("toggle-sidebar").setAttribute("aria-expanded",String(FRAME.classList.contains("mobile-open")));}
 else{FRAME.classList.toggle("collapsed");$("toggle-sidebar").setAttribute("aria-expanded",String(!FRAME.classList.contains("collapsed")));}
};
$("sidebar-scrim").onclick=()=>{FRAME.classList.remove("mobile-open");$("toggle-sidebar").setAttribute("aria-expanded","false");};
window.addEventListener("hashchange",()=>{state.pesquisa="";render();});
renderMunicipios();
const abrirMapa=$("abrir-mapa");
// A liberação operacional permanece explícita até a homologação do mapa municipal.
if(db.tipo!=='supabase'&&!D.config.referencias(db.municipioAtivo()).mapaDemonstrativo){
 abrirMapa.href="#";
 abrirMapa.title="Mapa de Evento deste município requer implantação operacional.";
 abrirMapa.setAttribute("aria-disabled","true");
 abrirMapa.addEventListener("click",e=>{e.preventDefault();toast("O Mapa de Evento desta Prefeitura ainda precisa ser configurado.");},true);
}
abrirMapa.addEventListener("click",e=>{
 if(window.matchMedia("(max-width:850px)").matches)return; // navegador móvel controla a janela
 e.preventDefault();
 const largura=Math.max(760,Math.min(1500,screen.availWidth-70));
 const altura=Math.max(550,Math.min(950,screen.availHeight-70));
 const esquerda=Math.max(0,Math.round((screen.availWidth-largura)/2));
 const topo=Math.max(0,Math.round((screen.availHeight-altura)/2));
 const win=window.open(abrirMapa.href,"AlertaMapaOperacional",
  "popup=yes,width="+largura+",height="+altura+",left="+esquerda+",top="+topo);
 if(win){try{win.opener=null;win.focus();}catch(_){}}
 else{const fallback=document.createElement("a");fallback.href=abrirMapa.href;fallback.target="_blank";fallback.rel="noopener noreferrer";document.body.appendChild(fallback);fallback.click();fallback.remove();}
});
if(!window.AlertaNuvem?.ativo&&globalThis.AlertaSessao&&globalThis.AlertaSessaoUI&&db.municipioAtivo()){
 try{
  const local=AlertaSessao.criar({municipioId:db.municipioAtivo().id});
  AlertaSessaoUI.criar({target:$("session-anchor"),sessao:local,municipio:db.municipioAtivo().nome,zonas:db.lista("zonas").map(x=>x.nome),aoMudar:()=>{}});
 }catch(error){$("session-anchor").textContent="Minha sessão";}
}
render();
void importarUnidadesCNES();
void importarBasesERiscosPublicos();
// Ao trocar para uma prefeitura nova, tentar localizar seu mapa automaticamente.
const prefeituraInicial=db.municipioAtivo();
// Georreferenciamento inicial exclusivo da Administração Geral.
})();
