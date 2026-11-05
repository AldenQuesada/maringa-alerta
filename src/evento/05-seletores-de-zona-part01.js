/* ---------- menu de zonas (sidebar) ---------- */
const zoneListEl = document.getElementById('zone-list');

document.getElementById('territory-search').addEventListener('input',renderZoneList);
const controleCamadas=document.getElementById('territory-layers');
Object.entries(camadasVisiveis).filter(([tipo])=>areas.some(area=>area.tipoArea===tipo)).forEach(([tipo,visivel])=>{
  const label=document.createElement('label');
  const check=document.createElement('input');
  check.type='checkbox';
  check.checked=visivel;
  label.append(check, ' '+tipo);
  controleCamadas.append(label);
  check.onchange=()=>{camadasVisiveis[tipo]=check.checked;applyZoneVisibility();};
});
function renderZoneList(){
  const focado = zoneListEl.contains(document.activeElement) ? document.activeElement.dataset.area : null;
  const busca=normalizarTerritorio(document.getElementById('territory-search').value);
  const alertas=zonasComAlertaAtivo();
  const abertas=ocorrencias.filter(o=>noEvento(o)&&noFiltro(o)&&(o.status==='ativa'||o.status==='em_atendimento'));
  const visiveis=areas.filter(area=>selecao.has(area.chave)||normalizarTerritorio(area.nome).includes(busca));
  zoneListEl.innerHTML = `<button type="button" class="zone-item todos ${selecao.size?'':'active'}" data-area="" aria-pressed="${!selecao.size}">Todo o município</button>
    ${!areasCadastradas.length?'<p class="territory-hint">Áreas de demonstração. Importe o cadastro municipal em Gestão.</p>':''}
    ${visiveis.map(area=>{
      const selecionada=selecao.has(area.chave);
      const total=abertas.filter(o=>pertence(area,o.bairro)).length;
      return `<button type="button" class="zone-item ${selecionada?'active':''}" data-area="${escHtml(area.chave)}" aria-pressed="${selecionada}">
        <span class="zi-dot"></span><span class="zi-text" title="${escHtml([area.nome,area.tipoArea,area.layer?area.fonte:'Sem limite no mapa'].filter(Boolean).join(' · '))}"><span class="zi-name">${[...alertas].some(z=>pertence(area,z))?'🌦 ':''}${escHtml(area.nome)}</span>
        <span class="zi-count">${area.tipoArea}${area.layer?'':' · sem limite no mapa'}</span></span><span class="zi-badge">${total}</span></button>`;
    }).join('')}`;
  zoneListEl.querySelectorAll('button').forEach(botao=>{
    botao.onclick=()=>selectZone(botao.dataset.area);
    if(focado!==null && botao.dataset.area===focado) botao.focus({preventScroll:true});
  });
}

function selectZone(chave){
  if(!chave) selecao.clear();
  else if(selecao.has(chave)) selecao.delete(chave);
  else selecao.add(chave);
  atualizarRecorte();
  if(!selecao.size){ navegacaoMapa.restaurar(); return; }
  const limites=L.latLngBounds([]);
  areasSelecionadas().forEach(area=>{ if(area.layer) limites.extend(area.layer.getBounds()); });
  if(limites.isValid()) map.fitBounds(limites,{padding:[40,40]});
}

function atualizarRecorte(){
  renderZoneList();
  applyZoneVisibility();
  updateZoneStrip();
  updateKpis();
  renderOfficialMarkers();
  rebuildHeat();
  if(currentPanelOcId && !ocorrencias.some(o=>o.id===currentPanelOcId && ocorrenciaVisivel(o))) document.getElementById('panel-close').click();
  if(!filaOverlay.hidden) renderFila();
  if(!relatorioOverlay.hidden) renderRelatorioEvento();
  if(!alertasOverlay.hidden) renderAlertasBody();
  if(!adminOverlay.hidden) renderAdminBody();
  if(!auditOverlay.hidden) renderAudit();
  if(!chatOverlay.hidden){
    renderChatContacts();
    if(!chatContatos().some(c=>c.id===chatContatoAtivo)){
      chatContatoAtivo=null;
      document.getElementById('chat-thread').textContent='Selecione um contato.';
    }
  }
  // O mesmo recorte territorial controla ocorrências, cadastros e marcadores.
  if(document.getElementById("mun-toggle")?.dataset.ready==="1"){
   montarMarcadoresPublicos();
   atualizarFiltroCadastros();
  }
}

function applyZoneVisibility(){
  areas.forEach(area=>{
    if(!area.layer) return;
    if(selecao.has(area.chave)||(!selecao.size&&camadasVisiveis[area.tipoArea]!==false)) area.layer.addTo(map);
    else area.layer.remove();
  });
  ocorrencias.forEach(o=>{
    const historico=filtroOcorrencias?.obter().situacoes.includes('resolvida');
    if(!o.marker&&o.status==='resolvida'&&historico&&o.pos){o.marker=L.marker(o.pos,{icon:ocIcon(o.status)});o.marker.on('click',()=>openOcorrencia(o));refreshOcTooltip(o);}
    if(!o.marker)return;
    const show=ocorrenciaVisivel(o)&&(o.status!=='resolvida'||historico);
    const has=ocLayer.hasLayer(o.marker);
    if(show&&!has)o.marker.addTo(ocLayer);
    if(!show&&has)ocLayer.removeLayer(o.marker);
  });
  voluntarios.forEach(v=>{
    const show = noRecorte(v.bairro);
    const has = volLayer.hasLayer(v.marker);
    if(show && !has) v.marker.addTo(volLayer);
    if(!show && has) volLayer.removeLayer(v.marker);
  });
  renderCollaborators();
}

function updateZoneStrip(){
  const strip = document.getElementById('zone-strip');
  strip.style.display = selecao.size ? 'flex' : 'none';
  strip.textContent = selecao.size ? recorteLabel() : '';
  strip.title = bairros.filter(b=>noRecorte(b.nome)).map(b=>{
    const faltando=itensQueFaltamNaZona(b.nome).map(item=>item.tipo);
    return [b.nome,b.equipamentos.join(', '),faltando.length?'Necessidades: '+faltando.join(', '):''].filter(Boolean).join(' · ');
  }).join('\n');
}
