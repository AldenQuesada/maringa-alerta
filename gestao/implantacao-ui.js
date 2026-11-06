/* UI única: implantação territorial + RH por prefeitura.
 * Fonte de dados pública e/ou importação de arquivos municipais, sempre com revisão.
 * Não altera outros módulos administrativos nem o mapa de evento.
 */
(function(global){
"use strict";
const C=global.AlertaImplantacaoCore,D=global.AlertaGestaoDados;
if(!C||!D)return;
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const $=id=>document.getElementById(id);
const stage={grupos:{},geo:null,ibge:null,logs:[],updated:""};
const normal=x=>String(x??"").toLowerCase();
const TAB=["bairros","zonas","saude","emergencias","parceiros","bases","riscos","pontos"];
const LABEL={
 bairros:"Bairros",zonas:"Zonas operacionais",saude:"Unidades de saúde",emergencias:"Bombeiros e polícias",
 parceiros:"Copel, Sanepar e parceiros",bases:"Bases de apoio",riscos:"Áreas de risco",pontos:"Pontos críticos"
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
function ready(){return ctx?.db?.municipioAtivo()?.codigo_ibge==="4115200"&&ctx?.db?.municipioAtivo()?.id==="maringa";}
function locState(){const p=ctx.db.municipioAtivo();return '<div class="mi-context"><strong>BRASIL</strong><span>›</span><strong>PARANÁ</strong><span>›</span><strong>'+esc(p?.nome||"Maringá")+'</strong><span class="mi-code">IBGE '+esc(p?.codigo_ibge||"4115200")+'</span><small>Administração nacional e estadual: estrutura futura, sem autorização global neste protótipo.</small></div>';}
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
 page.innerHTML='<div class="mi-head"><div><div class="eyebrow">CADASTRO TERRITORIAL ÚNICO</div><h1 class="page-title">Implantar Maringá</h1><p class="page-subtitle">País → Estado → Prefeitura → Bairros e zonas → Unidades → Gabinete de crise. Uma única tela, com importação, mapa, tabela e conferência.</p></div></div>'+
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
 '<p>IBGE Localidades e Malhas; CNES Ministério da Saúde. Para bairros, áreas de risco ou pontos ainda não publicados por API acessível, importe o GeoJSON/CSV municipal exportado do GeoMaringá/IPPLAM. Os órgãos sem endereço ficam como pendentes.</p>'+
 '<div><a href="'+esc(C.FONTES.ibge)+'" target="_blank" rel="noopener">IBGE</a><a href="'+esc(C.FONTES.cnes)+'" target="_blank" rel="noopener">CNES</a><a href="'+esc(C.FONTES.cnesCsv)+'" target="_blank" rel="noopener">Extrair CNES CSV</a><a href="https://www.maringa.pr.gov.br/" target="_blank" rel="noopener">Prefeitura / GeoMaringá</a></div>'+
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
function refreshTable(){
 const rows=selectedRows(),target=$("mi-rows"),counter=$("mi-count");
 if(!target)return;counter.textContent=rows.length+" registros";
 target.innerHTML=rows.length?rows.slice(0,650).map((x,i)=>{
  const geo=C.normalizeCoordinates(x.lat,x.lng),hasPolygon=!!x.geojson;
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
function initMap(){
 if(!global.L||!$("mi-map")){$("mi-map").textContent="A biblioteca cartográfica não está disponível. A tabela permanece funcional.";return;}
 if(map){map.remove();map=null;}
 const p=ctx.db.municipioAtivo();
 map=L.map("mi-map",{zoomControl:true}).setView([Number(p.lat)||-23.4205,Number(p.lng)||-51.9333],12);
 L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:"&copy; OpenStreetMap contributors"}).addTo(map);
 geoLayer=L.layerGroup().addTo(map);markerLayer=L.layerGroup().addTo(map);
 renderMarkers();setTimeout(()=>map.invalidateSize(),80);
}
function renderMarkers(){
 if(!map||!geoLayer||!markerLayer)return;
 geoLayer.clearLayers();markerLayer.clearLayers();
 const prefeitura=ctx.db.municipioAtivo(),geometry=stage.geo||prefeitura?.limite_geojson;
 if(geometry){try{
  const polygon=typeof geometry==="string"?JSON.parse(geometry):geometry;
  const g=L.geoJSON(polygon,{style:{color:"#f7be63",weight:2,fillOpacity:.045}}).addTo(geoLayer);
  if(g.getBounds().isValid())map.fitBounds(g.getBounds(),{padding:[15,15],maxZoom:13});
 }catch(_){log("Mapa","Geometria municipal não pôde ser desenhada.","warn");}}
 for(const x of selectedRows().slice(0,600)){
  const latlng=C.normalizeCoordinates(x.lat,x.lng);
  if(latlng){
   const marker=L.circleMarker([latlng.lat,latlng.lng],{radius:6,color:"#0b1826",weight:2,fillColor:tab==="saude"?"#39c7b1":"#f7b861",fillOpacity:.95});
   marker.bindPopup('<strong>'+esc(x.nome)+'</strong><br>'+esc(x.tipo||"")+'<br><small>'+esc(x.verificacao||"Pendente")+'</small>');
   marker.addTo(markerLayer);
  }else if(x.geojson&&["bairros","riscos","zonas"].includes(tab)){
   try{L.geoJSON(JSON.parse(x.geojson),{style:{color:tab==="riscos"?"#fd6571":"#55acdd",weight:1.5,fillOpacity:.09}}).addTo(geoLayer);}catch(_){}
  }
 }
}
function focusFeature(x){
 if(!x||!map)return;
 const point=C.normalizeCoordinates(x.lat,x.lng);
 if(point){map.flyTo([point.lat,point.lng],15);return;}
 if(x.geojson){
  try{const g=L.geoJSON(JSON.parse(x.geojson));if(g.getBounds().isValid())map.fitBounds(g.getBounds(),{padding:[20,20]});}
  catch(_){}
 }else notify("Registro sem coordenadas. Use Editar para cadastrar latitude e longitude verificadas.");
}
function openEditor(x){
 if(!x)return;activeEdit={...x};
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
 $("mi-cancel-edit").onclick=()=>{target.hidden=true;activeEdit=null;};
 $("mi-edit-form").onsubmit=async e=>{e.preventDefault();const form=new FormData(e.currentTarget),v={...activeEdit};
  for(const [k,value] of form.entries())v[k]=String(value).trim();
  const locationGiven=String(v.lat||"").trim()||String(v.lng||"").trim();
  const xy=C.normalizeCoordinates(v.lat,v.lng);
  if(locationGiven&&!xy){notify("Coordenadas inválidas ou fora da região de Maringá.");return;}
  if(xy){v.lat=xy.lat;v.lng=xy.lng;}
  if(!v.nome){notify("Informe o nome.");return;}
  const keys=stage.grupos[tab]||[],key=C.uniqueKey(activeEdit),idx=keys.findIndex(r=>C.uniqueKey(r)===key);
  if(idx>=0){keys[idx]=v;stage.grupos[tab]=keys;}
  else{
   try{
    const module=tab,old=ctx.db.registro(module,activeEdit.id);
    if(old){const schema=D.ESQUEMAS[module];const fields={};for(const f of schema.fields)fields[f.key]=v[f.key]??old[f.key]??"";
     await ctx.db.gravar(module,fields,old.id);}
    else addStage(tab,[v]);
   }catch(err){notify(err.message);return;}
  }
  target.hidden=true;activeEdit=null;notify("Conferência registrada.");renderTerritory();
 };
 target.scrollIntoView({behavior:"smooth",block:"nearest"});
}
const request=async(url,timeout=20000)=>{
 const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),timeout);
 try{const r=await fetch(url,{headers:{Accept:"application/json"},signal:ctrl.signal,cache:"no-cache"});
  if(!r.ok)throw Error("HTTP "+r.status);
  return await r.json();
 }finally{clearTimeout(timer);}
};
async function importOfficial(){
 if(busy||!ready())return;busy=true;renderTerritory();
 const errors=[];
 try{
  try{
   const data=await request(C.FONTES.ibge,18000);
   const p=C.validarMunicipioIBGE(data);stage.ibge=p;
   log("IBGE","Maringá / PR (4115200) identificada por código oficial.","ok");
  }catch(e){errors.push("IBGE Localidades: "+e.message);log("IBGE",e.message,"error");}
  try{
   const geo=await request(C.FONTES.malha,22000);
   stage.geo=JSON.stringify(C.normalizaMalha(geo));
   log("IBGE Malhas","Limite municipal GeoJSON carregado para revisão.","ok");
  }catch(e){errors.push("IBGE Malhas: "+e.message);log("Malha municipal",e.message,"error");}
  try{
   const all=[],known=new Set();let pages=0,stop=false,repeat=0,last="";
   while(pages<150&&!stop){
    const url=new URL(C.FONTES.cnes);url.searchParams.set("codigo_municipio",C.MUNICIPIO.slice(0,6));
    url.searchParams.set("status","1");url.searchParams.set("limit","20");url.searchParams.set("offset",String(pages));
    const data=await request(url.toString(),18000),parsed=C.unwrapCNES(data);
    const fingerprint=JSON.stringify(parsed.rows.slice(0,4).map(x=>C.pick(x,["codigo_cnes","CNES","nome_fantasia"])));
    if(fingerprint===last&&pages>0){repeat++;if(repeat>=1){errors.push("CNES repetiu a página: importação pode estar incompleta.");break;}}
    last=fingerprint;
    for(const raw of parsed.rows){
     const row=C.cnesItem(raw);if(row&&!known.has(row.codigo_cnes)){all.push(row);known.add(row.codigo_cnes);}
    }
    pages++;
    if(!parsed.rows.length||parsed.rows.length<20||parsed.total&&pages*20>=parsed.total)stop=true;
    if(pages%5===0){const info=$("mi-progress");if(info)info.textContent="CNES: "+pages+" páginas consultadas, "+all.length+" registros de Maringá identificados...";}
   }
   if(pages>=150)errors.push("Limite preventivo de 150 páginas CNES atingido. Complete pelo CSV oficial.");
   if(!all.length)throw Error("CNES não retornou estabelecimentos aproveitáveis de Maringá.");
   addStage("saude",all);log("CNES",all.length+" estabelecimentos recebidos em "+pages+" página(s), sujeitos a conferência.","ok");
  }catch(e){errors.push("CNES: "+e.message);log("CNES",e.message+" · alternativa: baixar CSV oficial e importar por arquivo.","error");}
 }finally{
  busy=false;stage.updated=new Date().toISOString();renderTerritory();
  if(errors.length)notify("Importação parcial: "+errors.length+" fonte(s) indisponível(is). Consulte o registro e use CSV/GeoJSON.");
  else notify("Dados recebidos. Confira e escolha Salvar implantação.");
 }
}
async function loadFile(file){
 if(!file||busy)return;
 if(file.size>14e6){notify("Arquivo acima do limite de 14 MB.");return;}
 try{
  const contents=await file.text(),kind=$("mi-kind")?.value||"bairros";
  const isCSV=file.name.toLowerCase().endsWith(".csv")||kind==="cnes-csv";
  let rows=[];
  if(isCSV){
   rows=C.parseCSV(contents).map(x=>C.linhaCSVParaCNES(x)).filter(Boolean);
   if(!rows.length)throw Error("Nenhum estabelecimento de Maringá encontrado no CSV CNES.");
   addStage("saude",rows);
  }else{
   const data=JSON.parse(contents);
   if(Array.isArray(data)||data?.estabelecimentos||data?.data){
    rows=C.unwrapCNES(data).rows.map(x=>C.cnesItem(x)).filter(Boolean);
    if(!rows.length)throw Error("Nenhum estabelecimento CNES reconhecido no JSON.");
    addStage("saude",rows);
   }else{
    const type=["saude","emergencias","parceiros"].includes(kind)?"instituicoes":kind;
    rows=C.geoItems(data,type);
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
 if(busy||!ready())return;
 const packageData={grupos:stage.grupos,fonte:"IBGE / CNES / GeoMaringá / fonte municipal"};
 if(stage.geo||stage.ibge){
  const geo=stage.geo?{limite_geojson:stage.geo,fonte_geo:C.FONTES.malha,geo_atualizado:new Date().toISOString()}:{}; 
  if(stage.ibge)Object.assign(geo,{pais:"Brasil",paisId:"BR",estado:"Paraná",codigo_uf:"41"});
  packageData.municipioGeo=geo;
 }
 if(!Object.values(stage.grupos).some(v=>v.length)&&!packageData.municipioGeo){notify("Não há dados novos para salvar.");return;}
 if(!confirm("Salvar a implantação no armazenamento deste navegador? Registros já validados não serão sobrescritos. Nenhuma prefeitura externa será notificada."))return;
 try{
  const result=await ctx.db.implantarPacote(packageData);
  stage.grupos={};stage.geo=null;stage.ibge=null;
  const total=Object.values(result.totais).reduce((n,x)=>n+x.novos+x.atualizados,0);
  log("Salvamento",total+" registros gravados ou atualizados. Faça a validação operacional antes de usar.","ok");
  renderTerritory();notify("Implantação salva: "+total+" registro(s).");
 }catch(e){log("Salvamento",e.message,"error");renderTerritory();notify("Falha: "+e.message);}
}
const ROLE_OPTIONS=[["admin","Administrador municipal"],["responsavel","Responsável regional"],["substituto","Substituto"],["coordenador","Coordenador"],["operador","Operador"]];
function renderRH(){
 if(!ctx)return;const people=ctx.db.lista("pessoas"),q=rhSearch.toLowerCase();
 const rows=people.filter(x=>(!rhRole||x.funcao===rhRole||(Array.isArray(x.papeis)&&x.papeis.includes(rhRole)))&&
  (!rhZone||x.zona===rhZone)&&(!q||[x.nome,x.orgao,x.cargo,x.zona,x.funcao].some(k=>normal(k).includes(q))));
 const zones=ctx.db.lista("zonas").map(z=>z.nome).filter(Boolean);
 ctx.page.innerHTML='<div class="mi-head"><div><div class="eyebrow">GABINETE DE CRISE · RH</div><h1 class="page-title">Pessoas e Hierarquia</h1><p class="page-subtitle">Um único cadastro de pessoas com papéis, órgãos, zonas e substituições. Os dados públicos não concedem acesso ao sistema.</p></div><button class="btn btn-primary" id="rh-new">+ Adicionar pessoa</button></div>'+
 locState()+
 '<div class="mi-workflow"><strong>Estrutura de comando</strong><p>Gabinete de Gestão Integrada, órgãos municipais/estaduais, responsáveis por zona, substitutos e operadores. Uma pessoa pode ter vários papéis vinculados, sem cadastros duplicados.</p><p class="mi-note">Admin País e Admin Estado: níveis previstos no modelo multi-tenant futuro; o protótipo local não concede essas permissões.</p></div>'+
 '<div class="mi-filterbar mi-rh-filters"><label>Função<select id="rh-role"><option value="">Todas as funções</option>'+ROLE_OPTIONS.map(([v,t])=>'<option value="'+v+'"'+(rhRole===v?" selected":"")+'>'+esc(t)+'</option>').join("")+'</select></label>'+
 '<label>Zona<select id="rh-zone"><option value="">Todas</option>'+zones.map(z=>'<option'+(rhZone===z?' selected':'')+'>'+esc(z)+'</option>').join("")+'</select></label>'+
 '<label>Buscar<input id="rh-search" type="search" value="'+esc(rhSearch)+'" placeholder="Nome, órgão ou função"></label></div>'+
 '<section class="mi-table-wrap mi-rh-list"><table class="mi-table"><thead><tr><th>Pessoa</th><th>Função e papéis</th><th>Órgão</th><th>Zona</th><th>Verificação</th><th>Editar</th></tr></thead><tbody>'+
 (rows.length?rows.map(x=>'<tr><td><strong>'+esc(x.nome)+'</strong><small>'+esc(x.cargo||"")+'</small></td><td>'+esc([x.funcao,...(x.papeis||[])].filter(Boolean).join(", "))+'</td><td>'+esc(x.orgao||"—")+'</td><td>'+esc(x.zona||"Todas/sem zona")+'</td><td>'+esc(x.verificacao||"Pendente")+'</td><td><button type="button" data-rh-edit="'+esc(x.id)+'">Editar</button></td></tr>').join(""):'<tr><td class="mi-empty" colspan="6">Nenhuma pessoa cadastrada com os filtros atuais.</td></tr>')+
 '</tbody></table></section>'+
 '<section id="rh-editor" class="mi-review" hidden></section>'+
 '<section class="mi-sources"><strong>Gabinete de crise: vinculação institucional</strong><p>Cadastre as pessoas responsáveis e confirme suas atribuições com o órgão público. Nomes encontrados em notícias não são adicionados automaticamente e não concedem autorização operacional.</p></section>';
 $("rh-new").onclick=()=>openRH(null);
 $("rh-role").onchange=e=>{rhRole=e.target.value;renderRH();};
 $("rh-zone").onchange=e=>{rhZone=e.target.value;renderRH();};
 $("rh-search").oninput=e=>{rhSearch=e.target.value;renderRH();$("rh-search")?.focus();};
 ctx.page.querySelectorAll("[data-rh-edit]").forEach(b=>b.onclick=()=>openRH(people.find(x=>x.id===b.dataset.rhEdit)));

}
function openRH(person=null,reference=null){
 const parent=$("rh-editor");if(!parent)return;rhEdit=person?.id||null;parent.hidden=false;
 const data=person||reference||{};
 const opts=ROLE_OPTIONS.map(([value,label])=>'<option value="'+value+'"'+(data.funcao===value?" selected":"")+'>'+esc(label)+'</option>').join("");
 const zones=ctx.db.lista("zonas").map(x=>x.nome).filter(Boolean);
 const orgs=[...ctx.db.lista("saude"),...ctx.db.lista("emergencias"),...ctx.db.lista("parceiros")].map(x=>x.nome).filter(Boolean);
 const substitutes=ctx.db.lista("pessoas").filter(x=>x.id!==person?.id);
 parent.innerHTML='<h2>'+(person?"Editar pessoa":"Cadastrar pessoa")+'</h2><p class="mi-note">Cadastro local para gestão. Somente uma autenticação institucional futura poderá conceder acesso operacional.</p>'+
 '<form id="rh-form"><div class="mi-fields">'+
 [['nome','Nome completo','text'],['cargo','Cargo institucional','text'],['orgao','Órgão / unidade','text'],['zona','Zona operacional','text'],['telefone','Contato institucional','tel'],['email','E-mail','email']].map(([k,label,type])=>'<label>'+label+'<input name="'+k+'" type="'+type+'" value="'+esc(data[k]||"")+'"'+(k==="nome"?" required":"")+'></label>').join("")+
 '<label>Estrutura representada no Gabinete<select name="estrutura_id"><option value="">Não vinculada</option>'+[...ctx.db.lista("saude"),...ctx.db.lista("emergencias"),...ctx.db.lista("parceiros")].map(x=>'<option value="'+esc(x.id)+'"'+(data.estrutura_id===x.id?' selected':'')+'>'+esc(x.nome)+'</option>').join("")+'</select></label>'+ 
 '<label>Função principal<select name="funcao" required><option value="">Selecionar</option>'+opts+'</select></label>'+
 '<label>Substituto responsável<select name="substituto_id"><option value="">Nenhum</option>'+substitutes.map(x=>'<option value="'+esc(x.id)+'"'+(x.id===data.substituto_id?" selected":"")+'>'+esc(x.nome)+'</option>').join("")+'</select></label>'+
 '<label>Situação<select name="status">'+["Pendente de validação","Ativo","Inativo"].map(x=>'<option'+(data.status===x?' selected':'')+'>'+x+'</option>').join("")+'</select></label>'+
 '<label>Verificação<select name="verificacao">'+["Pendente","Validado","Rejeitado"].map(x=>'<option'+(data.verificacao===x?' selected':'')+'>'+x+'</option>').join("")+'</select></label></div>'+
 '<fieldset class="mi-roles"><legend>Outros papéis autorizados</legend>'+ROLE_OPTIONS.map(([id,label])=>'<label><input type="checkbox" name="papeis" value="'+id+'"'+(Array.isArray(data.papeis)&&data.papeis.includes(id)?' checked':'')+'> '+esc(label)+'</label>').join("")+'</fieldset>'+
 '<div class="mi-edit-actions"><button class="btn btn-primary" type="submit">Salvar pessoa</button><button type="button" class="btn" id="rh-cancel">Cancelar</button></div><datalist id="rh-orgs">'+orgs.map(x=>'<option value="'+esc(x)+'"></option>').join("")+'</datalist><datalist id="rh-zones">'+zones.map(x=>'<option value="'+esc(x)+'"></option>').join("")+'</datalist></form>';
 parent.querySelector('[name="orgao"]').setAttribute("list","rh-orgs");
 parent.querySelector('[name="zona"]').setAttribute("list","rh-zones");
 $("rh-cancel").onclick=()=>{parent.hidden=true;rhEdit=null;};
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
   await ctx.db.gravar("pessoas",obj,rhEdit);
   rhEdit=null;notify("Pessoa cadastrada na hierarquia local.");renderRH();
  }catch(err){notify(err.message);}
 };
 parent.scrollIntoView({behavior:"smooth",block:"nearest"});
 parent.querySelector("input")?.focus();
}
function montar({page,db,mode,toast}){
 ctx={page,db,toast};if(mode==="pessoas"){if(map){map.remove();map=null;}renderRH();}
 else if(mode==="implantacao")renderTerritory();
}
global.AlertaImplantacaoUI={montar,renderTerritory,renderRH,preview:()=>JSON.parse(JSON.stringify(stage))};
})(typeof globalThis!=="undefined"?globalThis:window);
