function instalarCadastroOcorrencia(){
  CadastroOcorrenciaMapa.instalar({
    tenantId,tenantConfig,areas,tiposOcorrencia,map,ocLayer,MARINGA_CENTER,
    normalizarTerritorio,pertence,canActZone,responsavelDaOcorrencia,ocIcon,
    refreshOcTooltip,salvarPrototipo,acionarAjuda,atualizarFluxo,atualizarFiltroEventos,
    openOcorrencia,fecharMenuMobile,obterOcorrencias:()=>ocorrencias,
    proximoId:()=>idCounter++,reverterId:id=>{if(idCounter===id+1)idCounter=id;},
    setEventoFiltro:id=>{if(!noEvento({eventoId:id}))eventoAtivo=id;},
    obterEventoSelecionado:()=>EventosMapa.selecionadoIndividual(eventoAtivo)
  });
}

function iniciarControlesDemo(){
  document.querySelector('.brand').innerHTML=`<span class="dot"></span>${escHtml(tenantConfig.marca)}`;
  document.querySelector('.status-brand').textContent=tenantConfig.marca;
  document.title=tenantConfig.marca;
  atualizarFiltroEventos();
  instalarCadastroOcorrencia();
  document.getElementById('whatsapp-close').onclick=()=>document.getElementById('whatsapp-overlay').hidden=true;
  document.getElementById('whatsapp-overlay').onclick=e=>{if(e.target.id==='whatsapp-overlay')e.currentTarget.hidden=true;};
  document.getElementById('wa-cheguei').onclick=()=>confirmarWhatsApp('cheguei');
  document.getElementById('wa-terminei').onclick=()=>confirmarWhatsApp('terminei');
  function enviar(){
    const input=document.getElementById('wa-demo-input');
    const texto=input.value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[.!]/g,'');
    input.value='';
    if(['cheguei','estou no local','ja cheguei'].includes(texto))confirmarWhatsApp('cheguei');
    else if(['terminei','conclui','finalizei','ja terminei'].includes(texto))confirmarWhatsApp('terminei');
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
  window.addEventListener('beforeunload',salvarPrototipo);
  window.addEventListener('pagehide',()=>localizacoes.forEach((_,id)=>pararLocalizacao(id)));
  setInterval(salvarPrototipo,5000);
}

function fecharMenuMobile(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('menu-backdrop').classList.remove('open');
  document.getElementById('mobile-menu').setAttribute('aria-expanded','false');
}

