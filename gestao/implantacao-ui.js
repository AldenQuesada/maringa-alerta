/* previa: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({D,TAB,esc,normal,stage,state}){
function notify(msg){state.ctx?.toast?.(msg);}
function log(source,msg,status="info"){stage.logs.push({source,msg,status,time:new Date().toLocaleTimeString("pt-BR")});stage.updated=new Date().toISOString();}
function addStage(modulo,items){if(!TAB.includes(modulo))return;const list=stage.grupos[modulo]||[];
 const byKey=new Map(list.map(x=>[state.C.uniqueKey(x),x]));
 for(const x of items){if(x?.nome)byKey.set(state.C.uniqueKey(x),x);}
 stage.grupos[modulo]=[...byKey.values()];
}
function ready(){return !!state.ctx?.db?.municipioAtivo()?.codigo_ibge;}
function locState(){const p=state.ctx.db.municipioAtivo();return '<div class="mi-context"><strong>'+esc(p?.pais||'Brasil')+'</strong><strong>'+esc(p?.estado||p?.uf||'')+'</strong><strong>'+esc(p?.nome||'Município')+'</strong><span class="mi-code">IBGE '+esc(p?.codigo_ibge||'')+'</span></div>';}
function summary(){
 const registros=state.ctx.db.estado(),id=state.ctx.db.municipioAtivo()?.id;
 const count=k=>(registros[D.ESQUEMAS[k].collection]||[]).filter(x=>x.municipioId===id&&(!D.ESQUEMAS[k].category||x.categoria===D.ESQUEMAS[k].category)).length;
 const num=Object.values(stage.grupos).reduce((n,list)=>n+list.length,0);
 return '<div class="mi-summary">'+
 [['Município',1],['Bairros',count("bairros")],['Unidades de saúde',count("saude")],['Serviços e segurança',count("emergencias")+count("parceiros")],['Prontos para conferir',num]].map(([a,b])=>'<div><span>'+esc(a)+'</span><strong>'+b+'</strong></div>').join("")+'</div>';
}
function previewRows(k){
 const fromDB=state.ctx.db.lista(k);
 const staged=stage.grupos[k]||[];
 const map=new Map(fromDB.map(x=>[state.C.uniqueKey(x),{...x,_pending:false}]));
 for(const x of staged){
  const key=state.C.uniqueKey(x),old=map.get(key);
  map.set(key,{...(old||{}),...x,_pending:true});
 }
 return [...map.values()];
}
function selectedRows(){
 return previewRows(state.tab).filter(x=>{
  const needle=normal(state.search.trim());
  return !needle||[x.nome,x.tipo,x.bairro,x.zona,x.endereco,x.fonte,x.codigo_cnes].some(v=>normal(v).includes(needle));
 });
}
return {notify,log,addStage,ready,locState,summary,previewRows,selectedRows};
}
root.AlertaImplantacaoPrevia={criar};
})(globalThis);
/* territorio: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({$,LABEL,TAB,addStage,esc,focusFeature,importOfficial,initMap,loadFile,locState,log,openEditor,ready,renderMarkers,saveAll,selectedRows,stage,state,summary}){
function renderTerritory(){
 if(!state.ctx)return;const page=state.ctx.page;
 const disable=!ready();
 page.innerHTML='<div class="mi-head"><div><div class="eyebrow">CADASTRO TERRITORIAL ÚNICO</div><h1 class="page-title">Implantação municipal</h1><p class="page-subtitle">País, estado, prefeitura, bairros e zonas, unidades e gabinete de crise. Uma única tela, com importação, mapa, tabela e conferência.</p></div></div>'+
 locState()+summary()+
 '<div class="mi-workflow"><div class="mi-workflow-title"><strong>Importar e conferir</strong><small>Registros só são gravados quando você escolher Salvar implantação.</small></div>'+
 '<div class="mi-actions"><button class="btn btn-primary" type="button" id="mi-import"'+(state.busy||disable?" disabled":"")+'>Importar IBGE + CNES</button>'+
 '<button class="btn" type="button" id="mi-gg"'+(state.busy||disable?" disabled":"")+'>Preparar órgãos do gabinete</button>'+
 '<label class="mi-file-btn" for="mi-file">Importar GeoJSON / CSV</label><input id="mi-file" type="file" accept=".geojson,.json,.csv,application/json,text/csv"'+(state.busy||disable?" disabled":"")+'>'+
 '<label class="mi-file-kind">Categoria do arquivo <select id="mi-kind">'+
 [...TAB.filter(k=>k!=="zonas"),"cnes-csv"].map(k=>'<option value="'+k+'">'+esc(LABEL[k]||"CNES CSV")+'</option>').join("")+'</select></label>'+
 '<button class="btn btn-primary" type="button" id="mi-save"'+(state.busy||disable||(!Object.values(stage.grupos).some(v=>v.length)&&!stage.geo&& !stage.ibge)?" disabled":"")+'>Salvar implantação</button>'+
 '</div><div id="mi-progress" role="status" class="mi-progress">'+(state.busy?"Importação em andamento. Consultando as bases públicas...":"Importação assistida: confirme o lote e valide os endereços antes do uso operacional.")+'</div>'+
 (stage.logs.length?'<div class="mi-logs">'+stage.logs.slice(-8).map(x=>'<div class="'+esc(x.status)+'"><strong>'+esc(x.source)+':</strong> '+esc(x.msg)+'</div>').join("")+'</div>':"")+
 '</div><div class="mi-catalog"><div class="mi-filterbar"><label>Inventário <select id="mi-tab">'+TAB.map(k=>'<option value="'+k+'"'+(k===state.tab?" selected":"")+'>'+esc(LABEL[k])+'</option>').join("")+'</select></label>'+
 '<label>Buscar <input id="mi-search" type="search" value="'+esc(state.search)+'" placeholder="Nome, bairro, tipo, CNES..."></label><span id="mi-count"></span></div>'+
 '<div class="mi-datagrid"><div class="mi-table-wrap"><table class="mi-table"><thead><tr><th>Registro</th><th>Tipo</th><th>Localização</th><th>Verificação</th><th>Ação</th></tr></thead><tbody id="mi-rows"></tbody></table></div>'+
 '<div class="mi-map-pane"><div class="mi-map-header"><strong>Georreferenciamento</strong><small>Marcadores privados de consulta administrativa, não mapa público.</small></div><div id="mi-map" class="mi-map"></div><div class="mi-map-footer">Sem geometria oficial? O registro fica na tabela, marcado para conferência.</div></div></div></div>'+
 '<section class="mi-review" id="mi-editor" hidden></section>'+
 '<section class="mi-sources"><strong>Fontes e importação</strong>'+
 '<p>IBGE Localidades e Malhas; CNES Ministério da Saúde. Para bairros, áreas de risco ou pontos ainda não publicados por API acessível, importe o GeoJSON/CSV municipal exportado da fonte territorial da prefeitura. Os órgãos sem endereço ficam como pendentes.</p>'+
 '<div><a href="'+esc(state.C.FONTES.ibge)+'" target="_blank" rel="noopener">IBGE</a><a href="'+esc(state.C.FONTES.cnes)+'" target="_blank" rel="noopener">CNES</a><a href="'+esc(state.C.FONTES.cnesCsv)+'" target="_blank" rel="noopener">Extrair CNES CSV</a></div>'+
 '</section>';
 $("mi-tab").onchange=e=>{state.tab=e.target.value;state.search="";renderTerritory();};
 $("mi-search").oninput=e=>{state.search=e.target.value;refreshTable();};
 $("mi-import").onclick=importOfficial;
 $("mi-gg").onclick=()=>{addStage("emergencias",state.C.EMERGENCIA.filter(x=>x.categoria==="Emergência"));addStage("parceiros",state.C.EMERGENCIA.filter(x=>x.categoria==="Parceiros"));
  log("Gabinete de crise","Sete tipos institucionais preparados SEM endereços ou pessoas atribuídas. Conferir cada unidade antes de validar.","warn");renderTerritory();};
 $("mi-save").onclick=saveAll;
 $("mi-file").onchange=e=>loadFile(e.target.files?.[0]);
 refreshTable();initMap();
}
function refreshTable(){
 const rows=selectedRows(),target=$("mi-rows"),counter=$("mi-count");
 if(!target)return;counter.textContent=rows.length+" registros";
 target.innerHTML=rows.length?rows.slice(0,globalThis.AlertaGestaoDados.parametros.implantacao.linhasVisiveis).map((x,i)=>{
  const geo=state.C.normalizeCoordinates(x.lat,x.lng),hasPolygon=!!x.geojson;
  const estado=x._pending?"Revisar importação":x.verificacao||"Pendente";
  const local=[x.bairro,x.zona].filter(Boolean).join(" · ")||x.endereco|| (geo||hasPolygon?"Com geometria":"Sem localização");
  return '<tr><td><strong>'+esc(x.nome)+'</strong><small>'+esc(x.fonte||"Cadastro municipal")+(x.codigo_cnes?" · CNES "+esc(x.codigo_cnes):"")+'</small></td>'+
  '<td>'+esc(x.tipo||"—")+'</td><td>'+esc(local)+'</td><td><span class="mi-state '+(x.verificacao==="Validado"?"ok":"pending")+'">'+esc(estado)+'</span></td>'+
  '<td><div class="mi-row-actions"><button type="button" data-map-index="'+i+'">Mapa</button><button type="button" data-edit-index="'+i+'">Editar</button></div></td></tr>';
 }).join(""):'<tr><td colspan="5" class="mi-empty">Nenhum registro. Importe dados oficiais ou confira os cadastros já existentes.</td></tr>';
 target.querySelectorAll("[data-map-index]").forEach(btn=>btn.onclick=()=>focusFeature(rows[Number(btn.dataset.mapIndex)]));
 target.querySelectorAll("[data-edit-index]").forEach(btn=>btn.onclick=()=>openEditor(rows[Number(btn.dataset.editIndex)]));
 renderMarkers();
}
return {renderTerritory,refreshTable};
}
root.AlertaImplantacaoTerritorio={criar};
})(globalThis);
/* mapa: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({$,esc,global,log,notify,selectedRows,stage,state}){
function initMap(){
 if(!global.L||!$("mi-map")){$("mi-map").textContent="A biblioteca cartográfica não está disponível. A tabela permanece funcional.";return;}
 if(state.map){state.map.remove();state.map=null;}
 const p=state.ctx.db.municipioAtivo();
 const centro=globalThis.AlertaGestaoDados.config.centro(p);
 state.map=L.map("mi-map",{zoomControl:true}).setView(centro||[0,0],centro?12:2);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:"&copy; OpenStreetMap contributors"}).addTo(state.map);
 state.geoLayer=L.layerGroup().addTo(state.map);state.markerLayer=L.layerGroup().addTo(state.map);
 renderMarkers();setTimeout(()=>state.map.invalidateSize(),80);
}
function renderMarkers(){
 if(!state.map||!state.geoLayer||!state.markerLayer)return;
 state.geoLayer.clearLayers();state.markerLayer.clearLayers();
 const prefeitura=state.ctx.db.municipioAtivo(),geometry=stage.geo||prefeitura?.limite_geojson;
 if(geometry){try{
  const polygon=typeof geometry==="string"?JSON.parse(geometry):geometry;
  const g=L.geoJSON(polygon,{style:{color:"#f7be63",weight:2,fillOpacity:.045}}).addTo(state.geoLayer);
  if(g.getBounds().isValid())state.map.fitBounds(g.getBounds(),{padding:[15,15],maxZoom:13});
 }catch(_){log("Mapa","Geometria municipal não pôde ser desenhada.","warn");}}
 for(const x of selectedRows().slice(0,globalThis.AlertaGestaoDados.parametros.implantacao.marcadoresVisiveis)){
  const latlng=state.C.normalizeCoordinates(x.lat,x.lng);
  if(latlng){
   const marker=L.circleMarker([latlng.lat,latlng.lng],{radius:6,color:"#0b1826",weight:2,fillColor:state.tab==="saude"?"#39c7b1":"#f7b861",fillOpacity:.95});
   marker.bindPopup('<strong>'+esc(x.nome)+'</strong><br>'+esc(x.tipo||"")+'<br><small>'+esc(x.verificacao||"Pendente")+'</small>');
   marker.addTo(state.markerLayer);
  }else if(x.geojson&&["bairros","riscos","zonas"].includes(state.tab)){
   try{L.geoJSON(JSON.parse(x.geojson),{style:{color:state.tab==="riscos"?"#fd6571":"#55acdd",weight:1.5,fillOpacity:.09}}).addTo(state.geoLayer);}catch(_){}
  }
 }
}
function focusFeature(x){
 if(!x||!state.map)return;
 const point=state.C.normalizeCoordinates(x.lat,x.lng);
 if(point){state.map.flyTo([point.lat,point.lng],15);return;}
 if(x.geojson){
  try{const g=L.geoJSON(JSON.parse(x.geojson));if(g.getBounds().isValid())state.map.fitBounds(g.getBounds(),{padding:[20,20]});}
  catch(_){}
 }else notify("Registro sem coordenadas. Use Editar para cadastrar latitude e longitude verificadas.");
}
return {initMap,renderMarkers,focusFeature};
}
root.AlertaImplantacaoMapa={criar};
})(globalThis);
/* editor: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({$,D,addStage,esc,notify,renderTerritory,stage,state}){
function openEditor(x){
 if(!x)return;state.activeEdit={...x};
 const target=$("mi-editor");if(!target)return;target.hidden=false;
 target.innerHTML='<h2>Conferir e editar registro</h2><p class="page-subtitle">Os dados importados podem ser ajustados antes de salvar. Não altere a localização sem confirmar a fonte.</p>'+
 '<form id="mi-edit-form"><div class="mi-fields">'+[
 ["nome","Nome","text"],["tipo","Tipo","text"],["endereco","Endereço público","text"],["bairro","Bairro","text"],
 ["zona","Zona operacional","text"],["lat","Latitude","text"],["lng","Longitude","text"],
 ["codigo_cnes","CNES","text"],["verificacao","Verificação","select"]
 ].map(([k,label,type])=>'<label>'+esc(label)+(type==="select"?
 '<select name="'+k+'">'+["Pendente","Em conferência","Validado","Rejeitado"].map(v=>'<option value="'+v+'"'+(String(x[k])===v?" selected":"")+'>'+v+'</option>').join("")+'</select>':
 '<input name="'+k+'" type="text" value="'+esc(x[k]??"")+'">')+'</label>').join("")+'</div>'+
 '<div class="mi-edit-actions"><button class="btn btn-primary" type="submit">Salvar conferência</button><button id="mi-cancel-edit" type="button" class="btn">Cancelar</button></div></form>';
 $("mi-cancel-edit").onclick=()=>{target.hidden=true;state.activeEdit=null;};
 $("mi-edit-form").onsubmit=async e=>{e.preventDefault();const form=new FormData(e.currentTarget),v={...state.activeEdit};
  for(const [k,value] of form.entries())v[k]=String(value).trim();
  const locationGiven=String(v.lat||"").trim()||String(v.lng||"").trim();
  const xy=state.C.normalizeCoordinates(v.lat,v.lng);
  if(locationGiven&&!xy){notify("Coordenadas inválidas ou fora do território configurado.");return;}
  if(xy){v.lat=xy.lat;v.lng=xy.lng;}
  if(!v.nome){notify("Informe o nome.");return;}
  const keys=stage.grupos[state.tab]||[],key=state.C.uniqueKey(state.activeEdit),idx=keys.findIndex(r=>state.C.uniqueKey(r)===key);
  if(idx>=0){keys[idx]=v;stage.grupos[state.tab]=keys;}
  else{
   try{
    const module=state.tab,old=state.ctx.db.registro(module,state.activeEdit.id);
    if(old){const schema=D.ESQUEMAS[module];const fields={};for(const f of schema.fields)fields[f.key]=v[f.key]??old[f.key]??"";
     await state.ctx.db.gravar(module,fields,old.id);}
    else addStage(state.tab,[v]);
   }catch(err){notify(err.message);return;}
  }
  target.hidden=true;state.activeEdit=null;notify("Conferência registrada.");renderTerritory();
 };
 target.scrollIntoView({behavior:"smooth",block:"nearest"});
}
return {openEditor};
}
root.AlertaImplantacaoEditor={criar};
})(globalThis);
/* importacao: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({$,addStage,log,notify,ready,renderTerritory,request,stage,state}){
const limites=globalThis.AlertaGestaoDados.parametros.implantacao;
async function importOfficial(){
 if(state.busy||!ready())return;state.busy=true;renderTerritory();
 const errors=[];
 try{
  try{
   const data=await request(state.C.FONTES.ibge,limites.timeoutCadastroMs);
   const p=state.C.validarMunicipioIBGE(data);stage.ibge=p;
   log("IBGE",p.nome+" / "+p.uf+" ("+p.codigo_ibge+") identificado por código oficial.","ok");
  }catch(e){errors.push("IBGE Localidades: "+e.message);log("IBGE",e.message,"error");}
  try{
   const geo=await request(state.C.FONTES.malha,limites.timeoutMalhaMs);
   stage.geo=JSON.stringify(state.C.normalizaMalha(geo));
   log("IBGE Malhas","Limite municipal GeoJSON carregado para revisão.","ok");
  }catch(e){errors.push("IBGE Malhas: "+e.message);log("Malha municipal",e.message,"error");}
  try{
   const all=[],known=new Set();let pages=0,stop=false,repeat=0,last="";
   while(pages<limites.paginasCnesMaximas&&!stop){
    const url=new URL(state.C.FONTES.cnes);url.searchParams.set("codigo_municipio",state.C.MUNICIPIO.slice(0,6));
    url.searchParams.set("status","1");url.searchParams.set("limit",String(limites.tamanhoPaginaCnes));url.searchParams.set("offset",String(pages));
    const data=await request(url.toString(),limites.timeoutCadastroMs),parsed=state.C.unwrapCNES(data);
    const fingerprint=JSON.stringify(parsed.rows.slice(0,4).map(x=>state.C.pick(x,["codigo_cnes","CNES","nome_fantasia"])));
    if(fingerprint===last&&pages>0){repeat++;if(repeat>=1){errors.push("CNES repetiu a página: importação pode estar incompleta.");break;}}
    last=fingerprint;
    for(const raw of parsed.rows){
     const row=state.C.cnesItem(raw);if(row&&!known.has(row.codigo_cnes)){all.push(row);known.add(row.codigo_cnes);}
    }
    pages++;
    if(!parsed.rows.length||parsed.rows.length<limites.tamanhoPaginaCnes||parsed.total&&pages*limites.tamanhoPaginaCnes>=parsed.total)stop=true;
    if(pages%5===0){const info=$("mi-progress");if(info)info.textContent="CNES: "+pages+" páginas consultadas, "+all.length+" registros municipais identificados...";}
   }
   if(pages>=limites.paginasCnesMaximas)errors.push("Limite preventivo de "+limites.paginasCnesMaximas+" páginas CNES atingido. Complete pelo CSV oficial.");
   if(!all.length)throw Error("CNES não retornou estabelecimentos aproveitáveis do município.");
   addStage("saude",all);log("CNES",all.length+" estabelecimentos recebidos em "+pages+" página(s), sujeitos a conferência.","ok");
  }catch(e){errors.push("CNES: "+e.message);log("CNES",e.message+" · alternativa: baixar CSV oficial e importar por arquivo.","error");}
 }finally{
  state.busy=false;stage.updated=new Date().toISOString();renderTerritory();
  if(errors.length)notify("Importação parcial: "+errors.length+" fonte(s) indisponível(is). Consulte o registro e use CSV/GeoJSON.");
  else notify("Dados recebidos. Confira e escolha Salvar implantação.");
 }
}
async function loadFile(file){
 if(!file||state.busy)return;
 if(file.size>limites.arquivoBytesMaximos){notify("Arquivo acima do limite de "+(limites.arquivoBytesMaximos/1e6)+" MB.");return;}
 try{
  const contents=await file.text(),kind=$("mi-kind")?.value||"bairros";
  const isCSV=file.name.toLowerCase().endsWith(".csv")||kind==="cnes-csv";
  let rows=[];
  if(isCSV){
   rows=state.C.parseCSV(contents).map(x=>state.C.linhaCSVParaCNES(x)).filter(Boolean);
   if(!rows.length)throw Error("Nenhum estabelecimento do município encontrado no CSV CNES.");
   addStage("saude",rows);
  }else{
   const data=JSON.parse(contents);
   if(Array.isArray(data)||data?.estabelecimentos||data?.data){
    rows=state.C.unwrapCNES(data).rows.map(x=>state.C.cnesItem(x)).filter(Boolean);
    if(!rows.length)throw Error("Nenhum estabelecimento CNES reconhecido no JSON.");
    addStage("saude",rows);
   }else{
    const type=["saude","emergencias","parceiros"].includes(kind)?"instituicoes":kind;
    rows=state.C.geoItems(data,type);
    if(["saude","emergencias","parceiros"].includes(kind)){
     const cat={saude:"Saúde",emergencias:"Emergência",parceiros:"Parceiros"}[kind];
     rows=rows.map(x=>({...x,categoria:cat}));
    }
    addStage(kind,rows);
   }
  }
  log("Arquivo "+file.name,rows.length+" feições identificadas; alterações aguardam conferência.","ok");
  renderTerritory();notify(rows.length+" registros importados para prévia.");
 }catch(e){log("Arquivo",e.message,"error");renderTerritory();notify("Arquivo não importado: "+e.message);}
}
async function saveAll(){
 if(state.busy||!ready())return;
 const packageData={codigo_ibge:state.C.MUNICIPIO,grupos:stage.grupos,fonte:"IBGE / CNES / fonte municipal"};
 if(stage.geo||stage.ibge){
  const geo=stage.geo?{limite_geojson:stage.geo,fonte_geo:state.C.FONTES.malha,geo_atualizado:new Date().toISOString()}:{};
  if(stage.ibge)Object.assign(geo,{pais:state.C.PAIS.nome,paisId:state.C.PAIS.id,estado:state.C.ESTADO.nome,codigo_uf:state.C.ESTADO.codigo_ibge});
  packageData.municipioGeo=geo;
 }
 if(!Object.values(stage.grupos).some(v=>v.length)&&!packageData.municipioGeo){notify("Não há dados novos para salvar.");return;}
 if(!confirm("Salvar a implantação no cadastro municipal? Registros já validados não serão sobrescritos. Nenhuma prefeitura externa será notificada."))return;
 try{
  state.busy=true;
  renderTerritory();
  const result=await state.ctx.db.implantarPacote(packageData);
  stage.grupos={};stage.geo=null;stage.ibge=null;
  const total=Object.values(result.totais).reduce((n,x)=>n+x.novos+x.atualizados,0);
  log("Salvamento",total+" registros gravados ou atualizados. Faça a validação operacional antes de usar.","ok");
  notify("Implantação salva: "+total+" registro(s).");
 }catch(e){log("Salvamento",e.message,"error");notify("Falha: "+e.message);}finally{state.busy=false;renderTerritory();}
}
return {importOfficial,loadFile,saveAll};
}
root.AlertaImplantacaoImportacao={criar};
})(globalThis);
/* pessoas: dependências recebidas pela composição. */
(function(root){'use strict';
function criar({$,ROLE_OPTIONS,esc,locState,normal,notify,state}){
function renderRH(){
 if(!state.ctx)return;const people=state.ctx.db.lista("pessoas"),q=state.rhSearch.toLowerCase();
 const rows=people.filter(x=>(!state.rhRole||x.funcao===state.rhRole||(Array.isArray(x.papeis)&&x.papeis.includes(state.rhRole)))&&
  (!state.rhZone||x.zona===state.rhZone)&&(!q||[x.nome,x.orgao,x.cargo,x.zona,x.funcao].some(k=>normal(k).includes(q))));
 const zones=state.ctx.db.lista("zonas").map(z=>z.nome).filter(Boolean);
 state.ctx.page.innerHTML='<div class="mi-head"><div><div class="eyebrow">GABINETE DE CRISE · RH</div><h1 class="page-title">Pessoas e Hierarquia</h1><p class="page-subtitle">Um único cadastro de pessoas com papéis, órgãos, zonas e substituições. Os dados públicos não concedem acesso ao sistema.</p></div><button class="btn btn-primary" id="rh-new">+ Adicionar pessoa</button></div>'+
 locState()+
 '<div class="mi-workflow"><strong>Estrutura de comando</strong><p>Gabinete de Gestão Integrada, órgãos municipais/estaduais, responsáveis por zona, substitutos e operadores. Uma pessoa pode ter vários papéis vinculados, sem cadastros duplicados.</p><p class="mi-note">Admin País e Admin Estado: níveis previstos no modelo multi-tenant futuro; o protótipo local não concede essas permissões.</p></div>'+
 '<div class="mi-filterbar mi-rh-filters"><label>Função<select id="rh-role"><option value="">Todas as funções</option>'+ROLE_OPTIONS.map(([v,t])=>'<option value="'+v+'"'+(state.rhRole===v?" selected":"")+'>'+esc(t)+'</option>').join("")+'</select></label>'+
 '<label>Zona<select id="rh-zone"><option value="">Todas</option>'+zones.map(z=>'<option'+(state.rhZone===z?' selected':'')+'>'+esc(z)+'</option>').join("")+'</select></label>'+
 '<label>Buscar<input id="rh-search" type="search" value="'+esc(state.rhSearch)+'" placeholder="Nome, órgão ou função"></label></div>'+
 '<section class="mi-table-wrap mi-rh-list"><table class="mi-table"><thead><tr><th>Pessoa</th><th>Função e papéis</th><th>Órgão</th><th>Zona</th><th>Verificação</th><th>Editar</th></tr></thead><tbody>'+
 (rows.length?rows.map(x=>'<tr><td><strong>'+esc(x.nome)+'</strong><small>'+esc(x.cargo||"")+'</small></td><td>'+esc([x.funcao,...(x.papeis||[])].filter(Boolean).join(", "))+'</td><td>'+esc(x.orgao||"—")+'</td><td>'+esc(x.zona||"Todas/sem zona")+'</td><td>'+esc(x.verificacao||"Pendente")+'</td><td><button type="button" data-rh-edit="'+esc(x.id)+'">Editar</button></td></tr>').join(""):'<tr><td class="mi-empty" colspan="6">Nenhuma pessoa cadastrada com os filtros atuais.</td></tr>')+
 '</tbody></table></section>'+
 '<section id="rh-editor" class="mi-review" hidden></section>'+
 '<section class="mi-sources"><strong>Gabinete de crise: vinculação institucional</strong><p>Cadastre as pessoas responsáveis e confirme suas atribuições com o órgão público. Nomes encontrados em notícias não são adicionados automaticamente e não concedem autorização operacional.</p></section>';
 $("rh-new").onclick=()=>openRH(null);
 $("rh-role").onchange=e=>{state.rhRole=e.target.value;renderRH();};
 $("rh-zone").onchange=e=>{state.rhZone=e.target.value;renderRH();};
 $("rh-search").oninput=e=>{state.rhSearch=e.target.value;renderRH();$("rh-search")?.focus();};
 state.ctx.page.querySelectorAll("[data-rh-edit]").forEach(b=>b.onclick=()=>openRH(people.find(x=>x.id===b.dataset.rhEdit)));

}
function openRH(person=null,reference=null){
 const parent=$("rh-editor");if(!parent)return;state.rhEdit=person?.id||null;parent.hidden=false;
 const data=person||reference||{};
 const opts=ROLE_OPTIONS.map(([value,label])=>'<option value="'+value+'"'+(data.funcao===value?" selected":"")+'>'+esc(label)+'</option>').join("");
 const zones=state.ctx.db.lista("zonas").map(x=>x.nome).filter(Boolean);
 const orgs=[...state.ctx.db.lista("saude"),...state.ctx.db.lista("emergencias"),...state.ctx.db.lista("parceiros")].map(x=>x.nome).filter(Boolean);
 const substitutes=state.ctx.db.lista("pessoas").filter(x=>x.id!==person?.id);
 parent.innerHTML='<h2>'+(person?"Editar pessoa":"Cadastrar pessoa")+'</h2><p class="mi-note">Cadastro local para gestão. Somente uma autenticação institucional futura poderá conceder acesso operacional.</p>'+
 '<form id="rh-form"><div class="mi-fields">'+
 [['nome','Nome completo','text'],['cargo','Cargo institucional','text'],['orgao','Órgão / unidade','text'],['zona','Zona operacional','text'],['telefone','Contato institucional','tel'],['email','E-mail','email']].map(([k,label,type])=>'<label>'+label+'<input name="'+k+'" type="'+type+'" value="'+esc(data[k]||"")+'"'+(k==="nome"?" required":"")+'></label>').join("")+
 '<label>Estrutura representada no Gabinete<select name="estrutura_id"><option value="">Não vinculada</option>'+[...state.ctx.db.lista("saude"),...state.ctx.db.lista("emergencias"),...state.ctx.db.lista("parceiros")].map(x=>'<option value="'+esc(x.id)+'"'+(data.estrutura_id===x.id?' selected':'')+'>'+esc(x.nome)+'</option>').join("")+'</select></label>'+
 '<label>Função principal<select name="funcao" required><option value="">Selecionar</option>'+opts+'</select></label>'+
 '<label>Substituto responsável<select name="substituto_id"><option value="">Nenhum</option>'+substitutes.map(x=>'<option value="'+esc(x.id)+'"'+(x.id===data.substituto_id?" selected":"")+'>'+esc(x.nome)+'</option>').join("")+'</select></label>'+
 '<label>Situação<select name="status">'+["Pendente de validação","Ativo","Inativo"].map(x=>'<option'+(data.status===x?' selected':'')+'>'+x+'</option>').join("")+'</select></label>'+
 '<label>Verificação<select name="verificacao">'+["Pendente","Validado","Rejeitado"].map(x=>'<option'+(data.verificacao===x?' selected':'')+'>'+x+'</option>').join("")+'</select></label></div>'+
 '<fieldset class="mi-roles"><legend>Outros papéis autorizados</legend>'+ROLE_OPTIONS.map(([id,label])=>'<label><input type="checkbox" name="papeis" value="'+id+'"'+(Array.isArray(data.papeis)&&data.papeis.includes(id)?' checked':'')+'> '+esc(label)+'</label>').join("")+'</fieldset>'+
 '<div class="mi-edit-actions"><button class="btn btn-primary" type="submit">Salvar pessoa</button><button type="button" class="btn" id="rh-cancel">Cancelar</button></div><datalist id="rh-orgs">'+orgs.map(x=>'<option value="'+esc(x)+'"></option>').join("")+'</datalist><datalist id="rh-zones">'+zones.map(x=>'<option value="'+esc(x)+'"></option>').join("")+'</datalist></form>';
 parent.querySelector('[name="orgao"]').setAttribute("list","rh-orgs");
 parent.querySelector('[name="zona"]').setAttribute("list","rh-zones");
 $("rh-cancel").onclick=()=>{parent.hidden=true;state.rhEdit=null;};
 $("rh-form").onsubmit=async e=>{
  e.preventDefault();const form=e.currentTarget,data=new FormData(form),obj={};
  for(const [k,v] of data.entries()){
   if(k==="papeis"){obj.papeis??=[];obj.papeis.push(v);}
   else obj[k]=String(v).trim();
  }
  if(!obj.papeis)obj.papeis=[];
  if(!obj.nome||!obj.funcao){notify("Nome e função são obrigatórios.");return;}
  obj.papeis=obj.papeis.filter(k=>k!==obj.funcao);
  try{
   await state.ctx.db.gravar("pessoas",obj,state.rhEdit);
   state.rhEdit=null;notify("Pessoa cadastrada na hierarquia local.");renderRH();
  }catch(err){notify(err.message);}
 };
 parent.scrollIntoView({behavior:"smooth",block:"nearest"});
 parent.querySelector("input")?.focus();
}
return {renderRH,openRH};
}
root.AlertaImplantacaoPessoas={criar};
})(globalThis);
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
