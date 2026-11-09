/* Ciclo do formulário: campos, seleção IBGE, edição e restauração do foco. */
(function(root){
'use strict';
function criar({db,D,document,esc,structures,getCurrentPage,onDenied=()=>{}}){
const $=id=>document.getElementById(id),DRAWER=$('drawer-overlay');
let edicao=null,drawerModulo=null,ultimoFoco=null;
const cidadesPorUf=new Map();
async function carregarIBGE(uf){
 if(!D.UFS.includes(uf))return;
 const lista=$("ibge-cidades");if(!lista)return;
 let cidades=cidadesPorUf.get(uf);
 try{
  if(!cidades){
   const res=await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados/"+encodeURIComponent(uf)+"/municipios",{cache:"force-cache"});
   if(!res.ok)throw Error("Não foi possível consultar o IBGE.");
   cidades=await res.json();cidadesPorUf.set(uf,cidades);
  }
  if(!DRAWER.hidden&&$("field-uf")?.value===uf&&$("ibge-cidades")){
   $("ibge-cidades").innerHTML=cidades.map(x=>'<option value="'+esc(x.nome)+'"></option>').join("");
   atualizarCodigoIBGE();
  }
 }catch(_){/* Permitir preenchimento manual do código IBGE quando a API estiver indisponível. */}
}
function atualizarCodigoIBGE(){
 const uf=$("field-uf")?.value,cidade=$("field-nome")?.value?.trim(),codigo=$("field-codigo_ibge");
 if(!uf||!cidade||!codigo)return;
 const normal=s=>s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("pt-BR");
 const found=(cidadesPorUf.get(uf)||[]).find(x=>normal(x.nome)===normal(cidade));
 if(found)codigo.value=String(found.id);
}

function campoHTML(f,valor){
 const id="field-"+f.key,v=esc(valor??""),required=f.required?' required':"";
 const label='<label for="'+id+'">'+esc(f.label)+(f.required?' <span class="required">*</span>':"")+'</label>';
 if(f.type==="hidden")return '<input type="hidden" id="'+id+'" name="'+esc(f.key)+'" value="'+v+'">';
 if(f.type==="multi"){const current=Array.isArray(valor)?valor:String(valor||"").split(";").map(x=>x.trim()).filter(Boolean);
 return '<fieldset class="field multi-field"><legend>'+esc(f.label)+'</legend><div class="multi-choices">'+(f.options||[]).map(opt=>'<label class="multi-option"><input type="checkbox" name="'+esc(f.key)+'" value="'+esc(opt)+'"'+(current.includes(opt)?' checked':'')+'/><span>'+esc(opt)+'</span></label>').join("")+'</div></fieldset>';}
 if(f.type==="textarea")return '<div class="field">'+label+'<textarea id="'+id+'" name="'+esc(f.key)+'"'+required+'>'+v+'</textarea></div>';
 if(f.type==="colaborador"||f.type==="municipio"||f.type==="select"||f.type==="uf"||f.type==="zone"||f.type==="team"||f.type==="person"||f.type==="structure"||f.type==="eventoMapa"){
  const options=f.type==="colaborador"?db.lista("voluntarios").map(x=>({id:x.id,nome:x.nome})):f.type==="municipio"?db.municipios().filter(x=>x.id!==db.municipioAtivo()?.id&&x.status==="ativa"):f.type==="eventoMapa"?db.lista("eventos").filter(x=>x.id!==edicao):f.type==="uf"?D.UFS:f.type==="zone"?db.lista("zonas").map(x=>x.nome):f.type==="team"?db.lista("equipes").map(x=>({id:x.id,nome:x.nome})):f.type==="person"?db.lista("pessoas").map(x=>({id:x.id,nome:x.nome})):f.type==="structure"?structures().map(x=>({id:x.id,nome:x.nome})):f.options||[];
  return '<div class="field">'+label+'<select id="'+id+'" name="'+esc(f.key)+'"'+required+'><option value="">Selecionar</option>'+options.map(o=>'<option value="'+esc(o.id??o)+'"'+(String(o.id??o)===String(valor)?" selected":"")+'>'+esc(o.nome??o)+'</option>').join("")+'</select></div>';
 }
 const type=f.type==="number"?"number":f.type==="date"?"date":f.type==="tel"?"tel":f.type==="email"?"email":"text";
 const attr=type==="number"?' min="'+esc(f.min??0)+'" step="'+esc(f.step??'any')+'"':"";
 const list=f.type==="city"?' list="ibge-cidades" autocomplete="off"':"";
 return '<div class="field">'+label+'<input id="'+id+'" name="'+esc(f.key)+'" type="'+type+'" value="'+v+'"'+required+attr+list+'></div>';
}
function abrirDrawer(id=null,modulo=getCurrentPage(),prefill=null){
 if(modulo==="inicio")return;
 if(db.tipo==='supabase'&&!db.pode(modulo,'gravar')){onDenied('Você não tem permissão para alterar este cadastro.');return false;}
 drawerModulo=modulo;
 const def=D.ESQUEMAS[modulo];
 const item=id?db.registro(modulo,id):null;
 if(id&&!item)return;
 edicao=id;
 ultimoFoco=document.activeElement;
 $("drawer-eyebrow").textContent=def.label;
 $("drawer-title").textContent=(id?"Editar ":"Novo cadastro · ")+def.singular;
 $("cadastro-campos").innerHTML=def.fields.map(f=>campoHTML(db.tipo==='supabase'?root.AlertaPermissoesUI.campo(f,item,def.collection,root.AlertaRegrasOperacionais):f,item?.[f.key]??prefill?.[f.key])).join("")+(modulo==="prefeituras"?'<datalist id="ibge-cidades"></datalist>':"");
 if(modulo==="relatos" && typeof item?.foto==="string" && /^data:image\/jpeg;base64,/.test(item.foto)){
  const foto=document.createElement("img");
  foto.src=item.foto;foto.alt="Foto da ocorrência informada pelo cidadão";
  foto.style.cssText="display:block;width:min(100%,340px);max-height:260px;object-fit:contain;border-radius:12px;margin:12px auto;background:#eef1f0";
  $("cadastro-campos").prepend(foto);
 }
 const bairro=$("field-bairro");
 if(bairro&&(modulo==="pessoas"||modulo==="voluntarios")){
  bairro.required=true;
  bairro.setAttribute("list","bairros-origem");
  const lista=document.createElement("datalist");
  lista.id="bairros-origem";
  const nomes=new Set(db.lista("bairros").map(x=>x.nome));
  const preencher=()=>{lista.replaceChildren(...[...nomes].sort((a,b)=>a.localeCompare(b,"pt-BR")).map(nome=>new Option(nome)));};
  bairro.after(lista);
  preencher();
  if(D.config.referencias(db.municipioAtivo()).catalogoBairros&&globalThis[D.config.referencias(db.municipioAtivo()).catalogoBairros]){
   globalThis[D.config.referencias(db.municipioAtivo()).catalogoBairros].carregar().then(({bairros})=>{
    bairros.features.forEach(f=>nomes.add(f.properties.nome));
    preencher();
   }).catch(()=>{});
  }
 }
 $("form-error").textContent="";
 DRAWER.hidden=false;
 if(modulo==="prefeituras"){
  $("field-uf").addEventListener("change",()=>{ $("field-nome").value="";$("field-codigo_ibge").value="";carregarIBGE($("field-uf").value); });
  $("field-nome").addEventListener("change",()=>atualizarCodigoIBGE());
  if($("field-uf").value)carregarIBGE($("field-uf").value);
 }
 $("cadastro-campos").querySelector("input,select,textarea")?.focus();
}
function fecharDrawer(){
 DRAWER.hidden=true;edicao=null;drawerModulo=null;
 const foco=ultimoFoco;ultimoFoco=null;
 if(foco?.isConnected&&foco.focus)foco.focus({preventScroll:true});
}

return {abrirDrawer,fecharDrawer,get edicao(){return edicao;},get modulo(){return drawerModulo;}};
}
root.AlertaGestaoFormulario={criar};
})(globalThis);
/* Importação de referências configuradas por código IBGE; sem dependência da tela. */
(function(root){
'use strict';
function criar({db,config,carregarPublica,fetch,onChange=()=>{},onError=()=>{}}){
let referenciasPublicasConsultadas=false,cnesConsultado=false;
async function importarBasesERiscosPublicos(){
 if(db.tipo==="supabase")return;
 const municipio=db.municipioAtivo();
 const referencia=config.referencias(municipio);
 if(referenciasPublicasConsultadas||!referencia.publicas?.length)return;
 referenciasPublicasConsultadas=true;
 const docs=referencia.publicas.map(path=>"../"+path);
 const results=await Promise.allSettled(docs.map(url=>carregarPublica(db,{url})));
 const alterados=results.some(r=>r.status==="fulfilled"&&(r.value.novos||r.value.atualizados));
 if(results.some(r=>r.status==="rejected"))console.warn("Algumas referências públicas ainda não estão disponíveis.");
 if(alterados)onChange();
}
async function importarUnidadesCNES(){
 if(db.tipo==="supabase")return;
 const municipio=db.municipioAtivo(),referencia=config.referencias(municipio).cnes;
 if(cnesConsultado||!referencia)return;
 cnesConsultado=true;
 const codigosExistentes=new Set(["saude","emergencias"].flatMap(modulo=>db.lista(modulo)).map(x=>String(x.codigo_cnes||"")).filter(Boolean));
 if(codigosExistentes.size>=referencia.quantidade)return;
 try{
  const r=await fetch("../"+referencia.url,{cache:"no-cache"});
  if(!r.ok)throw Error("Arquivo de referência CNES indisponível");
  const doc=await r.json();
  if(String(doc.municipio_ibge)!==String(municipio.codigo_ibge)||!Array.isArray(doc.unidades)||doc.unidades.length!==referencia.quantidade)throw Error("Base CNES inválida");
  for(const [grupo] of [["saude"],["emergencias"]]){
   const linhas=doc.unidades.filter(x=>x.grupo===grupo&&!codigosExistentes.has(String(x.codigo_cnes))).map(x=>({nome:x.nome,tipo:x.tipo,codigo_cnes:x.codigo_cnes,externalId:"cnes:"+x.codigo_cnes,fonte:"CNES · Ministério da Saúde",url_fonte:doc.url_fonte,verificacao:"Em conferência"}));
   if(linhas.length)await db.importarLote(grupo,linhas);
  }
  onChange();
 }catch(err){onError("Não foi possível importar unidades do CNES: "+err.message);}
}

return {importarBasesERiscosPublicos,importarUnidadesCNES};
}
root.AlertaGestaoReferencias={criar};
})(globalThis);
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
/* painel: controlador com dependências explícitas. */
(function(root){'use strict';
function criar({PAGE,db,esc,icon,resumoCard,topo}){
function renderInicio(){
 const numero=tipo=>db.lista(tipo).length;
 const entradas=[
  ["Eventos","Registrar eventos e abrir seus mapas operacionais.","eventos"],
  ["Gerais","Dados institucionais e membros do Gabinete de Crise.","territorio"],
  ["Geoterritorialidade","Consultar e cadastrar zonas numeradas e bairros.","geoterritorialidade"],
  ["Estruturas","Cadastrar unidades e seus representantes do Gabinete de Crise.","estruturas"],
  ["Equipes","Organizar equipes e recursos municipais.","equipes"],
  ["Recursos e comunicação","Configurar equipamentos, abrigos e canais.","equipamentos"],
  ["Ajuda pós-evento","Gerenciar solicitações por zona.","solicitacoes"],
   ["Central de Conversas","Ver todos os colaboradores, filtrar por zona e revisar o fluxo Pra Somar.","conversas"],
  ["Brigadas e prefeituras","Mobilizar zonas e solicitar apoio a outros municípios.","mobilizacoes"]
 ];
 PAGE.innerHTML=topo("Painel de gestão","Cadastros e recursos para organizar a atuação de cada prefeitura.")+
 '<div class="dashboard-grid">'+resumoCard("Bairros",numero("bairros"),"layers","Nesta prefeitura")+resumoCard("Zonas",numero("zonas"),"layers","Na prefeitura selecionada")+resumoCard("Equipes",numero("equipes"),"users","Recuperação e apoio")+resumoCard("Instituições",numero("saude")+numero("emergencias")+numero("parceiros"),"hospital","Serviços cadastrados")+'</div>'+
 '<div class="dash-layout"><section class="section-card"><header class="section-card-head"><h2>Organizar cadastros</h2></header><div class="section-card-body">'+
 entradas.map(([n,d,m])=>'<div class="overview-entry"><div><strong>'+esc(n)+'</strong><p>'+esc(d)+'</p></div><a class="mini-action" href="#'+m+'">Abrir '+'</a></div>').join("")+
 '</div></section><section class="section-card"><header class="section-card-head"><h2>Hierarquia municipal</h2></header><div class="section-card-body"><div class="hierarchy">'+
 '<div class="hierarchy-step"><strong>Prefeitura</strong><small>Administração municipal e território</small></div>'+
 '<div class="hierarchy-step"><strong>Responsáveis e coordenadores</strong><small>Zonas, substituições e equipes</small></div>'+
 '<div class="hierarchy-step"><strong>Equipes e instituições</strong><small>Recursos, contatos e capacidade operacional</small></div>'+
 '</div></div></section></div>';
 PAGE.innerHTML+='<section class="section-card crisis-links"><div class="section-card-body"><strong>Três mapas integrados</strong><p class="page-subtitle">O Mapa de Evento preserva a aplicação original. O Mapa de Colaboradores mostra as capacidades cadastradas; o Mapa da Ajuda mostra demandas pós-evento.</p><div class="heading-actions"><a class="btn" href="../index.html" target="_blank" rel="noopener">Mapa de Evento</a><a class="btn" href="../mapas/?tipo=colaboradores" target="_blank" rel="noopener">Mapa de Colaboradores</a><a class="btn" href="../mapas/?tipo=ajuda" target="_blank" rel="noopener">Mapa da Ajuda</a><a class="btn btn-primary" href="../atendimento/" target="_blank" rel="noopener">Testar atendimento WhatsApp</a></div></div></section>';
}
return {renderInicio};
}
root.AlertaGestaoPainel={criar};
})(globalThis);
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
 '<td><div class="row-actions">'+(state.atual==="eventos"?'<a class="row-action" href="../index.html?evento='+encodeURIComponent(item.id)+'" target="_blank" rel="noopener">Abrir mapa</a>':'')+(def.editor==='mapa'?'<a class="row-action" href="../index.html?incidente='+encodeURIComponent(item.id)+'">Abrir no mapa</a>':'<button class="row-action" type="button" data-edit="'+esc(item.id)+'" title="Editar">Editar</button>')+(state.atual==="eventos"?'':'<button class="row-action danger" type="button" data-delete="'+esc(item.id)+'" title="Excluir">Excluir</button>')+'</div></td></tr>').join("");
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
 PAGE.innerHTML=topo(d.label,d.summary,d.editor==='mapa'?null:state.atual)+
 (d.editor==='mapa'?'<div class="heading-actions"><a class="btn btn-primary" data-permission-collection="'+esc(d.collection)+'" href="../index.html?novaOcorrencia=1">'+icon('plus')+'Registrar no mapa</a></div>':'')+
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
/* roteador: controlador com dependências explícitas. */
(function(root){'use strict';
function criar({D,PAGE,PREF_SECTIONS,abrirDrawer,db,renderEstruturas,renderGeoterritorialidade,renderInicio,renderModulo,renderNav,renderPrefTabs,renderTerritorioMunicipal,state,topo}){
function render(){
 root.AlertaContatos?.desmontar();
 if(db.municipioAtivo()?.status==="suspensa"){
  PAGE.innerHTML=topo("Município suspenso","O Admin Geral suspendeu este município. A gestão municipal não pode operar até reativação.");
  return;
 }
 const hash=decodeURIComponent(location.hash.replace(/^#/,""))||"inicio";
 if(hash==="bairros"||hash==="zonas")state.geoTipo=hash;
 if(["saude","emergencias","parceiros"].includes(hash))state.estruturaTipo=hash;
 const alias=hash==="prefeituras"||hash==="implantacao"||hash==="pessoas"?"territorio":hash==="bairros"||hash==="zonas"?"geoterritorialidade":["saude","emergencias","parceiros"].includes(hash)?"estruturas":hash;
 const proximo=alias==="inicio"||alias==="conversas"||alias==="estruturas"||alias==="geoterritorialidade"||Object.hasOwn(D.ESQUEMAS,alias)?alias:"inicio";
 if(db.tipo==='supabase'&&!AlertaPermissoesUI.podeRota(db,proximo)){PAGE.innerHTML=topo('Acesso restrito','Seu vínculo não permite consultar este cadastro.');return;}
 if(proximo!==state.atual)state.pesquisa="";
 state.atual=proximo;
 document.title=(state.atual==="inicio"?"Gestão":state.atual==="conversas"?"Central de Conversas":state.atual==="estruturas"?"Estruturas":state.atual==="geoterritorialidade"?"Geoterritorialidade":D.ESQUEMAS[state.atual].label)+" | Gestão Municipal";
 renderNav();
 if(state.atual==="inicio")renderInicio();
 else if(state.atual==="conversas"){
  try{db.tipo!=="supabase"&&window.MaringaColaboradoresDemo?.garantir(db,window.localStorage,{gerarExemplo:new URLSearchParams(location.search).get("modo")==="demo"||new URLSearchParams(location.search).get("demo")==="1"})}catch(err){console.warn("Ajudantes demonstrativos não puderam ser importados",err);}
  window.AlertaCentralConversas.montar({target:PAGE,db,onEdit:id=>abrirDrawer(id,"voluntarios"),onNew:()=>abrirDrawer(null,"voluntarios")});
 }
 else if(state.atual==="voluntarios"&&db.tipo==="supabase")window.AlertaContatos.montar({target:PAGE,db,onEdit:id=>abrirDrawer(id,"voluntarios")});
 else if(state.atual==="territorio")renderTerritorioMunicipal();
 else if(state.atual==="estruturas")renderEstruturas();
 else if(state.atual==="geoterritorialidade")renderGeoterritorialidade();
 else renderModulo();
 if(PREF_SECTIONS.has(state.atual)){
  renderPrefTabs();
  if(state.atual==="geoterritorialidade")window.dispatchEvent(new Event("gestao:geo-render"));
 }
}
return {render};
}
root.AlertaGestaoRoteador={criar};
})(globalThis);
/* operacoes: controlador com dependências explícitas. */
(function(root){'use strict';
function criar({$,db,render,renderModulo,renderMunicipios,state,toastTimer}){
async function geocodificarPrefeitura(item) {
 if(item.lat!==undefined||!item.nome||!item.uf)return;
 try{
  const params=new URLSearchParams({q:item.nome+", "+item.uf+", Brasil",format:"json",limit:"1"});
  const res=await fetch("https://nominatim.openstreetmap.org/search?"+params.toString(),{headers:{"Accept":"application/json"}});
  if(!res.ok)return;
  const list=await res.json(),x=list[0];if(!x)return;
  const lat=Number(x.lat),lng=Number(x.lon);
  if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
  const bb=(x.boundingbox||[]).map(Number);
  const geo={lat,lng};
  if(bb.length===4&&bb.every(Number.isFinite)){
   const [south,north,west,east]=bb,dy=Math.max((north-south)*.06,.002),dx=Math.max((east-west)*.06,.002);
   geo.bbox=[south-dy,north+dy,west-dx,east+dx];
  }
  await db.atualizarGeo(item.id,geo);
  if(state.atual==="prefeituras")renderModulo();
 }catch(_){/* O cadastro permanece salvo mesmo sem geocodificação externa. */}
}
function toast(msg){
 const el=$("toast");el.textContent=msg;el.hidden=false;
 if(toastTimer)clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>{el.hidden=true;},2800);
}
async function excluir(id){
 if(db.tipo==='supabase'&&!db.pode(state.atual,'excluir')){toast('Você não tem permissão para excluir este cadastro.');return;}
 const item=db.registro(state.atual,id);if(!item)return;
 const label=item.nome||item.identificacao||"este registro";
 if(!confirm('Excluir "'+label+'"?'))return;
 try{const anterior=db.municipioAtivo()?.id;await db.excluir(state.atual,id);if(state.atual==="prefeituras"){renderMunicipios();if(anterior!==db.municipioAtivo()?.id){location.reload();return;}}render();if(state.atual==="bairros")window.dispatchEvent(new Event("gestao:bairros-atualizados"));toast("Cadastro excluído.");}catch(e){toast(e.message);}
}
return {geocodificarPrefeitura,toast,excluir};
}
root.AlertaGestaoOperacoes={criar};
})(globalThis);
/* Composição da Gestão Municipal e seus controladores. */
(function () {
"use strict";
const {$}={ $: id => document.getElementById(id) };
const D=window.AlertaGestaoDados;
if(!D){document.getElementById("page").textContent="Não foi possível carregar os cadastros.";return;}
// Município recebido do Admin Geral fica fixo nesta aba (sessionStorage).
// Apenas isolamento de demonstração; autorizações reais exigem backend e RLS.
const municipioId=D.config.selecionar(D,sessionStorage);
const db=D.criar(undefined,{municipioId});
const PAGE=document.getElementById("page");
const NAV=document.getElementById("sidebar-nav");
const FRAME=document.getElementById("app-frame");
const DRAWER=document.getElementById("drawer-overlay");
const FORM=document.getElementById("cadastro-form");
const esc=v=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const ICONS={
  dashboard:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  building:'<path d="M4 21V5l8-3 8 3v16M2 21h20M9 8h2m-2 4h2m2-4h2m-2 4h2m-5 9v-5h4v5"/>',
  layers:'<path d="m12 2 9 5-9 5-9-5 9-5zM3 12l9 5 9-5M3 17l9 5 9-5"/>',
  pin:'<path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
  shield:'<path d="m12 2 8 4v6c0 5-4 8-8 10-4-2-8-5-8-10V6z"/><path d="m9 12 2 2 4-4"/>',
  user:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M10 3.2a4 4 0 1 1 0 7.6M17 7a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-3.9"/>',
  wrench:'<path d="M14 6a6 6 0 0 0-8 8l-4 4a2 2 0 0 0 3 3l4-4a6 6 0 0 0 8-8l-5 5-3-3z"/>',
  hospital:'<path d="M5 21V3h14v18M2 21h20M12 7v8M8 11h8M10 21v-4h4v4"/>',
  siren:'<path d="M5 16h14l-1-8a6 6 0 0 0-12 0l-1 8zM3 20h18M12 1v2M3 4l2 2M21 4l-2 2"/>',
  truck:'<path d="M3 5h12v12H3zM15 9h4l3 4v4h-7zM7 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4M19 21a2 2 0 1 0 0-4 2 2 0 0 0 0 4"/>',
  box:'<path d="m12 2 9 5-9 5-9-5zM3 7v10l9 5 9-5V7M12 12v10"/>',
  bell:'<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  list:'<path d="M9 6h12M9 12h12M9 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  search:'<circle cx="10" cy="10" r="7"/><path d="m15 15 6 6"/>',
  plus:'<path d="M12 5v14M5 12h14"/>',
  external:'<path d="M14 5h5v5M19 5l-9 9"/><path d="M19 13v6H5V5h6"/>',
  chat:'<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-4-.9L3 21l1.9-5.5a9 9 0 0 1-.9-4A8.5 8.5 0 0 1 12.5 3 8.5 8.5 0 0 1 21 11.5z"/><path d="M8 11h9M8 14h6"/>'
};
const icon=(id,css="")=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="'+css+'" aria-hidden="true">'+(ICONS[id]||ICONS.list)+'</svg>';
const icons={territorio:"layers",implantacao:"pin",bairros:"layers",pessoas:"users",solicitacoes:"list",mobilizacoes:"bell",apoios:"building",inicio:"dashboard",eventos:"pin",prefeituras:"building",zonas:"layers",bases:"pin",riscos:"shield",administradores:"shield",responsaveis:"user",substitutos:"user",coordenadores:"users",operadores:"user",equipes:"wrench",integrantes:"users",voluntarios:"users",saude:"hospital",emergencias:"siren",parceiros:"building",veiculos:"truck",equipamentos:"wrench",estoques:"box",abrigos:"hospital",pontos:"pin",ocorrencias:"list",canais:"bell",regras:"shield"};
let toastTimer=null;
const municipio=db.municipioAtivo();
const {importarBasesERiscosPublicos,importarUnidadesCNES}=AlertaGestaoReferencias.criar({db,config:D.config,carregarPublica:(...args)=>globalThis.AlertaImportacaoPublica.carregar(...args),fetch:(...args)=>fetch(...args),onChange:()=>render(),onError:message=>toast(message)});

const PREF_TABS=[["territorio","Gerais"],["geoterritorialidade","Geoterritorialidade"],["estruturas","Estruturas"],["bases","Bases"],["riscos","Riscos"]];
const STRUCT_MODULES=[["saude","Unidades de saúde"],["emergencias","Emergência e segurança"],["parceiros","Órgãos e concessionárias"]];
const PREF_SECTIONS=new Set([...PREF_TABS.map(x=>x[0]),"pessoas",...STRUCT_MODULES.map(x=>x[0])]);

const state={atual:"inicio",pesquisa:"",geoTipo:"zonas",estruturaTipo:"saude"};
const {renderMunicipios,renderNav,topo,resumoCard}=AlertaGestaoNavegacao.criar({$,D,FRAME,NAV,PREF_SECTIONS,db,esc,icon,icons,render:(...args)=>render(...args),state});
const {renderInicio}=AlertaGestaoPainel.criar({PAGE,db,esc,icon,resumoCard:(...args)=>resumoCard(...args),topo:(...args)=>topo(...args)});
const {tabelaLinhas,mapaPreview,renderModulo}=AlertaGestaoTabelas.criar({$,D,PAGE,db,esc,icon,icons,state,topo:(...args)=>topo(...args)});
const {renderPrefTabs,structures,responsible,gabinete,renderTerritorioMunicipal,renderEstruturas,renderGeoterritorialidade}=AlertaGestaoPrefeitura.criar({$,PAGE,PREF_TABS,STRUCT_MODULES,db,esc,icon,importarUnidadesCNES,render:(...args)=>render(...args),state,topo:(...args)=>topo(...args)});
const {render}=AlertaGestaoRoteador.criar({D,PAGE,PREF_SECTIONS,abrirDrawer:(...args)=>abrirDrawer(...args),db,renderEstruturas:(...args)=>renderEstruturas(...args),renderGeoterritorialidade:(...args)=>renderGeoterritorialidade(...args),renderInicio:(...args)=>renderInicio(...args),renderModulo:(...args)=>renderModulo(...args),renderNav:(...args)=>renderNav(...args),renderPrefTabs:(...args)=>renderPrefTabs(...args),renderTerritorioMunicipal:(...args)=>renderTerritorioMunicipal(...args),state,topo:(...args)=>topo(...args)});
const {geocodificarPrefeitura,toast,excluir}=AlertaGestaoOperacoes.criar({$,db,render:(...args)=>render(...args),renderModulo:(...args)=>renderModulo(...args),renderMunicipios:(...args)=>renderMunicipios(...args),state,toastTimer});
const drawer=AlertaGestaoFormulario.criar({db,D,document,esc,structures,getCurrentPage:()=>state.atual,onDenied:toast});
const {fecharDrawer}=drawer;
function abrirDrawer(id=null,module=state.atual,...args){
 if(window.MARINGA_SUPABASE?.cadastroAdministrativo===true&&db.tipo==='supabase'&&D.ESQUEMAS[module]?.collection==='usuarios'){location.href='../colaboradores/?municipio='+encodeURIComponent(db.municipioAtivo().id)+(id?'&pessoa='+encodeURIComponent(id):'&novo=1');return;}
 return drawer.abrirDrawer(id,module,...args);
}
FORM.addEventListener("submit",async e=>{
 e.preventDefault();const modulo=drawer.modulo||state.atual;
 const submit=$("drawer-save");if(submit.disabled)return;
 const data={};
 for(const [k,v] of new FormData(FORM).entries()){if(Object.hasOwn(data,k))data[k]=[].concat(data[k],v);else data[k]=v;}
 for(const f of D.ESQUEMAS[modulo].fields)if(f.type==="multi")data[f.key]=Array.isArray(data[f.key])?data[f.key]:data[f.key]?[data[f.key]]:[];
 submit.disabled=true;
 try{
  const item=await db.gravar(modulo,data,drawer.edicao);
  const novo=!drawer.edicao;
  fecharDrawer();
  if(modulo==="prefeituras")renderMunicipios();
  render();if(modulo==="bairros")window.dispatchEvent(new Event("gestao:bairros-atualizados"));toast("Cadastro salvo.");
  if(novo&&modulo==="prefeituras")geocodificarPrefeitura(item);
 }catch(err){$("form-error").textContent=err.message;}finally{submit.disabled=false;}
});
PAGE.addEventListener("click",async e=>{
 if(e.target.closest('[data-importar-tornado]')){try{if(db.tipo==="supabase")throw Error("Eventos demonstrativos não são enviados ao Supabase.");const reference=D.config.referencias(db.municipioAtivo()).eventoHistorico;
if(!reference||!globalThis[reference.adaptador])throw Error("Não há evento de referência configurado para esta prefeitura.");
globalThis[reference.adaptador].importar(db);render();toast('Evento histórico disponível no cadastro.');}catch(err){toast(err.message||'Não foi possível importar.');}return;}

 const novo=e.target.closest("[data-new]");
 const edit=e.target.closest("[data-edit]");
 const del=e.target.closest("[data-delete]");
 const canon=e.target.closest("[data-canon-edit]");
 const geoEdit=e.target.closest("[data-geo-edit]");
 if(canon){abrirDrawer(canon.dataset.id,canon.dataset.canonEdit);return;}
 if(geoEdit){abrirDrawer(geoEdit.dataset.geoEdit,geoEdit.dataset.geoModule||state.geoTipo);return;}
 if(novo){
  e.preventDefault();
  if(state.atual==="inicio")location.hash="#"+novo.dataset.new;
  else abrirDrawer(null,novo.dataset.new);
  return;
 }
 if(edit){abrirDrawer(edit.dataset.edit);return;}
 if(del){excluir(del.dataset.delete);return;}
});
window.addEventListener("gestao:referencia-territorial",e=>{
 const {modulo,source}=e.detail||{};
 if(state.atual!=="geoterritorialidade"||!["zonas","bairros"].includes(modulo)||!source)return;
 abrirDrawer(null,modulo,source);
});
$("drawer-close").onclick=fecharDrawer;
$("drawer-cancel").onclick=fecharDrawer;
DRAWER.addEventListener("click",e=>{if(e.target===DRAWER)fecharDrawer();});
document.addEventListener("keydown",e=>{
 if(DRAWER.hidden)return;
 if(e.key==="Escape"){e.preventDefault();fecharDrawer();}
 if(e.key==="Tab"){
  const items=[...DRAWER.querySelectorAll("button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])")].filter(x=>!x.closest("[hidden]"));
  if(!items.length)return;
  if(e.shiftKey&&document.activeElement===items[0]){e.preventDefault();items.at(-1).focus();}
  else if(!e.shiftKey&&document.activeElement===items.at(-1)){e.preventDefault();items[0].focus();}
 }
});
$("toggle-sidebar").onclick=()=>{
 const isMobile=window.matchMedia("(max-width:850px)").matches;
 if(isMobile){FRAME.classList.toggle("mobile-open");$("toggle-sidebar").setAttribute("aria-expanded",String(FRAME.classList.contains("mobile-open")));}
 else{FRAME.classList.toggle("collapsed");$("toggle-sidebar").setAttribute("aria-expanded",String(!FRAME.classList.contains("collapsed")));}
};
$("sidebar-scrim").onclick=()=>{FRAME.classList.remove("mobile-open");$("toggle-sidebar").setAttribute("aria-expanded","false");};
window.addEventListener("hashchange",()=>{state.pesquisa="";render();});
renderMunicipios();
const abrirMapa=$("abrir-mapa");
// A liberação operacional permanece explícita até a homologação do mapa municipal.
if(db.tipo!=='supabase'&&!D.config.referencias(db.municipioAtivo()).mapaDemonstrativo){
 abrirMapa.href="#";
 abrirMapa.title="Mapa de Evento deste município requer implantação operacional.";
 abrirMapa.setAttribute("aria-disabled","true");
 abrirMapa.addEventListener("click",e=>{e.preventDefault();toast("O Mapa de Evento desta Prefeitura ainda precisa ser configurado.");},true);
}
abrirMapa.addEventListener("click",e=>{
 if(window.matchMedia("(max-width:850px)").matches)return; // navegador móvel controla a janela
 e.preventDefault();
 const largura=Math.max(760,Math.min(1500,screen.availWidth-70));
 const altura=Math.max(550,Math.min(950,screen.availHeight-70));
 const esquerda=Math.max(0,Math.round((screen.availWidth-largura)/2));
 const topo=Math.max(0,Math.round((screen.availHeight-altura)/2));
 const win=window.open(abrirMapa.href,"AlertaMapaOperacional",
  "popup=yes,width="+largura+",height="+altura+",left="+esquerda+",top="+topo);
 if(win){try{win.opener=null;win.focus();}catch(_){}}
 else{const fallback=document.createElement("a");fallback.href=abrirMapa.href;fallback.target="_blank";fallback.rel="noopener noreferrer";document.body.appendChild(fallback);fallback.click();fallback.remove();}
});
if(!window.AlertaNuvem?.ativo&&globalThis.AlertaSessao&&globalThis.AlertaSessaoUI&&db.municipioAtivo()){
 try{
  const local=AlertaSessao.criar({municipioId:db.municipioAtivo().id});
  AlertaSessaoUI.criar({target:$("session-anchor"),sessao:local,municipio:db.municipioAtivo().nome,zonas:db.lista("zonas").map(x=>x.nome),aoMudar:()=>{}});
 }catch(error){$("session-anchor").textContent="Minha sessão";}
}
render();
void importarUnidadesCNES();
void importarBasesERiscosPublicos();
// Ao trocar para uma prefeitura nova, tentar localizar seu mapa automaticamente.
const prefeituraInicial=db.municipioAtivo();
// Georreferenciamento inicial exclusivo da Administração Geral.
})();
