/* ---------- log de auditoria imutavel (cadeia de hash) ---------- */
const AUDIT_KEY = storageKey('audit');
let auditLog = [];
try{ if(!conectado)auditLog = JSON.parse(localStorage.getItem(AUDIT_KEY) || "[]"); }catch(e){ auditLog = []; }

async function sha256(str){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
let auditSequencia=Promise.resolve();
function auditPayload({ts,ator,acao,detalhe,prev,territorios}){
  return JSON.stringify({ts,ator,acao,detalhe,prev,territorios});
}
function auditPush(ator, acao, detalhe, territorios){
  const ts=Date.now();
  auditSequencia=auditSequencia.then(async()=>{
    const prev=auditLog.length?auditLog[auditLog.length-1].hash:'0';
    const entrada={ts,ator,acao,detalhe,prev,territorios};
    const hash=await sha256(auditPayload(entrada));
    auditLog.push({...entrada,hash});
    try{!conectado&&localStorage.setItem(AUDIT_KEY,JSON.stringify(auditLog));}catch(e){}
    renderAuditIfOpen();
  }).catch(()=>{});
  return auditSequencia;
}
async function verificarIntegridadeAudit(){
  await auditSequencia;
  for(let i=0;i<auditLog.length;i++){
    const e = auditLog[i];
    const prevEsperado = i===0 ? '0' : auditLog[i-1].hash;
    const payload = auditPayload({...e,prev:prevEsperado});
    const recalculado = await sha256(payload);
    if(recalculado !== e.hash || e.prev !== prevEsperado) return {ok:false, indice:i};
  }
  return {ok:true};
}

const auditOverlay = document.getElementById('audit-overlay');
document.getElementById('open-audit').onclick = ()=>{ auditOverlay.hidden=false; renderAudit(); };
document.getElementById('audit-close').onclick = ()=>{ auditOverlay.hidden=true; };
auditOverlay.addEventListener('click', e=>{ if(e.target===auditOverlay) auditOverlay.hidden=true; });
function renderAuditIfOpen(){ if(!auditOverlay.hidden) renderAudit(); }

function renderAudit(){
  const body = document.getElementById('audit-body');
  body.innerHTML = `
    <div style="font-size:11px;color:var(--muted);margin-bottom:12px">Cada ação fica registrada com o hash da entrada anterior, formando uma cadeia. Editar ou apagar uma entrada no meio quebra a cadeia a partir dali. A verificação percorre toda a cadeia municipal. Registros gerais e antigos sem território aparecem em todos os recortes.</div>
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <button class="admin-btn primary" id="audit-verify">🔒 Verificar integridade</button>
      <button class="admin-btn danger" id="audit-tamper">⚠ Simular adulteração (demo)</button>
    </div>
    <div id="audit-result" style="margin-bottom:12px;font-size:12px"></div>
    <table class="admin-table"><thead><tr><th>Quando</th><th>Ator</th><th>Ação</th><th>Detalhe</th><th>Hash</th></tr></thead><tbody>
      ${auditLog.filter(e=>!selecao.size||!e.territorios?.length||e.territorios.some(noRecorte)).reverse().map(e=>`
        <tr><td style="white-space:nowrap">${new Date(e.ts).toLocaleTimeString('pt-BR')}</td><td>${escHtml(e.ator)}</td><td>${escHtml(e.acao)}</td><td>${escHtml(e.detalhe)}</td><td style="font-family:var(--mono);font-size:9.5px;color:var(--muted)">${e.hash.slice(0,10)}…</td></tr>
      `).join('') || '<tr><td colspan="5" style="color:var(--muted)">Nenhuma ação registrada ainda.</td></tr>'}
    </tbody></table>
  `;
  document.getElementById('audit-verify').onclick = async ()=>{
    const r = await verificarIntegridadeAudit();
    document.getElementById('audit-result').innerHTML = r.ok
      ? `<span style="color:var(--green)">✓ Cadeia municipal íntegra: ${auditLog.length} entradas, nenhuma adulteração detectada.</span>`
      : `<span style="color:var(--red)">✗ Adulteração detectada na entrada #${r.indice+1} — o hash não corresponde ao conteúdo.</span>`;
  };
  document.getElementById('audit-tamper').onclick = ()=>{
    if(!auditLog.length){ document.getElementById('audit-result').textContent = 'Não há entradas para adulterar ainda.'; return; }
    auditLog[0].detalhe = auditLog[0].detalhe + ' (editado depois, sem recalcular o hash)';
    try{ !conectado&&localStorage.setItem(AUDIT_KEY, JSON.stringify(auditLog)); }catch(e){}
    renderAudit();
  };
}

