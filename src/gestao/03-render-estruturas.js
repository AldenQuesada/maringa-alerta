function renderEstruturas(){
 const m=estruturaTipo,people=db.lista("pessoas"),records=db.lista(m);
 PAGE.innerHTML=topo("Estruturas","Unidades, órgãos e seus representantes cadastrados.",""+m)+
 '<section class="table-shell pref-canonical-table"><div class="table-toolbar">'+
 '<label class="pref-table-select" for="estrutura-type">Tipo <select id="estrutura-type">'+STRUCT_MODULES.map(([id,label])=>'<option value="'+id+'"'+(id===m?' selected':'')+'>'+esc(label)+'</option>').join("")+'</select></label>'+
 '<label class="search-field">'+icon("search")+'<input id="estrutura-search" type="search" placeholder="Buscar unidade ou CNES" aria-label="Buscar estruturas"></label><span class="table-count" id="estrutura-count"></span></div>'+
 '<div class="table-scroll"><table><thead><tr><th>Unidade / estrutura</th><th>Tipo</th><th>CNES</th><th>Zona / bairro</th><th>Representante no Gabinete</th><th>Ações</th></tr></thead><tbody id="estrutura-rows"></tbody></table></div></section>';
 $("estrutura-type").onchange=e=>{estruturaTipo=e.target.value;render();};
 const renderRows=()=>{
  const term=$("estrutura-search").value.toLocaleLowerCase("pt-BR");
  const lista=records.filter(x=>(x.nome+" "+(x.codigo_cnes||"")+" "+(x.bairro||"")+" "+(x.zona||"")).toLocaleLowerCase("pt-BR").includes(term));
  $("estrutura-count").textContent=lista.length+" registro(s)";
  $("estrutura-rows").innerHTML=lista.map(x=>{
   const resp=responsible(x,people);
   return '<tr><td><strong>'+esc(x.nome)+'</strong></td><td>'+esc(x.tipo||"—")+'</td><td>'+esc(x.codigo_cnes||"—")+'</td>'+
   '<td>'+esc(x.zona||x.bairro||"—")+'</td><td>'+esc(resp?.nome||"Não atribuído")+'</td>'+
   '<td><button type="button" class="row-action" data-canon-edit="'+m+'" data-id="'+esc(x.id)+'">Editar</button></td></tr>';
  }).join("")||'<tr><td colspan="6">Nenhum registro para este filtro.</td></tr>';
 };
 $("estrutura-search").oninput=renderRows;renderRows();
 void importarUnidadesCNES();
}
function renderGeoterritorialidade(){
 PAGE.innerHTML=topo("Geoterritorialidade","Cadastro das Zonas numeradas e dos bairros do município.",geoTipo)+
 '<section class="table-shell pref-canonical-table"><div class="table-toolbar">'+
 '<label class="pref-table-select" for="geo-type">Território <select id="geo-type"><option value="zonas"'+(geoTipo==="zonas"?" selected":"")+'>Zonas numeradas</option><option value="bairros"'+(geoTipo==="bairros"?" selected":"")+'>Bairros</option></select></label>'+
 '<label class="search-field">'+icon("search")+'<input id="geo-search" type="search" placeholder="Buscar zona ou bairro" aria-label="Buscar território"></label>'+
 '<span id="geo-count" class="table-count"></span></div>'+
 '<div class="table-scroll"><table><thead><tr><th>Zona / Bairro</th><th>Código de referência</th><th>Vínculo territorial</th><th>Fonte</th><th>Ações</th></tr></thead><tbody id="geo-rows"><tr><td colspan="5">Carregando dados territoriais...</td></tr></tbody></table></div></section>';
 $("geo-type").onchange=e=>{geoTipo=e.target.value;render();};
 $("geo-search").oninput=()=>window.dispatchEvent(new Event("gestao:geo-render"));
}
function renderModulo(){
 const d=D.ESQUEMAS[atual];
 if(atual==="bairros"){
  PAGE.innerHTML=topo("Bairros","Inventário territorial e vínculos com as zonas operacionais. Utilize Novo cadastro para incluir um bairro.","bairros");
  return; // O catálogo de bairros é o único inventário visível, montado pelo adaptador territorial existente.
 }
 PAGE.innerHTML=topo(d.label,d.summary,atual)+
 (atual==='eventos'&&D.config.referencias(db.municipioAtivo()).eventoHistorico?'<div class="heading-actions"><button type="button" class="btn btn-primary" data-importar-tornado>+ '+esc(D.config.referencias(db.municipioAtivo()).eventoHistorico.rotulo)+'</button></div>':'')+
 '<section class="table-shell"><div class="table-toolbar"><label class="search-field">'+icon("search")+'<input id="table-search" type="search" placeholder="Buscar cadastro" aria-label="Buscar cadastros" autocomplete="off"></label><span id="table-count" class="table-count"></span></div>'+
 '<div class="table-scroll"><table><thead><tr>'+d.columns.map(c=>'<th scope="col">'+esc(d.fields.find(f=>f.key===c)?.label||c)+'</th>').join("")+'<th scope="col" style="text-align:right">Ações</th></tr></thead><tbody id="table-body"></tbody></table></div></section>'+
 (atual==="prefeituras"?'<div class="prefecture-layout"><section class="section-card"><header class="section-card-head"><h2>Prefeitura selecionada</h2></header><div class="section-card-body"><div class="hierarchy">'+
 '<div class="hierarchy-step"><strong>'+esc(db.municipioAtivo()?.nome||"—")+'</strong><small>'+esc(db.municipioAtivo()?.uf||"")+' · Código IBGE '+esc(db.municipioAtivo()?.codigo_ibge||"—")+'</small></div>'+
 '<div class="hierarchy-step"><strong>Território e instituições</strong><small>As zonas e cadastros desta prefeitura ficam no menu esquerdo.</small></div></div></div></section>'+mapaPreview()+'</div>':"");
 if(atual==="prefeituras")PAGE.insertAdjacentHTML("beforeend",'<section class="section-card"><div class="section-card-body"><strong>Implantação georreferenciada municipal</strong><p class="page-subtitle">No fluxo único é possível conferir IBGE, CNES, bairros, zonas, unidades, pontos críticos e órgãos do gabinete de crise.</p><a class="btn btn-primary" href="#implantacao">Abrir implantação única</a></div></section>');
 const search=$("table-search");search.value=pesquisa;search.oninput=e=>{pesquisa=e.target.value;tabelaLinhas();};
 tabelaLinhas();
}
