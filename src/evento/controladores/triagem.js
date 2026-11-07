/* Controlador triagem: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('triagem',{
 dependencias:{
  "escHtml": "contexto",
  "minutosDesde": "contexto",
  "tenantId": "contexto",
  "GRAV_LABEL": "equipes",
  "RESP_LABEL": "equipes",
  "ocorrencias": "cadastro-territorial",
  "recorteLabel": "cadastro-territorial",
  "ocorrenciaVisivel": "cadastro-territorial",
  "openOcorrencia": "ocorrencias",
  "isViewOnly": "permissoes"
},
 criar(dependencias){
 let filaOverlay;
 function calcPrioridade(o){ return AlertaFluxo.prioridade(o,Date.now()); }
function renderFila(){
  const body = document.getElementById('fila-body');
  // A entrada cidadã não confirma nem aciona uma ocorrência: segue para triagem.
  const relatosCidadaos = dependencias.isViewOnly() ? [] : AlertaGestaoDados.criar(undefined,{municipioId:dependencias.tenantId})
    .lista('relatos',dependencias.tenantId).filter(r=>r.status==='Em triagem');
  const lista = dependencias.ocorrencias
    .filter(o=> o.status==='ativa'||o.status==='em_atendimento')
    .filter(dependencias.ocorrenciaVisivel)
    .map(o=>({o, score:calcPrioridade(o)}))
    .sort((a,c)=>c.score-a.score);
  body.innerHTML = `
    <div style="font-size:11px;color:var(--muted);margin-bottom:12px">Gravidade define a ordem; o tempo de espera desempata dentro de cada classe. Presença da equipe e propriedade pública/privada não reduzem o risco. Recorte: ${dependencias.escHtml(dependencias.recorteLabel())}.</div>
    ${relatosCidadaos.length?'<section class="fila-relatos"><h3>Relatos enviados por cidadãos · '+relatosCidadaos.length+'</h3><p style="font-size:11px;color:var(--muted)">Ainda não são ocorrências confirmadas. Consulte os dados e fotografias na Gestão antes do acionamento.</p>'+relatosCidadaos.map(r=>'<div class="fila-item"><div class="fila-rank">●</div><div class="fila-info"><div class="fi-title">Relato cidadão · '+dependencias.escHtml(r.endereco)+'</div><div class="fi-meta">'+dependencias.escHtml((r.pessoas_no_local||[]).filter(x=>x!=="NÃO HÁ").join(" · ")||"Sem pessoas vulneráveis informadas")+' · Em triagem</div></div></div>').join('')+'<a href="./gestao/#relatos" target="_blank" rel="noopener" class="sidebar-btn" style="display:inline-block;margin:9px 0 16px">Abrir relatos na Gestão</a></section>':''}
    ${lista.map(({o,score},i)=>`
      <div class="fila-item" data-oc="${o.id}">
        <div class="fila-rank">#${i+1}</div>
        <div class="fila-info">
          <div class="fi-title">${o.icone} ${dependencias.escHtml(o.tipo)} · ${dependencias.escHtml(o.bairro)}</div>
          <div class="fi-meta">${dependencias.GRAV_LABEL[o.gravidade]} gravidade · ${dependencias.RESP_LABEL[o.responsabilidade]} · ${o.status==='ativa'?`aguardando há ${dependencias.minutosDesde(o.reportadoEm)}min`:'em atendimento'}</div>
        </div>
        <div class="fila-score">${dependencias.GRAV_LABEL[o.gravidade]}</div>
      </div>
    `).join('') || '<div style="color:var(--muted);font-size:12px">Nenhuma ocorrência em aberto nesta visão.</div>'}
  `;
  body.querySelectorAll('.fila-item').forEach(elm=>{
    elm.onclick = ()=>{ const o = dependencias.ocorrencias.find(x=>x.id===elm.dataset.oc); if(o){ filaOverlay.hidden=true; dependencias.openOcorrencia(o); } };
  });
}
 async function iniciar(){
 (filaOverlay=document.getElementById('fila-overlay'));
document.getElementById('open-fila').onclick = ()=>{ filaOverlay.hidden=false; renderFila(); };
document.getElementById('fila-close').onclick = ()=>{ filaOverlay.hidden=true; };
filaOverlay.addEventListener('click', e=>{ if(e.target===filaOverlay) filaOverlay.hidden=true; });
 return true;
 }
 return {iniciar,calcPrioridade,get filaOverlay(){return filaOverlay;},renderFila};
 }
});
})(globalThis);
