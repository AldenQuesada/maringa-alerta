/* Controlador prontidao: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('prontidao',{
 dependencias:{
  "escHtml": "contexto",
  "minutosDesde": "contexto",
  "bairros": "regioes",
  "PAPEL_LABEL": "regioes",
  "todosFuncionarios": "regioes",
  "voluntarios": "cadastro-territorial",
  "areas": "cadastro-territorial",
  "pertence": "cadastro-territorial",
  "noRecorte": "cadastro-territorial",
  "renderZoneList": "recorte",
  "NIVEL_COLOR": "escalonamento",
  "NIVEL_LABEL": "escalonamento",
  "alertasClimaticos": "escalonamento",
  "prontidao": "escalonamento",
  "gerarAlerta": "escalonamento",
  "zonasComAlertaAtivo": "escalonamento"
},
 criar(dependencias){
 let alertasOverlay,alertasTab;
 function marcarZonasEmAlerta(){
  const ativas = dependencias.zonasComAlertaAtivo();
  dependencias.areas.filter(area=>area.layer).forEach(area=>{
    const emAlerta = [...ativas].some(z=>dependencias.pertence(area,z));
    area.layer.setStyle(emAlerta
      ? { color:'#ff8a3b', weight:2.8, opacity:.95, dashArray:'3,5', fillOpacity:.1, fillColor:'#ff8a3b' }
      : { color:'#f2c230', weight:2.2, opacity:.85, dashArray:'7,5', fillOpacity:.06, fillColor:'#f2c230' });
  });
  dependencias.renderZoneList();
}
function renderAlertasIfOpen(){ if(!alertasOverlay.hidden && alertasTab==='alertas') renderAlertasBody(); }
function renderProntidaoIfOpen(){ if(!alertasOverlay.hidden && alertasTab==='prontidao') renderAlertasBody(); }
function renderAlertasBody(){
  const body = document.getElementById('alertas-body');
  if(alertasTab==='alertas') return renderAlertasTab(body);
  renderProntidaoTab(body);
}
function renderAlertasTab(body){
  body.innerHTML = `
    <button class="admin-btn primary" id="gerar-alerta-btn" style="margin-bottom:14px">🔔 Simular novo alerta meteorológico</button>
    ${dependencias.alertasClimaticos.filter(a=>a.zonasAfetadas.some(dependencias.noRecorte)).map(a=>{
      const minutos = dependencias.minutosDesde(a.emitidoEm);
      const ativo = minutos < a.janelaHoras*60;
      return `<div class="alert-card">
        <span class="alert-nivel" style="background:${dependencias.NIVEL_COLOR[a.nivel]}22;color:${dependencias.NIVEL_COLOR[a.nivel]}">${dependencias.NIVEL_LABEL[a.nivel]}</span>
        <strong style="margin-left:8px">${dependencias.escHtml(a.tipo)}</strong>
        <div class="alert-meta">Fonte: ${dependencias.escHtml(a.fonte)} · emitido há ${minutos} min · janela de ${a.janelaHoras}h · ${ativo?'<span style="color:var(--green)">em vigor</span>':'<span style="color:var(--muted)">expirado</span>'}</div>
        <div class="alert-zonas">${a.zonasAfetadas.filter(dependencias.noRecorte).map(z=>`<span>${dependencias.escHtml(z)}</span>`).join('')}</div>
      </div>`;
    }).join('') || '<div style="color:var(--muted);font-size:12px">Nenhum alerta emitido ainda. Clique no botão acima para simular um.</div>'}
  `;
  document.getElementById('gerar-alerta-btn').onclick = ()=>{ dependencias.gerarAlerta(); renderAlertasTab(body); };
}
function renderProntidaoTab(body){
  const zonasRelevantes = dependencias.bairros.filter(b=> dependencias.noRecorte(b.nome) && dependencias.alertasClimaticos.some(a=>a.zonasAfetadas.includes(b.nome)));
  if(!zonasRelevantes.length){
    body.innerHTML = '<div style="color:var(--muted);font-size:12px">Nenhuma zona em alerta ainda. A prontidão aparece aqui depois que um alerta for emitido.</div>';
    return;
  }
  body.innerHTML = zonasRelevantes.map(b=>{
    const alertasDaZona = dependencias.alertasClimaticos.filter(a=>a.zonasAfetadas.includes(b.nome));
    const ultimoAlerta = alertasDaZona[0];
    const mapa = dependencias.prontidao[ultimoAlerta.id] || {};
    const pessoas = [
      ...dependencias.todosFuncionarios().filter(p=>p.zona===b.nome).map(p=>({id:p.id, nome:p.nome, tipo:dependencias.PAPEL_LABEL[p.papel]})),
      ...dependencias.voluntarios.filter(v=>v.bairro===b.nome).map(v=>({id:v.id, nome:v.nome, tipo:'Colaborador'})),
    ];
    const conf = pessoas.filter(p=> mapa[p.id]?.status==='confirmado').length;
    const indisp = pessoas.filter(p=> mapa[p.id]?.status==='indisponivel').length;
    const pend = pessoas.length - conf - indisp;
    const pct = n => pessoas.length ? (n/pessoas.length*100) : 0;
    return `<div class="prontidao-zone">
      <h4>${dependencias.escHtml(b.nome)} <span style="font-size:10.5px;color:var(--muted);font-family:var(--mono)">· alerta ${dependencias.NIVEL_LABEL[ultimoAlerta.nivel].toLowerCase()} (${dependencias.escHtml(ultimoAlerta.tipo)})</span></h4>
      <div class="prontidao-bar">
        <div style="width:${pct(conf)}%;background:var(--green)"></div>
        <div style="width:${pct(indisp)}%;background:var(--red)"></div>
        <div style="width:${pct(pend)}%;background:var(--muted)"></div>
      </div>
      <div class="prontidao-legend">
        <span><i style="background:var(--green)"></i>Confirmados: ${conf}</span>
        <span><i style="background:var(--red)"></i>Indisponíveis: ${indisp}</span>
        <span><i style="background:var(--muted)"></i>Sem resposta: ${pend}</span>
      </div>
      <div class="prontidao-people">
        ${pessoas.map(p=>{
          const st = mapa[p.id]?.status || 'pendente';
          const cor = st==='confirmado'?'var(--green)':st==='indisponivel'?'var(--red)':'var(--muted)';
          return `<span class="pp-chip" style="color:${cor};border-color:${cor}66">${dependencias.escHtml(p.nome.split(' ')[0])} · ${dependencias.escHtml(p.tipo)}</span>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}
 async function iniciar(){
 (alertasOverlay=document.getElementById('alertas-overlay'));
(alertasTab='alertas');
document.getElementById('open-alertas').onclick = ()=>{ alertasOverlay.hidden=false; renderAlertasBody(); };
document.getElementById('alertas-close').onclick = ()=>{ alertasOverlay.hidden=true; };
alertasOverlay.addEventListener('click', e=>{ if(e.target===alertasOverlay) alertasOverlay.hidden=true; });
document.getElementById('alertas-tabs').querySelectorAll('.mtab').forEach(btn=>{
  btn.onclick = ()=>{
    alertasTab = btn.dataset.tab;
    document.getElementById('alertas-tabs').querySelectorAll('.mtab').forEach(b=>b.classList.toggle('active', b===btn));
    renderAlertasBody();
  };
});
 return true;
 }
 return {iniciar,marcarZonasEmAlerta,get alertasOverlay(){return alertasOverlay;},get alertasTab(){return alertasTab;},set alertasTab(valor){alertasTab=valor;},renderAlertasIfOpen,renderProntidaoIfOpen,renderAlertasBody,renderAlertasTab,renderProntidaoTab};
 }
});
})(globalThis);
