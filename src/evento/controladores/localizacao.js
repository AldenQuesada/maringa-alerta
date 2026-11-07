/* Controlador localizacao: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('localizacao',{
 dependencias:{
  "escHtml": "contexto",
  "ocorrencias": "cadastro-territorial",
  "voluntarios": "cadastro-territorial",
  "localizacoes": "pessoas",
  "VALIDADE_GPS_MS": "pessoas",
  "atualizarPontoAoVivo": "pessoas",
  "pararLocalizacao": "pessoas",
  "checkInValido": "pessoas",
  "renderCollaborators": "painel-colaboradores",
  "auditPush": "trilha",
  "whatsappContexto": "conversas",
  "registrarEtapa": "conversas",
  "enviarMensagemDemo": "conversas",
  "acionarAjuda": "conversas",
  "atualizarFluxo": "conversas",
  "participantesDaConversa": "conversas",
  "renderWhatsapp": "conversas"
},
 criar(dependencias){

 function iniciarLocalizacao(o,id){
  if(!navigator.geolocation){
    document.getElementById('wa-demo-status').textContent='Localização indisponível neste dispositivo.';
    return;
  }
  dependencias.localizacoes.forEach((_,pessoaId)=>dependencias.pararLocalizacao(pessoaId));
  const sessao={ocorrenciaId:o.id};
  dependencias.localizacoes.set(id,sessao);
  const atualizar=()=>{
    dependencias.atualizarPontoAoVivo(id);
    dependencias.renderCollaborators();
    if(dependencias.whatsappContexto?.pessoaId===id && dependencias.whatsappContexto.ocorrenciaId===o.id) dependencias.renderWhatsapp();
  };
  sessao.watch=navigator.geolocation.watchPosition(({coords,timestamp})=>{
    if(dependencias.localizacoes.get(id)!==sessao)return;
    Object.assign(sessao,{pos:[coords.latitude,coords.longitude],precisao:coords.accuracy,ts:timestamp});
    clearTimeout(sessao.expiracao);
    sessao.expiracao=setTimeout(atualizar,Math.max(1,timestamp+dependencias.VALIDADE_GPS_MS-Date.now()+1));
    atualizar();
  },erro=>{
    if(dependencias.localizacoes.get(id)!==sessao)return;
    dependencias.pararLocalizacao(id);
    atualizar();
    if(dependencias.whatsappContexto?.pessoaId===id && dependencias.whatsappContexto.ocorrenciaId===o.id){
      document.getElementById('wa-demo-status').textContent=erro.code===1?'Permissão de localização negada.':'Sinal de localização indisponível. Tente novamente.';
    }
  },{enableHighAccuracy:true,maximumAge:0,timeout:AlertaGestaoDados.parametros.gps.timeoutMs});
  dependencias.renderWhatsapp();
}
function confirmarWhatsApp(acao){
  if(!dependencias.whatsappContexto)return;
  const o=dependencias.ocorrencias.find(x=>x.id===dependencias.whatsappContexto.ocorrenciaId), id=dependencias.whatsappContexto.pessoaId;
  if(!o)return;
  const equipe=o.atendimentoEquipe?.id===id?o.atendimentoEquipe:null;
  const pessoa=dependencias.participantesDaConversa(o).find(p=>p.id===id);
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
    if(acao==='cheguei'&&!dependencias.checkInValido(o,id)){
      document.getElementById('wa-demo-status').textContent='O check-in exige localização ativa e posição confirmada no local.';
      return;
    }
    if(acao==='terminei'&&antes!=='no_local')return;
    resultado=acao==='cheguei'?AlertaFluxo.chegar(o,id,Date.now()):AlertaFluxo.terminar(o,id,Date.now());
  }
  if(!resultado.ok){document.getElementById('wa-demo-status').textContent=resultado.motivo||'Esta confirmação já foi registrada.';return;}
  if(!equipe){
    if(acao==='cheguei') o.participacoes.find(p=>p.voluntarioId===id).checkInGPS=true;
    else dependencias.pararLocalizacao(id);
  }
  dependencias.enviarMensagemDemo(id,acao==='cheguei'?'Cheguei':'Terminei',o,acao,true);
  dependencias.enviarMensagemDemo(id,acao==='cheguei'?'Chegada registrada. Obrigado por ajudar.':'Obrigado pela ajuda! Sua participação foi encerrada.',o,'resposta');
  dependencias.registrarEtapa(o,acao,`${pessoa.nome}: ${acao==='cheguei'?'chegada confirmada':'ajuda concluída'}`);
  dependencias.auditPush(pessoa.nome,acao==='cheguei'?'Chegada pelo WhatsApp simulado':'Término pelo WhatsApp simulado',o.protocolo,[o.bairro]);
  AlertaFluxo.sincronizarDisponibilidade(dependencias.voluntarios,dependencias.ocorrencias);
  if(acao==='terminei'&&!equipe){
    const v=dependencias.voluntarios.find(x=>x.id===id);
    if(v){
      const abertas=dependencias.ocorrencias.filter(x=>x.id!==o.id&&['ativa','em_atendimento'].includes(x.status)).sort((a,b)=>AlertaFluxo.prioridade(b)-AlertaFluxo.prioridade(a));
      for(const outra of abertas){
        const convite=dependencias.acionarAjuda(outra,[v]);
        if((convite.novos||[]).includes(id)){
          dependencias.enviarMensagemDemo(id,`Há outra ocorrência em ${outra.bairro} precisando de ajuda. Se puder continuar, veja o novo convite ${outra.protocolo}.`,o,'proximo_convite');
          break;
        }
      }
    }
  }
  dependencias.atualizarFluxo();dependencias.renderWhatsapp();
}
function renderAnexos(o){
  const r=o.relatorio||{};
  return `<details class="optional-report"><summary>Fotos e observações opcionais</summary><div class="report-form">
    <p class="demo-caption">Estes registros complementam o atendimento. Não são necessários para confirmar o término da ajuda.</p>
    <div class="field"><label for="foto-atual">Foto da situação inicial</label><input type="file" accept="image/*" id="foto-atual" class="file-in"></div>
    <div class="field"><label for="foto-final">Foto da situação final</label><input type="file" accept="image/*" id="foto-final" class="file-in"></div>
    <div class="field"><label for="pendencias">Observações e necessidades restantes</label><textarea id="pendencias" rows="2" class="file-in" placeholder="Opcional">${dependencias.escHtml(r.pendencias||'')}</textarea></div>
    <label style="font-size:11px;display:flex;gap:7px;align-items:flex-start;margin-bottom:12px"><input type="checkbox" id="fotos-publicas"${r.fotosPublicas?' checked':''}>Mostrar as fotos no status público desta demonstração</label>
    <button class="admin-btn" id="report-submit">Salvar complemento</button><div id="report-err" class="demo-caption" role="status"></div>
    <div class="attachment-previews">${r.fotoAtual?`<img src="${r.fotoAtual}" alt="Situação inicial registrada">`:''}${r.fotoFinal?`<img src="${r.fotoFinal}" alt="Situação final registrada">`:''}</div>
  </div></details>`;
}
 async function iniciar(){

 return true;
 }
 return {iniciar,iniciarLocalizacao,confirmarWhatsApp,renderAnexos};
 }
});
})(globalThis);
