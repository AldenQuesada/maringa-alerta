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
 '<td><div class="row-actions">'+(atual==="eventos"?'<a class="row-action" href="../index.html?evento='+encodeURIComponent(item.id)+'" target="_blank" rel="noopener">Abrir mapa</a>':'')+'<button class="row-action" type="button" data-edit="'+esc(item.id)+'" title="Editar">Editar</button>'+(atual==="eventos"?'':'<button class="row-action danger" type="button" data-delete="'+esc(item.id)+'" title="Excluir">Excluir</button>')+'</div></td></tr>').join("");
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
const PREF_TABS=[["territorio","Gerais"],["geoterritorialidade","Geoterritorialidade"],["estruturas","Estruturas"],["bases","Bases"],["riscos","Riscos"]];
const STRUCT_MODULES=[["saude","Unidades de saúde"],["emergencias","Emergência e segurança"],["parceiros","Órgãos e concessionárias"]];
const PREF_SECTIONS=new Set([...PREF_TABS.map(x=>x[0]),"pessoas",...STRUCT_MODULES.map(x=>x[0])]);
let estruturaTipo="saude",cnesConsultado=false,referenciasPublicasConsultadas=false;
