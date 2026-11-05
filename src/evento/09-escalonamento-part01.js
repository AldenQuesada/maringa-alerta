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
