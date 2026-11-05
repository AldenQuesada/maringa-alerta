/* ---------- fluxo simples de ajuda e WhatsApp de demonstracao ---------- */
let whatsappContexto = null;
let estadoPronto = false;
let ultimaSerializacao = null;
const PARTICIPACAO_LABEL = {convidado:'Convite enviado', no_local:'No local', concluida:'Ajuda concluída', recusada:'Não pode ir'};

function registrarEtapa(o, tipo, texto){
  o.timeline = o.timeline || [];
  o.timeline.push({tipo, texto, ts:Date.now()});
}

function enviarMensagemDemo(id, texto, o, tipo='sistema', pessoa=false){
  chatHistorico[id] = chatHistorico[id] || [];
  chatHistorico[id].push({de:pessoa?'eles':'eu', texto, ts:Date.now(), ocorrenciaId:o.id, tipo, pessoa});
}

function estadoPessoa(id){
  const participacoes = ocorrencias.flatMap(o=>o.participacoes||[]).filter(p=>p.voluntarioId===id);
  if(participacoes.some(p=>p.status==='no_local')) return 'no local';
  if(participacoes.some(p=>p.status==='convidado')) return 'convidado';
  return 'disponível';
}

function acionarAjuda(o, candidatos=voluntarios){
  if(o.atendimentoEquipe && o.atendimentoEquipe.status!=='concluida')return {ok:true,novos:[]};
  const resultado = AlertaFluxo.ativar(o, candidatos.filter(v=>v.bairro===o.bairro), ocorrencias, {
    agora:Date.now(), limite:2, distancia:(v,oc)=>map.distance(v.pos,oc.pos)
  });
  if(!o.responsavelAvisadoEm&&o.responsavel?.id!=='sem-responsavel'){
    o.responsavelAvisadoEm=Date.now();
    registrarEtapa(o,'responsavel','Responsável da região avisado automaticamente');
    enviarMensagemDemo(o.responsavel.id,`Ocorrência confirmada: ${o.tipo}, ${o.bairro}. Protocolo ${o.protocolo}. O sistema já iniciou o acionamento conforme a necessidade.`,o,'aviso_regional');
  }
  (resultado.novos||[]).forEach(id=>{
    const v=voluntarios.find(p=>p.id===id);
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
  AlertaFluxo.sincronizarDisponibilidade(voluntarios,ocorrencias);
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
  AlertaFluxo.sincronizarDisponibilidade(voluntarios,ocorrencias);
  voluntarios.forEach(v=>atualizarPontoAoVivo(v.id));
  ocorrencias.forEach(o=>{
    calcularTempos(o);
    if(o.marker){o.marker.setIcon(ocIcon(o.status));refreshOcTooltip(o);}
  });
  applyZoneVisibility();updateKpis();renderZoneList();rebuildHeat();renderChatContacts();
  if(currentPanelOcId){const o=ocorrencias.find(x=>x.id===currentPanelOcId);if(o)openOcorrencia(o);}
  if(chatContatoAtivo && !chatOverlay.hidden) renderChatMessages(chatContatoAtivo);
  if(!filaOverlay.hidden)renderFila();
  if(!relatorioOverlay.hidden)renderRelatorioEvento();
  salvarPrototipo();
}

function participantesDaConversa(o){
  const pessoas=(o.participacoes||[]).map(p=>{
    const v=voluntarios.find(x=>x.id===p.voluntarioId);
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
  const o=ocorrencias.find(x=>x.id===whatsappContexto.ocorrenciaId);
  if(!o)return;
  const pessoas=participantesDaConversa(o), pessoa=pessoas.find(p=>p.id===whatsappContexto.pessoaId);
  if(!pessoa)return;
  document.getElementById('wa-demo-protocolo').textContent=`${o.protocolo} · ${o.bairro}`;
  const select=document.getElementById('wa-demo-pessoa');
  select.innerHTML=pessoas.map(p=>`<option value="${escHtml(p.id)}">${escHtml(p.nome)}</option>`).join('');
  select.value=pessoa.id;
  select.onchange=()=>{whatsappContexto.pessoaId=select.value;renderWhatsapp();};
  const box=document.getElementById('wa-demo-messages');
  const mensagens=(chatHistorico[pessoa.id]||[]).filter(m=>m.ocorrenciaId===o.id);
  box.innerHTML=mensagens.map(m=>`<div class="wa-message${m.pessoa?' pessoa':''}">${escHtml(m.texto)}<time>${new Date(m.ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</time></div>`).join('');
  box.scrollTop=box.scrollHeight;
  const chegou=pessoa.status==='no_local', terminou=pessoa.status==='concluida';
  document.getElementById('wa-cheguei').disabled=chegou||terminou||pessoa.status==='recusada'||o.status==='resolvida';
  document.getElementById('wa-terminei').disabled=!chegou;
  document.getElementById('wa-demo-status').textContent=terminou?'Obrigado! Sua participação terminou.':chegou?'Presença registrada. Quando terminar, avise por aqui.':'Confirme ao chegar. O responsável da região já foi avisado.';
  const gps=document.getElementById('wa-localizacao');
  const individual=voluntarios.some(v=>v.id===pessoa.id);
  const compartilhando=localizacoes.get(pessoa.id)?.ocorrenciaId===o.id;
  gps.hidden=!individual||terminou||pessoa.status==='recusada'||o.status==='resolvida';
  gps.textContent=compartilhando?'Parar localização':'Ativar localização';
  gps.setAttribute('aria-pressed',String(compartilhando));
  gps.onclick=()=>{
    if(compartilhando){
      pararLocalizacao(pessoa.id);
      renderCollaborators();renderWhatsapp();
    }else iniciarLocalizacao(o,pessoa.id);
  };
  if(individual&&!chegou&&!terminou&&pessoa.status!=='recusada'&&o.status!=='resolvida'){
    document.getElementById('wa-cheguei').disabled=!checkInValido(o,pessoa.id);
    const atual=posicaoAtual(pessoa.id);
    document.getElementById('wa-demo-status').textContent=checkInValido(o,pessoa.id)
      ? 'Localização confirmada no local. Toque em Cheguei.'
      : !compartilhando?'Ative a localização deste dispositivo para fazer o check-in.'
      : !atual?'Aguardando um sinal de localização recente.'
      : `Check-in indisponível. Distância aproximada: ${Math.round(map.distance(atual.pos,o.pos))} m. Aproxime-se do ponto da ocorrência e aguarde uma posição precisa.`;
  }
  const proxima=ocorrencias.find(x=>x.id!==o.id && (x.participacoes||[]).some(p=>p.voluntarioId===pessoa.id&&p.status==='convidado'));
  const proximoBtn=document.getElementById('wa-demo-next');
  proximoBtn.hidden=!terminou||!proxima;
  if(proxima){proximoBtn.textContent=`Ver outro convite · ${proxima.bairro}`;proximoBtn.onclick=()=>abrirWhatsapp(proxima,pessoa.id);}
  document.getElementById('wa-demo-input').placeholder='Escreva Cheguei ou Terminei';
}

function iniciarLocalizacao(o,id){
  if(!navigator.geolocation){
    document.getElementById('wa-demo-status').textContent='Localização indisponível neste dispositivo.';
    return;
  }
  localizacoes.forEach((_,pessoaId)=>pararLocalizacao(pessoaId));
  const sessao={ocorrenciaId:o.id};
  localizacoes.set(id,sessao);
  const atualizar=()=>{
    atualizarPontoAoVivo(id);
    renderCollaborators();
    if(whatsappContexto?.pessoaId===id && whatsappContexto.ocorrenciaId===o.id) renderWhatsapp();
  };
  sessao.watch=navigator.geolocation.watchPosition(({coords,timestamp})=>{
    if(localizacoes.get(id)!==sessao)return;
    Object.assign(sessao,{pos:[coords.latitude,coords.longitude],precisao:coords.accuracy,ts:timestamp});
    clearTimeout(sessao.expiracao);
    sessao.expiracao=setTimeout(atualizar,Math.max(1,timestamp+VALIDADE_GPS_MS-Date.now()+1));
    atualizar();
  },erro=>{
    if(localizacoes.get(id)!==sessao)return;
    pararLocalizacao(id);
    atualizar();
    if(whatsappContexto?.pessoaId===id && whatsappContexto.ocorrenciaId===o.id){
      document.getElementById('wa-demo-status').textContent=erro.code===1?'Permissão de localização negada.':'Sinal de localização indisponível. Tente novamente.';
    }
  },{enableHighAccuracy:true,maximumAge:0,timeout:20000});
  renderWhatsapp();
}

function confirmarWhatsApp(acao){
  if(!whatsappContexto)return;
  const o=ocorrencias.find(x=>x.id===whatsappContexto.ocorrenciaId), id=whatsappContexto.pessoaId;
  if(!o)return;
  const equipe=o.atendimentoEquipe?.id===id?o.atendimentoEquipe:null;
  const pessoa=participantesDaConversa(o).find(p=>p.id===id);
  if(!pessoa)return;
  let resultado;
  if(equipe){
    if(acao==='cheguei'){
      if(equipe.status!=='acionada')return;
      equipe.status='no_local';equipe.chegouEm=Date.now();
      o.status='em_atendimento';o.confirmadoEm=o.confirmadoEm||Date.now();
    }else{
      if(equipe.status!=='no_local')return;
      equipe.status='concluida';equipe.terminouEm=Date.now();
      if(o.encaminhamentoEspecializado)o.encaminhamentoEspecializado.status='concluido';
      o.pendenciaTecnica=false;
      const pendente=(o.participacoes||[]).some(p=>p.status==='convidado'||p.status==='no_local');
      if(!pendente){o.status='resolvida';o.resolvidoEm=Date.now();}
    }
    resultado={ok:true};
  }else{
    const antes=(o.participacoes||[]).find(p=>p.voluntarioId===id)?.status;
    if(acao==='cheguei'&&antes!=='convidado')return;
    if(acao==='cheguei'&&!checkInValido(o,id)){
      document.getElementById('wa-demo-status').textContent='O check-in exige localização ativa e posição confirmada no local.';
      return;
    }
    if(acao==='terminei'&&antes!=='no_local')return;
    resultado=acao==='cheguei'?AlertaFluxo.chegar(o,id,Date.now()):AlertaFluxo.terminar(o,id,Date.now());
  }
  if(!resultado.ok){document.getElementById('wa-demo-status').textContent=resultado.motivo||'Esta confirmação já foi registrada.';return;}
  if(!equipe){
    if(acao==='cheguei') o.participacoes.find(p=>p.voluntarioId===id).checkInGPS=true;
    else pararLocalizacao(id);
  }
  enviarMensagemDemo(id,acao==='cheguei'?'Cheguei':'Terminei',o,acao,true);
  enviarMensagemDemo(id,acao==='cheguei'?'Chegada registrada. Obrigado por ajudar.':'Obrigado pela ajuda! Sua participação foi encerrada.',o,'resposta');
  registrarEtapa(o,acao,`${pessoa.nome}: ${acao==='cheguei'?'chegada confirmada':'ajuda concluída'}`);
  auditPush(pessoa.nome,acao==='cheguei'?'Chegada pelo WhatsApp simulado':'Término pelo WhatsApp simulado',o.protocolo,[o.bairro]);
  AlertaFluxo.sincronizarDisponibilidade(voluntarios,ocorrencias);
  if(acao==='terminei'&&!equipe){
    const v=voluntarios.find(x=>x.id===id);
    if(v){
      const abertas=ocorrencias.filter(x=>x.id!==o.id&&['ativa','em_atendimento'].includes(x.status)).sort((a,b)=>AlertaFluxo.prioridade(b)-AlertaFluxo.prioridade(a));
      for(const outra of abertas){
        const convite=acionarAjuda(outra,[v]);
        if((convite.novos||[]).includes(id)){
          enviarMensagemDemo(id,`Há outra ocorrência em ${outra.bairro} precisando de ajuda. Se puder continuar, veja o novo convite ${outra.protocolo}.`,o,'proximo_convite');
          break;
        }
      }
    }
  }
  atualizarFluxo();renderWhatsapp();
}

function renderAnexos(o){
  const r=o.relatorio||{};
  return `<details class="optional-report"><summary>Fotos e observações opcionais</summary><div class="report-form">
    <p class="demo-caption">Estes registros complementam o atendimento. Não são necessários para confirmar o término da ajuda.</p>
    <div class="field"><label for="foto-atual">Foto da situação inicial</label><input type="file" accept="image/*" id="foto-atual" class="file-in"></div>
    <div class="field"><label for="foto-final">Foto da situação final</label><input type="file" accept="image/*" id="foto-final" class="file-in"></div>
    <div class="field"><label for="pendencias">Observações e necessidades restantes</label><textarea id="pendencias" rows="2" class="file-in" placeholder="Opcional">${escHtml(r.pendencias||'')}</textarea></div>
    <label style="font-size:11px;display:flex;gap:7px;align-items:flex-start;margin-bottom:12px"><input type="checkbox" id="fotos-publicas"${r.fotosPublicas?' checked':''}>Mostrar as fotos no status público desta demonstração</label>
    <button class="admin-btn" id="report-submit">Salvar complemento</button><div id="report-err" class="demo-caption" role="status"></div>
    <div class="attachment-previews">${r.fotoAtual?`<img src="${r.fotoAtual}" alt="Situação inicial registrada">`:''}${r.fotoFinal?`<img src="${r.fotoFinal}" alt="Situação final registrada">`:''}</div>
  </div></details>`;
}

function salvarAnexos(o){
  const arquivos=[document.getElementById('foto-atual').files[0],document.getElementById('foto-final').files[0]];
  const err=document.getElementById('report-err');
  if(arquivos.some(f=>f&&(!f.type.startsWith('image/')||f.size>1500000))){err.textContent='Escolha imagens de até 1,5 MB para este protótipo. Sua participação não depende destes anexos.';return;}
  const ler=f=>f?new Promise((res,rej)=>{const reader=new FileReader();reader.onload=()=>res(reader.result);reader.onerror=rej;reader.readAsDataURL(f);}):Promise.resolve(null);
  const pendencias=document.getElementById('pendencias').value.trim();
  const fotosPublicas=document.getElementById('fotos-publicas').checked;
  Promise.all(arquivos.map(ler)).then(([inicial,final])=>{
    const r=o.relatorio||{};
    o.relatorio={fotoAtual:inicial||r.fotoAtual||null,fotoFinal:final||r.fotoFinal||null,pendencias,fotosPublicas,preenchidoPor:o.responsavel.nome,enviadoEm:Date.now()};
    registrarEtapa(o,'complemento','Complemento opcional salvo');
    if(pendencias){
      enviarMensagemDemo(o.responsavel.id,`Necessidade/observação em ${o.protocolo}: ${pendencias}`,o,'pendencia');
      registrarEtapa(o,'pendencia','Observação encaminhada automaticamente ao responsável');
    }
    salvarPrototipo();openOcorrencia(o);
  }).catch(()=>{err.textContent='Não foi possível ler a imagem. Você pode tentar novamente; isso não impede o término da ajuda.';});
}

function salvarPrototipo(){
  if(!estadoPronto)return;
  try{
    const dados={versao:1,tenantId,idCounter,eventStart,
      voluntarios:voluntarios.map(({marker,...v})=>v),
      ocorrencias:ocorrencias.map(({marker,responsavel,...o})=>({...o,responsavelId:responsavel?.id})),
      chatHistorico,alertasClimaticos,prontidao,alertaIdCursor};
    const serializado=JSON.stringify(dados);
    if(serializado===ultimaSerializacao)return true;
    if(localStorage.getItem(storageKey('operacao'))!==ultimaSerializacao){
      const aviso=document.getElementById('demo-save-status');aviso.textContent='Os dados foram alterados em outra aba. Recarregue antes de continuar; não substituímos os dados salvos.';aviso.hidden=false;return false;
    }
    localStorage.setItem(storageKey('operacao'),serializado);
    ultimaSerializacao=serializado;
    document.getElementById('demo-save-status').hidden=true;
    return true;
  }catch(e){const aviso=document.getElementById('demo-save-status');aviso.textContent='Não foi possível salvar neste navegador.';aviso.hidden=false;return false;}
}

function restaurarPrototipo(dados){
  idCounter=dados.idCounter||1;if(Number.isFinite(dados.eventStart))eventStart=dados.eventStart;
  voluntarios=dados.voluntarios.map(v=>{
    const marker=L.marker(v.pos,{icon:volIcon(),title:v.nome}).addTo(volLayer);
    configurarMarcadorPessoa(marker,{...v,demo:v.cpf==null&&v.endereco==null});
    return {...v,tenantId,marker};
  });
  ocorrencias=dados.ocorrencias.map(item=>{
    const o={...item,tenantId,responsavel:responsavelDaOcorrencia(item.bairro),marker:null};
    if(o.status!=='resolvida'){
      o.marker=L.marker(o.pos,{icon:ocIcon(o.status)}).addTo(ocLayer);
      o.marker.on('click',()=>openOcorrencia(o));refreshOcTooltip(o);
    }
    return o;
  });
  Object.assign(chatHistorico,dados.chatHistorico||{});
  alertasClimaticos.push(...(dados.alertasClimaticos||[]));Object.assign(prontidao,dados.prontidao||{});
  alertaIdCursor=dados.alertaIdCursor||1;
  ultimaSerializacao=JSON.stringify(dados);
  return true;
}

function responsavelDaOcorrencia(nome){
  const demo=bairros.find(b=>b.nome===nome);
  if(demo)return demo.equipe.responsavel;
  const registro=AlertaGestaoDados.criar().lista('responsaveis',tenantId).find(p=>normalizarTerritorio(p.bairro||p.zona)===normalizarTerritorio(nome));
  return registro?{id:registro.id,nome:registro.nome,cargo:registro.cargo||'Responsável',tel:registro.telefone||''}
    :{id:'sem-responsavel',nome:'Não cadastrado',cargo:'Responsável',tel:''};
}
function atualizarFiltroEventos(){
  const select=document.getElementById('filtro-evento');
  eventosCache=AlertaGestaoDados.criar(undefined,{municipioId:tenantId}).lista('eventos');const lista=eventosMunicipio();
  if(!abriuEventoDaUrl&&eventoAtivo){const grupo=EventosMapa.membros(eventoAtivo,lista);if(grupo.length>1)eventoAtivo='mapa:'+EventosMapa.raiz(eventoAtivo,lista);abriuEventoDaUrl=true;}
  const grupos=lista.filter(e=>EventosMapa.membros(e.id,lista).length>1&&EventosMapa.raiz(e.id,lista)===e.id);
  select.replaceChildren(new Option('Todos os eventos',''),...grupos.map(e=>new Option('Mapa conjunto · '+e.nome,'mapa:'+e.id)),...lista.map(e=>new Option(e.nome,e.id)));
  if(![...select.options].some(e=>e.value===eventoAtivo))eventoAtivo='';
  select.value=eventoAtivo;renderEventoReferencias();
}
function renderEventoReferencias(){
  const target=document.getElementById('evento-referencias'),lista=eventosMunicipio();
  const ids=eventoAtivo.startsWith('mapa:')?EventosMapa.membros(eventoAtivo.slice(5),lista):[eventoAtivo];
  EventoReferencias.render(target,lista.filter(e=>ids.includes(e.id)));
}
document.getElementById('filtro-evento').addEventListener('change',e=>{
  eventoAtivo=e.target.value;renderEventoReferencias();
  if(currentPanelOcId&&!noEvento(ocorrencias.find(o=>o.id===currentPanelOcId)||{}))document.getElementById('panel-close').click();
  atualizarRecorte();
});
function instalarCadastroOcorrencia(){
  CadastroOcorrenciaMapa.instalar({
    tenantId,tenantConfig,areas,tiposOcorrencia,map,ocLayer,MARINGA_CENTER,
    normalizarTerritorio,pertence,canActZone,responsavelDaOcorrencia,ocIcon,
    refreshOcTooltip,salvarPrototipo,acionarAjuda,atualizarFluxo,atualizarFiltroEventos,
    openOcorrencia,fecharMenuMobile,obterOcorrencias:()=>ocorrencias,
    proximoId:()=>idCounter++,reverterId:id=>{if(idCounter===id+1)idCounter=id;},
    setEventoFiltro:id=>{if(!noEvento({eventoId:id}))eventoAtivo=id;},
    obterEventoSelecionado:()=>EventosMapa.selecionadoIndividual(eventoAtivo)
  });
}

function iniciarControlesDemo(){
  document.querySelector('.brand').innerHTML=`<span class="dot"></span>${escHtml(tenantConfig.marca)}`;
  document.querySelector('.status-brand').textContent=tenantConfig.marca;
  document.title=tenantConfig.marca;
  atualizarFiltroEventos();
  instalarCadastroOcorrencia();
  document.getElementById('whatsapp-close').onclick=()=>document.getElementById('whatsapp-overlay').hidden=true;
  document.getElementById('whatsapp-overlay').onclick=e=>{if(e.target.id==='whatsapp-overlay')e.currentTarget.hidden=true;};
  document.getElementById('wa-cheguei').onclick=()=>confirmarWhatsApp('cheguei');
  document.getElementById('wa-terminei').onclick=()=>confirmarWhatsApp('terminei');
  function enviar(){
    const input=document.getElementById('wa-demo-input');
    const texto=input.value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[.!]/g,'');
    input.value='';
    if(['cheguei','estou no local','ja cheguei'].includes(texto))confirmarWhatsApp('cheguei');
    else if(['terminei','conclui','finalizei','ja terminei'].includes(texto))confirmarWhatsApp('terminei');
    else document.getElementById('wa-demo-status').textContent='Nesta simulação, use Cheguei ou Terminei. No sistema real, a conversa será recebida pelo WhatsApp.';
  }
  document.getElementById('wa-demo-send').onclick=enviar;
  document.getElementById('wa-demo-input').onkeydown=e=>{if(e.key==='Enter')enviar();};
  document.getElementById('mobile-menu').onclick=()=>{
    const abriu=document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('menu-backdrop').classList.toggle('open',abriu);
    document.getElementById('mobile-menu').setAttribute('aria-expanded',String(abriu));
  };
  document.getElementById('menu-backdrop').onclick=fecharMenuMobile;
  document.querySelectorAll('.sidebar-actions button,.sidebar-actions a').forEach(el=>el.addEventListener('click',fecharMenuMobile));
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    fecharMenuMobile();document.querySelectorAll('.modal-overlay:not([hidden]):not(#role-overlay)').forEach(el=>{el.hidden=true;});
  });
  window.addEventListener('beforeunload',salvarPrototipo);
  window.addEventListener('pagehide',()=>localizacoes.forEach((_,id)=>pararLocalizacao(id)));
  setInterval(salvarPrototipo,5000);
}

function fecharMenuMobile(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('menu-backdrop').classList.remove('open');
  document.getElementById('mobile-menu').setAttribute('aria-expanded','false');
}

iniciarControlesDemo();
if(window.innerWidth<=860)document.getElementById('floatwin-min').click();
const recuperacao=OperacaoRestauracao.ler(localStorage,storageKey('operacao'),tenantId);
if(recuperacao.estado==='bloqueado'){
  const overlay=document.createElement('div');overlay.className='recuperacao-overlay';
  overlay.innerHTML='<section class="recuperacao-card" role="alertdialog" aria-modal="true" aria-labelledby="recuperacao-title"><h2 id="recuperacao-title">Seus dados foram preservados</h2><p id="recuperacao-motivo"></p><p>O mapa foi interrompido para impedir que os dados sejam substituídos. Salve uma cópia e procure suporte para recuperar o conteúdo.</p><button type="button" id="recuperacao-backup">Baixar cópia dos dados</button></section>';
  overlay.querySelector('#recuperacao-motivo').textContent=recuperacao.motivo;
  const backup=overlay.querySelector('#recuperacao-backup');backup.hidden=recuperacao.original===null;
  backup.onclick=()=>{const url=URL.createObjectURL(new Blob([recuperacao.original],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='backup-mapa-operacional.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  document.body.appendChild(overlay);(backup.hidden?overlay.querySelector('h2'):backup).focus();
  return;
}
if(recuperacao.estado==='restauravel'){restaurarPrototipo(recuperacao.dados);ultimaSerializacao=recuperacao.original;}
if(recuperacao.estado==='vazio'){
gerarVoluntarios();
for(let i=0;i<5;i++) gerarOcorrencia();
gerarOcorrencia({zona:bairros[0].nome,tipo:tiposOcorrencia[0]});

// historico de ocorrencias ja resolvidas antes da sessao atual, distribuidas entre os bairros
bairros.forEach(b=>{
  const n = Math.floor(rnd(1,3));
  for(let i=0;i<n;i++){
    const t = pick(tiposOcorrencia);
    const tChegada = Math.floor(rnd(10,35)), tAtend = Math.floor(rnd(20,70));
    const reportado = Date.now()-Math.floor(rnd(60,230))*60000;
    const numIdHist = idCounter++;
    ocorrencias.push({
      id:"oc"+numIdHist, protocolo:tenantConfig.prefixo+"-"+String(10000+numIdHist).slice(-5), tipo:t.tipo, icone:t.icone, bairro:b.nome, pos: randPointInBox(b.poly),
      gravidade: sortGravidade(t.gravBase), responsabilidade: pick(t.resp),
      reportadoEm: reportado, confirmadoEm: reportado+tChegada*60000, resolvidoEm: reportado+(tChegada+tAtend)*60000,
      status:"resolvida", tempoChegada:tChegada, tempoAtendimento:tAtend, tempoReal: tChegada+tAtend,
      responsavel: b.equipe.responsavel, voluntariosProx: [], marker:null,
    });
  }
});


}
filtroOcorrencias=FiltrosOcorrencias.montar({target:document.getElementById('filtros-ocorrencias'),
 obterDados:()=>({ocorrencias,tipos:[...tiposOcorrencia.map(x=>x.tipo),...gestao.lista('ocorrencias',tenantId).map(x=>x.nome)],
 organizacoes:['saude','emergencias','parceiros','equipes'].flatMap(modulo=>gestao.lista(modulo,tenantId).map(x=>({id:modulo+':'+x.id,nome:x.nome})))}),
 aoMudar:()=>atualizarRecorte()});
document.getElementById('fil-toggle').click();
PainelEventos.iniciar({painel:document.getElementById('eventos-painel'),barra:document.getElementById('eventos-painel-head'),
 abrir:document.getElementById('eventos-open'),fechar:document.getElementById('eventos-close'),area:document.getElementById('mapwrap'),
 aoAbrir:()=>filtroOcorrencias.atualizarOpcoes()});
setInterval(()=>{const f=filtroOcorrencias.obter();if(f.horas||f.espera)atualizarRecorte();},30000);
estadoPronto=true;
saveAdminState();
atualizarFluxo();
tickClock();
renderOfficialMarkers();
processarFilaOffline();
const buscaMapa=document.getElementById('event-search');
const resultadosMapa=document.getElementById('event-results');
const recursosBusca=['bases','riscos','pontos','saude','emergencias','parceiros','abrigos']
  .flatMap(tipo=>gestao.lista(tipo,tenantId));
let marcadorBusca;
function incluirTerritorio(territorio){
  if(noRecorte(territorio)) return;
  const area=areas.find(a=>a.tipoArea==='Bairro'&&pertence(a,territorio))||areas.find(a=>pertence(a,territorio));
  if(area) selectZone(area.chave);
}
function abrirRecurso(recurso){
  incluirTerritorio(recurso.bairro||recurso.zona);
  marcadorBusca?.remove();
  const pos=[Number(recurso.lat),Number(recurso.lng)];
  const localizado=recurso.lat && recurso.lng && pos.every(Number.isFinite);
  const conteudo=`<strong>${escHtml(recurso.nome)}</strong><br>${escHtml(recurso.endereco||recurso.localizacao||'')}`;
  if(localizado){
    marcadorBusca=L.marker(pos).addTo(map).bindPopup(conteudo);
    map.setView(pos,Math.max(map.getZoom(),15));
    marcadorBusca.openPopup();
  }else{
    L.popup().setLatLng(map.getCenter()).setContent(conteudo+'<br>Sem coordenadas cadastradas.').openOn(map);
  }
}
function buscarNoMapa(){
  const termos=normalizarTerritorio(buscaMapa.value).split(/\s+/).filter(Boolean);
  resultadosMapa.replaceChildren();
  resultadosMapa.hidden=!termos.length;
  buscaMapa.setAttribute('aria-expanded',String(!!termos.length));
  if(!termos.length)return;
  const grupos=[
    ['Bairros e zonas',areas.map(a=>({nome:a.nome,meta:a.tipoArea,abrir:()=>{if(!selecao.has(a.chave))selectZone(a.chave);}}))],
    ['Ocorrências',ocorrencias.map(o=>({nome:o.tipo,meta:[o.protocolo,o.bairro,o.endereco].filter(Boolean).join(' · '),territorio:o.bairro,
      abrir:()=>{if(!noEvento(o)){eventoAtivo='';atualizarFiltroEventos();atualizarRecorte();}incluirTerritorio(o.bairro);if(o.pos)map.panTo(o.pos);openOcorrencia(o);}}))],
    ['Pessoas',pessoasMunicipio().map(p=>({nome:p.nome,meta:[p.sub,p.bairroOrigem].filter(Boolean).join(' · '),territorio:p.bairroOrigem,
      abrir:()=>{incluirTerritorio(p.bairroOrigem);mostrarFicha(p.id);}}))],
    ['Unidades e pontos cadastrados',recursosBusca.map(r=>({nome:r.nome,meta:[r.tipo,r.categoria,r.endereco,r.localizacao].filter(Boolean).join(' · '),
      territorio:r.bairro||r.zona,abrir:()=>abrirRecurso(r)}))]
  ];
  for(const [titulo,registros] of grupos){
    const encontrados=registros.filter(r=>termos.every(t=>normalizarTerritorio(r.nome+' '+r.meta).includes(t)));
    if(!encontrados.length)continue;
    const secao=document.createElement('section');
    const cabecalho=document.createElement('h3');
    cabecalho.textContent=titulo;
    secao.append(cabecalho);
    encontrados.forEach(r=>{
      const botao=document.createElement('button');
      botao.type='button';
      botao.textContent=[r.nome,r.meta,r.territorio&&!noRecorte(r.territorio)?'Fora do filtro':''].filter(Boolean).join(' · ');
      botao.onclick=()=>{buscaMapa.value='';buscarNoMapa();r.abrir();};
      secao.append(botao);
    });
    resultadosMapa.append(secao);
  }
  if(!resultadosMapa.childElementCount) resultadosMapa.textContent='Nenhum resultado em Maringá.';
}
buscaMapa.addEventListener('input',buscarNoMapa);
buscaMapa.addEventListener('keydown',e=>{
  if(e.key==='Enter'){e.preventDefault();resultadosMapa.querySelector('button')?.click();}
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!resultadosMapa.hidden){buscaMapa.value='';buscarNoMapa();buscaMapa.focus();}
});
document.addEventListener('click',e=>{
  if(!e.target.closest('.event-search')&&!resultadosMapa.hidden){buscaMapa.value='';buscarNoMapa();}
});

const bairroSolicitado=new URLSearchParams(location.search).get('bairro');
if(bairroSolicitado){
  const area=areasCadastradas.find(a=>normalizarTerritorio(a.nome)===normalizarTerritorio(bairroSolicitado));
  if(area) selectZone(area.chave);
}

})();
