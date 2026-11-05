/* ---------- pagina publica de status (visao do morador, sem dados internos) ---------- */
function statusSteps(o){
  const steps = [
    { label:'Ocorrência recebida', done:true },
    ...(o.confirmado===false?[{label:'Em triagem',done:false,now:true}]:[]),
    { label:'Equipe confirmou presença na área', done: o.status!=='ativa', now: o.status==='ativa'&&o.confirmado!==false },
    { label:'Atendimento concluído', done: o.status==='resolvida', now: o.status==='em_atendimento' },
  ];
  return steps.map(s=> s.done ? {...s, cls:'done'} : s.now ? {...s, cls:'now'} : {...s, cls:'pending'});
}

function renderStatusResultado(o){
  const el = document.getElementById('status-resultado');
  if(!o){
    el.innerHTML = '<div style="color:var(--red);font-size:12.5px;margin-top:8px">Protocolo não encontrado. Confira o código recebido no WhatsApp.</div>';
    return;
  }
  const steps = statusSteps(o);
  el.innerHTML = `
    <div class="status-result-card">
      <div style="font-size:13px;font-weight:700;margin-bottom:2px">${o.icone} ${escHtml(o.tipo)}</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:14px">Zona: ${escHtml(o.bairro)} · Protocolo ${escHtml(o.protocolo)}</div>
      ${steps.map(s=>`<div class="status-step ${s.cls}"><span class="dot2"></span><span>${s.label}</span></div>`).join('')}
      ${o.status==='resolvida'
        ? `<div style="margin-top:12px;font-size:12px;color:var(--green)">✓ Atendida em ${o.tempoChegada+o.tempoAtendimento} minutos.</div>
           ${o.relatorio && o.relatorio.fotosPublicas ? `
              <div class="grid2" style="margin-top:10px">
                ${o.relatorio.fotoAtual?`<img src="${o.relatorio.fotoAtual}" alt="Situação inicial" style="width:100%;border-radius:6px">`:""}
                ${o.relatorio.fotoFinal?`<img src="${o.relatorio.fotoFinal}" alt="Situação final" style="width:100%;border-radius:6px">`:""}
              </div>` : `<div style="margin-top:8px;font-size:11px;color:var(--muted)">Não há fotos públicas neste registro.</div>`}`
        : o.tempoEstimado>0?`<div style="margin-top:12px;font-size:12px;color:var(--muted)">Tempo estimado: ${o.tempoEstimado} minutos a partir do recebimento.</div>`:'<div style="margin-top:12px;font-size:12px;color:var(--muted)">Tempo estimado ainda não informado.</div>'}
    </div>
  `;
}

document.getElementById('status-buscar').onclick = ()=>{
  const codigo = document.getElementById('status-protocolo').value.trim().toUpperCase();
  const o = ocorrencias.find(x=>x.protocolo===codigo);
  renderStatusResultado(o);
};
document.getElementById('status-protocolo').addEventListener('keydown', e=>{ if(e.key==='Enter') document.getElementById('status-buscar').click(); });
document.getElementById('status-voltar').onclick = (e)=>{ e.preventDefault(); location.hash=''; };

function applyRoute(){
  const isStatus = location.hash === '#status';
  document.getElementById('app-view').hidden = isStatus;
  document.getElementById('status-view').hidden = !isStatus;
  if(isStatus) document.getElementById('status-resultado').innerHTML = '';

}
window.addEventListener('hashchange', applyRoute);
applyRoute();