iniciarControlesDemo();
if(window.innerWidth<=860)document.getElementById('floatwin-min').click();
const recuperacao=OperacaoRestauracao.ler(localStorage,storageKey('operacao'),tenantId);
if(recuperacao.estado==='bloqueado'){
  const overlay=document.createElement('div');overlay.className='recuperacao-overlay';
  overlay.innerHTML='<section class="recuperacao-card" role="alertdialog" aria-modal="true" aria-labelledby="recuperacao-title"><h2 id="recuperacao-title">Seus dados foram preservados</h2><p id="recuperacao-motivo"></p><p>O mapa foi interrompido para impedir que os dados sejam substituídos. Salve uma cópia e procure suporte para recuperar o conteúdo.</p><button type="button" id="recuperacao-backup">Baixar cópia dos dados</button></section>';
  overlay.querySelector('#recuperacao-motivo').textContent=recuperacao.motivo;
  const backup=overlay.querySelector('#recuperacao-backup');backup.hidden=recuperacao.original===null;
  backup.onclick=()=>{const url=URL.createObjectURL(new Blob([recuperacao.original],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='backup-mapa-operacional.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  document.body.appendChild(overlay);(backup.hidden?overlay.querySelector('h2'):backup).focus();
  return;
}
if(recuperacao.estado==='restauravel'){restaurarPrototipo(recuperacao.dados);ultimaSerializacao=recuperacao.original;}
if(recuperacao.estado==='vazio'){
gerarVoluntarios();
for(let i=0;i<5;i++) gerarOcorrencia();
gerarOcorrencia({zona:bairros[0].nome,tipo:tiposOcorrencia[0]});

// historico de ocorrencias ja resolvidas antes da sessao atual, distribuidas entre os bairros
bairros.forEach(b=>{
  const n = Math.floor(rnd(1,3));
  for(let i=0;i<n;i++){
    const t = pick(tiposOcorrencia);
    const tChegada = Math.floor(rnd(10,35)), tAtend = Math.floor(rnd(20,70));
    const reportado = Date.now()-Math.floor(rnd(60,230))*60000;
    const numIdHist = idCounter++;
    ocorrencias.push({
      id:"oc"+numIdHist, protocolo:tenantConfig.prefixo+"-"+String(10000+numIdHist).slice(-5), tipo:t.tipo, icone:t.icone, bairro:b.nome, pos: randPointInBox(b.poly),
      gravidade: sortGravidade(t.gravBase), responsabilidade: pick(t.resp),
      reportadoEm: reportado, confirmadoEm: reportado+tChegada*60000, resolvidoEm: reportado+(tChegada+tAtend)*60000,
      status:"resolvida", tempoChegada:tChegada, tempoAtendimento:tAtend, tempoReal: tChegada+tAtend,
      responsavel: b.equipe.responsavel, voluntariosProx: [], marker:null,
    });
  }
});


}
filtroOcorrencias=FiltrosOcorrencias.montar({target:document.getElementById('filtros-ocorrencias'),
 obterDados:()=>({ocorrencias,tipos:[...tiposOcorrencia.map(x=>x.tipo),...gestao.lista('ocorrencias',tenantId).map(x=>x.nome)],
 organizacoes:['saude','emergencias','parceiros','equipes'].flatMap(modulo=>gestao.lista(modulo,tenantId).map(x=>({id:modulo+':'+x.id,nome:x.nome})))}),
 aoMudar:()=>atualizarRecorte()});
document.getElementById('fil-toggle').click();
PainelEventos.iniciar({painel:document.getElementById('eventos-painel'),barra:document.getElementById('eventos-painel-head'),
 abrir:document.getElementById('eventos-open'),fechar:document.getElementById('eventos-close'),area:document.getElementById('mapwrap'),
 aoAbrir:()=>filtroOcorrencias.atualizarOpcoes()});
setInterval(()=>{const f=filtroOcorrencias.obter();if(f.horas||f.espera)atualizarRecorte();},30000);
estadoPronto=true;
saveAdminState();
atualizarFluxo();
tickClock();
renderOfficialMarkers();
processarFilaOffline();
const buscaMapa=document.getElementById('event-search');
const resultadosMapa=document.getElementById('event-results');
const listarRecursosPublicos=()=>['bases','riscos','pontos','saude','emergencias','parceiros','abrigos']
 .flatMap(modulo=>gestao.lista(modulo,tenantId).filter(item=>item.verificacao!=='Rejeitado').map(item=>({...item,modulo})));
const layerRecursosPublicos=L.layerGroup().addTo(map);
let marcadorBusca;
function montarMarcadoresPublicos(){
 layerRecursosPublicos.clearLayers();
 const registros=listarRecursosPublicos().filter(x=>{
  if(x.lat===undefined||x.lat===null||x.lat===""||x.lng===undefined||x.lng===null||x.lng==="")return false;
  const lat=Number(x.lat),lng=Number(x.lng);
  return Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=-24&&lat<=-23&&lng>=-52.5&&lng<=-51.2;
 });
 for(const r of registros){
  const doacoes=r.modulo==='bases'&&r.tipo==='Centro de coleta de donativos';
  const simbolo=doacoes?'📦':r.modulo==='abrigos'?'🛏️':r.modulo==='riscos'?'⚠️':r.modulo==='bases'?'🏠':r.modulo==='saude'?'🏥':'📍';
  const ic=L.divIcon({className:'ponto-publico-marker',html:'<span title="'+escHtml(r.nome)+'">'+simbolo+'</span>',iconSize:[30,30],iconAnchor:[15,30]});
  const geolocalizacao=r.geo_status||'Localização cadastrada';
  const source=/^https:\/\//.test(r.url_fonte||'')?'<a href="'+escHtml(r.url_fonte)+'" target="_blank" rel="noopener">Fonte pública</a>':'';
  const route=r.endereco?'<a href="https://www.google.com/maps/search/?api=1&amp;query='+encodeURIComponent(r.endereco+', Maringá, PR')+'" target="_blank" rel="noopener">Ver endereço no mapa</a>':'';
  const observacao=doacoes?'<p><strong>Donativos:</strong> '+escHtml(r.itens_aceitos||'Confirmar antes de doar')+'</p><p>'+escHtml(r.horario||'Horário a confirmar')+'</p>':r.modulo==='abrigos'?'<p><strong>Modalidade:</strong> '+escHtml(r.tipo||'Acolhimento')+'</p><p><strong>Capacidade total publicada:</strong> '+escHtml(r.capacidade||'Não informada')+' · Vagas livres: '+escHtml(r.disponiveis===''||r.disponiveis==null?'A confirmar':r.disponiveis)+'</p><p>'+escHtml(r.acesso||'Confirme a disponibilidade com a instituição')+'</p>':'';
  const aviso='<small>Coordenada: '+escHtml(geolocalizacao)+'. Cadastro: '+escHtml(r.verificacao||'Sem validação')+'. Confirme antes do deslocamento.</small>';
  const html='<div class="ponto-publico-popup"><strong>'+simbolo+' '+escHtml(r.nome)+'</strong><p>'+escHtml(r.endereco||r.localizacao||'')+'</p>'+observacao+aviso+'<div>'+[route,source].filter(Boolean).join(' · ')+'</div></div>';
  L.marker([Number(r.lat),Number(r.lng)],{icon:ic,title:r.nome}).bindPopup(html).addTo(layerRecursosPublicos);
 }
 return registros.length;
}

