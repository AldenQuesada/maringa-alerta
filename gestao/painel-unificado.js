/* Painel de gestão simplificado: uma ficha de prefeitura, colaboradores via WhatsApp,
 * três mapas standalone. Preserva todos os dados locais e a UI do mapa original. */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const D=globalThis.AlertaGestaoDados;
if(!D){$("page").textContent="Falha ao carregar os dados de gestão.";return;}
const db=D.criar();
const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const name=x=>String(x?.nome||x?.identificacao||x?.titulo||x?.tipo||"Registro").trim();
const titles={inicio:"Visão geral",prefeituras:"Prefeituras",colaboradores:"Colaboradores",solicitacoes:"Pedidos de ajuda",mobilizacoes:"Mobilização"};
const links={
 evento:{label:"Mapa de Evento",url:"../index.html"},
 colaboradores:{label:"Mapa de Colaboradores",url:"../mapas/?tipo=colaboradores"},
 ajuda:{label:"Mapa da Ajuda",url:"../mapas/?tipo=ajuda"}
};
const sections=[
 {title:"Território e cobertura",hint:"Zonas, bases de apoio e áreas de risco.",keys:["zonas","bases","riscos"]},
 {title:"Responsáveis e hierarquia",hint:"Um único cadastro para administradores, responsáveis, substitutos, coordenadores e operadores.",keys:["usuarios"]},
 {title:"Equipes municipais",hint:"Equipes, brigadas, integrantes e capacidades.",keys:["equipes","integrantes"]},
 {title:"Instituições e serviços",hint:"Saúde, Defesa Civil, Bombeiros, Polícias, concessionárias e parceiros.",keys:["instituicoes"]},
 {title:"Recursos e infraestrutura",hint:"Veículos, equipamentos, estoques, abrigos e pontos críticos.",keys:["veiculos","equipamentos","estoques","abrigos","pontos"]},
 {title:"Configurações operacionais",hint:"Tipos de ocorrência, canais institucionais e regras automáticas.",keys:["ocorrenciaTipos","canais","regras"]}
];
const catalog={
 zonas:{label:"Zonas",fields:[["nome","Nome da zona","text",true],["tipo","Tipo","select",false,["Urbana","Rural","Mista","Outra"]],["responsavel","Responsável regional"],["observacoes","Observações","textarea"]]},
 bases:{label:"Bases de apoio",schema:"bases"},
 riscos:{label:"Áreas de risco",schema:"riscos"},
 usuarios:{label:"Equipe de gestão",fields:[["nome","Nome e sobrenome","text",true],["funcao","Papel","select",true,["admin","responsavel","substituto","coordenador","operador"]],["zona","Zona"],["cargo","Cargo"],["especialidade","Especialidade"],["telefone","Telefone","tel"],["email","E-mail","email"]]},
 equipes:{label:"Equipes e brigadas",schema:"equipes"},
 integrantes:{label:"Integrantes de equipes",schema:"integrantes"},
 instituicoes:{label:"Órgãos e instituições",fields:[["nome","Nome oficial","text",true],["categoria","Categoria","select",true,["Saúde","Emergência","Parceiros"]],["tipo","Tipo"],["endereco","Endereço"],["telefone","Telefone","tel"],["email","E-mail","email"],["codigo_cnes","Código CNES"],["area","Área de atuação"],["servicos","Serviços e capacidade","textarea"]]},
 veiculos:{label:"Veículos",schema:"veiculos"},
 equipamentos:{label:"Equipamentos",schema:"equipamentos"},
 estoques:{label:"Estoques",schema:"estoques"},
 abrigos:{label:"Abrigos",schema:"abrigos"},
 pontos:{label:"Pontos críticos",schema:"pontos"},
 ocorrenciaTipos:{label:"Tipos de ocorrência",schema:"ocorrencias"},
 canais:{label:"Canais",schema:"canais"},
 regras:{label:"Regras de acionamento",schema:"regras"}
};
function camposDaColecao(k){
 const config=catalog[k];
 if(config.fields)return config.fields;
 const def=D.ESQUEMAS[config.schema];
 return def.fields.filter(f=>f.type!=="hidden").map(f=>[f.key,f.label,f.type==="zone"||f.type==="team"?"text":f.type,!!f.required,f.options]);
}
const nav=[{title:"Gestão",items:["inicio","prefeituras"]},{title:"Atendimento",items:["colaboradores","solicitacoes"]},{title:"Coordenação",items:["mobilizacoes"]}];
let page="inicio",draft=null,editingId=null,activeEditor=null,openSections=new Set(),dirty=false,search="",toastTimer;
const ibgeUF=new Map();
function toast(message){const el=$("toast");el.textContent=message;el.hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.hidden=true,3500);}
function noScroll(){document.getElementById("main").scrollTo({top:0,behavior:"instant"});}
function pageHeading(title,desc,actions=""){
 return '<div class="heading-row"><div><div class="eyebrow">'+esc(db.municipioAtivo()?.nome||"Maringá Alerta")+'</div><h1 class="page-title">'+esc(title)+'</h1><p class="page-subtitle">'+esc(desc)+'</p></div><div class="heading-actions">'+actions+'</div></div>';
}
function btn(label,action,primary=false){
 return '<button type="button" class="btn '+(primary?"btn-primary":"btn-quiet")+'" data-action="'+action+'">'+label+'</button>';
}
function renderMunSwitch(){
 const select=$("municipio-switch");
 select.innerHTML=db.municipios().map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nome)+" · "+esc(x.uf)+"</option>").join("");
 select.value=db.municipioAtivo()?.id||"";
 select.onchange=()=>{if(draft&&dirty&&!confirm("Descartar mudanças não salvas na prefeitura?")){select.value=db.municipioAtivo()?.id||"";return;}db.selecionarMunicipio(select.value);draft=null;editingId=null;dirty=false;location.reload();};
}
function renderNav(){
 $("sidebar-nav").innerHTML=nav.map(g=>'<section class="nav-group"><h2 class="nav-group-title">'+g.title+'</h2>'+g.items.map(k=>'<a class="nav-item'+(page===k?" active":"")+'" href="#'+k+'" data-navigation="'+k+'" aria-current="'+(page===k?"page":"false")+'"><span class="nav-letter" aria-hidden="true">'+esc(titles[k].slice(0,1))+'</span><span class="nav-label">'+esc(titles[k])+'</span></a>').join("")+'</section>').join("");
}
function renderInicio(){
 const prefeitura=db.municipioAtivo();
 const grupos=db.estado();
 const cs=db.lista("voluntarios"),pedidos=db.lista("solicitacoes");
 const buttons='<a class="btn btn-primary" href="#prefeituras">Gerenciar Prefeitura</a>';
 $("page").innerHTML=pageHeading("Painel de gestão","Uma estrutura municipal, todos os recursos associados e as pessoas que chegam pelo WhatsApp.",buttons)+
 '<div class="dashboard-grid">'+[
 ["Prefeituras",db.municipios().length],["Zonas",db.lista("zonas").length],["Colaboradores",cs.length],["Pedidos de ajuda",pedidos.length]
 ].map(([label,num])=>'<div class="metric"><div class="metric-top">'+esc(label)+'</div><div class="metric-value">'+num+'</div></div>').join("")+'</div>'+
 '<div class="dash-layout"><section class="section-card"><header class="section-card-head"><h2>Gestão da Prefeitura</h2></header><div class="section-card-body"><p class="page-subtitle">Cadastre uma Prefeitura uma única vez. Dentro da ficha ficam zonas, responsáveis, substitutos, coordenadores, brigadas, instituições, veículos, equipamentos e regras.</p>'+
 '<div class="panel-actions"><a class="btn btn-primary" href="#prefeituras">Abrir ficha municipal</a></div></div></section>'+
 '<section class="section-card"><header class="section-card-head"><h2>Atendimento pelo WhatsApp</h2></header><div class="section-card-body"><p class="page-subtitle">Colaboradores e pessoas afetadas entram pelo atendimento Maringá Unida. Aqui apenas consultamos os cadastros recebidos.</p>'+
 '<div class="panel-actions"><a class="btn" href="../atendimento/" target="_blank" rel="noopener noreferrer">Testar fluxo de atendimento</a></div></div></section></div>';
}
function renderPrefeituras(){
 if(draft){renderFicha();return;}
 const items=db.municipios();
 $("page").innerHTML=pageHeading("Prefeituras","Um cadastro por município. Abra a ficha para configurar e editar toda a estrutura interna.",btn("+ Nova Prefeitura","new-prefeitura",true))+
 '<section class="section-card"><header class="section-card-head"><h2>Municípios cadastrados</h2></header><div class="section-card-body"><div class="prefeitura-cards">'+
 items.map(p=>'<div class="prefeitura-row"><div><strong>'+esc(p.nome)+" / "+esc(p.uf)+'</strong><div class="muted-meta">IBGE '+esc(p.codigo_ibge)+' · '+db.estado().zonas.filter(x=>x.municipioId===p.id).length+' zonas · '+db.estado().usuarios.filter(x=>x.municipioId===p.id).length+' responsáveis e equipe de gestão</div></div><button class="btn btn-primary" type="button" data-prefeitura="'+esc(p.id)+'">Editar Prefeitura</button></div>').join("")+
 '</div></div></section>';
}
function fieldHTML(key,label,type,value,required=false,options=null,prefix="field"){
 const id=prefix+"-"+key;const req=required?" required":"";const val=esc(value??"");
 const heading='<label for="'+esc(id)+'">'+esc(label)+(required?' <span class="required">*</span>':"")+'</label>';
 if(type==="textarea")return '<div class="field">'+heading+'<textarea id="'+esc(id)+'" name="'+esc(key)+'"'+req+'>'+val+'</textarea></div>';
 if(type==="select"||type==="uf"){
  const choices=type==="uf"?D.UFS:options||[];
  return '<div class="field">'+heading+'<select id="'+esc(id)+'" name="'+esc(key)+'"'+req+'><option value="">Selecionar</option>'+choices.map(x=>'<option value="'+esc(x)+'"'+(String(x)===String(value)?" selected":"")+'>'+esc(x)+"</option>").join("")+'</select></div>';
 }
 const textType=["tel","email","number","date"].includes(type)?type:"text";
 const list=key==="nome"&&prefix==="pref"?' list="municipios-ibge"':"";
 return '<div class="field">'+heading+'<input id="'+esc(id)+'" name="'+esc(key)+'" type="'+textType+'" value="'+val+'"'+req+list+'></div>';
}
function salvarCamposPrefeitura(){
 if(!draft||!$("pref-form"))return;
 for(const key of ["uf","nome","codigo_ibge","responsavel","telefone","email"]){
  const input=$("pref-"+key);
  if(input)draft.prefeitura[key]=input.value;
 }
}
function dadosDaLinha(k,id){return draft?.grupos?.[k]?.find(x=>String(x.id)===String(id))||null;}
function formularioLinha(k,id=null){
 const specs=camposDaColecao(k),row=id?dadosDaLinha(k,id):null;
 return '<div class="subeditor" data-subeditor="'+k+'"><h4>'+(id?"Editar ":"Adicionar ")+esc(catalog[k].label)+'</h4>'+
 '<div class="subfields">'+specs.map(([field,label,type,required,options])=>fieldHTML(field,label,type,row?.[field],required,options,"sub")).join("")+'</div>'+
 '<div class="inline-actions"><button type="button" class="btn btn-primary" data-save-row="'+k+'" data-row-id="'+esc(id||"")+'">Adicionar à ficha</button><button type="button" class="btn btn-quiet" data-cancel-row="1">Cancelar</button></div></div>';
}
function resumoLinha(k,row){
 const primario=name(row);
 let meta="";
 if(k==="usuarios")meta=({admin:"Administrador",responsavel:"Responsável regional",substituto:"Substituto",coordenador:"Coordenador",operador:"Operador"})[row.funcao]||row.funcao||"Função não indicada";
 else if(k==="instituicoes")meta=[row.categoria,row.tipo].filter(Boolean).join(" · ");
 else meta=[row.tipo,row.zona,row.categoria].filter(Boolean).join(" · ");
 return '<div class="subrow"><div><strong>'+esc(primario)+'</strong><span>'+esc(meta)+'</span></div><div class="subrow-actions"><button type="button" data-edit-row="'+k+'" data-row-id="'+esc(row.id)+'">Editar</button><button type="button" data-remove-row="'+k+'" data-row-id="'+esc(row.id)+'">Retirar</button></div></div>';
}
function secaoHTML(sec,index){
 const open=openSections.has(index)||(!editingId&&index===0);
 return '<details class="municipal-section" data-section="'+index+'"'+(open?" open":"")+'><summary><span><strong>'+esc(sec.title)+'</strong><small>'+esc(sec.hint)+'</small></span><span class="section-count">'+sec.keys.reduce((v,k)=>v+(draft.grupos[k]?.length||0),0)+' registros</span></summary>'+
 '<div class="municipal-section-body">'+sec.keys.map(k=>{
   const rows=draft.grupos[k]||[];
   return '<div class="subcollection"><header class="subcollection-head"><strong>'+esc(catalog[k].label)+'</strong><button type="button" class="btn-mini" data-add-row="'+k+'">+ Adicionar</button></header>'+
   (rows.length?rows.map(row=>resumoLinha(k,row)).join(""):'<p class="empty-mini">Nenhum registro nesta seção.</p>')+
   (activeEditor?.key===k?formularioLinha(k,activeEditor.id):"")+'</div>';
 }).join("")+'</div></details>';
}
function renderFicha(){
 const p=draft.prefeitura,id=editingId,estado=id?"Editar Prefeitura":"Nova Prefeitura";
 $("page").innerHTML=pageHeading(estado,"Todos os dados municipais ficam nesta única ficha. Você pode adicionar itens em cada seção e salvar tudo ao final.")+
 '<form id="pref-form" novalidate><section class="section-card"><header class="section-card-head"><h2>Identificação do município</h2></header><div class="section-card-body"><div class="municipal-fields">'+
 fieldHTML("uf","UF","uf",p.uf,true,null,"pref")+
 fieldHTML("nome","Município","text",p.nome,true,null,"pref")+
 fieldHTML("codigo_ibge","Código IBGE","text",p.codigo_ibge,true,null,"pref")+
 fieldHTML("responsavel","Contato institucional","text",p.responsavel,false,null,"pref")+
 fieldHTML("telefone","Telefone institucional","tel",p.telefone,false,null,"pref")+
 fieldHTML("email","E-mail institucional","email",p.email,false,null,"pref")+
 '</div><datalist id="municipios-ibge"></datalist></div></section>'+
 '<div class="sections-label">ESTRUTURA DA PREFEITURA <span class="muted-meta">Abra cada seção para cadastrar ou editar.</span></div>'+
 sections.map((sec,i)=>secaoHTML(sec,i)).join("")+
 '<div class="sticky-actions"><span>'+(!editingId?"Novo cadastro":"Alterações nesta Prefeitura")+ (dirty?" · alterações não salvas":"")+'</span>'+
 '<button type="button" class="btn btn-quiet" data-action="cancel-prefeitura">Cancelar</button>'+
 '<button type="submit" class="btn btn-primary">Salvar Prefeitura</button></div></form>';
 $("pref-form").addEventListener("submit",salvarFicha);
 $("pref-form").addEventListener("input",()=>{dirty=true;});
 const uf=$("pref-uf"),nome=$("pref-nome");
 uf.addEventListener("change",()=>{salvarCamposPrefeitura();nome.value="";$("pref-codigo_ibge").value="";draft.prefeitura.nome="";draft.prefeitura.codigo_ibge="";carregarIBGE(uf.value);});
 nome.addEventListener("change",()=>resolverIBGE());
 if(uf.value)carregarIBGE(uf.value);
 for(const detail of document.querySelectorAll(".municipal-section")){
  detail.addEventListener("toggle",()=>{
   const i=Number(detail.dataset.section);
   if(detail.open)openSections.add(i);else openSections.delete(i);
  });
 }
}
async function carregarIBGE(uf){
 if(!D.UFS.includes(uf))return;
 try{
  let cidades=ibgeUF.get(uf);
  if(!cidades){
   const r=await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados/"+encodeURIComponent(uf)+"/municipios",{cache:"force-cache"});
   if(!r.ok)return;
   cidades=await r.json();ibgeUF.set(uf,cidades);
  }
  if(!$("pref-uf")||$("pref-uf").value!==uf)return;
  $("municipios-ibge").innerHTML=cidades.map(x=>'<option value="'+esc(x.nome)+'"></option>').join("");
  resolverIBGE();
 }catch(_){/* Permitir preenchimento manual quando o IBGE não responder. */}
}
function resolverIBGE(){
 const uf=$("pref-uf")?.value,nome=$("pref-nome")?.value?.trim(),codigo=$("pref-codigo_ibge");
 if(!nome||!uf||!codigo)return;
 const norm=x=>String(x).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 const achou=(ibgeUF.get(uf)||[]).find(x=>norm(x.nome)===norm(nome));
 if(achou){codigo.value=String(achou.id);draft.prefeitura.codigo_ibge=String(achou.id);}
}
function novoCadastro(){
 draft=db.fichaPrefeitura();editingId=null;activeEditor=null;openSections=new Set();dirty=false;
 renderFicha();noScroll();
}
function editarPrefeitura(id){
 draft=db.fichaPrefeitura(id);editingId=id;activeEditor=null;openSections=new Set();dirty=false;
 renderFicha();noScroll();
}
function cancelarFicha(){
 if(dirty&&!confirm("Descartar as alterações não salvas?"))return;
 draft=null;editingId=null;activeEditor=null;dirty=false;render();
}
function adicionarLinha(k,id=null){
 salvarCamposPrefeitura();dirty=true;activeEditor={key:k,id};
 const sec=sections.findIndex(s=>s.keys.includes(k));openSections.add(sec);
 renderFicha();
 const el=document.querySelector('[data-subeditor="'+k+'"]');el?.scrollIntoView({block:"nearest"});
 el?.querySelector("input,select,textarea")?.focus();
}
function guardarLinha(k,id){
 const el=document.querySelector('[data-subeditor="'+k+'"]');if(!el)return;
 const values={},specs=camposDaColecao(k);
 for(const [field,label,type,required] of specs){
  const input=el.querySelector('[name="'+CSS.escape(field)+'"]');
  values[field]=input?.value?.trim()||"";
  if(required&&!values[field]){toast("Preencha: "+label);input?.focus();return;}
 }
 const current=id?dadosDaLinha(k,id):null;
 const item={...(current||{}),...values,id:id||"draft-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2)};
 if(k==="usuarios"&&!item.funcao)item.funcao="operador";
 if(k==="instituicoes"&&!item.categoria)item.categoria="Parceiros";
 if(current){draft.grupos[k]=draft.grupos[k].map(row=>row.id===id?item:row);}
 else draft.grupos[k].push(item);
 activeEditor=null;dirty=true;renderFicha();
}
function retirarLinha(k,id){
 salvarCamposPrefeitura();
 if(!confirm("Retirar este registro da ficha municipal? A exclusão só será aplicada ao salvar a Prefeitura."))return;
 draft.grupos[k]=draft.grupos[k].filter(x=>x.id!==id);
 activeEditor=null;dirty=true;renderFicha();
}
function salvarFicha(e){
 e.preventDefault();
 if(activeEditor){toast("Conclua ou cancele a edição do item antes de salvar a Prefeitura.");return;}
 salvarCamposPrefeitura();
 try{
  const anterior=db.municipioAtivo()?.id;
  const salvo=db.salvarFichaPrefeitura(draft,editingId);
  draft=null;editingId=null;activeEditor=null;dirty=false;openSections.clear();
  renderMunSwitch();render();toast("Prefeitura e estrutura salvas.");noScroll();
  if(salvo.lat===undefined)geolocalizarPrefeitura(salvo);
  if(anterior!==salvo.id)location.reload();
 }catch(e){toast(e.message);}
}
async function geolocalizarPrefeitura(p){
 try{
  const url="https://nominatim.openstreetmap.org/search?"+new URLSearchParams({q:p.nome+", "+p.uf+", Brasil",format:"json",limit:"1"});
  const res=await fetch(url,{headers:{Accept:"application/json"}});
  if(!res.ok)return;
  const xs=await res.json(),x=xs[0];if(!x)return;
  const lat=Number(x.lat),lng=Number(x.lon);
  if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
  const bb=(x.boundingbox||[]).map(Number),geo={lat,lng};
  if(bb.length===4&&bb.every(Number.isFinite)){
   const [south,north,west,east]=bb;
   geo.bbox=[south,north,west,east];
  }
  db.atualizarGeo(p.id,geo);
 }catch(_){}
}
function renderConsulta(kind){
 const ehAjuda=kind==="solicitacoes",rows=db.lista(ehAjuda?"solicitacoes":"voluntarios");
 const titulo=ehAjuda?"Pedidos de ajuda":"Colaboradores";
 const descricao=ehAjuda?"Solicitações recebidas pelo atendimento. A Prefeitura acompanha e encaminha os pedidos.":"Pessoas físicas e empresas que se cadastram pelo WhatsApp. Aqui é apenas consulta, não existe botão de cadastro manual.";
 const destino=ehAjuda?"../mapas/?tipo=ajuda":"../mapas/?tipo=colaboradores";
 const cab=pageHeading(titulo,descricao,'<a class="btn" href="../atendimento/" target="_blank" rel="noopener noreferrer">Simular WhatsApp</a><a class="btn btn-primary" href="'+destino+'" target="_blank" rel="noopener noreferrer">Abrir mapa</a>');
 const filt=rows.filter(x=>(x.nome+" "+x.zona+" "+(ehAjuda?x.necessidade:x.tipo_pessoa)).toLowerCase().includes(search.toLowerCase()));
 $("page").innerHTML=cab+'<section class="table-shell"><div class="table-toolbar"><label class="search-field">Buscar <input id="search-consulta" type="search" value="'+esc(search)+'" placeholder="Buscar por zona, tipo ou nome" /></label><span class="table-count">'+filt.length+' registros</span></div>'+
 '<div class="table-scroll"><table><thead><tr><th>Identificação</th><th>Tipo</th><th>Zona</th><th>'+(ehAjuda?"Situação":"Ajuda oferecida")+'</th></tr></thead><tbody>'+
 (filt.length?filt.map(x=>'<tr><td>'+esc(x.nome||"Não informado")+'</td><td>'+esc(ehAjuda?x.necessidade:x.tipo_pessoa||"Colaborador")+'</td><td>'+esc(x.zona||"Não definida")+'</td><td>'+esc(ehAjuda?x.status:([x.ajudas,x.maquinas,x.empreendedores,x.materiais].flat().filter(Boolean).join(", ")||"Sem especificação"))+'</td></tr>').join(""):'<tr><td colspan="4" class="empty-consulta">Nenhum registro. As pessoas entram pelo WhatsApp Maringá Unida.</td></tr>')+
 '</tbody></table></div></section>';
 $("search-consulta").oninput=e=>{search=e.target.value;renderConsulta(kind);$("search-consulta").focus();$("search-consulta").setSelectionRange(search.length,search.length);};
}
function renderMobilizacoes(){
 const m=db.lista("mobilizacoes"),a=db.lista("apoios");
 $("page").innerHTML=pageHeading("Mobilização","Acionamentos e cooperação entre municípios partem dos mapas e ficam registrados aqui.")+
 '<div class="dash-layout"><section class="section-card"><header class="section-card-head"><h2>Brigadas por zona</h2></header><div class="section-card-body"><p class="page-subtitle">Selecione a zona no Mapa de Colaboradores e prepare a mobilização em um clique.</p><div class="metric-value">'+m.length+'</div><div class="panel-actions"><a class="btn btn-primary" href="../mapas/?tipo=colaboradores" target="_blank" rel="noopener">Abrir Mapa de Colaboradores</a></div></div></section>'+
 '<section class="section-card"><header class="section-card-head"><h2>Apoio intermunicipal</h2></header><div class="section-card-body"><p class="page-subtitle">Solicite recursos a outra Prefeitura pelo Mapa da Ajuda.</p><div class="metric-value">'+a.length+'</div><div class="panel-actions"><a class="btn btn-primary" href="../mapas/?tipo=ajuda" target="_blank" rel="noopener">Abrir Mapa da Ajuda</a></div></div></section></div>';
}
function render(){
 const hash=decodeURIComponent(location.hash.slice(1))||"inicio";
 page=Object.hasOwn(titles,hash)?hash:"inicio";
 document.title=titles[page]+" | Maringá Alerta";
 renderNav();
 if(page==="inicio")renderInicio();
 else if(page==="prefeituras")renderPrefeituras();
 else if(page==="colaboradores"||page==="solicitacoes")renderConsulta(page);
 else renderMobilizacoes();
}
$("page").addEventListener("click",e=>{
 const t=e.target.closest("button");if(!t)return;
 if(t.dataset.action==="new-prefeitura"){novoCadastro();return;}
 if(t.dataset.action==="cancel-prefeitura"){cancelarFicha();return;}
 if(t.dataset.prefeitura){editarPrefeitura(t.dataset.prefeitura);return;}
 if(t.dataset.addRow){adicionarLinha(t.dataset.addRow);return;}
 if(t.dataset.editRow){adicionarLinha(t.dataset.editRow,t.dataset.rowId);return;}
 if(t.dataset.saveRow){guardarLinha(t.dataset.saveRow,t.dataset.rowId||null);return;}
 if(t.dataset.removeRow){retirarLinha(t.dataset.removeRow,t.dataset.rowId);return;}
 if(t.hasAttribute("data-cancel-row")){salvarCamposPrefeitura();activeEditor=null;renderFicha();return;}
});
$("sidebar-nav").addEventListener("click",e=>{
 if(!e.target.closest("[data-navigation]"))return;
 if(draft&&dirty&&!confirm("Descartar alterações não salvas na Prefeitura?")){e.preventDefault();return;}
 draft=null;editingId=null;activeEditor=null;dirty=false;
});
$("toggle-sidebar").onclick=()=>{
 const frame=$("app-frame");
 if(matchMedia("(max-width:850px)").matches){
  frame.classList.toggle("mobile-open");
  $("toggle-sidebar").setAttribute("aria-expanded",String(frame.classList.contains("mobile-open")));
 }else{
  frame.classList.toggle("collapsed");
  $("toggle-sidebar").setAttribute("aria-expanded",String(!frame.classList.contains("collapsed")));
 }
};
$("sidebar-scrim").onclick=()=>$("app-frame").classList.remove("mobile-open");
window.addEventListener("hashchange",()=>{search="";if(draft){if(dirty&&!confirm("Descartar alterações não salvas na Prefeitura?")){location.hash="#prefeituras";return;}draft=null;dirty=false;}render();});
document.querySelectorAll(".map-hub a").forEach(link=>{
 link.addEventListener("click",e=>{
  if(matchMedia("(max-width:850px)").matches)return;
  e.preventDefault();
  const width=Math.min(1480,Math.max(780,screen.availWidth-65));
  const height=Math.min(930,Math.max(530,screen.availHeight-65));
  const win=window.open(link.href,"MaringaAlerta_"+link.dataset.mapa,"popup=yes,width="+width+",height="+height+",left="+Math.max(0,Math.round((screen.availWidth-width)/2))+",top="+Math.max(0,Math.round((screen.availHeight-height)/2)));
  if(win)win.focus();else window.open(link.href,"_blank","noopener,noreferrer");
 });
});
renderMunSwitch();
if(globalThis.AlertaSessao&&globalThis.AlertaSessaoUI&&db.municipioAtivo()){
 try{
  const session=AlertaSessao.criar({municipioId:db.municipioAtivo().id});
  AlertaSessaoUI.criar({target:$("session-anchor"),sessao:session,municipio:db.municipioAtivo().nome,zonas:db.lista("zonas").map(x=>x.nome),aoMudar:()=>{}});
 }catch(_){$("session-anchor").textContent="Minha sessão";}
}
render();
if(db.municipioAtivo()?.lat===undefined)geolocalizarPrefeitura(db.municipioAtivo());
})();