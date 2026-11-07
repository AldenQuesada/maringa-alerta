/* Controlador permissoes: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('permissoes',{
 dependencias:{
  "conectado": "contexto",
  "tenantId": "contexto",
  "tenantConfig": "contexto",
  "bairros": "regioes",
  "ocorrencias": "cadastro-territorial",
  "currentRole": "cadastro-territorial",
  "map": "mapa",
  "heatLayer": "mapa",
  "heatOn": "mapa",
  "rebuildHeat": "mapa",
  "renderCollaborators": "painel-colaboradores",
  "currentPanelOcId": "ocorrencias",
  "openOcorrencia": "ocorrencias",
  "renderAdminBody": "administracao",
  "applyRoute": "status-publico"
},
 criar(dependencias){

 function canAdmin(){ return !!dependencias.currentRole && dependencias.currentRole.tipo==='admin'; }
function canActZone(zona){ return !!dependencias.currentRole && (dependencias.currentRole.tipo==='admin' || (dependencias.currentRole.tipo==='responsavel' && dependencias.currentRole.zona===zona)); }
function isViewOnly(){ return !dependencias.currentRole || dependencias.currentRole.tipo==='visualizacao'; }
function applyRolePermissions(){
  document.getElementById('open-audit').style.display = canAdmin() ? '' : 'none';
  document.getElementById('open-admin').style.display = isViewOnly() ? 'none' : '';
  document.getElementById('demo-new').disabled = isViewOnly();
}
function selecionarPerfilDemo(perfil) {
  dependencias.currentRole = perfil && ['admin','responsavel','visualizacao'].includes(perfil.tipo)
    ? perfil : {tipo:'visualizacao'};
  applyRolePermissions();
  dependencias.renderCollaborators();
  if(dependencias.currentPanelOcId) {
    const o=dependencias.ocorrencias.find(x=>x.id===dependencias.currentPanelOcId);
    if(o)dependencias.openOcorrencia(o);
  }
  if(!document.getElementById('admin-overlay').hidden){
    if(isViewOnly())document.getElementById('admin-overlay').hidden=true;
    else dependencias.renderAdminBody();
  }
  if(!canAdmin())document.getElementById('audit-overlay').hidden=true;
}
 async function iniciar(){
 if(dependencias.conectado){
  selecionarPerfilDemo({tipo:'visualizacao'});
  const cadastro=document.getElementById('demo-new');
  cadastro.title='O registro de ocorrências neste mapa ainda não está integrado ao banco.';
  cadastro.setAttribute('aria-label',cadastro.title);
  document.getElementById('session-anchor').textContent=window.AlertaNuvem.email;
}else if(window.AlertaSessao && window.AlertaSessaoUI){
  const servicoSessao = AlertaSessao.criar({ municipioId:dependencias.tenantId });
  const sessaoAtual = servicoSessao.obterSessao();
  selecionarPerfilDemo(sessaoAtual?.conta?.perfil || {tipo:'visualizacao'});
  AlertaSessaoUI.criar({
    target:document.getElementById('session-anchor'),
    sessao:servicoSessao,
    municipio:dependencias.tenantConfig.nome,
    zonas:dependencias.bairros.map(b=>b.nome),
    aoMudar:atual=>selecionarPerfilDemo(atual?.conta?.perfil || {tipo:'visualizacao'})
  });
}else{
  selecionarPerfilDemo({tipo:'visualizacao'});
  const item=document.createElement('span'); item.textContent='Sessão indisponível';
  document.getElementById('session-anchor').appendChild(item);
}
dependencias.applyRoute();
document.getElementById('heat-toggle').onclick = (e)=>{
  dependencias.heatOn = !dependencias.heatOn;
  if(dependencias.heatOn){ dependencias.rebuildHeat(); dependencias.heatLayer.addTo(dependencias.map); e.target.textContent = '🔥 Mapa de gravidade: ligado'; }
  else { dependencias.map.removeLayer(dependencias.heatLayer); e.target.textContent = '🔥 Mapa de gravidade: desligado'; }
};
 return true;
 }
 return {iniciar,canAdmin,canActZone,isViewOnly,applyRolePermissions,selecionarPerfilDemo};
 }
});
})(globalThis);
