/* Controlador inicializacao: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('inicializacao',{
 dependencias:{
  "sortGravidade": "contexto",
  "rnd": "contexto",
  "pick": "contexto",
  "escHtml": "contexto",
  "randPointInBox": "contexto",
  "conectado": "contexto",
  "tenantId": "contexto",
  "demoMode": "contexto",
  "tenantConfig": "contexto",
  "storageKey": "contexto",
  "bairros": "regioes",
  "MUNICIPIO_CENTER": "regioes",
  "saveAdminState": "cadastros",
  "tiposOcorrencia": "equipes",
  "ocorrencias": "cadastro-territorial",
  "idCounter": "cadastro-territorial",
  "gestao": "cadastro-territorial",
  "normalizarTerritorio": "cadastro-territorial",
  "areas": "cadastro-territorial",
  "pertence": "cadastro-territorial",
  "eventoAtivo": "cadastro-territorial",
  "noEvento": "cadastro-territorial",
  "filtroOcorrencias": "cadastro-territorial",
  "map": "mapa",
  "ocLayer": "mapa",
  "ocIcon": "mapa",
  "gerarVoluntarios": "mapa",
  "gerarOcorrencia": "mapa",
  "refreshOcTooltip": "mapa",
  "atualizarRecorte": "recorte",
  "renderOfficialMarkers": "pessoas",
  "localizacoes": "pessoas",
  "pararLocalizacao": "pessoas",
  "currentPanelOcId": "ocorrencias",
  "openOcorrencia": "ocorrencias",
  "tickClock": "resumo",
  "processarFilaOffline": "offline",
  "canActZone": "permissoes",
  "estadoPronto": "conversas",
  "ultimaSerializacao": "conversas",
  "acionarAjuda": "conversas",
  "atualizarFluxo": "conversas",
  "confirmarWhatsApp": "localizacao",
  "salvarPrototipo": "persistencia",
  "restaurarPrototipo": "persistencia",
  "responsavelDaOcorrencia": "persistencia",
  "atualizarFiltroEventos": "persistencia"
},
 criar(dependencias){
 let recuperacao,buscaMapa,resultadosMapa,INVENTARIO,filtrosCadastros,listarRecursosPublicos,linhasInventario,layerRecursosPublicos,painelPonto,marcadorBusca;
 function instalarCadastroOcorrencia(){
  CadastroOcorrenciaMapa.instalar({
    tenantId:dependencias.tenantId,tenantConfig:dependencias.tenantConfig,areas:dependencias.areas,tiposOcorrencia:dependencias.tiposOcorrencia,map:dependencias.map,ocLayer:dependencias.ocLayer,MUNICIPIO_CENTER:dependencias.MUNICIPIO_CENTER,
    normalizarTerritorio:dependencias.normalizarTerritorio,pertence:dependencias.pertence,canActZone:dependencias.canActZone,responsavelDaOcorrencia:dependencias.responsavelDaOcorrencia,ocIcon:dependencias.ocIcon,
    refreshOcTooltip:dependencias.refreshOcTooltip,salvarPrototipo:dependencias.salvarPrototipo,acionarAjuda:dependencias.acionarAjuda,atualizarFluxo:dependencias.atualizarFluxo,atualizarFiltroEventos:dependencias.atualizarFiltroEventos,
    openOcorrencia:dependencias.openOcorrencia,fecharMenuMobile,obterOcorrencias:()=>dependencias.ocorrencias,
    proximoId:()=>dependencias.idCounter++,reverterId:id=>{if(dependencias.idCounter===id+1)dependencias.idCounter=id;},
    setEventoFiltro:id=>{if(!dependencias.noEvento({eventoId:id}))dependencias.eventoAtivo=id;},
    obterEventoSelecionado:()=>EventosMapa.selecionadoIndividual(dependencias.eventoAtivo)
  });
}
function iniciarControlesDemo(){
  document.querySelector('.brand').innerHTML=`<span class="dot"></span>${dependencias.escHtml(dependencias.tenantConfig.marca)}`;
  document.querySelector('.status-brand').textContent=dependencias.tenantConfig.marca;
  document.title=dependencias.tenantConfig.marca;
  dependencias.atualizarFiltroEventos();
  instalarCadastroOcorrencia();
  document.getElementById('whatsapp-close').onclick=()=>document.getElementById('whatsapp-overlay').hidden=true;
  document.getElementById('whatsapp-overlay').onclick=e=>{if(e.target.id==='whatsapp-overlay')e.currentTarget.hidden=true;};
  document.getElementById('wa-cheguei').onclick=()=>dependencias.confirmarWhatsApp('cheguei');
  document.getElementById('wa-terminei').onclick=()=>dependencias.confirmarWhatsApp('terminei');
  function enviar(){
    const input=document.getElementById('wa-demo-input');
    const texto=input.value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[.!]/g,'');
    input.value='';
    if(['cheguei','estou no local','ja cheguei'].includes(texto))dependencias.confirmarWhatsApp('cheguei');
    else if(['terminei','conclui','finalizei','ja terminei'].includes(texto))dependencias.confirmarWhatsApp('terminei');
    else document.getElementById('wa-demo-status').textContent='Nesta simulação, use Cheguei ou Terminei. No sistema real, a conversa será recebida pelo WhatsApp.';
  }
  document.getElementById('wa-demo-send').onclick=enviar;
  document.getElementById('wa-demo-input').onkeydown=e=>{if(e.key==='Enter')enviar();};
  document.getElementById('mobile-menu').onclick=()=>{
    const abriu=document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('menu-backdrop').classList.toggle('open',abriu);
    document.getElementById('mobile-menu').setAttribute('aria-expanded',String(abriu));
  };
  document.getElementById('menu-backdrop').onclick=fecharMenuMobile;
  document.querySelectorAll('.sidebar-actions button,.sidebar-actions a').forEach(el=>el.addEventListener('click',fecharMenuMobile));
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    fecharMenuMobile();document.querySelectorAll('.modal-overlay:not([hidden]):not(#role-overlay)').forEach(el=>{el.hidden=true;});
  });
  window.addEventListener('beforeunload',dependencias.salvarPrototipo);
  window.addEventListener('pagehide',()=>dependencias.localizacoes.forEach((_,id)=>dependencias.pararLocalizacao(id)));
  setInterval(dependencias.salvarPrototipo,5000);
}
function fecharMenuMobile(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('menu-backdrop').classList.remove('open');
  document.getElementById('mobile-menu').setAttribute('aria-expanded','false');
}
function montarMarcadoresPublicos(){
 layerRecursosPublicos.clearLayers();
 if(!filtrosCadastros?.mostrar())return 0;
 const registros=linhasInventario().filter(x=>x.georreferenciado&&!x.privado);
 for(const r of registros){
  const simbolo=INVENTARIO.simbolo(r);
  const ic=L.divIcon({className:'ponto-publico-marker',html:'<span title="'+dependencias.escHtml(r.nome)+'">'+simbolo+'</span>',iconSize:[30,30],iconAnchor:[15,30]});
  L.marker([r.lat,r.lng],{icon:ic,title:r.nome}).bindTooltip('<strong>'+dependencias.escHtml(r.nome)+'</strong><br>'+dependencias.escHtml(r.endereco||'Endereço não informado'),{direction:'top'}).on('click',()=>painelPonto.abrir(r)).addTo(layerRecursosPublicos);
 }
 return registros.length;
}
 async function iniciar(){
 iniciarControlesDemo();
if(window.innerWidth<=860)document.getElementById('floatwin-min').click();
(recuperacao=dependencias.conectado?{estado:'vazio'}:OperacaoRestauracao.ler(localStorage,dependencias.storageKey('operacao'),dependencias.tenantId));
if(recuperacao.estado==='bloqueado'){
  const overlay=document.createElement('div');overlay.className='recuperacao-overlay';
  overlay.innerHTML='<section class="recuperacao-card" role="alertdialog" aria-modal="true" aria-labelledby="recuperacao-title"><h2 id="recuperacao-title">Seus dados foram preservados</h2><p id="recuperacao-motivo"></p><p>O mapa foi interrompido para impedir que os dados sejam substituídos. Salve uma cópia e procure suporte para recuperar o conteúdo.</p><button type="button" id="recuperacao-backup">Baixar cópia dos dados</button></section>';
  overlay.querySelector('#recuperacao-motivo').textContent=recuperacao.motivo;
  const backup=overlay.querySelector('#recuperacao-backup');backup.hidden=recuperacao.original===null;
  backup.onclick=()=>{const url=URL.createObjectURL(new Blob([recuperacao.original],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='backup-mapa-operacional.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  document.body.appendChild(overlay);(backup.hidden?overlay.querySelector('h2'):backup).focus();
  return false;
}
if(recuperacao.estado==='restauravel'){dependencias.restaurarPrototipo(recuperacao.dados);dependencias.ultimaSerializacao=recuperacao.original;}
if(recuperacao.estado==='vazio'&&dependencias.demoMode){
dependencias.gerarVoluntarios();
for(let i=0;i<5;i++) dependencias.gerarOcorrencia();
dependencias.gerarOcorrencia({zona:dependencias.bairros[0].nome,tipo:dependencias.tiposOcorrencia[0]});

// historico de ocorrencias ja resolvidas antes da sessao atual, distribuidas entre os bairros
dependencias.bairros.forEach(b=>{
  const n = Math.floor(dependencias.rnd(1,3));
  for(let i=0;i<n;i++){
    const t = dependencias.pick(dependencias.tiposOcorrencia);
    const tChegada = Math.floor(dependencias.rnd(10,35)), tAtend = Math.floor(dependencias.rnd(20,70));
    const reportado = Date.now()-Math.floor(dependencias.rnd(60,230))*60000;
    const numIdHist = dependencias.idCounter++;
    dependencias.ocorrencias.push({
      id:"oc"+numIdHist, demo:true, protocolo:dependencias.tenantConfig.prefixo+"-"+String(10000+numIdHist).slice(-5), tipo:t.tipo, icone:t.icone, bairro:b.nome, pos: dependencias.randPointInBox(b.poly),
      gravidade: dependencias.sortGravidade(t.gravBase), responsabilidade: dependencias.pick(t.resp),
      reportadoEm: reportado, confirmadoEm: reportado+tChegada*60000, resolvidoEm: reportado+(tChegada+tAtend)*60000,
      status:"resolvida", tempoChegada:tChegada, tempoAtendimento:tAtend, tempoReal: tChegada+tAtend,
      responsavel: b.equipe.responsavel, voluntariosProx: [], marker:null,
    });
  }
});


}
dependencias.filtroOcorrencias=FiltrosOcorrencias.montar({target:document.getElementById('filtros-ocorrencias'),
 obterDados:()=>({ocorrencias:dependencias.ocorrencias,tipos:[...dependencias.tiposOcorrencia.map(x=>x.tipo),...dependencias.gestao.lista('ocorrencias',dependencias.tenantId).map(x=>x.nome)],
 organizacoes:['saude','emergencias','parceiros','equipes'].flatMap(modulo=>dependencias.gestao.lista(modulo,dependencias.tenantId).map(x=>({id:modulo+':'+x.id,nome:x.nome})))}),
 aoMudar:()=>dependencias.atualizarRecorte()});
document.getElementById('fil-toggle').click();
PainelEventos.iniciar({painel:document.getElementById('eventos-painel'),barra:document.getElementById('eventos-painel-head'),
 abrir:document.getElementById('eventos-open'),fechar:document.getElementById('eventos-close'),area:document.getElementById('mapwrap'),
 aoAbrir:()=>{dependencias.filtroOcorrencias.atualizarOpcoes();filtrosCadastros?.abrir();}});
setInterval(()=>{const f=dependencias.filtroOcorrencias.obter();if(f.horas||f.espera)dependencias.atualizarRecorte();},30000);
dependencias.estadoPronto=true;
dependencias.saveAdminState();
dependencias.atualizarFluxo();
dependencias.tickClock();
dependencias.renderOfficialMarkers();
dependencias.processarFilaOffline();
(buscaMapa=document.getElementById('event-search'));
(resultadosMapa=document.getElementById('event-results'));
(INVENTARIO=globalThis.AlertaInventarioMapas);
(listarRecursosPublicos=()=>INVENTARIO.registros(dependencias.gestao).filter(x=>!x.privado));
(linhasInventario=()=>filtrosCadastros?filtrosCadastros.rows():[]);
(layerRecursosPublicos=L.layerGroup().addTo(dependencias.map));
(painelPonto=FichaPonto.criar({painel:document.getElementById('panel'),abrirPainel:()=>{dependencias.currentPanelOcId=null;document.getElementById('panel').classList.add('open')},aoFechar:()=>document.getElementById('panel').classList.remove('open'),obterRegistro:(modulo,id)=>dependencias.gestao.registro(modulo,id),waLink:MaringaCrise.waLink}));
 return true;
 }
 return {iniciar,instalarCadastroOcorrencia,iniciarControlesDemo,fecharMenuMobile,get recuperacao(){return recuperacao;},get buscaMapa(){return buscaMapa;},get resultadosMapa(){return resultadosMapa;},get INVENTARIO(){return INVENTARIO;},get filtrosCadastros(){return filtrosCadastros;},set filtrosCadastros(valor){filtrosCadastros=valor;},get listarRecursosPublicos(){return listarRecursosPublicos;},get linhasInventario(){return linhasInventario;},get layerRecursosPublicos(){return layerRecursosPublicos;},get painelPonto(){return painelPonto;},get marcadorBusca(){return marcadorBusca;},set marcadorBusca(valor){marcadorBusca=valor;},montarMarcadoresPublicos};
 }
});
})(globalThis);
