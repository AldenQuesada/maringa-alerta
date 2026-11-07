/* UI única: implantação territorial + RH por prefeitura.
 * Fonte de dados pública e/ou importação de arquivos municipais, sempre com revisão.
 * Não altera outros módulos administrativos nem o mapa de evento.
 */
(function(global){
"use strict";
let C=global.AlertaImplantacaoCore;const D=global.AlertaGestaoDados;
if(!C||!D)return;
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const $=id=>document.getElementById(id);
const stage={grupos:{},geo:null,ibge:null,logs:[],updated:""};
const normal=x=>String(x??"").toLowerCase();
const TAB=["bairros","zonas","saude","emergencias","parceiros","bases","riscos","pontos"];
const LABEL={
 bairros:"Bairros",zonas:"Zonas operacionais",saude:"Unidades de saúde",emergencias:"Bombeiros e polícias",
 parceiros:"Concessionárias e parceiros",bases:"Bases de apoio",riscos:"Áreas de risco",pontos:"Pontos críticos"
};
let ctx=null,tab="saude",search="",activeEdit=null,map=null,geoLayer=null,markerLayer=null,busy=false,rhRole="",rhZone="",rhSearch="",rhEdit=null;
const uid=()=>global.crypto?.randomUUID?.()||"draft-"+Date.now()+"-"+Math.random().toString(36).slice(2);
const institutionModule=x=>x.categoria==="Saúde"?"saude":x.categoria==="Emergência"?"emergencias":"parceiros";
function notify(msg){ctx?.toast?.(msg);}
function log(source,msg,status="info"){stage.logs.push({source,msg,status,time:new Date().toLocaleTimeString("pt-BR")});stage.updated=new Date().toISOString();}
function addStage(modulo,items){if(!TAB.includes(modulo))return;const list=stage.grupos[modulo]||[];
 const byKey=new Map(list.map(x=>[C.uniqueKey(x),x]));
 for(const x of items){if(x?.nome)byKey.set(C.uniqueKey(x),x);}
 stage.grupos[modulo]=[...byKey.values()];
}
function ready(){return !!ctx?.db?.municipioAtivo()?.codigo_ibge;}
function locState(){const p=ctx.db.municipioAtivo();return '<div class="mi-context"><strong>'+esc(p?.pais||'Brasil')+'</strong><strong>'+esc(p?.estado||p?.uf||'')+'</strong><strong>'+esc(p?.nome||'Município')+'</strong><span class="mi-code">IBGE '+esc(p?.codigo_ibge||'')+'</span></div>';}
function summary(){
 const state=ctx.db.estado(),id=ctx.db.municipioAtivo()?.id;
 const count=k=>(state[D.ESQUEMAS[k].collection]||[]).filter(x=>x.municipioId===id&&(!D.ESQUEMAS[k].category||x.categoria===D.ESQUEMAS[k].category)).length;
 const num=Object.values(stage.grupos).reduce((n,list)=>n+list.length,0);
 return '<div class="mi-summary">'+
 [['Município',1],['Bairros',count("bairros")],['Unidades de saúde',count("saude")],['Serviços e segurança',count("emergencias")+count("parceiros")],['Prontos para conferir',num]].map(([a,b])=>'<div><span>'+esc(a)+'</span><strong>'+b+'</strong></div>').join("")+'</div>';
}
function previewRows(k){
 const fromDB=ctx.db.lista(k);
 const staged=stage.grupos[k]||[];
 const map=new Map(fromDB.map(x=>[C.uniqueKey(x),{...x,_pending:false}]));
 for(const x of staged){
  const key=C.uniqueKey(x),old=map.get(key);
  map.set(key,{...(old||{}),...x,_pending:true});
 }
 return [...map.values()];
}
function selectedRows(){
 return previewRows(tab).filter(x=>{
  const needle=normal(search.trim());
  return !needle||[x.nome,x.tipo,x.bairro,x.zona,x.endereco,x.fonte,x.codigo_cnes].some(v=>normal(v).includes(needle));
 });
}
function renderTerritory(){
 if(!ctx)return;const page=ctx.page;
 const disable=!ready();
 page.innerHTML='<div class="mi-head"><div><div class="eyebrow">CADASTRO TERRITORIAL ÚNICO</div><h1 class="page-title">Implantação municipal</h1><p class="page-subtitle">País, estado, prefeitura, bairros e zonas, unidades e gabinete de crise. Uma única tela, com importação, mapa, tabela e conferência.</p></div></div>'+
 locState()+summary()+
 '<div class="mi-workflow"><div class="mi-workflow-title"><strong>Importar e conferir</strong><small>Registros só são gravados quando você escolher Salvar implantação.</small></div>'+
 '<div class="mi-actions"><button class="btn btn-primary" type="button" id="mi-import"'+(busy||disable?" disabled":"")+'>Importar IBGE + CNES</button>'+
 '<button class="btn" type="button" id="mi-gg"'+(busy||disable?" disabled":"")+'>Preparar órgãos do gabinete</button>'+
 '<label class="mi-file-btn" for="mi-file">Importar GeoJSON / CSV</label><input id="mi-file" type="file" accept=".geojson,.json,.csv,application/json,text/csv"'+(busy||disable?" disabled":"")+'>'+
 '<label class="mi-file-kind">Categoria do arquivo <select id="mi-kind">'+
 [...TAB.filter(k=>k!=="zonas"),"cnes-csv"].map(k=>'<option value="'+k+'">'+esc(LABEL[k]||"CNES CSV")+'</option>').join("")+'</select></label>'+
 '<button class="btn btn-primary" type="button" id="mi-save"'+(busy||disable||(!Object.values(stage.grupos).some(v=>v.length)&&!stage.geo&& !stage.ibge)?" disabled":"")+'>Salvar implantação</button>'+
 '</div><div id="mi-progress" role="status" class="mi-progress">'+(busy?"Importação em andamento. Consultando as bases públicas...":"Importação assistida: confirme o lote e valide os endereços antes do uso operacional.")+'</div>'+
 (stage.logs.length?'<div class="mi-logs">'+stage.logs.slice(-8).map(x=>'<div class="'+esc(x.status)+'"><strong>'+esc(x.source)+':</strong> '+esc(x.msg)+'</div>').join("")+'</div>':"")+
 '</div><div class="mi-catalog"><div class="mi-filterbar"><label>Inventário <select id="mi-tab">'+TAB.map(k=>'<option value="'+k+'"'+(k===tab?" selected":"")+'>'+esc(LABEL[k])+'</option>').join("")+'</select></label>'+
 '<label>Buscar <input id="mi-search" type="search" value="'+esc(search)+'" placeholder="Nome, bairro, tipo, CNES..."></label><span id="mi-count"></span></div>'+
 '<div class="mi-datagrid"><div class="mi-table-wrap"><table class="mi-table"><thead><tr><th>Registro</th><th>Tipo</th><th>Localização</th><th>Verificação</th><th>Ação</th></tr></thead><tbody id="mi-rows"></tbody></table></div>'+
 '<div class="mi-map-pane"><div class="mi-map-header"><strong>Georreferenciamento</strong><small>Marcadores privados de consulta administrativa, não mapa público.</small></div><div id="mi-map" class="mi-map"></div><div class="mi-map-footer">Sem geometria oficial? O registro fica na tabela, marcado para conferência.</div></div></div></div>'+
 '<section class="mi-review" id="mi-editor" hidden></section>'+
 '<section class="mi-sources"><strong>Fontes e importação</strong>'+
 '<p>IBGE Localidades e Malhas; CNES Ministério da Saúde. Para bairros, áreas de risco ou pontos ainda não publicados por API acessível, importe o GeoJSON/CSV municipal exportado da fonte territorial da prefeitura. Os órgãos sem endereço ficam como pendentes.</p>'+
 '<div><a href="'+esc(C.FONTES.ibge)+'" target="_blank" rel="noopener">IBGE</a><a href="'+esc(C.FONTES.cnes)+'" target="_blank" rel="noopener">CNES</a><a href="'+esc(C.FONTES.cnesCsv)+'" target="_blank" rel="noopener">Extrair CNES CSV</a></div>'+
 '</section>';
 $("mi-tab").onchange=e=>{tab=e.target.value;search="";renderTerritory();};
 $("mi-search").oninput=e=>{search=e.target.value;refreshTable();};
 $("mi-import").onclick=importOfficial;
 $("mi-gg").onclick=()=>{addStage("emergencias",C.EMERGENCIA.filter(x=>x.categoria==="Emergência"));addStage("parceiros",C.EMERGENCIA.filter(x=>x.categoria==="Parceiros"));
  log("Gabinete de crise","Sete tipos institucionais preparados SEM endereços ou pessoas atribuídas. Conferir cada unidade antes de validar.","warn");renderTerritory();};
 $("mi-save").onclick=saveAll;
 $("mi-file").onchange=e=>loadFile(e.target.files?.[0]);
 refreshTable();initMap();
}
