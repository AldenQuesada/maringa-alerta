/* ---------- alerta de SLA / escalonamento ---------- */
const SLA_LIMITE_MIN = 2; // no relogio simulado do prototipo; num evento real seria configuravel (ex. 20-30min)
setInterval(()=>{
  ocorrencias.forEach(o=>{
    if(o.confirmado!==false && o.status==='ativa' && o.gravidade===3 && !o._escalado && minutosDesde(o.reportadoEm) >= SLA_LIMITE_MIN){
      o._escalado = true;
      const zona = bairros.find(b=>b.nome===o.bairro);
      const coord = zona?.equipe?.coordenador;
      if(!coord)return;
      if(!chatHistorico[coord.id]) chatHistorico[coord.id] = [];
      chatHistorico[coord.id].push({ de:'eles', texto:`⚠ SLA excedido: "${o.tipo}" em ${o.bairro} sem confirmação de presença há ${minutosDesde(o.reportadoEm)}min. Precisa de apoio?`, ts: Date.now() });
      renderChatContacts();
      const b = document.getElementById('alert-banner');
      b.style.background = 'rgba(255,59,59,.15)'; b.style.border='1px solid var(--red)'; b.style.color='var(--red)';
      b.textContent = `⏱ SLA excedido: ocorrência de alta gravidade em ${o.bairro} sem confirmação há ${minutosDesde(o.reportadoEm)}min — coordenador notificado`;
      b.classList.add('show');
      setTimeout(()=>b.classList.remove('show'), 6500);
    }
  });
}, 15000);

/* ---------- alertas meteorológicos e pré-ativação ----------
   Fontes e alertas abaixo são simulados. A integração com fontes oficiais depende
   de verificar os canais, os termos e a disponibilidade para cada município. */
const alertaTipos = [
  {tipo:"Chuva intensa", nivel:"laranja"},
  {tipo:"Vendaval / rajadas de vento", nivel:"laranja"},
  {tipo:"Risco de alagamento", nivel:"amarelo"},
  {tipo:"Queda de granizo", nivel:"amarelo"},
  {tipo:"Ciclone extratropical", nivel:"vermelho"},
];
const NIVEL_COLOR = {amarelo:"#f2c230", laranja:"#ff8a3b", vermelho:"#ff3b3b"};
const NIVEL_LABEL = {amarelo:"Atenção", laranja:"Perigo", vermelho:"Grande perigo"};
const fontesAlerta = ["INMET","SIMEPAR","Defesa Civil PR"];

let alertaIdCursor = 1;
const alertasClimaticos = [];
const prontidao = {}; // alertaId -> { pessoaId: {status:'pendente'|'confirmado'|'indisponivel', respondidoEm} }

function pessoaNome(id){
  const f = todosFuncionarios().find(p=>p.id===id); if(f) return f.nome;
  const v = voluntarios.find(x=>x.id===id); if(v) return v.nome;
  return id;
}

function gerarAlerta(){
  const t = pick(alertaTipos);
  const nZonas = Math.floor(rnd(1,4));
  const zonasAfetadas = [...bairros].sort(()=>Math.random()-0.5).slice(0,nZonas).map(b=>b.nome);
  const alerta = {
    id:"al"+(alertaIdCursor++), fonte: pick(fontesAlerta),
    nivel: t.nivel, tipo: t.tipo, zonasAfetadas,
    emitidoEm: Date.now(), janelaHoras: Math.floor(rnd(3,18)),
  };
  alertasClimaticos.unshift(alerta);
  auditPush(alerta.fonte, 'Emitiu alerta meteorológico', `${alerta.tipo} (${NIVEL_LABEL[alerta.nivel]}) em ${zonasAfetadas.join(', ')}`,zonasAfetadas);
  dispararPreAtivacao(alerta);
  return alerta;
}

function dispararPreAtivacao(alerta){
  prontidao[alerta.id] = {};
  const pessoas = [
    ...todosFuncionarios().filter(p=> alerta.zonasAfetadas.includes(p.zona)),
    ...voluntarios.filter(v=> alerta.zonasAfetadas.includes(v.bairro) && ['antes','todos'].includes(v.alertaPreferencia||'todos')),
  ];
  pessoas.forEach(p=>{
    prontidao[alerta.id][p.id] = { status:'pendente', respondidoEm:null };
    if(!chatHistorico[p.id]) chatHistorico[p.id] = [];
    chatHistorico[p.id].push({
      de:'eu',
      texto:`[Alerta ${NIVEL_LABEL[alerta.nivel]} · ${alerta.fonte}] ${alerta.tipo} previsto para sua zona nas próximas ${alerta.janelaHoras}h. Você está disponível para ajudar se a situação piorar?`,
      ts: Date.now(),
    });
    setTimeout(()=>{
      const r = Math.random();
      const status = r<0.55 ? 'confirmado' : r<0.82 ? 'indisponivel' : 'pendente';
      prontidao[alerta.id][p.id] = { status, respondidoEm: status==='pendente'?null:Date.now() };
      if(status!=='pendente'){
        chatHistorico[p.id].push({ de:'eles', texto: status==='confirmado' ? 'Confirmado, estou disponível se precisar.' : 'Não vou conseguir dessa vez, desculpa.', ts: Date.now() });
      }
      renderProntidaoIfOpen();
      renderChatContacts();
    }, 3000 + Math.random()*9000);
  });
  renderAlertasIfOpen();
  renderProntidaoIfOpen();
  showAlertBanner(alerta);
  marcarZonasEmAlerta();
}

