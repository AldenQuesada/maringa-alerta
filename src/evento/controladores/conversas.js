/* Controlador conversas: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('conversas',{
 dependencias:{
  "escHtml": "contexto",
  "ocorrencias": "cadastro-territorial",
  "voluntarios": "cadastro-territorial",
  "map": "mapa",
  "rebuildHeat": "mapa",
  "ocIcon": "mapa",
  "refreshOcTooltip": "mapa",
  "renderZoneList": "recorte",
  "applyZoneVisibility": "recorte",
  "localizacoes": "pessoas",
  "posicaoAtual": "pessoas",
  "atualizarPontoAoVivo": "pessoas",
  "pararLocalizacao": "pessoas",
  "checkInValido": "pessoas",
  "renderCollaborators": "painel-colaboradores",
  "currentPanelOcId": "ocorrencias",
  "openOcorrencia": "ocorrencias",
  "updateKpis": "resumo",
  "filaOverlay": "triagem",
  "renderFila": "triagem",
  "chatOverlay": "mensagens",
  "chatHistorico": "mensagens",
  "chatContatoAtivo": "mensagens",
  "renderChatContacts": "mensagens",
  "renderChatMessages": "mensagens",
  "relatorioOverlay": "relatorio",
  "renderRelatorioEvento": "relatorio",
  "iniciarLocalizacao": "localizacao",
  "salvarPrototipo": "persistencia"
},
 criar(dependencias){
 let whatsappContexto,estadoPronto,ultimaSerializacao,PARTICIPACAO_LABEL;
 function registrarEtapa(o, tipo, texto){
  o.timeline = o.timeline || [];
  o.timeline.push({tipo, texto, ts:Date.now()});
}
function enviarMensagemDemo(id, texto, o, tipo='sistema', pessoa=false){
  dependencias.chatHistorico[id] = dependencias.chatHistorico[id] || [];
  dependencias.chatHistorico[id].push({de:pessoa?'eles':'eu', texto, ts:Date.now(), ocorrenciaId:o.id, tipo, pessoa});
}
function estadoPessoa(id){
  const participacoes = dependencias.ocorrencias.flatMap(o=>o.participacoes||[]).filter(p=>p.voluntarioId===id);
  if(participacoes.some(p=>p.status==='no_local')) return 'no local';
  if(participacoes.some(p=>p.status==='convidado')) return 'convidado';
  return 'disponível';
}
function acionarAjuda(o, candidatos=dependencias.voluntarios){
  if(o.atendimentoEquipe && o.atendimentoEquipe.status!=='concluida')return {ok:true,novos:[]};
  const resultado = AlertaFluxo.ativar(o, candidatos.filter(v=>v.bairro===o.bairro), dependencias.ocorrencias, {
    agora:Date.now(), limite:2, distancia:(v,oc)=>dependencias.map.distance(v.pos,oc.pos)
  });
  if(!o.responsavelAvisadoEm&&o.responsavel?.id!=='sem-responsavel'){
    o.responsavelAvisadoEm=Date.now();
    registrarEtapa(o,'responsavel','Responsável da região avisado automaticamente');
    enviarMensagemDemo(o.responsavel.id,`Ocorrência confirmada: ${o.tipo}, ${o.bairro}. Protocolo ${o.protocolo}. O sistema já iniciou o acionamento conforme a necessidade.`,o,'aviso_regional');
  }
  (resultado.novos||[]).forEach(id=>{
    const v=dependencias.voluntarios.find(p=>p.id===id);
    if(!v) return;
    enviarMensagemDemo(id,`Olá, ${v.nome.split(' ')[0]}. Há uma ocorrência confirmada em ${o.bairro}: ${o.tipo}.\n\nLocal: ponto indicado no mapa · ${o.protocolo}.\n${o.orientacaoAjuda||""}\nResponsável: ${o.responsavel.nome}, ${o.responsavel.tel}.\n\nSe puder ajudar, confirme quando chegar. Ao terminar, é só avisar por aqui.`,o,'convite');
    registrarEtapa(o,'convite',`Convite enviado a ${v.nome}`);
  });
  if(resultado.ok && !resultado.resolvida && (resultado.encaminhamentoEspecializado || resultado.faltam>0) && !o.atendimentoEquipe){
    const especial=o.encaminhamentoEspecializado;
    o.pendenciaTecnica=true;
    o.atendimentoEquipe={id:`equipe:${o.id}`, nome:especial?.servico || 'Equipe municipal de apoio', status:'acionada'};
    enviarMensagemDemo(o.atendimentoEquipe.id,`Acionamento de demonstração: ${o.tipo}, ${o.bairro}.\nProtocolo ${o.protocolo}.\n${especial?.motivo || 'Não há voluntários disponíveis suficientes. A equipe municipal foi acionada para completar o atendimento, e o responsável regional já foi avisado.'}\n\nConfirme a chegada e o término por aqui.`,o,'encaminhamento');
    registrarEtapa(o,'encaminhamento',`${o.atendimentoEquipe.nome}: encaminhamento simulado registrado`);
  }
  AlertaFluxo.sincronizarDisponibilidade(dependencias.voluntarios,dependencias.ocorrencias);
  return resultado;
}
function calcularTempos(o){
  if(o.status!=='resolvida') return;
  o.resolvidoEm=o.resolvidoEm||Date.now();
  o.tempoChegada=Math.max(0,Math.round(((o.confirmadoEm||o.resolvidoEm)-o.reportadoEm)/60000));
  o.tempoAtendimento=Math.max(0,Math.round((o.resolvidoEm-(o.confirmadoEm||o.resolvidoEm))/60000));
  o.tempoReal=o.tempoChegada+o.tempoAtendimento;
}
function atualizarFluxo(){
  AlertaFluxo.sincronizarDisponibilidade(dependencias.voluntarios,dependencias.ocorrencias);
  dependencias.voluntarios.forEach(v=>dependencias.atualizarPontoAoVivo(v.id));
  dependencias.ocorrencias.forEach(o=>{
    calcularTempos(o);
    if(o.marker){o.marker.setIcon(dependencias.ocIcon(o.status));dependencias.refreshOcTooltip(o);}
  });
  dependencias.applyZoneVisibility();dependencias.updateKpis();dependencias.renderZoneList();dependencias.rebuildHeat();dependencias.renderChatContacts();
  if(dependencias.currentPanelOcId){const o=dependencias.ocorrencias.find(x=>x.id===dependencias.currentPanelOcId);if(o)dependencias.openOcorrencia(o);}
  if(dependencias.chatContatoAtivo && !dependencias.chatOverlay.hidden) dependencias.renderChatMessages(dependencias.chatContatoAtivo);
  if(!dependencias.filaOverlay.hidden)dependencias.renderFila();
  if(!dependencias.relatorioOverlay.hidden)dependencias.renderRelatorioEvento();
  dependencias.salvarPrototipo();
}
function participantesDaConversa(o){
  const pessoas=(o.participacoes||[]).map(p=>{
    const v=dependencias.voluntarios.find(x=>x.id===p.voluntarioId);
    return v?{id:v.id,nome:v.nome,status:p.status}:null;
  }).filter(Boolean);
  if(o.atendimentoEquipe) pessoas.push({id:o.atendimentoEquipe.id,nome:o.atendimentoEquipe.nome,status:o.atendimentoEquipe.status});
  return pessoas;
}
function abrirWhatsapp(o, pessoaId){
  const pessoas=participantesDaConversa(o);
  const pessoa=pessoas.find(p=>p.id===pessoaId)||pessoas.find(p=>p.status==='convidado'||p.status==='acionada')||pessoas[0];
  if(!pessoa)return;
  whatsappContexto={ocorrenciaId:o.id,pessoaId:pessoa.id};
  document.getElementById('whatsapp-overlay').hidden=false;
  renderWhatsapp();
}
function renderWhatsapp(){
  if(!whatsappContexto)return;
  const o=dependencias.ocorrencias.find(x=>x.id===whatsappContexto.ocorrenciaId);
  if(!o)return;
  const pessoas=participantesDaConversa(o), pessoa=pessoas.find(p=>p.id===whatsappContexto.pessoaId);
  if(!pessoa)return;
  document.getElementById('wa-demo-protocolo').textContent=`${o.protocolo} · ${o.bairro}`;
  const select=document.getElementById('wa-demo-pessoa');
  select.innerHTML=pessoas.map(p=>`<option value="${dependencias.escHtml(p.id)}">${dependencias.escHtml(p.nome)}</option>`).join('');
  select.value=pessoa.id;
  select.onchange=()=>{whatsappContexto.pessoaId=select.value;renderWhatsapp();};
  const box=document.getElementById('wa-demo-messages');
  const mensagens=(dependencias.chatHistorico[pessoa.id]||[]).filter(m=>m.ocorrenciaId===o.id);
  box.innerHTML=mensagens.map(m=>`<div class="wa-message${m.pessoa?' pessoa':''}">${dependencias.escHtml(m.texto)}<time>${new Date(m.ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</time></div>`).join('');
  box.scrollTop=box.scrollHeight;
  const chegou=pessoa.status==='no_local', terminou=pessoa.status==='concluida';
  document.getElementById('wa-cheguei').disabled=chegou||terminou||pessoa.status==='recusada'||o.status==='resolvida';
  document.getElementById('wa-terminei').disabled=!chegou;
  document.getElementById('wa-demo-status').textContent=terminou?'Obrigado! Sua participação terminou.':chegou?'Presença registrada. Quando terminar, avise por aqui.':'Confirme ao chegar. O responsável da região já foi avisado.';
  const gps=document.getElementById('wa-localizacao');
  const individual=dependencias.voluntarios.some(v=>v.id===pessoa.id);
  const compartilhando=dependencias.localizacoes.get(pessoa.id)?.ocorrenciaId===o.id;
  gps.hidden=!individual||terminou||pessoa.status==='recusada'||o.status==='resolvida';
  gps.textContent=compartilhando?'Parar localização':'Ativar localização';
  gps.setAttribute('aria-pressed',String(compartilhando));
  gps.onclick=()=>{
    if(compartilhando){
      dependencias.pararLocalizacao(pessoa.id);
      dependencias.renderCollaborators();renderWhatsapp();
    }else dependencias.iniciarLocalizacao(o,pessoa.id);
  };
  if(individual&&!chegou&&!terminou&&pessoa.status!=='recusada'&&o.status!=='resolvida'){
    document.getElementById('wa-cheguei').disabled=!dependencias.checkInValido(o,pessoa.id);
    const atual=dependencias.posicaoAtual(pessoa.id);
    document.getElementById('wa-demo-status').textContent=dependencias.checkInValido(o,pessoa.id)
      ? 'Localização confirmada no local. Toque em Cheguei.'
      : !compartilhando?'Ative a localização deste dispositivo para fazer o check-in.'
      : !atual?'Aguardando um sinal de localização recente.'
      : `Check-in indisponível. Distância aproximada: ${Math.round(dependencias.map.distance(atual.pos,o.pos))} m. Aproxime-se do ponto da ocorrência e aguarde uma posição precisa.`;
  }
  const proxima=dependencias.ocorrencias.find(x=>x.id!==o.id && (x.participacoes||[]).some(p=>p.voluntarioId===pessoa.id&&p.status==='convidado'));
  const proximoBtn=document.getElementById('wa-demo-next');
  proximoBtn.hidden=!terminou||!proxima;
  if(proxima){proximoBtn.textContent=`Ver outro convite · ${proxima.bairro}`;proximoBtn.onclick=()=>abrirWhatsapp(proxima,pessoa.id);}
  document.getElementById('wa-demo-input').placeholder='Escreva Cheguei ou Terminei';
}
 async function iniciar(){
 (whatsappContexto=null);
(estadoPronto=false);
(ultimaSerializacao=null);
(PARTICIPACAO_LABEL={convidado:'Convite enviado', no_local:'No local', concluida:'Ajuda concluída', recusada:'Não pode ir'});
 return true;
 }
 return {iniciar,get whatsappContexto(){return whatsappContexto;},set whatsappContexto(valor){whatsappContexto=valor;},get estadoPronto(){return estadoPronto;},set estadoPronto(valor){estadoPronto=valor;},get ultimaSerializacao(){return ultimaSerializacao;},set ultimaSerializacao(valor){ultimaSerializacao=valor;},get PARTICIPACAO_LABEL(){return PARTICIPACAO_LABEL;},registrarEtapa,enviarMensagemDemo,estadoPessoa,acionarAjuda,calcularTempos,atualizarFluxo,participantesDaConversa,abrirWhatsapp,renderWhatsapp};
 }
});
})(globalThis);
