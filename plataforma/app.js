/* Administração Geral · interface demonstrativa de provisionamento multi-prefeitura.
 * SEM autenticação real. Municípios e geometrias persistem apenas no navegador.
 */
(function(){
"use strict";
const $=id=>document.getElementById(id);
const esc=x=>String(x??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const D=globalThis.AlertaGestaoDados,A=globalThis.AlertaAdminPlataforma;
if(!D||!A){$("screen").textContent="Falha ao carregar Administração Geral.";return;}
const central=A.criar(),cache=new Map();
let section="dashboard",editing=null,search="",ufFilter="",busy=false,formCities=[],selectedUF="PR",notifyTimer;
const ufLabels={AC:"Acre",AL:"Alagoas",AP:"Amapá",AM:"Amazonas",BA:"Bahia",CE:"Ceará",DF:"Distrito Federal",ES:"Espírito Santo",GO:"Goiás",MA:"Maranhão",MT:"Mato Grosso",MS:"Mato Grosso do Sul",MG:"Minas Gerais",PA:"Pará",PB:"Paraíba",PR:"Paraná",PE:"Pernambuco",PI:"Piauí",RJ:"Rio de Janeiro",RN:"Rio Grande do Norte",RS:"Rio Grande do Sul",RO:"Rondônia",RR:"Roraima",SC:"Santa Catarina",SP:"São Paulo",SE:"Sergipe",TO:"Tocantins"};
const nameUF=x=>ufLabels[x]||x;
function notice(txt){let x=$("notification");x.textContent=txt;x.hidden=false;clearTimeout(notifyTimer);notifyTimer=setTimeout(()=>x.hidden=true,4100);}
function heading(title,description,actions=""){return '<div class="heading"><div><div class="kicker">ADMIN GERAL · TODO O SISTEMA</div><h1>'+esc(title)+'</h1><p>'+esc(description)+'</p></div><div>'+actions+'</div></div>';}
const warning='<div class="notice"><strong>Ambiente demonstrativo.</strong> Os dados desta Administração Geral são armazenados somente neste navegador. A sessão local não autentica nem protege o banco. Não insira credenciais ou informações privadas reais. A publicação institucional exige backend com login e permissões auditáveis.</div>';
function badge(status){const value=status||"implantacao";return '<span class="status '+esc(value)+'">'+esc(value==="implantacao"?"Em implantação":value==="ativa"?"Ativa":value==="suspensa"?"Suspensa":value)+'</span>';}
function renderNav(){
 document.querySelectorAll("[data-page]").forEach(x=>x.classList.toggle("active",x.dataset.page===section));
}
function current(){return central.municipios();}
function stats(){
 const xs=current();
 return '<div class="stat-grid">'+[
 ["Prefeituras cadastradas",xs.length],["Em implantação",xs.filter(x=>!x.status||x.status==="implantacao").length],["Ativas",xs.filter(x=>x.status==="ativa").length],["Suspensas",xs.filter(x=>x.status==="suspensa").length]
 ].map(([name,n])=>'<div class="stat"><small>'+esc(name)+'</small><strong>'+n+'</strong></div>').join("")+'</div>';
}
function renderDashboard(){
 $("screen").innerHTML=heading("Painel geral da plataforma","Administração central do SaaS. Crie a Prefeitura uma única vez; depois sua equipe trabalha no próprio ambiente.")+warning+stats()+
 '<section class="panel"><div class="panel-head"><h2>Hierarquia de provisionamento</h2></div><div class="panel-body"><div class="hierarchy"><span>Plataforma</span><b>›</b><span>Brasil</span><b>›</b><span>Estado</span><b>›</b><span>Prefeitura</span><b>›</b><span>Gabinete de crise</span></div>'+
 '<p>O Admin Geral cria, parametriza e acompanha prefeituras; o Admin Municipal não pode criar outras prefeituras. Os usuários municipais trabalham com o escopo da própria cidade.</p>'+
 '<div class="entry-pills"><a href="#municipios">Cadastrar / editar Prefeituras</a><a href="#territorios">Georreferenciamento por município</a></div></div></section>'+
 municipalityTable(current());
 wireList();
}
function municipalityTable(items){
 return '<section class="panel"><div class="panel-head"><h2>Prefeituras da plataforma</h2><span>'+items.length+' município(s)</span></div><div class="table-wrap"><table class="records"><thead><tr><th>País › Estado › Prefeitura</th><th>Código IBGE</th><th>Situação</th><th>Território</th><th>Admin municipal</th><th>Ações</th></tr></thead><tbody>'+
 (items.length?items.map(x=>'<tr><td><strong>'+esc(x.nome)+' / '+esc(x.uf)+'</strong><small>Brasil › '+esc(nameUF(x.uf))+'</small></td><td>'+esc(x.codigo_ibge)+'</td><td>'+badge(x.status)+'</td>'+
 '<td>'+esc(x.geo_atualizado?"Georreferenciado · "+(x.fonte_geo||"IBGE"):x.id==="maringa"?"Bairros IBGE 2022 disponíveis":"Georreferência pendente")+'</td>'+
 '<td><small>'+esc(x.admin_municipal_email||"Não definido")+'</small></td>'+
 '<td><div class="row-actions"><button type="button" class="btn" data-edit="'+esc(x.id)+'">Editar</button><button type="button" class="btn" data-open="'+esc(x.id)+'">Abrir Prefeitura</button></div></td></tr>').join(""):'<tr><td colspan="6" class="empty">Nenhuma Prefeitura cadastrada.</td></tr>')+
 '</tbody></table></div></section>';
}
function renderMunicipios(){
 const xs=current().filter(x=>(!ufFilter||x.uf===ufFilter)&&(!search||(x.nome+" "+x.codigo_ibge+" "+x.uf).toLocaleLowerCase("pt-BR").includes(search.toLocaleLowerCase("pt-BR"))));
 $("screen").innerHTML=heading("Prefeituras","Cadastre Maringá, Londrina e os demais municípios em um único formulário hierárquico.",
 '<button id="new-city" type="button" class="btn primary">+ Nova Prefeitura</button>')+warning+
 '<section class="panel"><div class="panel-head"><h2>Filtros de municípios</h2></div><div class="panel-body"><div class="toolbar"><input id="filter-search" class="grow" type="search" placeholder="Buscar nome ou código IBGE" value="'+esc(search)+'"><select id="filter-uf"><option value="">Todos os estados</option>'+
 Object.entries(ufLabels).map(([v,t])=>'<option value="'+v+'"'+(v===ufFilter?" selected":"")+'>'+esc(t)+' ('+v+')</option>').join("")+'</select></div></div></section>'+
 municipalityTable(xs)+'<section id="city-editor" class="panel" hidden></section>';
 $("new-city").onclick=()=>openEditor(null);
 $("filter-search").oninput=e=>{search=e.target.value;renderMunicipios();$("filter-search")?.focus();};
 $("filter-uf").onchange=e=>{ufFilter=e.target.value;renderMunicipios();};
 wireList();
}
function wireList(){
 $("screen").querySelectorAll("[data-edit]").forEach(x=>x.onclick=()=>{section="municipios";renderMunicipios();openEditor(x.dataset.edit);});
 $("screen").querySelectorAll("[data-open]").forEach(x=>x.onclick=()=>abrirMunicipio(x.dataset.open));
}
function openEditor(id=null){
 editing=id;
 const original=id?current().find(x=>x.id===id):null;
 if(id&&!original){notice("Prefeitura não encontrada.");return;}
 selectedUF=original?.uf||"PR";formCities=[];
 const el=$("city-editor");if(!el)return;el.hidden=false;
 el.innerHTML='<div class="panel-head"><h2>'+(original?"Editar Prefeitura":"Nova Prefeitura")+'</h2><span>Cadastro único · país, estado e município</span></div>'+
 '<div class="panel-body"><form id="city-form"><div class="form-grid">'+
 field("País","pais",'<select name="pais" disabled><option value="BR">Brasil</option></select><small>Outros países dependem de catálogo e backend próprios.</small>')+
 field("Estado","uf",'<select id="field-uf" name="uf"'+(original?" disabled":"")+'>'+Object.entries(ufLabels).map(([v,t])=>'<option value="'+v+'"'+(v===selectedUF?" selected":"")+'>'+esc(t)+' ('+v+')</option>').join("")+'</select>')+
 field("Município oficial / IBGE","cidade",original?
 '<input id="field-city" type="text" readonly value="'+esc(original.nome)+'"><small>Código IBGE não pode ser alterado.</small>':
 '<select id="field-city" required disabled><option value="">Consultando municípios no IBGE...</option></select>')+
 field("Código IBGE","codigo",'<input id="field-code" readonly value="'+esc(original?.codigo_ibge||"")+'">')+
 field("Administrador municipal (nome de referência)","admin",'<input name="admin" value="'+esc(original?.responsavel||"")+'" placeholder="Nome do responsável municipal">')+
 field("E-mail institucional (não envia convite)","email",'<input type="email" name="email" value="'+esc(original?.admin_municipal_email||"")+'" placeholder="contato@prefeitura.gov.br">')+
 field("Telefone institucional","telefone",'<input type="tel" name="telefone" value="'+esc(original?.telefone||"")+'">')+
 field("Situação","status",'<select name="status">'+A.STATUSES.map(x=>'<option value="'+x+'"'+((original?.status||"implantacao")===x?" selected":"")+'>'+esc(x==="implantacao"?"Em implantação":x==="ativa"?"Ativa":"Suspensa")+'</option>').join("")+'</select>')+
 '</div><div class="form-actions"><button type="button" class="btn" id="cancel-city">Cancelar</button><button class="btn primary" type="submit">Salvar Prefeitura</button></div></form></div>';
 el.scrollIntoView({block:"nearest"});
 $("cancel-city").onclick=()=>{el.hidden=true;editing=null;};
 $("field-uf").onchange=e=>{selectedUF=e.target.value;$("field-code").value="";void loadCities();};
 if(!original){void loadCities();$("field-city").onchange=()=>{
  const record=formCities.find(x=>String(x.id)===$("field-city").value);
  $("field-code").value=String(record?.id||"");
 };}
 $("city-form").onsubmit=e=>{e.preventDefault();
  const fd=new FormData(e.currentTarget),uf=original?.uf||String(fd.get("uf")||selectedUF);
  const selected=original?{id:original.codigo_ibge,nome:original.nome,uf:{sigla:uf}}:formCities.find(x=>String(x.id)===$("field-city").value);
  if(!selected){notice("Selecione uma Prefeitura consultada no IBGE.");return;}
  try{
   const p=central.gravarPrefeitura({uf,estado:nameUF(uf),cidade:selected,
     adminMunicipal:fd.get("admin"),email:fd.get("email"),telefone:fd.get("telefone"),status:fd.get("status")},editing);
   editing=null;notice("Prefeitura "+p.nome+" salva neste navegador.");renderMunicipios();
  }catch(err){notice(err.message);}
 };
}
function field(name,key,markup){return '<div class="field"><label for="'+esc(key)+'">'+esc(name)+'</label>'+markup+'</div>';}
async function loadCities(){
 const select=$("field-city");if(!select||busy)return;
 const uf=$("field-uf")?.value||selectedUF;
 select.disabled=true;select.innerHTML='<option value="">Carregando municípios do IBGE...</option>';
 try{
  let cities=cache.get(uf);
  if(!cities){
   const controller=new AbortController(),t=setTimeout(()=>controller.abort(),18000);
   try{
    const res=await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados/"+uf+"/municipios",{signal:controller.signal,cache:"force-cache"});
    if(!res.ok)throw Error("IBGE HTTP "+res.status);
    cities=await res.json();if(!Array.isArray(cities)||!cities.length)throw Error("Lista do IBGE vazia");
    cache.set(uf,cities);
   }finally{clearTimeout(t);}
  }
  if(!select.isConnected||$("field-uf")?.value!==uf)return;
  formCities=cities;select.disabled=false;
  select.innerHTML='<option value="">Selecione a Prefeitura...</option>'+cities.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.nome)+'</option>').join("");
  if(uf==="PR"){const expected=cities.find(x=>x.nome==="Londrina");if(!expected)notice("Lista do IBGE consultada; verifique o município pretendido.");}
 }catch(err){
  formCities=[];select.disabled=true;select.innerHTML='<option>IBGE indisponível · tente novamente</option>';
  notice("Consulta IBGE falhou: "+err.message);
 }
}
function abrirMunicipio(id){
 try{
  const p=central.acessarMunicipio(id);
  location.href="../gestao/?municipio="+encodeURIComponent(p.id);
 }catch(err){notice(err.message);}
}
function polygon(geo){
 const feature=geo?.type==="FeatureCollection"?geo.features?.find(x=>x?.geometry?.type?.includes("Polygon")):geo?.type==="Feature"?geo:geo;
 const g=feature?.geometry||feature;if(!["Polygon","MultiPolygon"].includes(g?.type))throw Error("Malha IBGE não contém polígono.");
 if(JSON.stringify(g).length>1250000)throw Error("Malha excede limite do navegador.");
 const points=[];
 const walk=x=>{if(!Array.isArray(x))return;if(x.length>=2&&typeof x[0]==="number"&&typeof x[1]==="number"){points.push(x);return;}for(const a of x)walk(a);};
 walk(g.coordinates);if(points.length<4)throw Error("Malha sem geometria suficiente.");
 const xs=points.map(a=>a[0]),ys=points.map(a=>a[1]);
 const left=Math.min(...xs),right=Math.max(...xs),bottom=Math.min(...ys),top=Math.max(...ys);
 if(![left,right,bottom,top].every(Number.isFinite))throw Error("Limite geográfico inválido.");
 return {center:[(bottom+top)/2,(left+right)/2],bbox:[bottom,top,left,right],json:JSON.stringify(g)};
}
async function syncGeo(id){
 if(busy)return;const p=current().find(x=>x.id===id);if(!p)return;
 busy=true;renderTerritorios();const status=$("geo-status");if(status)status.textContent="Consultando malha IBGE de "+p.nome+"...";
 try{
  const url="https://servicodados.ibge.gov.br/api/v3/malhas/municipios/"+p.codigo_ibge+"?formato=application%2Fvnd.geo%2Bjson&qualidade=minima";
  const controller=new AbortController(),t=setTimeout(()=>controller.abort(),28000);
  let data;try{
   const res=await fetch(url,{signal:controller.signal,headers:{Accept:"application/vnd.geo+json, application/json"}});
   if(!res.ok)throw Error("IBGE HTTP "+res.status);
   data=await res.json();
  }finally{clearTimeout(t);}
  const g=polygon(data);
  central.registrarGeo(id,{lat:g.center[0],lng:g.center[1],bbox:g.bbox,limite_geojson:g.json,fonte:"IBGE · malha municipal"});
  notice("Limite geográfico de "+p.nome+" salvo no protótipo.");
 }catch(err){notice("Malha não atualizada: "+err.message);}finally{busy=false;renderTerritorios();}
}
function renderTerritorios(){
 const xs=current();
 $("screen").innerHTML=heading("Georreferenciamento municipal","Admin Geral provisiona os limites iniciais; cada Prefeitura recebe seu território já associado ao código IBGE.")+warning+
 '<section class="panel"><div class="panel-head"><h2>Camadas por Prefeitura</h2><span id="geo-status">'+(busy?"Importando geometria oficial...":"Importação inicial assistida por município")+'</span></div><div class="table-wrap"><table class="records"><thead><tr><th>Prefeitura</th><th>IBGE</th><th>Origem territorial</th><th>Georreferenciamento</th><th>Ação</th></tr></thead><tbody>'+
 xs.map(x=>'<tr><td><strong>'+esc(x.nome)+' / '+esc(x.uf)+'</strong></td><td>'+esc(x.codigo_ibge)+'</td>'+
 '<td>'+esc(x.id==="maringa"?"113 bairros IBGE 2022 versionados":x.fonte_geo||"Nenhuma fonte importada")+'</td>'+
 '<td>'+esc(x.geo_atualizado?"Atualizado em "+new Date(x.geo_atualizado).toLocaleDateString("pt-BR"):"Malha pendente")+'</td>'+
 '<td><div class="row-actions"><button class="btn" data-geo="'+esc(x.id)+'"'+(busy?" disabled":"")+'>Importar limite IBGE</button>'+
 '<button class="btn" data-open="'+esc(x.id)+'">Abrir Prefeitura</button></div></td></tr>').join("")+
 '</tbody></table></div></section>'+
 '<section class="panel"><div class="panel-head"><h2>Bairros e zonas operacionais</h2></div><div class="panel-body"><p>Maringá já possui a malha IBGE 2022 com 113 bairros carregável no mapa. Londrina e outros municípios precisam de suas próprias camadas e verificação. Zonas operacionais não são automaticamente criadas a partir de bairros.</p></div></section>';
 $("screen").querySelectorAll("[data-geo]").forEach(x=>x.onclick=()=>syncGeo(x.dataset.geo));
 $("screen").querySelectorAll("[data-open]").forEach(x=>x.onclick=()=>abrirMunicipio(x.dataset.open));
}
function render(){
 const p=location.hash.slice(1);
 section=["dashboard","municipios","territorios"].includes(p)?p:"dashboard";
 renderNav();
 if(section==="dashboard")renderDashboard();
 else if(section==="municipios")renderMunicipios();
 else renderTerritorios();
}
window.addEventListener("hashchange",render);
render();
})();