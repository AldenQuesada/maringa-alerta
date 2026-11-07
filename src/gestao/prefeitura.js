/* prefeitura: controlador com dependências explícitas. */
(function(root){'use strict';
function criar({$,PAGE,PREF_TABS,STRUCT_MODULES,db,esc,icon,importarUnidadesCNES,render,state,topo}){
function renderPrefTabs(){
 const html='<nav class="pref-tabs" aria-label="Cadastro da Prefeitura">'+PREF_TABS.map(([id,label])=>'<a class="pref-tab'+(id===state.atual?' active':'')+'" href="#'+id+'"'+(id===state.atual?' aria-current="page"':'')+'>'+esc(label)+'</a>').join("")+'</nav>';
 const heading=PAGE.querySelector(".heading-row");if(heading)heading.insertAdjacentHTML("afterend",html);else PAGE.insertAdjacentHTML("afterbegin",html);
 const nav=PAGE.querySelector(".pref-tabs"),body=document.createElement("div");body.className="pref-tab-body";
 while(nav.nextSibling)body.appendChild(nav.nextSibling);PAGE.appendChild(body);
 PAGE.closest(".content")?.scrollTo(0,0);
}
function structures(){return STRUCT_MODULES.flatMap(([m])=>db.lista(m));}
function responsible(x,people){return people.find(p=>p.id===x.responsavel_id)||people.find(p=>p.estrutura_id===x.id)||null;}
function gabinete(){const orgs=structures();return db.lista("pessoas").filter(p=>p.estrutura_id||orgs.some(x=>x.responsavel_id===p.id)||["admin","responsavel","substituto","coordenador"].includes(p.funcao));}
function renderTerritorioMunicipal(){
 const p=db.municipioAtivo();
 if(!p){PAGE.innerHTML=topo("Prefeitura indisponível","Município ainda não provisionado.");return;}
 const people=gabinete(),orgs=structures();
 PAGE.innerHTML=topo("Gerais","Dados institucionais e representantes do Gabinete de Crise.","pessoas")+
 '<section class="table-shell pref-general"><div class="table-toolbar"><strong>Dados da Prefeitura</strong></div><div class="table-scroll"><table><thead><tr><th>Prefeitura</th><th>UF</th><th>Código IBGE</th><th>Telefone</th><th>E-mail</th><th>Situação</th><th>Ações</th></tr></thead><tbody>'+
 '<tr><td><strong>'+esc(p.nome)+'</strong></td><td>'+esc(p.uf||"—")+'</td><td>'+esc(p.codigo_ibge||"—")+'</td><td>'+esc(p.telefone||"—")+'</td><td>'+esc(p.email||p.admin_municipal_email||"—")+'</td><td>'+esc(p.status||"—")+'</td>'+
 '<td><a class="row-action" href="../plataforma/#municipios" title="O cadastro da Prefeitura pertence ao Admin Geral">Editar</a></td></tr></tbody></table></div></section>'+
 '<section class="table-shell pref-cabinet"><div class="table-toolbar"><strong>Gabinete de Crise</strong><span class="table-count">'+people.length+' membro(s)</span></div>'+
 '<div class="table-scroll"><table><thead><tr><th>Nome</th><th>Cargo</th><th>Função</th><th>Estrutura representada</th><th>Telefone</th><th>E-mail</th><th>Ações</th></tr></thead><tbody>'+
 (people.length?people.map(x=>{const org=orgs.find(o=>o.id===x.estrutura_id||o.responsavel_id===x.id);return '<tr><td><strong>'+esc(x.nome)+'</strong></td><td>'+esc(x.cargo||"Não informado")+'</td><td>'+esc(x.funcao||"—")+'</td><td>'+esc(org?.nome||x.orgao||"Não vinculada")+'</td><td>'+esc(x.telefone||"—")+'</td><td>'+esc(x.email||"—")+'</td><td><button type="button" class="row-action" data-canon-edit="pessoas" data-id="'+esc(x.id)+'">Editar</button></td></tr>';}).join(""):'<tr><td colspan="7">Nenhum membro cadastrado. Use Novo cadastro acima.</td></tr>')+
 '</tbody></table></div></section>';
}
function renderEstruturas(){
 const m=state.estruturaTipo,people=db.lista("pessoas"),records=db.lista(m);
 PAGE.innerHTML=topo("Estruturas","Unidades, órgãos e seus representantes cadastrados.",""+m)+
 '<section class="table-shell pref-canonical-table"><div class="table-toolbar">'+
 '<label class="pref-table-select" for="estrutura-type">Tipo <select id="estrutura-type">'+STRUCT_MODULES.map(([id,label])=>'<option value="'+id+'"'+(id===m?' selected':'')+'>'+esc(label)+'</option>').join("")+'</select></label>'+
 '<label class="search-field">'+icon("search")+'<input id="estrutura-search" type="search" placeholder="Buscar unidade ou CNES" aria-label="Buscar estruturas"></label><span class="table-count" id="estrutura-count"></span></div>'+
 '<div class="table-scroll"><table><thead><tr><th>Unidade / estrutura</th><th>Tipo</th><th>CNES</th><th>Zona / bairro</th><th>Representante no Gabinete</th><th>Ações</th></tr></thead><tbody id="estrutura-rows"></tbody></table></div></section>';
 $("estrutura-type").onchange=e=>{state.estruturaTipo=e.target.value;render();};
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
 PAGE.innerHTML=topo("Geoterritorialidade","Cadastro das Zonas numeradas e dos bairros do município.",state.geoTipo)+
 '<section class="table-shell pref-canonical-table"><div class="table-toolbar">'+
 '<label class="pref-table-select" for="geo-type">Território <select id="geo-type"><option value="zonas"'+(state.geoTipo==="zonas"?" selected":"")+'>Zonas numeradas</option><option value="bairros"'+(state.geoTipo==="bairros"?" selected":"")+'>Bairros</option></select></label>'+
 '<label class="search-field">'+icon("search")+'<input id="geo-search" type="search" placeholder="Buscar zona ou bairro" aria-label="Buscar território"></label>'+
 '<span id="geo-count" class="table-count"></span></div>'+
 '<div class="table-scroll"><table><thead><tr><th>Zona / Bairro</th><th>Código de referência</th><th>Vínculo territorial</th><th>Fonte</th><th>Ações</th></tr></thead><tbody id="geo-rows"><tr><td colspan="5">Carregando dados territoriais...</td></tr></tbody></table></div></section>';
 $("geo-type").onchange=e=>{state.geoTipo=e.target.value;render();};
 $("geo-search").oninput=()=>window.dispatchEvent(new Event("gestao:geo-render"));
}
return {renderPrefTabs,structures,responsible,gabinete,renderTerritorioMunicipal,renderEstruturas,renderGeoterritorialidade};
}
root.AlertaGestaoPrefeitura={criar};
})(globalThis);
