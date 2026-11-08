/* roteador: controlador com dependências explícitas. */
(function(root){'use strict';
function criar({D,PAGE,PREF_SECTIONS,abrirDrawer,db,renderEstruturas,renderGeoterritorialidade,renderInicio,renderModulo,renderNav,renderPrefTabs,renderTerritorioMunicipal,state,topo}){
function render(){
 root.AlertaContatos?.desmontar();
 if(db.municipioAtivo()?.status==="suspensa"){
  PAGE.innerHTML=topo("Município suspenso","O Admin Geral suspendeu este município. A gestão municipal não pode operar até reativação.");
  return;
 }
 const hash=decodeURIComponent(location.hash.replace(/^#/,""))||"inicio";
 if(hash==="bairros"||hash==="zonas")state.geoTipo=hash;
 if(["saude","emergencias","parceiros"].includes(hash))state.estruturaTipo=hash;
 const alias=hash==="prefeituras"||hash==="implantacao"||hash==="pessoas"?"territorio":hash==="bairros"||hash==="zonas"?"geoterritorialidade":["saude","emergencias","parceiros"].includes(hash)?"estruturas":hash;
 const proximo=alias==="inicio"||alias==="conversas"||alias==="estruturas"||alias==="geoterritorialidade"||Object.hasOwn(D.ESQUEMAS,alias)?alias:"inicio";
 if(db.tipo==='supabase'&&!AlertaPermissoesUI.podeRota(db,proximo)){PAGE.innerHTML=topo('Acesso restrito','Seu vínculo não permite consultar este cadastro.');return;}
 if(proximo!==state.atual)state.pesquisa="";
 state.atual=proximo;
 document.title=(state.atual==="inicio"?"Gestão":state.atual==="conversas"?"Central de Conversas":state.atual==="estruturas"?"Estruturas":state.atual==="geoterritorialidade"?"Geoterritorialidade":D.ESQUEMAS[state.atual].label)+" | Gestão Municipal";
 renderNav();
 if(state.atual==="inicio")renderInicio();
 else if(state.atual==="conversas"){
  try{db.tipo!=="supabase"&&window.MaringaColaboradoresDemo?.garantir(db,window.localStorage,{gerarExemplo:new URLSearchParams(location.search).get("modo")==="demo"||new URLSearchParams(location.search).get("demo")==="1"})}catch(err){console.warn("Ajudantes demonstrativos não puderam ser importados",err);}
  window.AlertaCentralConversas.montar({target:PAGE,db,onEdit:id=>abrirDrawer(id,"voluntarios"),onNew:()=>abrirDrawer(null,"voluntarios")});
 }
 else if(state.atual==="voluntarios"&&db.tipo==="supabase")window.AlertaContatos.montar({target:PAGE,db,onEdit:id=>abrirDrawer(id,"voluntarios")});
 else if(state.atual==="territorio")renderTerritorioMunicipal();
 else if(state.atual==="estruturas")renderEstruturas();
 else if(state.atual==="geoterritorialidade")renderGeoterritorialidade();
 else renderModulo();
 if(PREF_SECTIONS.has(state.atual)){
  renderPrefTabs();
  if(state.atual==="geoterritorialidade")window.dispatchEvent(new Event("gestao:geo-render"));
 }
}
return {render};
}
root.AlertaGestaoRoteador={criar};
})(globalThis);
