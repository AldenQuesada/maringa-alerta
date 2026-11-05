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
