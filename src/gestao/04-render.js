function render(){
 if(db.municipioAtivo()?.status==="suspensa"){
  PAGE.innerHTML=topo("Município suspenso","O Admin Geral suspendeu este município. A gestão municipal não pode operar até reativação.");
  return;
 }
 const hash=decodeURIComponent(location.hash.replace(/^#/,""))||"inicio";
 if(hash==="bairros"||hash==="zonas")geoTipo=hash;
 if(["saude","emergencias","parceiros"].includes(hash))estruturaTipo=hash;
 const alias=hash==="prefeituras"||hash==="implantacao"||hash==="pessoas"?"territorio":hash==="bairros"||hash==="zonas"?"geoterritorialidade":["saude","emergencias","parceiros"].includes(hash)?"estruturas":hash;
 const proximo=alias==="inicio"||alias==="conversas"||alias==="estruturas"||alias==="geoterritorialidade"||Object.hasOwn(D.ESQUEMAS,alias)?alias:"inicio";
 if(db.tipo==='supabase'&&!AlertaPermissoesUI.podeRota(db,proximo)){PAGE.innerHTML=topo('Acesso restrito','Seu vínculo não permite consultar este cadastro.');return;}
 if(proximo!==atual)pesquisa="";
 atual=proximo;
 document.title=(atual==="inicio"?"Gestão":atual==="conversas"?"Central de Conversas":atual==="estruturas"?"Estruturas":atual==="geoterritorialidade"?"Geoterritorialidade":D.ESQUEMAS[atual].label)+" | Gestão Municipal";
 renderNav();
 if(atual==="inicio")renderInicio();
 else if(atual==="conversas"){
  try{db.tipo!=="supabase"&&window.MaringaColaboradoresDemo?.garantir(db,window.localStorage)}catch(err){console.warn("Ajudantes demonstrativos não puderam ser importados",err);}
  window.AlertaCentralConversas.montar({target:PAGE,db,onEdit:id=>abrirDrawer(id,"voluntarios"),onNew:()=>abrirDrawer(null,"voluntarios")});
 }
 else if(atual==="territorio")renderTerritorioMunicipal();
 else if(atual==="estruturas")renderEstruturas();
 else if(atual==="geoterritorialidade")renderGeoterritorialidade();
 else renderModulo();
 if(PREF_SECTIONS.has(atual)){
  renderPrefTabs();
  if(atual==="geoterritorialidade")window.dispatchEvent(new Event("gestao:geo-render"));
 }
}
