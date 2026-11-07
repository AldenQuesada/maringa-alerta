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
