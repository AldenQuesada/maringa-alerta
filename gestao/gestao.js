/* Área administrativa independente. A janela operacional original permanece intocada. */
(function () {
"use strict";
const {$}={ $: id => document.getElementById(id) };
const D=window.AlertaGestaoDados;
if(!D){document.getElementById("page").textContent="Não foi possível carregar os cadastros.";return;}
// Município recebido do Admin Geral fica fixo nesta aba (sessionStorage).
// Apenas isolamento de demonstração; autorizações reais exigem backend e RLS.
const CIDADE_DEMO=sessionStorage.getItem("alerta_contexto_municipal_demo_v1")||"maringa";
const db=D.criar(undefined,{municipioId:CIDADE_DEMO});
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
  chevron:'<path d="m9 18 6-6-6-6"/>'
};
const icon=(id,css="")=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" class="'+css+'" aria-hidden="true">'+(ICONS[id]||ICONS.list)+'</svg>';
const icons={territorio:"layers",implantacao:"pin",bairros:"layers",pessoas:"users",solicitacoes:"list",mobilizacoes:"bell",apoios:"building",inicio:"dashboard",prefeituras:"building",zonas:"layers",bases:"pin",riscos:"shield",administradores:"shield",responsaveis:"user",substitutos:"user",coordenadores:"users",operadores:"user",equipes:"wrench",integrantes:"users",voluntarios:"users",saude:"hospital",emergencias:"siren",parceiros:"building",veiculos:"truck",equipamentos:"wrench",estoques:"box",abrigos:"hospital",pontos:"pin",ocorrencias:"list",canais:"bell",regras:"shield"};
let atual="inicio",pesquisa="",edicao=null,ultimoFoco=null,toastTimer=null;
const cidadesPorUf=new Map();
const municipio=db.municipioAtivo();
function renderMunicipios(){
 const select=$("municipio-switch"),lista=db.municipios();
 select.innerHTML=lista.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nome)+" · "+esc(x.uf)+"</option>").join("");
 select.value=db.municipioAtivo()?.id||"";
 select.disabled=true;select.title="O município é atribuído pelo Admin Geral da plataforma.";
}
function renderNav(){
 NAV.innerHTML=D.GROUPS.map(g=>'<div class="nav-group"><div class="nav-group-title">'+esc(g.label)+'</div>'+
   g.items.map(id=>'<a class="nav-item'+((atual===id||(id==="territorio"&&PREF_SECTIONS.has(atual)))?" active":"")+'" href="#'+esc(id)+'" data-nav="'+esc(id)+'" aria-current="'+((atual===id||(id==="territorio"&&PREF_SECTIONS.has(atual)))?"page":"false")+'" title="'+esc(id==="inicio"?"Visão geral":D.ESQUEMAS[id].label)+'">'+icon(icons[id])+'<span class="nav-label">'+esc(id==="inicio"?"Visão geral":D.ESQUEMAS[id].label)+"</span></a>").join("")+"</div>").join("");
 NAV.querySelectorAll("[data-nav]").forEach(el=>el.onclick=()=>{
  FRAME.classList.remove("mobile-open");
  if(location.hash==="#"+el.dataset.nav) {pesquisa="";render();}
 });
}
function topo(titulo,subtitulo,acao){
 return '<div class="heading-row"><div><div class="eyebrow">'+esc(PREF_SECTIONS.has(atual)?"GESTÃO MUNICIPAL":db.municipioAtivo()?.nome||"Municípios")+'</div><h1 class="page-title">'+esc(titulo)+'</h1><p class="page-subtitle">'+esc(subtitulo)+'</p></div>'+
 (acao?'<div class="heading-actions"><button class="btn btn-primary" type="button" data-new="'+esc(acao)+'">'+icon("plus")+ 'Novo cadastro</button></div>':"")+"</div>";
}
function resumoCard(nome,valor,icone,nota){
 return '<div class="metric"><div class="metric-top">'+esc(nome)+icon(icone)+'</div><div class="metric-value">'+esc(valor)+'</div><div class="metric-foot">'+esc(nota)+'</div></div>';
}
function renderInicio(){
 const numero=tipo=>db.lista(tipo).length;
 const entradas=[
  ["Território municipal","Consultar limites, bairros, zonas e instalações do município provisionado.","territorio"],
  ["Zonas operacionais","Organizar a cobertura e vincular responsáveis.","zonas"],
  ["Pessoas e hierarquia","Vincular responsáveis, substitutos e operadores a órgãos e zonas.","pessoas"],
  ["Equipes e instituições","Organizar equipes, hospitais e serviços de emergência.","equipes"],
  ["Recursos e comunicação","Configurar equipamentos, abrigos e canais.","equipamentos"],
  ["Ajuda pós-evento","Gerenciar solicitações por zona.","solicitacoes"],
  ["Brigadas e prefeituras","Mobilizar zonas e solicitar apoio a outros municípios.","mobilizacoes"]
 ];
 PAGE.innerHTML=topo("Painel de gestão","Cadastros e recursos para organizar a atuação de cada prefeitura.")+
 '<div class="dashboard-grid">'+resumoCard("Bairros",numero("bairros"),"layers","Nesta prefeitura")+resumoCard("Zonas",numero("zonas"),"layers","Na prefeitura selecionada")+resumoCard("Equipes",numero("equipes"),"users","Recuperação e apoio")+resumoCard("Instituições",numero("saude")+numero("emergencias")+numero("parceiros"),"hospital","Serviços cadastrados")+'</div>'+
 '<div class="dash-layout"><section class="section-card"><header class="section-card-head"><h2>Organizar cadastros</h2></header><div class="section-card-body">'+
 entradas.map(([n,d,m])=>'<div class="overview-entry"><div><strong>'+esc(n)+'</strong><p>'+esc(d)+'</p></div><a class="mini-action" href="#'+m+'">Abrir '+icon("chevron")+'</a></div>').join("")+
 '</div></section><section class="section-card"><header class="section-card-head"><h2>Hierarquia municipal</h2></header><div class="section-card-body"><div class="hierarchy">'+
 '<div class="hierarchy-step"><strong>Prefeitura</strong><small>Administração municipal e território</small></div><div class="hierarchy-arrow">↓</div>'+
 '<div class="hierarchy-step"><strong>Responsáveis e coordenadores</strong><small>Zonas, substituições e equipes</small></div><div class="hierarchy-arrow">↓</div>'+
 '<div class="hierarchy-step"><strong>Equipes e instituições</strong><small>Recursos, contatos e capacidade operacional</small></div>'+
 '</div></div></section></div>';
 PAGE.innerHTML+='<section class="section-card crisis-links"><div class="section-card-body"><strong>Três mapas integrados</strong><p class="page-subtitle">O Mapa de Evento preserva a aplicação original. O Mapa de Colaboradores mostra as capacidades cadastradas; o Mapa da Ajuda mostra demandas pós-evento.</p><div class="heading-actions"><a class="btn" href="../index.html" target="_blank" rel="noopener">Mapa de Evento</a><a class="btn" href="../mapas/?tipo=colaboradores" target="_blank" rel="noopener">Mapa de Colaboradores</a><a class="btn" href="../mapas/?tipo=ajuda" target="_blank" rel="noopener">Mapa da Ajuda</a><a class="btn btn-primary" href="../atendimento/" target="_blank" rel="noopener">Testar atendimento WhatsApp</a></div></div></section>';
}
function tabelaLinhas(){
 if(atual==="inicio")return;
 const def=D.ESQUEMAS[atual],all=db.lista(atual);
 const list=all.filter(x=>Object.values(x).some(v=>(typeof v==="string"||Array.isArray(v))&&String(v).toLocaleLowerCase("pt-BR").includes(pesquisa.toLocaleLowerCase("pt-BR"))));
 const plural=list.length===1?"registro":"registros";
 const count=$("table-count");if(count)count.textContent=list.length+" "+plural;
 const tbody=$("table-body");if(!tbody)return;
 if(!list.length){
  tbody.innerHTML='<tr><td colspan="'+(def.columns.length+1)+'"><div class="empty-state">'+icon(icons[atual])+'<h3>'+(pesquisa?"Nenhum resultado":"Nenhum cadastro ainda")+'</h3><p>'+(pesquisa?"Altere os termos da busca.":"Adicione o primeiro registro para começar.")+'</p>'+""+'</div></td></tr>';
  return;
 }
 tbody.innerHTML=list.map(item=>'<tr>'+def.columns.map(c=>'<td>'+esc(c==="responsavel_id"?(db.lista("pessoas").find(p=>p.id===item[c])?.nome||"Não vinculado"):(item[c]===0?0:item[c]||"—"))+'</td>').join("")+
 '<td><div class="row-actions"><button class="row-action" type="button" data-edit="'+esc(item.id)+'" title="Editar">Editar</button><button class="row-action danger" type="button" data-delete="'+esc(item.id)+'" title="Excluir">Excluir</button></div></td></tr>').join("");
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
const PREF_TABS=[["territorio","Gerais"],["bairros","Bairros"],["zonas","Zonas"],["estruturas","Estruturas"],["pessoas","Gabinete de Crise"],["bases","Bases"],["riscos","Riscos"]];
const STRUCT_MODULES=[["saude","Saúde"],["emergencias","Emergência e segurança"],["parceiros","Órgãos e concessionárias"]];
const PREF_SECTIONS=new Set([...PREF_TABS.map(x=>x[0]),...STRUCT_MODULES.map(x=>x[0])]);
function renderPrefTabs(){
 const active=STRUCT_MODULES.some(x=>x[0]===atual)?"estruturas":atual;
 const html='<nav class="pref-tabs" aria-label="Etapas da gestão da Prefeitura">'+PREF_TABS.map(([id,label],i)=>'<a class="pref-tab'+(id===active?' active':'')+'" href="#'+id+'"'+(id===active?' aria-current="page"':'')+'><small>'+String(i+1).padStart(2,"0")+'</small>'+esc(label)+'</a>').join("")+'</nav>';
 const heading=PAGE.querySelector(".heading-row,.mi-head");if(heading)heading.insertAdjacentHTML("afterend",html);else PAGE.insertAdjacentHTML("afterbegin",html);
 const nav=PAGE.querySelector(".pref-tabs"),body=document.createElement("div");body.className="pref-tab-body";
 while(nav.nextSibling)body.appendChild(nav.nextSibling);PAGE.appendChild(body);
 PAGE.closest(".content")?.scrollTo(0,0);
}
function structures(){return STRUCT_MODULES.flatMap(([m])=>db.lista(m));}
function responsible(x,people){return people.find(p=>p.id===x.responsavel_id)||people.find(p=>p.estrutura_id===x.id)||null;}
function renderTerritorioMunicipal(){
 const p=db.municipioAtivo();if(!p){PAGE.innerHTML=topo("Município indisponível","Prefeitura ainda não provisionada pelo Admin Geral.");return;}
 const orgs=structures(),people=db.lista("pessoas").filter(x=>x.estrutura_id||orgs.some(o=>o.responsavel_id===x.id)||["admin","responsavel","substituto","coordenador"].includes(x.funcao));
 const fields=[["Município",p.nome],["Estado",p.estado||p.uf],["Código IBGE",p.codigo_ibge],["Situação",p.status||"Em implantação"],["Contato institucional",p.responsavel],["Telefone",p.telefone],["E-mail institucional",p.email||p.admin_municipal_email],["Origem do cadastro",p.origem_provisionamento],["Georreferenciamento",p.fonte_geo]];
 PAGE.innerHTML=topo("Gerais","Dados institucionais e composição do Gabinete de Crise.")+
 '<section class="section-card"><header class="section-card-head"><h2>Dados da Prefeitura</h2><span class="pref-note">Cadastro do Admin Geral · somente leitura</span></header><div class="section-card-body"><dl class="pref-details">'+fields.map(([k,v])=>'<div><dt>'+esc(k)+'</dt><dd>'+esc(v||"Não informado")+'</dd></div>').join("")+'</dl></div></section>'+
 '<section class="section-card"><header class="section-card-head"><h2>Membros do Gabinete de Crise</h2><a class="mini-action" href="#pessoas">Gerenciar membros</a></header><div class="section-card-body">'+
 (people.length?'<div class="pref-member-grid">'+people.map(x=>{
 const org=orgs.find(o=>o.id===x.estrutura_id||o.responsavel_id===x.id)||orgs.find(o=>x.orgao&&o.nome===x.orgao);
 return '<div class="pref-member"><strong>'+esc(x.nome)+'</strong><span>'+esc(x.cargo||x.funcao||"Função pendente")+'</span><small>'+esc(org?.nome||x.orgao||"Estrutura ainda não vinculada")+'</small></div>';
 }).join("")+'</div>':'<p class="pref-note">Nenhum membro cadastrado. Adicione as pessoas e vincule seus órgãos ou estruturas.</p>')+
 '</div></section>';
}
function renderEstruturas(){
 const people=db.lista("pessoas");
 PAGE.innerHTML=topo("Estruturas do Gabinete de Crise","Cada órgão tem seu próprio registro e representante vinculado ao cadastro único de pessoas.")+
 STRUCT_MODULES.map(([module,label])=>{
  const records=db.lista(module);
  return '<section class="section-card"><header class="section-card-head"><h2>'+esc(label)+'</h2><a class="mini-action" href="#'+module+'">Cadastrar e editar</a></header><div class="section-card-body">'+
  (records.length?records.map(x=>'<div class="overview-entry"><div><strong>'+esc(x.nome)+'</strong><p>Representante: '+esc(responsible(x,people)?.nome||"Não atribuído")+'</p></div></div>').join(""):'<p class="pref-note">Nenhuma estrutura cadastrada.</p>')+
  '</div></section>';
 }).join("");
}
function renderModulo(){
 const d=D.ESQUEMAS[atual];
 if(atual==="bairros"){
  PAGE.innerHTML=topo("Bairros","Inventário territorial e vínculos com as zonas operacionais. Utilize Novo cadastro para incluir um bairro.","bairros");
  return; // O catálogo de bairros é o único inventário visível, montado pelo adaptador territorial existente.
 }
 PAGE.innerHTML=topo(d.label,d.summary,atual)+
 '<section class="table-shell"><div class="table-toolbar"><label class="search-field">'+icon("search")+'<input id="table-search" type="search" placeholder="Buscar cadastro" aria-label="Buscar cadastros" autocomplete="off"></label><span id="table-count" class="table-count"></span></div>'+
 '<div class="table-scroll"><table><thead><tr>'+d.columns.map(c=>'<th scope="col">'+esc(d.fields.find(f=>f.key===c)?.label||c)+'</th>').join("")+'<th scope="col" style="text-align:right">Ações</th></tr></thead><tbody id="table-body"></tbody></table></div></section>'+
 (atual==="prefeituras"?'<div class="prefecture-layout"><section class="section-card"><header class="section-card-head"><h2>Prefeitura selecionada</h2></header><div class="section-card-body"><div class="hierarchy">'+
 '<div class="hierarchy-step"><strong>'+esc(db.municipioAtivo()?.nome||"—")+'</strong><small>'+esc(db.municipioAtivo()?.uf||"")+' · Código IBGE '+esc(db.municipioAtivo()?.codigo_ibge||"—")+'</small></div>'+
 '<div class="hierarchy-step"><strong>Território e instituições</strong><small>As zonas e cadastros desta prefeitura ficam no menu esquerdo.</small></div></div></div></section>'+mapaPreview()+'</div>':"");
 if(atual==="prefeituras")PAGE.insertAdjacentHTML("beforeend",'<section class="section-card"><div class="section-card-body"><strong>Implantação georreferenciada de Maringá</strong><p class="page-subtitle">No fluxo único é possível conferir IBGE, CNES, bairros, zonas, unidades, pontos críticos e órgãos do gabinete de crise.</p><a class="btn btn-primary" href="#implantacao">Abrir implantação única</a></div></section>');
 const search=$("table-search");search.value=pesquisa;search.oninput=e=>{pesquisa=e.target.value;tabelaLinhas();};
 tabelaLinhas();
}
function render(){
 if(db.municipioAtivo()?.status==="suspensa"){
  PAGE.innerHTML=topo("Município suspenso","O Admin Geral suspendeu este ambiente de demonstração. A gestão municipal não pode operar até reativação.");
  return;
 }
 const hash=decodeURIComponent(location.hash.replace(/^#/,""))||"inicio";
 const adjusted=hash==="prefeituras"||hash==="implantacao"?"territorio":hash;
 const proximo=adjusted==="inicio"||adjusted==="estruturas"||Object.hasOwn(D.ESQUEMAS,adjusted)?adjusted:"inicio";
 if(proximo!==atual)pesquisa="";
 atual=proximo;
 document.title=(atual==="inicio"?"Gestão":atual==="estruturas"?"Estruturas":D.ESQUEMAS[atual].label)+" | Maringá Alerta";
 renderNav();
 if(atual==="inicio")renderInicio();
 else if(atual==="territorio")renderTerritorioMunicipal();
 else if(atual==="pessoas"){
  if(globalThis.AlertaImplantacaoUI)AlertaImplantacaoUI.montar({page:PAGE,db,mode:atual,toast});
  else PAGE.innerHTML=topo("Implantação indisponível","Não foi possível carregar o módulo territorial.");
 }
 else if(atual==="estruturas")renderEstruturas();
 else renderModulo();
 if(PREF_SECTIONS.has(atual))renderPrefTabs();
}
function campoHTML(f,valor){
 const id="field-"+f.key,v=esc(valor??""),required=f.required?' required':"";
 const label='<label for="'+id+'">'+esc(f.label)+(f.required?' <span class="required">*</span>':"")+'</label>';
 if(f.type==="hidden")return '<input type="hidden" id="'+id+'" name="'+esc(f.key)+'" value="'+v+'">';
 if(f.type==="multi"){const current=Array.isArray(valor)?valor:String(valor||"").split(";").map(x=>x.trim()).filter(Boolean);
 return '<fieldset class="field multi-field"><legend>'+esc(f.label)+'</legend><div class="multi-choices">'+(f.options||[]).map(opt=>'<label class="multi-option"><input type="checkbox" name="'+esc(f.key)+'" value="'+esc(opt)+'"'+(current.includes(opt)?' checked':'')+'/><span>'+esc(opt)+'</span></label>').join("")+'</div></fieldset>';}
 if(f.type==="textarea")return '<div class="field">'+label+'<textarea id="'+id+'" name="'+esc(f.key)+'"'+required+'>'+v+'</textarea></div>';
 if(f.type==="select"||f.type==="uf"||f.type==="zone"||f.type==="team"||f.type==="person"||f.type==="structure"){
  const options=f.type==="uf"?D.UFS:f.type==="zone"?db.lista("zonas").map(x=>x.nome):f.type==="team"?db.lista("equipes").map(x=>x.nome):f.type==="person"?db.lista("pessoas").map(x=>({id:x.id,nome:x.nome})):f.type==="structure"?structures().map(x=>({id:x.id,nome:x.nome})):f.options||[];
  return '<div class="field">'+label+'<select id="'+id+'" name="'+esc(f.key)+'"'+required+'><option value="">Selecionar</option>'+options.map(o=>'<option value="'+esc(o.id??o)+'"'+(String(o.id??o)===String(valor)?" selected":"")+'>'+esc(o.nome??o)+'</option>').join("")+'</select></div>';
 }
 const type=f.type==="number"?"number":f.type==="date"?"date":f.type==="tel"?"tel":f.type==="email"?"email":"text";
 const attr=type==="number"?' min="0" step="any"':"";
 const list=f.type==="city"?' list="ibge-cidades" autocomplete="off"':"";
 return '<div class="field">'+label+'<input id="'+id+'" name="'+esc(f.key)+'" type="'+type+'" value="'+v+'"'+required+attr+list+'></div>';
}
function abrirDrawer(id=null){
 if(atual==="inicio")return;
 const def=D.ESQUEMAS[atual];
 const item=id?db.registro(atual,id):null;
 if(id&&!item)return;
 edicao=id;
 ultimoFoco=document.activeElement;
 $("drawer-eyebrow").textContent=def.label;
 $("drawer-title").textContent=(id?"Editar ":"Novo cadastro · ")+def.singular;
 $("cadastro-campos").innerHTML=def.fields.map(f=>campoHTML(f,item?.[f.key])).join("")+(atual==="prefeituras"?'<datalist id="ibge-cidades"></datalist>':"");
 const bairro=$("field-bairro");
 if(bairro&&(atual==="pessoas"||atual==="voluntarios")){
  bairro.required=true;
  bairro.setAttribute("list","bairros-origem");
  const lista=document.createElement("datalist");
  lista.id="bairros-origem";
  const nomes=new Set(db.lista("bairros").map(x=>x.nome));
  const preencher=()=>{lista.replaceChildren(...[...nomes].sort((a,b)=>a.localeCompare(b,"pt-BR")).map(nome=>new Option(nome)));};
  bairro.after(lista);
  preencher();
  if(db.municipioAtivo()?.id==="maringa"&&globalThis.MaringaBairros){
   MaringaBairros.carregar().then(({bairros})=>{
    bairros.features.forEach(f=>nomes.add(f.properties.nome));
    preencher();
   }).catch(()=>{});
  }
 }
 $("form-error").textContent="";
 DRAWER.hidden=false;
 if(atual==="prefeituras"){
  $("field-uf").addEventListener("change",()=>{ $("field-nome").value="";$("field-codigo_ibge").value="";carregarIBGE($("field-uf").value); });
  $("field-nome").addEventListener("change",()=>atualizarCodigoIBGE());
  if($("field-uf").value)carregarIBGE($("field-uf").value);
 }
 $("cadastro-campos").querySelector("input,select,textarea")?.focus();
}
function fecharDrawer(){
 DRAWER.hidden=true;edicao=null;
 const foco=ultimoFoco;ultimoFoco=null;
 if(foco?.isConnected&&foco.focus)foco.focus({preventScroll:true});
}
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
  db.atualizarGeo(item.id,geo);
  if(atual==="prefeituras")renderModulo();
 }catch(_){/* O cadastro permanece salvo mesmo sem geocodificação externa. */}
}
function toast(msg){
 const el=$("toast");el.textContent=msg;el.hidden=false;
 if(toastTimer)clearTimeout(toastTimer);
 toastTimer=setTimeout(()=>{el.hidden=true;},2800);
}
function excluir(id){
 const item=db.registro(atual,id);if(!item)return;
 const label=item.nome||item.identificacao||"este registro";
 if(!confirm('Excluir "'+label+'"?'))return;
 try{const anterior=db.municipioAtivo()?.id;db.excluir(atual,id);if(atual==="prefeituras"){renderMunicipios();if(anterior!==db.municipioAtivo()?.id){location.reload();return;}}render();if(atual==="bairros")window.dispatchEvent(new Event("gestao:bairros-atualizados"));toast("Cadastro excluído.");}catch(e){toast(e.message);}
}
FORM.addEventListener("submit",e=>{
 e.preventDefault();const modulo=atual;
 const data={};
 for(const [k,v] of new FormData(FORM).entries()){if(Object.hasOwn(data,k))data[k]=[].concat(data[k],v);else data[k]=v;}
 for(const f of D.ESQUEMAS[modulo].fields)if(f.type==="multi")data[f.key]=Array.isArray(data[f.key])?data[f.key]:data[f.key]?[data[f.key]]:[];
 try{
  const item=db.gravar(modulo,data,edicao);
  const novo=!edicao;
  fecharDrawer();
  if(modulo==="prefeituras")renderMunicipios();
  render();if(modulo==="bairros")window.dispatchEvent(new Event("gestao:bairros-atualizados"));toast("Cadastro salvo.");
  if(novo&&modulo==="prefeituras")geocodificarPrefeitura(item);
 }catch(err){$("form-error").textContent=err.message;}
});
PAGE.addEventListener("click",e=>{
 const novo=e.target.closest("[data-new]"),edit=e.target.closest("[data-edit]"),del=e.target.closest("[data-delete]");
 if(novo){e.preventDefault();if(atual==="inicio")location.hash="#"+novo.dataset.new;else abrirDrawer();return;}
 if(edit){abrirDrawer(edit.dataset.edit);return;}
 if(del){excluir(del.dataset.delete);return;}
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
window.addEventListener("hashchange",()=>{pesquisa="";render();});
renderMunicipios();
const abrirMapa=$("abrir-mapa");
// O Mapa de Evento original contém apenas simulação de Maringá;
// não mostrar ocorrências de Maringá a uma Prefeitura recém-provisionada.
if(db.municipioAtivo()?.id!=="maringa"){
 abrirMapa.href="#";
 abrirMapa.title="Mapa de Evento deste município requer implantação operacional.";
 abrirMapa.setAttribute("aria-disabled","true");
 abrirMapa.addEventListener("click",e=>{e.preventDefault();toast("O Mapa de Evento desta Prefeitura ainda precisa ser configurado. Não serão mostradas ocorrências de Maringá.");},true);
}
abrirMapa.addEventListener("click",e=>{
 if(window.matchMedia("(max-width:850px)").matches)return; // navegador móvel controla a janela
 e.preventDefault();
 const largura=Math.max(760,Math.min(1500,screen.availWidth-70));
 const altura=Math.max(550,Math.min(950,screen.availHeight-70));
 const esquerda=Math.max(0,Math.round((screen.availWidth-largura)/2));
 const topo=Math.max(0,Math.round((screen.availHeight-altura)/2));
 const win=window.open(abrirMapa.href,"MaringaAlertaMapaOperacional",
  "popup=yes,width="+largura+",height="+altura+",left="+esquerda+",top="+topo);
 if(win){try{win.opener=null;win.focus();}catch(_){}}
 else{const fallback=document.createElement("a");fallback.href=abrirMapa.href;fallback.target="_blank";fallback.rel="noopener noreferrer";document.body.appendChild(fallback);fallback.click();fallback.remove();}
});
if(globalThis.AlertaSessao&&globalThis.AlertaSessaoUI&&db.municipioAtivo()){
 try{
  const local=AlertaSessao.criar({municipioId:db.municipioAtivo().id});
  AlertaSessaoUI.criar({target:$("session-anchor"),sessao:local,municipio:db.municipioAtivo().nome,zonas:db.lista("zonas").map(x=>x.nome),aoMudar:()=>{}});
 }catch(error){$("session-anchor").textContent="Minha sessão";}
}
render();
// Ao trocar para uma prefeitura nova, tentar localizar seu mapa automaticamente.
const prefeituraInicial=db.municipioAtivo();
// Georreferenciamento inicial exclusivo da Administração Geral.
})();
