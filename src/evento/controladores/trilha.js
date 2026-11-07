/* Controlador trilha: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('trilha',{
 dependencias:{
  "escHtml": "contexto",
  "conectado": "contexto",
  "storageKey": "contexto",
  "selecao": "cadastro-territorial",
  "noRecorte": "cadastro-territorial"
},
 criar(dependencias){
 let auditoriaLocal,auditPush,verificarIntegridadeAudit,auditOverlay;
 function renderAuditIfOpen(){ if(!auditOverlay.hidden) renderAudit(); }
function renderAudit(){
  const auditLog=auditoriaLocal.listar();
  const body = document.getElementById('audit-body');
  body.innerHTML = `
    <div style="font-size:11px;color:var(--muted);margin-bottom:12px">Cada ação fica registrada com o hash da entrada anterior, formando uma cadeia. Editar ou apagar uma entrada no meio quebra a cadeia a partir dali. A verificação percorre toda a cadeia municipal. Registros gerais e antigos sem território aparecem em todos os recortes.</div>
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <button class="admin-btn primary" id="audit-verify">🔒 Verificar integridade</button>
      <button class="admin-btn danger" id="audit-tamper">⚠ Simular adulteração (demo)</button>
    </div>
    <div id="audit-result" style="margin-bottom:12px;font-size:12px"></div>
    <table class="admin-table"><thead><tr><th>Quando</th><th>Ator</th><th>Ação</th><th>Detalhe</th><th>Hash</th></tr></thead><tbody>
      ${auditLog.filter(e=>!dependencias.selecao.size||!e.territorios?.length||e.territorios.some(dependencias.noRecorte)).reverse().map(e=>`
        <tr><td style="white-space:nowrap">${new Date(e.ts).toLocaleTimeString('pt-BR')}</td><td>${dependencias.escHtml(e.ator)}</td><td>${dependencias.escHtml(e.acao)}</td><td>${dependencias.escHtml(e.detalhe)}</td><td style="font-family:var(--mono);font-size:9.5px;color:var(--muted)">${e.hash.slice(0,10)}…</td></tr>
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
    auditoriaLocal.simularAdulteracao();
    renderAudit();
  };
}
 async function iniciar(){
 (auditoriaLocal=AlertaEventoAuditoriaLocal.criar({armazenamento:localStorage,chave:dependencias.storageKey('audit'),habilitado:!dependencias.conectado,onChange:()=>renderAuditIfOpen()}));
(auditPush=auditoriaLocal.adicionar);
(verificarIntegridadeAudit=auditoriaLocal.verificar);
(auditOverlay=document.getElementById('audit-overlay'));
document.getElementById('open-audit').onclick = ()=>{ auditOverlay.hidden=false; renderAudit(); };
document.getElementById('audit-close').onclick = ()=>{ auditOverlay.hidden=true; };
auditOverlay.addEventListener('click', e=>{ if(e.target===auditOverlay) auditOverlay.hidden=true; });
 return true;
 }
 return {iniciar,get auditoriaLocal(){return auditoriaLocal;},get auditPush(){return auditPush;},get verificarIntegridadeAudit(){return verificarIntegridadeAudit;},get auditOverlay(){return auditOverlay;},renderAuditIfOpen,renderAudit};
 }
});
})(globalThis);
