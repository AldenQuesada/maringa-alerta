/* Controlador recorte: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('recorte',{
 dependencias:{
  "escHtml": "contexto",
  "bairros": "regioes",
  "itensQueFaltamNaZona": "equipes",
  "ocorrencias": "cadastro-territorial",
  "voluntarios": "cadastro-territorial",
  "normalizarTerritorio": "cadastro-territorial",
  "areasCadastradas": "cadastro-territorial",
  "areas": "cadastro-territorial",
  "selecao": "cadastro-territorial",
  "areasSelecionadas": "cadastro-territorial",
  "pertence": "cadastro-territorial",
  "noRecorte": "cadastro-territorial",
  "recorteLabel": "cadastro-territorial",
  "camadasVisiveis": "cadastro-territorial",
  "noEvento": "cadastro-territorial",
  "filtroOcorrencias": "cadastro-territorial",
  "noFiltro": "cadastro-territorial",
  "ocorrenciaVisivel": "cadastro-territorial",
  "map": "mapa",
  "navegacaoMapa": "mapa",
  "ocLayer": "mapa",
  "volLayer": "mapa",
  "rebuildHeat": "mapa",
  "ocIcon": "mapa",
  "refreshOcTooltip": "mapa",
  "renderOfficialMarkers": "pessoas",
  "renderCollaborators": "painel-colaboradores",
  "currentPanelOcId": "ocorrencias",
  "openOcorrencia": "ocorrencias",
  "updateKpis": "resumo",
  "adminOverlay": "administracao",
  "renderAdminBody": "administracao",
  "filaOverlay": "triagem",
  "renderFila": "triagem",
  "zonasComAlertaAtivo": "escalonamento",
  "alertasOverlay": "prontidao",
  "renderAlertasBody": "prontidao",
  "chatOverlay": "mensagens",
  "chatContatoAtivo": "mensagens",
  "chatContatos": "mensagens",
  "renderChatContacts": "mensagens",
  "auditOverlay": "trilha",
  "renderAudit": "trilha",
  "relatorioOverlay": "relatorio",
  "renderRelatorioEvento": "relatorio",
  "montarMarcadoresPublicos": "inicializacao",
  "atualizarFiltroCadastros": "busca"
},
 criar(dependencias){
 let zoneListEl,controleCamadas;
 function renderZoneList(){
  const focado = zoneListEl.contains(document.activeElement) ? document.activeElement.dataset.area : null;
  const busca=dependencias.normalizarTerritorio(document.getElementById('territory-search').value);
  const alertas=dependencias.zonasComAlertaAtivo();
  const abertas=dependencias.ocorrencias.filter(o=>dependencias.noEvento(o)&&dependencias.noFiltro(o)&&(o.status==='ativa'||o.status==='em_atendimento'));
  const visiveis=dependencias.areas.filter(area=>dependencias.selecao.has(area.chave)||dependencias.normalizarTerritorio(area.nome).includes(busca));
  zoneListEl.innerHTML = `<button type="button" class="zone-item todos ${dependencias.selecao.size?'':'active'}" data-area="" aria-pressed="${!dependencias.selecao.size}">Todo o município</button>
    ${!dependencias.areasCadastradas.length?'<p class="territory-hint">Sem território municipal cadastrado. Importe o cadastro em Gestão.</p>':''}
    ${visiveis.map(area=>{
      const selecionada=dependencias.selecao.has(area.chave);
      const total=abertas.filter(o=>dependencias.pertence(area,o.bairro)).length;
      return `<button type="button" class="zone-item ${selecionada?'active':''}" data-area="${dependencias.escHtml(area.chave)}" aria-pressed="${selecionada}">
        <span class="zi-dot"></span><span class="zi-text" title="${dependencias.escHtml([area.nome,area.tipoArea,area.layer?area.fonte:'Sem limite no mapa'].filter(Boolean).join(' · '))}"><span class="zi-name">${[...alertas].some(z=>dependencias.pertence(area,z))?'🌦 ':''}${dependencias.escHtml(area.nome)}</span>
        <span class="zi-count">${area.tipoArea}${area.layer?'':' · sem limite no mapa'}</span></span><span class="zi-badge">${total}</span></button>`;
    }).join('')}`;
  zoneListEl.querySelectorAll('button').forEach(botao=>{
    botao.onclick=()=>selectZone(botao.dataset.area);
    if(focado!==null && botao.dataset.area===focado) botao.focus({preventScroll:true});
  });
}
function selectZone(chave){
  if(!chave) dependencias.selecao.clear();
  else if(dependencias.selecao.has(chave)) dependencias.selecao.delete(chave);
  else dependencias.selecao.add(chave);
  atualizarRecorte();
  if(!dependencias.selecao.size){ dependencias.navegacaoMapa.restaurar(); return; }
  const limites=L.latLngBounds([]);
  dependencias.areasSelecionadas().forEach(area=>{ if(area.layer) limites.extend(area.layer.getBounds()); });
  if(limites.isValid()) dependencias.map.fitBounds(limites,{padding:[40,40]});
}
function atualizarRecorte(){
  renderZoneList();
  applyZoneVisibility();
  updateZoneStrip();
  dependencias.updateKpis();
  dependencias.renderOfficialMarkers();
  dependencias.rebuildHeat();
  if(dependencias.currentPanelOcId && !dependencias.ocorrencias.some(o=>o.id===dependencias.currentPanelOcId && dependencias.ocorrenciaVisivel(o))) document.getElementById('panel-close').click();
  if(!dependencias.filaOverlay.hidden) dependencias.renderFila();
  if(!dependencias.relatorioOverlay.hidden) dependencias.renderRelatorioEvento();
  if(!dependencias.alertasOverlay.hidden) dependencias.renderAlertasBody();
  if(!dependencias.adminOverlay.hidden) dependencias.renderAdminBody();
  if(!dependencias.auditOverlay.hidden) dependencias.renderAudit();
  if(!dependencias.chatOverlay.hidden){
    dependencias.renderChatContacts();
    if(!dependencias.chatContatos().some(c=>c.id===dependencias.chatContatoAtivo)){
      dependencias.chatContatoAtivo=null;
      document.getElementById('chat-thread').textContent='Selecione um contato.';
    }
  }
  // O mesmo recorte territorial controla ocorrências, cadastros e marcadores.
  if(document.getElementById("mun-toggle")?.dataset.ready==="1"){
   dependencias.montarMarcadoresPublicos();
   dependencias.atualizarFiltroCadastros();
  }
}
function applyZoneVisibility(){
  dependencias.areas.forEach(area=>{
    if(!area.layer) return;
    if(dependencias.selecao.has(area.chave)||(!dependencias.selecao.size&&dependencias.camadasVisiveis[area.tipoArea]!==false)) area.layer.addTo(dependencias.map);
    else area.layer.remove();
  });
  dependencias.ocorrencias.forEach(o=>{
    const historico=dependencias.filtroOcorrencias?.obter().situacoes.includes('resolvida');
    if(!o.marker&&o.status==='resolvida'&&historico&&o.pos){o.marker=L.marker(o.pos,{icon:dependencias.ocIcon(o.status)});o.marker.on('click',()=>dependencias.openOcorrencia(o));dependencias.refreshOcTooltip(o);}
    if(!o.marker)return;
    const show=dependencias.ocorrenciaVisivel(o)&&(o.status!=='resolvida'||historico);
    const has=dependencias.ocLayer.hasLayer(o.marker);
    if(show&&!has)o.marker.addTo(dependencias.ocLayer);
    if(!show&&has)dependencias.ocLayer.removeLayer(o.marker);
  });
  dependencias.voluntarios.forEach(v=>{
    const show = dependencias.noRecorte(v.bairro);
    const has = dependencias.volLayer.hasLayer(v.marker);
    if(show && !has) v.marker.addTo(dependencias.volLayer);
    if(!show && has) dependencias.volLayer.removeLayer(v.marker);
  });
  dependencias.renderCollaborators();
}
function updateZoneStrip(){
  const strip = document.getElementById('zone-strip');
  strip.style.display = dependencias.selecao.size ? 'flex' : 'none';
  strip.textContent = dependencias.selecao.size ? dependencias.recorteLabel() : '';
  strip.title = dependencias.bairros.filter(b=>dependencias.noRecorte(b.nome)).map(b=>{
    const faltando=dependencias.itensQueFaltamNaZona(b.nome).map(item=>item.tipo);
    return [b.nome,b.equipamentos.join(', '),faltando.length?'Necessidades: '+faltando.join(', '):''].filter(Boolean).join(' · ');
  }).join('\n');
}
 async function iniciar(){
 (zoneListEl=document.getElementById('zone-list'));
document.getElementById('territory-search').addEventListener('input',renderZoneList);
(controleCamadas=document.getElementById('territory-layers'));
Object.entries(dependencias.camadasVisiveis).filter(([tipo])=>dependencias.areas.some(area=>area.tipoArea===tipo)).forEach(([tipo,visivel])=>{
  const label=document.createElement('label');
  const check=document.createElement('input');
  check.type='checkbox';
  check.checked=visivel;
  label.append(check, ' '+tipo);
  controleCamadas.append(label);
  check.onchange=()=>{dependencias.camadasVisiveis[tipo]=check.checked;applyZoneVisibility();};
});
 return true;
 }
 return {iniciar,get zoneListEl(){return zoneListEl;},get controleCamadas(){return controleCamadas;},renderZoneList,selectZone,atualizarRecorte,applyZoneVisibility,updateZoneStrip};
 }
});
})(globalThis);
