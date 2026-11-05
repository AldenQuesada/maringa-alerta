/* ---------- triagem automatica por prioridade ---------- */
function calcPrioridade(o){ return AlertaFluxo.prioridade(o,Date.now()); }

const filaOverlay = document.getElementById('fila-overlay');
document.getElementById('open-fila').onclick = ()=>{ filaOverlay.hidden=false; renderFila(); };
document.getElementById('fila-close').onclick = ()=>{ filaOverlay.hidden=true; };
filaOverlay.addEventListener('click', e=>{ if(e.target===filaOverlay) filaOverlay.hidden=true; });

function renderFila(){
  const body = document.getElementById('fila-body');
  const lista = ocorrencias
    .filter(o=> o.status==='ativa'||o.status==='em_atendimento')
    .filter(ocorrenciaVisivel)
    .map(o=>({o, score:calcPrioridade(o)}))
    .sort((a,c)=>c.score-a.score);
  body.innerHTML = `
    <div style="font-size:11px;color:var(--muted);margin-bottom:12px">Gravidade define a ordem; o tempo de espera desempata dentro de cada classe. Presença da equipe e propriedade pública/privada não reduzem o risco. Recorte: ${escHtml(recorteLabel())}.</div>
    ${lista.map(({o,score},i)=>`
      <div class="fila-item" data-oc="${o.id}">
        <div class="fila-rank">#${i+1}</div>
        <div class="fila-info">
          <div class="fi-title">${o.icone} ${escHtml(o.tipo)} · ${escHtml(o.bairro)}</div>
          <div class="fi-meta">${GRAV_LABEL[o.gravidade]} gravidade · ${RESP_LABEL[o.responsabilidade]} · ${o.status==='ativa'?`aguardando há ${minutosDesde(o.reportadoEm)}min`:'em atendimento'}</div>
        </div>
        <div class="fila-score">${GRAV_LABEL[o.gravidade]}</div>
      </div>
    `).join('') || '<div style="color:var(--muted);font-size:12px">Nenhuma ocorrência em aberto nesta visão.</div>'}
  `;
  body.querySelectorAll('.fila-item').forEach(elm=>{
    elm.onclick = ()=>{ const o = ocorrencias.find(x=>x.id===elm.dataset.oc); if(o){ filaOverlay.hidden=true; openOcorrencia(o); } };
  });
}

