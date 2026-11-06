/* ---------- controle de acesso por papel (simulado, nao e seguranca real) ---------- */
function canAdmin(){ return !!currentRole && currentRole.tipo==='admin'; }
function canActZone(zona){ return !!currentRole && (currentRole.tipo==='admin' || (currentRole.tipo==='responsavel' && currentRole.zona===zona)); }
function isViewOnly(){ return !currentRole || currentRole.tipo==='visualizacao'; }

function applyRolePermissions(){
  document.getElementById('open-audit').style.display = canAdmin() ? '' : 'none';
  document.getElementById('open-admin').style.display = isViewOnly() ? 'none' : '';
  document.getElementById('demo-new').disabled = isViewOnly();
}
function selecionarPerfilDemo(perfil) {
  currentRole = perfil && ['admin','responsavel','visualizacao'].includes(perfil.tipo)
    ? perfil : {tipo:'visualizacao'};
  applyRolePermissions();
  renderCollaborators();
  if(currentPanelOcId) {
    const o=ocorrencias.find(x=>x.id===currentPanelOcId);
    if(o)openOcorrencia(o);
  }
  if(!document.getElementById('admin-overlay').hidden){
    if(isViewOnly())document.getElementById('admin-overlay').hidden=true;
    else renderAdminBody();
  }
  if(!canAdmin())document.getElementById('audit-overlay').hidden=true;
}
if(conectado){
  selecionarPerfilDemo({tipo:'visualizacao'});
  document.getElementById('session-anchor').textContent=window.AlertaNuvem.email;
}else if(window.AlertaSessao && window.AlertaSessaoUI){
  const servicoSessao = AlertaSessao.criar({ municipioId:tenantId });
  const sessaoAtual = servicoSessao.obterSessao();
  selecionarPerfilDemo(sessaoAtual?.conta?.perfil || {tipo:'visualizacao'});
  AlertaSessaoUI.criar({
    target:document.getElementById('session-anchor'),
    sessao:servicoSessao,
    municipio:tenantConfig.nome,
    zonas:bairros.map(b=>b.nome),
    aoMudar:atual=>selecionarPerfilDemo(atual?.conta?.perfil || {tipo:'visualizacao'})
  });
}else{
  selecionarPerfilDemo({tipo:'visualizacao'});
  const item=document.createElement('span'); item.textContent='Sessão indisponível';
  document.getElementById('session-anchor').appendChild(item);
}
applyRoute();

document.getElementById('heat-toggle').onclick = (e)=>{
  heatOn = !heatOn;
  if(heatOn){ rebuildHeat(); heatLayer.addTo(map); e.target.textContent = '🔥 Mapa de gravidade: ligado'; }
  else { map.removeLayer(heatLayer); e.target.textContent = '🔥 Mapa de gravidade: desligado'; }
};

