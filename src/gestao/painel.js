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
