/* navegacao: controlador com dependências explícitas. */
(function(root){'use strict';
function criar({$,D,FRAME,NAV,PREF_SECTIONS,db,esc,icon,icons,render,state}){
function renderMunicipios(){
 const marca=D.config.marca(db.municipioAtivo()),brand=document.querySelector('.brand');
 if(brand){brand.setAttribute('aria-label',marca+' · Início');brand.querySelector('strong').textContent=marca.toLocaleUpperCase('pt-BR');brand.querySelector('.brand-mark').firstChild.textContent=marca.charAt(0)||'S';}
 const rodape=document.querySelector('.foot-copy');if(rodape)rodape.textContent=marca;
 const sigla=document.querySelector('.foot-mark');if(sigla)sigla.textContent=marca.charAt(0)||'S';
 const select=$("municipio-switch"),lista=db.municipios();
 select.innerHTML=lista.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nome)+" · "+esc(x.uf)+"</option>").join("");
 select.value=db.municipioAtivo()?.id||"";
 select.disabled=true;select.title="O município é atribuído pelo Admin Geral da plataforma.";
}
function renderNav(){
 NAV.innerHTML='<div class="nav-group"><div class="nav-group-title">Atendimento</div><a class="nav-item'+(state.atual==="conversas"?" active":"")+'" href="#conversas" data-nav="conversas" aria-current="'+(state.atual==="conversas"?"page":"false")+'" title="Central de Conversas">'+icon("chat")+'<span class="nav-label">Central de Conversas</span></a></div>'+D.GROUPS.map(g=>'<div class="nav-group"><div class="nav-group-title">'+esc(g.label)+'</div>'+
   g.items.map(id=>'<a class="nav-item'+((state.atual===id||(id==="territorio"&&PREF_SECTIONS.has(state.atual)))?" active":"")+'" href="#'+esc(id)+'" data-nav="'+esc(id)+'" aria-current="'+((state.atual===id||(id==="territorio"&&PREF_SECTIONS.has(state.atual)))?"page":"false")+'" title="'+esc(id==="inicio"?"Visão geral":D.ESQUEMAS[id].label)+'">'+icon(icons[id])+'<span class="nav-label">'+esc(id==="inicio"?"Visão geral":D.ESQUEMAS[id].label)+"</span></a>").join("")+"</div>").join("");
 NAV.querySelectorAll("[data-nav]").forEach(el=>el.onclick=()=>{
  FRAME.classList.remove("mobile-open");
  if(location.hash==="#"+el.dataset.nav) {state.pesquisa="";render();}
 });
}
function topo(titulo,subtitulo,acao){
 return '<div class="heading-row"><div><div class="eyebrow">'+esc(PREF_SECTIONS.has(state.atual)?"GESTÃO MUNICIPAL":db.municipioAtivo()?.nome||"Municípios")+'</div><h1 class="page-title">'+esc(titulo)+'</h1><p class="page-subtitle">'+esc(subtitulo)+'</p></div>'+
 (acao?'<div class="heading-actions"><button class="btn btn-primary" type="button" data-new="'+esc(acao)+'">'+icon("plus")+ 'Novo cadastro</button></div>':"")+"</div>";
}
function resumoCard(nome,valor,icone,nota){
 return '<div class="metric"><div class="metric-top">'+esc(nome)+icon(icone)+'</div><div class="metric-value">'+esc(valor)+'</div><div class="metric-foot">'+esc(nota)+'</div></div>';
}
return {renderMunicipios,renderNav,topo,resumoCard};
}
root.AlertaGestaoNavegacao={criar};
})(globalThis);
