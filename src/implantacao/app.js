/* UI única: implantação territorial + RH por prefeitura.
 * Fonte de dados pública e/ou importação de arquivos municipais, sempre com revisão.
 * Não altera outros módulos administrativos nem o mapa de evento.
 */
(function(global){
"use strict";
const state={C:global.AlertaImplantacaoCore,ctx:null,tab:"saude",search:"",activeEdit:null,map:null,geoLayer:null,markerLayer:null,busy:false,rhRole:"",rhZone:"",rhSearch:"",rhEdit:null};
const D=global.AlertaGestaoDados;
if(!state.C||!D)return;
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const $=id=>document.getElementById(id);
const stage={grupos:{},geo:null,ibge:null,logs:[],updated:""};
const normal=x=>String(x??"").toLowerCase();
const TAB=["bairros","zonas","saude","emergencias","parceiros","bases","riscos","pontos"];
const LABEL={
 bairros:"Bairros",zonas:"Zonas operacionais",saude:"Unidades de saúde",emergencias:"Bombeiros e polícias",
 parceiros:"Concessionárias e parceiros",bases:"Bases de apoio",riscos:"Áreas de risco",pontos:"Pontos críticos"
};

const uid=()=>global.crypto?.randomUUID?.()||"draft-"+Date.now()+"-"+Math.random().toString(36).slice(2);
const institutionModule=x=>x.categoria==="Saúde"?"saude":x.categoria==="Emergência"?"emergencias":"parceiros";

const request=async(url,timeout=D.parametros.implantacao.timeoutMs)=>{
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
 try{const r=await fetch(url,{headers:{Accept:"application/json"},signal:ctrl.signal,cache:"no-cache"});
  if(!r.ok)throw Error("HTTP "+r.status);
  return await r.json();
 }finally{clearTimeout(timer);}
};

const ROLE_OPTIONS=[["admin","Administrador municipal"],["responsavel","Responsável regional"],["substituto","Substituto"],["coordenador","Coordenador"],["operador","Operador"]];

function montar({page,db,mode,toast}){
 const municipioId=db.municipioAtivo()?.id;
 if(state.busy&&state.ctx?.municipioId!==municipioId){notify("Aguarde a operação atual antes de trocar de prefeitura.");return;}
 if(state.ctx?.municipioId!==municipioId){stage.grupos={};stage.geo=null;stage.ibge=null;stage.logs=[];}
 state.C=global.AlertaImplantacaoCore.criar(db.municipioAtivo());
 state.ctx={page,db,toast,municipioId};if(mode==="pessoas"){if(state.map){state.map.remove();state.map=null;}renderRH();}
 else if(mode==="implantacao")renderTerritory();
}
const {notify,log,addStage,ready,locState,summary,previewRows,selectedRows}=AlertaImplantacaoPrevia.criar({D,TAB,esc,normal,stage,state});
const {renderTerritory,refreshTable}=AlertaImplantacaoTerritorio.criar({$,LABEL,TAB,addStage:(...args)=>addStage(...args),esc,focusFeature:(...args)=>focusFeature(...args),importOfficial:(...args)=>importOfficial(...args),initMap:(...args)=>initMap(...args),loadFile:(...args)=>loadFile(...args),locState:(...args)=>locState(...args),log:(...args)=>log(...args),openEditor:(...args)=>openEditor(...args),ready:(...args)=>ready(...args),renderMarkers:(...args)=>renderMarkers(...args),saveAll:(...args)=>saveAll(...args),selectedRows:(...args)=>selectedRows(...args),stage,state,summary:(...args)=>summary(...args)});
const {initMap,renderMarkers,focusFeature}=AlertaImplantacaoMapa.criar({$,esc,global,log:(...args)=>log(...args),notify:(...args)=>notify(...args),selectedRows:(...args)=>selectedRows(...args),stage,state});
const {openEditor}=AlertaImplantacaoEditor.criar({$,D,addStage:(...args)=>addStage(...args),esc,notify:(...args)=>notify(...args),renderTerritory:(...args)=>renderTerritory(...args),stage,state});
const {importOfficial,loadFile,saveAll}=AlertaImplantacaoImportacao.criar({$,addStage:(...args)=>addStage(...args),log:(...args)=>log(...args),notify:(...args)=>notify(...args),ready:(...args)=>ready(...args),renderTerritory:(...args)=>renderTerritory(...args),request,stage,state});
const {renderRH,openRH}=AlertaImplantacaoPessoas.criar({$,ROLE_OPTIONS,esc,locState:(...args)=>locState(...args),normal,notify:(...args)=>notify(...args),state});
global.AlertaImplantacaoUI={montar,renderTerritory,renderRH,preview:()=>JSON.parse(JSON.stringify(stage))};
})(typeof globalThis!=="undefined"?globalThis:window);