function showAlertBanner(alerta){
  const b = document.getElementById('alert-banner');
  b.style.background = NIVEL_COLOR[alerta.nivel]+'22';
  b.style.border = '1px solid '+NIVEL_COLOR[alerta.nivel];
  b.style.color = NIVEL_COLOR[alerta.nivel];
  b.textContent = `🌦 Alerta ${NIVEL_LABEL[alerta.nivel]} (${alerta.fonte}): ${alerta.tipo} em ${alerta.zonasAfetadas.join(', ')} — pré-ativação de equipe disparada`;
  b.classList.add('show');
  setTimeout(()=>b.classList.remove('show'), 6500);
}

function zonasComAlertaAtivo(){
  const agora = Date.now();
  const ativas = new Set();
  alertasClimaticos.forEach(a=>{
    if(agora - a.emitidoEm < a.janelaHoras*3600000) a.zonasAfetadas.forEach(z=>ativas.add(z));
  });
  return ativas;
}

function marcarZonasEmAlerta(){
  const ativas = zonasComAlertaAtivo();
  areas.filter(area=>area.layer).forEach(area=>{
    const emAlerta = [...ativas].some(z=>pertence(area,z));
    area.layer.setStyle(emAlerta
      ? { color:'#ff8a3b', weight:2.8, opacity:.95, dashArray:'3,5', fillOpacity:.1, fillColor:'#ff8a3b' }
      : { color:'#f2c230', weight:2.2, opacity:.85, dashArray:'7,5', fillOpacity:.06, fillColor:'#f2c230' });
  });
  renderZoneList();
}

const alertasOverlay = document.getElementById('alertas-overlay');
let alertasTab = 'alertas';
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
    ${alertasClimaticos.filter(a=>a.zonasAfetadas.some(noRecorte)).map(a=>{
      const minutos = minutosDesde(a.emitidoEm);
      const ativo = minutos < a.janelaHoras*60;
      return `<div class="alert-card">
        <span class="alert-nivel" style="background:${NIVEL_COLOR[a.nivel]}22;color:${NIVEL_COLOR[a.nivel]}">${NIVEL_LABEL[a.nivel]}</span>
        <strong style="margin-left:8px">${escHtml(a.tipo)}</strong>
        <div class="alert-meta">Fonte: ${escHtml(a.fonte)} · emitido há ${minutos} min · janela de ${a.janelaHoras}h · ${ativo?'<span style="color:var(--green)">em vigor</span>':'<span style="color:var(--muted)">expirado</span>'}</div>
        <div class="alert-zonas">${a.zonasAfetadas.filter(noRecorte).map(z=>`<span>${escHtml(z)}</span>`).join('')}</div>
      </div>`;
    }).join('') || '<div style="color:var(--muted);font-size:12px">Nenhum alerta emitido ainda. Clique no botão acima para simular um.</div>'}
  `;
  document.getElementById('gerar-alerta-btn').onclick = ()=>{ gerarAlerta(); renderAlertasTab(body); };
}

function renderProntidaoTab(body){
  const zonasRelevantes = bairros.filter(b=> noRecorte(b.nome) && alertasClimaticos.some(a=>a.zonasAfetadas.includes(b.nome)));
  if(!zonasRelevantes.length){
    body.innerHTML = '<div style="color:var(--muted);font-size:12px">Nenhuma zona em alerta ainda. A prontidão aparece aqui depois que um alerta for emitido.</div>';
    return;
  }
  body.innerHTML = zonasRelevantes.map(b=>{
    const alertasDaZona = alertasClimaticos.filter(a=>a.zonasAfetadas.includes(b.nome));
    const ultimoAlerta = alertasDaZona[0];
    const mapa = prontidao[ultimoAlerta.id] || {};
    const pessoas = [
      ...todosFuncionarios().filter(p=>p.zona===b.nome).map(p=>({id:p.id, nome:p.nome, tipo:PAPEL_LABEL[p.papel]})),
      ...voluntarios.filter(v=>v.bairro===b.nome).map(v=>({id:v.id, nome:v.nome, tipo:'Colaborador'})),
    ];
    const conf = pessoas.filter(p=> mapa[p.id]?.status==='confirmado').length;
    const indisp = pessoas.filter(p=> mapa[p.id]?.status==='indisponivel').length;
    const pend = pessoas.length - conf - indisp;
    const pct = n => pessoas.length ? (n/pessoas.length*100) : 0;
    return `<div class="prontidao-zone">
      <h4>${escHtml(b.nome)} <span style="font-size:10.5px;color:var(--muted);font-family:var(--mono)">· alerta ${NIVEL_LABEL[ultimoAlerta.nivel].toLowerCase()} (${escHtml(ultimoAlerta.tipo)})</span></h4>
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
          return `<span class="pp-chip" style="color:${cor};border-color:${cor}66">${escHtml(p.nome.split(' ')[0])} · ${escHtml(p.tipo)}</span>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}

