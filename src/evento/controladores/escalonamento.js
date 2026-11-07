/* Controlador escalonamento: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('escalonamento',{
 dependencias:{
  "rnd": "contexto",
  "pick": "contexto",
  "minutosDesde": "contexto",
  "bairros": "regioes",
  "todosFuncionarios": "regioes",
  "ocorrencias": "cadastro-territorial",
  "voluntarios": "cadastro-territorial",
  "marcarZonasEmAlerta": "prontidao",
  "renderAlertasIfOpen": "prontidao",
  "renderProntidaoIfOpen": "prontidao",
  "chatHistorico": "mensagens",
  "renderChatContacts": "mensagens",
  "auditPush": "trilha"
},
 criar(dependencias){
 let SLA_LIMITE_MIN,alertaTipos,NIVEL_COLOR,NIVEL_LABEL,fontesAlerta,alertaIdCursor,alertasClimaticos,prontidao;
 function pessoaNome(id){
  const f = dependencias.todosFuncionarios().find(p=>p.id===id); if(f) return f.nome;
  const v = dependencias.voluntarios.find(x=>x.id===id); if(v) return v.nome;
  return id;
}
function gerarAlerta(){
  const t = dependencias.pick(alertaTipos);
  const nZonas = Math.floor(dependencias.rnd(1,4));
  const zonasAfetadas = [...dependencias.bairros].sort(()=>Math.random()-0.5).slice(0,nZonas).map(b=>b.nome);
  const alerta = {
    id:"al"+(alertaIdCursor++), fonte: dependencias.pick(fontesAlerta),
    nivel: t.nivel, tipo: t.tipo, zonasAfetadas,
    emitidoEm: Date.now(), janelaHoras: Math.floor(dependencias.rnd(3,18)),
  };
  alertasClimaticos.unshift(alerta);
  dependencias.auditPush(alerta.fonte, 'Emitiu alerta meteorológico', `${alerta.tipo} (${NIVEL_LABEL[alerta.nivel]}) em ${zonasAfetadas.join(', ')}`,zonasAfetadas);
  dispararPreAtivacao(alerta);
  return alerta;
}
function dispararPreAtivacao(alerta){
  prontidao[alerta.id] = {};
  const pessoas = [
    ...dependencias.todosFuncionarios().filter(p=> alerta.zonasAfetadas.includes(p.zona)),
    ...dependencias.voluntarios.filter(v=> alerta.zonasAfetadas.includes(v.bairro) && ['antes','todos'].includes(v.alertaPreferencia||'todos')),
  ];
  pessoas.forEach(p=>{
    prontidao[alerta.id][p.id] = { status:'pendente', respondidoEm:null };
    if(!dependencias.chatHistorico[p.id]) dependencias.chatHistorico[p.id] = [];
    dependencias.chatHistorico[p.id].push({
      de:'eu',
      texto:`[Alerta ${NIVEL_LABEL[alerta.nivel]} · ${alerta.fonte}] ${alerta.tipo} previsto para sua zona nas próximas ${alerta.janelaHoras}h. Você está disponível para ajudar se a situação piorar?`,
      ts: Date.now(),
    });
    setTimeout(()=>{
      const r = Math.random();
      const status = r<0.55 ? 'confirmado' : r<0.82 ? 'indisponivel' : 'pendente';
      prontidao[alerta.id][p.id] = { status, respondidoEm: status==='pendente'?null:Date.now() };
      if(status!=='pendente'){
        dependencias.chatHistorico[p.id].push({ de:'eles', texto: status==='confirmado' ? 'Confirmado, estou disponível se precisar.' : 'Não vou conseguir dessa vez, desculpa.', ts: Date.now() });
      }
      dependencias.renderProntidaoIfOpen();
      dependencias.renderChatContacts();
    }, 3000 + Math.random()*9000);
  });
  dependencias.renderAlertasIfOpen();
  dependencias.renderProntidaoIfOpen();
  showAlertBanner(alerta);
  dependencias.marcarZonasEmAlerta();
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
 async function iniciar(){
 (SLA_LIMITE_MIN=2);
setInterval(()=>{
  dependencias.ocorrencias.forEach(o=>{
    if(o.confirmado!==false && o.status==='ativa' && o.gravidade===3 && !o._escalado && dependencias.minutosDesde(o.reportadoEm) >= SLA_LIMITE_MIN){
      o._escalado = true;
      const zona = dependencias.bairros.find(b=>b.nome===o.bairro);
      const coord = zona?.equipe?.coordenador;
      if(!coord)return;
      if(!dependencias.chatHistorico[coord.id]) dependencias.chatHistorico[coord.id] = [];
      dependencias.chatHistorico[coord.id].push({ de:'eles', texto:`⚠ SLA excedido: "${o.tipo}" em ${o.bairro} sem confirmação de presença há ${dependencias.minutosDesde(o.reportadoEm)}min. Precisa de apoio?`, ts: Date.now() });
      dependencias.renderChatContacts();
      const b = document.getElementById('alert-banner');
      b.style.background = 'rgba(255,59,59,.15)'; b.style.border='1px solid var(--red)'; b.style.color='var(--red)';
      b.textContent = `⏱ SLA excedido: ocorrência de alta gravidade em ${o.bairro} sem confirmação há ${dependencias.minutosDesde(o.reportadoEm)}min — coordenador notificado`;
      b.classList.add('show');
      setTimeout(()=>b.classList.remove('show'), 6500);
    }
  });
}, 15000);
(alertaTipos=[
  {tipo:"Chuva intensa", nivel:"laranja"},
  {tipo:"Vendaval / rajadas de vento", nivel:"laranja"},
  {tipo:"Risco de alagamento", nivel:"amarelo"},
  {tipo:"Queda de granizo", nivel:"amarelo"},
  {tipo:"Ciclone extratropical", nivel:"vermelho"},
]);
(NIVEL_COLOR={amarelo:"#f2c230", laranja:"#ff8a3b", vermelho:"#ff3b3b"});
(NIVEL_LABEL={amarelo:"Atenção", laranja:"Perigo", vermelho:"Grande perigo"});
(fontesAlerta=["INMET","SIMEPAR","Defesa Civil PR"]);
(alertaIdCursor=1);
(alertasClimaticos=[]);
(prontidao={});
 return true;
 }
 return {iniciar,get SLA_LIMITE_MIN(){return SLA_LIMITE_MIN;},get alertaTipos(){return alertaTipos;},get NIVEL_COLOR(){return NIVEL_COLOR;},get NIVEL_LABEL(){return NIVEL_LABEL;},get fontesAlerta(){return fontesAlerta;},get alertaIdCursor(){return alertaIdCursor;},set alertaIdCursor(valor){alertaIdCursor=valor;},get alertasClimaticos(){return alertasClimaticos;},get prontidao(){return prontidao;},pessoaNome,gerarAlerta,dispararPreAtivacao,showAlertBanner,zonasComAlertaAtivo};
 }
});
})(globalThis);
