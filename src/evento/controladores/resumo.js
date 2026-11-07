/* Controlador resumo: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('resumo',{
 dependencias:{
  "escHtml": "contexto",
  "GRAV_COLOR": "equipes",
  "RESP_COLOR": "equipes",
  "ocorrencias": "cadastro-territorial",
  "recorteLabel": "cadastro-territorial",
  "ocorrenciaVisivel": "cadastro-territorial",
  "pessoasPainel": "pessoas",
  "currentPanelOcId": "ocorrencias",
  "openOcorrencia": "ocorrencias"
},
 criar(dependencias){
 let eventStart;
 function closePanel(){ document.getElementById('panel').classList.remove('open'); dependencias.currentPanelOcId = null; }
function showReco(o){
  const banner = document.getElementById('reco-banner');
  banner.textContent = `🏅 Reconhecimento oficial: equipe de ${o.bairro} resolveu em ${o.tempoReal} min — ato da Prefeitura em preparação`;
  banner.classList.add('show');
  setTimeout(()=>banner.classList.remove('show'), 5200);
}
function updateKpis(){
  const ocList = dependencias.ocorrencias.filter(dependencias.ocorrenciaVisivel);
  const volList = dependencias.pessoasPainel().filter(p=>!p.oficial);
  const abertas = ocList.filter(o=>o.status==='ativa'||o.status==='em_atendimento');
  const resolvidas = ocList.filter(o=>o.status==='resolvida');
  document.getElementById('kpi-ativas').textContent = abertas.length;
  document.getElementById('kpi-resolvidas').textContent = resolvidas.length;
  document.getElementById('kpi-voluntarios').textContent = volList.length;
  document.getElementById('kpi-tempo').textContent = resolvidas.length>0
    ? Math.round(resolvidas.reduce((s,o)=>s+o.tempoReal,0)/resolvidas.length)+"min" : "—";
  renderResumo(abertas);
}
function renderResumo(abertas){
  const el = document.getElementById('sidebar-footer');
  const porGrav = {1:0,2:0,3:0};
  const porResp = {publica:0, privada:0, mista:0};
  abertas.forEach(o=>{ porGrav[o.gravidade]++; porResp[o.responsabilidade]++; });

  const resolvidas = dependencias.ocorrencias
    .filter(o=> o.status==='resolvida' && dependencias.ocorrenciaVisivel(o))
    .sort((a,c)=> (c.resolvidoEm||0) - (a.resolvidoEm||0))
    .slice(0,5);

  el.innerHTML = `
    <div class="sf-label">Gravidade (${dependencias.escHtml(dependencias.recorteLabel())})</div>
    <div class="sf-row"><span style="color:${dependencias.GRAV_COLOR[3]}">Alta</span><b>${porGrav[3]}</b></div>
    <div class="sf-row"><span style="color:${dependencias.GRAV_COLOR[2]}">Média</span><b>${porGrav[2]}</b></div>
    <div class="sf-row"><span style="color:${dependencias.GRAV_COLOR[1]}">Baixa</span><b>${porGrav[1]}</b></div>
    <div class="sf-label" style="margin-top:10px">Responsabilidade</div>
    <div class="sf-row"><span style="color:${dependencias.RESP_COLOR.publica}">Pública</span><b>${porResp.publica}</b></div>
    <div class="sf-row"><span style="color:${dependencias.RESP_COLOR.privada}">Privada</span><b>${porResp.privada}</b></div>
    <div class="sf-row"><span style="color:${dependencias.RESP_COLOR.mista}">Mista</span><b>${porResp.mista}</b></div>
    <div class="sf-label" style="margin-top:10px">Resolvidas recentes</div>
    ${resolvidas.map(o=>`<div class="sf-resolvida" data-oc="${o.id}">${o.icone} ${dependencias.escHtml(o.tipo)} <span>${o.relatorio?'· complemento salvo':'· concluída'}</span></div>`).join('') || '<div style="color:var(--muted);font-size:10.5px">Nenhuma ainda.</div>'}
  `;
  el.querySelectorAll('.sf-resolvida').forEach(elm=>{
    elm.onclick = ()=>{ const o = dependencias.ocorrencias.find(x=>x.id===elm.dataset.oc); if(o) dependencias.openOcorrencia(o); };
  });
}
function tickClock(){
  const now = new Date();
  document.getElementById('clock').textContent=new Intl.DateTimeFormat('pt-BR',{
    dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'
  }).format(now);
}
 async function iniciar(){
 document.getElementById('panel-close').onclick = closePanel;
(eventStart=Date.now() - (4*60+12)*60000);
setInterval(tickClock, 30000);
 return true;
 }
 return {iniciar,closePanel,showReco,updateKpis,renderResumo,get eventStart(){return eventStart;},set eventStart(valor){eventStart=valor;},tickClock};
 }
});
})(globalThis);
