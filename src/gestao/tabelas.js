/* tabelas: controlador com dependências explícitas. */
(function(root){'use strict';
function criar({$,D,PAGE,db,esc,icon,icons,state,topo}){
function tabelaLinhas(){
 if(state.atual==="inicio")return;
 const def=D.ESQUEMAS[state.atual],all=db.lista(state.atual);
 const list=all.filter(x=>Object.values(x).some(v=>(typeof v==="string"||Array.isArray(v))&&String(v).toLocaleLowerCase("pt-BR").includes(state.pesquisa.toLocaleLowerCase("pt-BR"))));
 const plural=list.length===1?"registro":"registros";
 const count=$("table-count");if(count)count.textContent=list.length+" "+plural;
 const tbody=$("table-body");if(!tbody)return;
 if(!list.length){
  tbody.innerHTML='<tr><td colspan="'+(def.columns.length+1)+'"><div class="empty-state">'+icon(icons[state.atual])+'<h3>'+(state.pesquisa?"Nenhum resultado":"Nenhum cadastro ainda")+'</h3><p>'+(state.pesquisa?"Altere os termos da busca.":"Adicione o primeiro registro para começar.")+'</p>'+""+'</div></td></tr>';
  return;
 }
 tbody.innerHTML=list.map(item=>'<tr>'+def.columns.map(c=>'<td>'+esc(c==="responsavel_id"?(db.lista("pessoas").find(p=>p.id===item[c])?.nome||"Não vinculado"):(item[c]===0?0:item[c]||"—"))+'</td>').join("")+
 '<td><div class="row-actions">'+(state.atual==="eventos"?'<a class="row-action" href="../index.html?evento='+encodeURIComponent(item.id)+'" target="_blank" rel="noopener">Abrir mapa</a>':'')+'<button class="row-action" type="button" data-edit="'+esc(item.id)+'" title="Editar">Editar</button>'+(state.atual==="eventos"?'':'<button class="row-action danger" type="button" data-delete="'+esc(item.id)+'" title="Excluir">Excluir</button>')+'</div></td></tr>').join("");
}
function mapaPreview(){
 const p=db.municipioAtivo();
 if(!p)return "";
 const lat=Number(p.lat),lng=Number(p.lng);
 const valido=Number.isFinite(lat)&&Number.isFinite(lng)&&p.lat!==undefined&&p.lng!==undefined;
 let mapa='<div class="geo-fallback">'+icon("pin")+'<strong>Mapa não localizado</strong><span>Escolha um município no formulário para obter a localização.</span></div>';
 if(valido){
  let box=Array.isArray(p.bbox)&&p.bbox.length===4?p.bbox:[lat-.065,lat+.065,lng-.09,lng+.09];
  const [s,n,w,e]=box.map(Number);
  if([s,n,w,e].every(Number.isFinite)){
   const bbox=encodeURIComponent([w,s,e,n].join(","));
   const src="https://www.openstreetmap.org/export/embed.html?bbox="+bbox+"&layer=mapnik&marker="+encodeURIComponent(lat+","+lng);
   mapa='<iframe class="geo-iframe" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" title="Mapa de '+esc(p.nome)+'" src="'+esc(src)+'"></iframe>';
  }
 }
 return '<aside class="geo-panel"><div class="geo-head">Mapa · '+esc(p.nome)+'</div>'+mapa+'<div class="hint">A vista do município é independente do Mapa Operacional.</div></aside>';
}
function renderModulo(){
 const d=D.ESQUEMAS[state.atual];
 if(state.atual==="bairros"){
  PAGE.innerHTML=topo("Bairros","Inventário territorial e vínculos com as zonas operacionais. Utilize Novo cadastro para incluir um bairro.","bairros");
  return; // O catálogo de bairros é o único inventário visível, montado pelo adaptador territorial existente.
 }
 PAGE.innerHTML=topo(d.label,d.summary,state.atual)+
 (state.atual==='eventos'&&D.config.referencias(db.municipioAtivo()).eventoHistorico?'<div class="heading-actions"><button type="button" class="btn btn-primary" data-importar-tornado>+ '+esc(D.config.referencias(db.municipioAtivo()).eventoHistorico.rotulo)+'</button></div>':'')+
 '<section class="table-shell"><div class="table-toolbar"><label class="search-field">'+icon("search")+'<input id="table-search" type="search" placeholder="Buscar cadastro" aria-label="Buscar cadastros" autocomplete="off"></label><span id="table-count" class="table-count"></span></div>'+
 '<div class="table-scroll"><table><thead><tr>'+d.columns.map(c=>'<th scope="col">'+esc(d.fields.find(f=>f.key===c)?.label||c)+'</th>').join("")+'<th scope="col" style="text-align:right">Ações</th></tr></thead><tbody id="table-body"></tbody></table></div></section>'+
 (state.atual==="prefeituras"?'<div class="prefecture-layout"><section class="section-card"><header class="section-card-head"><h2>Prefeitura selecionada</h2></header><div class="section-card-body"><div class="hierarchy">'+
 '<div class="hierarchy-step"><strong>'+esc(db.municipioAtivo()?.nome||"—")+'</strong><small>'+esc(db.municipioAtivo()?.uf||"")+' · Código IBGE '+esc(db.municipioAtivo()?.codigo_ibge||"—")+'</small></div>'+
 '<div class="hierarchy-step"><strong>Território e instituições</strong><small>As zonas e cadastros desta prefeitura ficam no menu esquerdo.</small></div></div></div></section>'+mapaPreview()+'</div>':"");
 if(state.atual==="prefeituras")PAGE.insertAdjacentHTML("beforeend",'<section class="section-card"><div class="section-card-body"><strong>Implantação georreferenciada municipal</strong><p class="page-subtitle">No fluxo único é possível conferir IBGE, CNES, bairros, zonas, unidades, pontos críticos e órgãos do gabinete de crise.</p><a class="btn btn-primary" href="#implantacao">Abrir implantação única</a></div></section>');
 const search=$("table-search");search.value=state.pesquisa;search.oninput=e=>{state.pesquisa=e.target.value;tabelaLinhas();};
 tabelaLinhas();
}
return {tabelaLinhas,mapaPreview,renderModulo};
}
root.AlertaGestaoTabelas={criar};
})(globalThis);
