/* Controlador ocorrencias: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('ocorrencias',{
 dependencias:{
  "initials": "contexto",
  "escHtml": "contexto",
  "minutosDesde": "contexto",
  "fmtDist": "contexto",
  "GRAV_LABEL": "equipes",
  "GRAV_COLOR": "equipes",
  "RESP_LABEL": "equipes",
  "RESP_COLOR": "equipes",
  "ocorrencias": "cadastro-territorial",
  "voluntarios": "cadastro-territorial",
  "normalizarTerritorio": "cadastro-territorial",
  "map": "mapa",
  "pessoasMunicipio": "pessoas",
  "auditPush": "trilha",
  "canActZone": "permissoes",
  "PARTICIPACAO_LABEL": "conversas",
  "registrarEtapa": "conversas",
  "acionarAjuda": "conversas",
  "atualizarFluxo": "conversas",
  "participantesDaConversa": "conversas",
  "abrirWhatsapp": "conversas",
  "renderAnexos": "localizacao",
  "salvarAnexos": "persistencia",
  "salvarPrototipo": "persistencia",
  "painelPonto": "inicializacao"
},
 criar(dependencias){
 let currentPanelOcId,STATUS_BADGE;
 function badgeChip(label, color){
  return `<span class="badge" style="background:${color}22;color:${color};border:1px solid ${color}66">${label}</span>`;
}
function openOcorrencia(o){
  if(document.getElementById('panel').classList.contains('com-ficha-ponto')) dependencias.painelPonto.fechar();
  currentPanelOcId=o.id;
  const panel=document.getElementById('panel'), body=document.getElementById('panel-body');
  const [badgeClass,badgeLabel]=o.confirmado===false?['ativa','EM TRIAGEM']:(STATUS_BADGE[o.status]||STATUS_BADGE.ativa);
  document.getElementById('panel-title').innerHTML=`${o.icone} ${dependencias.escHtml(o.tipo)} <span class="badge ${badgeClass}">${badgeLabel}</span><div style="font-family:var(--mono);font-size:10px;color:var(--muted);width:100%;margin-top:5px">${dependencias.escHtml(o.protocolo)} · ${dependencias.escHtml(o.bairro)}</div>`;
  const pessoas=dependencias.participantesDaConversa(o);
  const apoios=o.apoiosBairro||[];
  const candidatosApoio=dependencias.pessoasMunicipio().filter(p=>p.bairroOrigem
    && dependencias.normalizarTerritorio(p.bairroOrigem)!==dependencias.normalizarTerritorio(o.bairro)
    && !apoios.some(apoio=>apoio.pessoaId===p.id));
  const noLocal=pessoas.filter(p=>p.status==='no_local').length;
  const convidados=pessoas.filter(p=>p.status==='convidado').length;
  const concluidos=pessoas.filter(p=>p.status==='concluida').length;
  const mensagem=o.confirmado===false?'Relato salvo para triagem. Ainda não houve acionamento.':o.status==='resolvida'?'Atendimento concluído. Obrigado a quem ajudou.':noLocal?`${noLocal} ${noLocal===1?'pessoa confirmou':'pessoas confirmaram'} chegada. O atendimento continua.`:o.atendimentoEquipe?`${o.atendimentoEquipe.nome}: encaminhamento simulado. Aguardando chegada.`:`${convidados} ${convidados===1?'convite enviado':'convites enviados'}. Aguardando confirmação de chegada.`;
  const tempoChegada=o.confirmadoEm?Math.max(0,Math.round((o.confirmadoEm-o.reportadoEm)/60000)):null;
  body.innerHTML=`
    <div class="photo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M4 7h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="3.4"/></svg><div class="tag">${dependencias.escHtml(o.fotoTag||'Registro de demonstração')}</div></div>
    <div class="grid2" style="margin-bottom:12px">${badgeChip('Gravidade: '+dependencias.GRAV_LABEL[o.gravidade],dependencias.GRAV_COLOR[o.gravidade])}${badgeChip('Resp.: '+dependencias.RESP_LABEL[o.responsabilidade],dependencias.RESP_COLOR[o.responsabilidade])}</div>
    <div class="flow-note">${dependencias.escHtml(mensagem)}${o.confirmado!==false&&o.responsavel?.id!=='sem-responsavel'?'<small>Aviso simulado ao responsável regional. ': '<small>'}${concluidos?`${concluidos} participação(ões) concluída(s).`:''}</small></div>
    <div class="grid2"><div class="field"><label>${tempoChegada===null?'Recebida há':'Tempo até chegada'}</label><div class="val mono">${tempoChegada===null?dependencias.minutosDesde(o.reportadoEm):tempoChegada} min</div></div><div class="field"><label>${o.status==='resolvida'?'Tempo total':'Em atendimento'}</label><div class="val mono" id="live-atendimento">${o.status==='resolvida'?`${o.tempoReal||0} min`:o.confirmadoEm?`${dependencias.minutosDesde(o.confirmadoEm)} min`:'Aguardando chegada'}</div></div></div>
    ${o.orientacaoAjuda?`<div class="demo-caption">${dependencias.escHtml(o.orientacaoAjuda)}</div>`:''}
    ${o.gravidade===3&&o.status!=='resolvida'?`<div class="sla-box">Contatos de emergência: <a href="tel:192">SAMU 192</a> · <a href="tel:193">Bombeiros 193</a> · <a href="tel:199">Defesa Civil 199</a><div class="demo-caption">Esta demonstração não aciona esses serviços.</div>${o.acionamentoOficial?`<div>Contato registrado: ${dependencias.escHtml(o.acionamentoOficial.servico)}</div>`:`<button class="admin-btn" id="acionar-oficial-btn">Registrar contato com serviço</button>`}</div>`:''}
    <div class="resp-card"><div class="avatar">${dependencias.initials(o.responsavel.nome)}</div><div><div class="name">${dependencias.escHtml(o.responsavel.nome)}</div><div class="role">${dependencias.escHtml(o.responsavel.cargo)} · responsável da zona</div><div class="demo-caption">${dependencias.escHtml(o.responsavel.tel)}</div></div></div>
    ${pessoas.length?`<div class="flow-actions"><button class="admin-btn primary" id="open-whatsapp-oc">Abrir WhatsApp simulado</button></div>`:''}
    <div class="flow-title">Pessoas e equipe acionadas</div>
    ${pessoas.map(p=>{const v=dependencias.voluntarios.find(x=>x.id===p.id);return `<div class="flow-person"><div class="avatar small">${dependencias.initials(p.nome)}</div><div class="person-copy"><div class="p-name">${dependencias.escHtml(p.nome)}</div><div class="p-help">${v?dependencias.escHtml(v.ajuda)+' · '+dependencias.fmtDist(dependencias.map.distance(v.pos,o.pos)):'Atendimento de demonstração'}</div><span class="flow-tag ${p.status}">${dependencias.PARTICIPACAO_LABEL[p.status]||'Encaminhamento registrado'}</span></div><button class="admin-btn" data-wa-pessoa="${dependencias.escHtml(p.id)}" aria-label="Ver conversa de ${dependencias.escHtml(p.nome)}">Conversa</button></div>`;}).join('')||'<p class="demo-caption">Sem participações registradas nesta ocorrência de histórico.</p>'}
    <div class="flow-title">Apoio de outro bairro</div>
    ${apoios.map(a=>`<p class="demo-caption">${dependencias.escHtml(a.nome)} · ${dependencias.escHtml(a.bairro)} · Pedido registrado</p>`).join('')}
    ${dependencias.canActZone(o.bairro)&&o.status!=='resolvida'&&candidatosApoio.length?`<form id="apoio-bairro-form">
      <select name="pessoa" aria-label="Pessoa de outro bairro" required><option value="">Selecione a pessoa</option>
      ${candidatosApoio.map(p=>`<option value="${dependencias.escHtml(p.id)}">${dependencias.escHtml(p.nome+' · '+p.bairroOrigem)}</option>`).join('')}</select>
      <button class="admin-btn" type="submit">Registrar pedido de apoio</button>
      <p class="demo-caption">Registro local nesta demonstração.</p></form>`:''}
    ${o.organizacoes?.length?`<div class="flow-title">Organizações e equipes previstas</div><p class="demo-caption">Acionamento preparado neste navegador. Nenhum aviso real foi enviado.</p>${o.organizacoes.map(x=>`<p>${dependencias.escHtml(x.nome)} · Preparado</p>`).join('')}`:''}
    ${o.endereco?`<div class="flow-title">Local e relato</div><p>${dependencias.escHtml(o.endereco)} · ${dependencias.escHtml(o.acesso||'')}</p><p>${dependencias.escHtml(o.descricao||'')}</p><p>Origem: ${dependencias.escHtml(o.origem||'Operador')} · Evento: ${dependencias.escHtml(o.evento||'Não informado')}</p><p>Riscos: ${dependencias.escHtml(o.riscos||'Não informados')} · Pessoas afetadas: ${dependencias.escHtml(o.afetados||'Não informado')}</p>${(o.relatos||[]).map(r=>`<p>${dependencias.escHtml(r.origem)} · ${dependencias.escHtml(r.descricao||r.endereco)}</p><div class="attachment-previews">${(r.fotos||[]).map(f=>`<img src="${dependencias.escHtml(f.dados)}" alt="${dependencias.escHtml(f.nome)}">`).join('')}</div>`).join('')}`:''}
    ${o.confirmado===false&&dependencias.canActZone(o.bairro)?'<button type="button" id="confirmar-triagem" class="admin-btn primary">Confirmar e acionar</button>':''}
    <div class="flow-title">Histórico da ocorrência</div>
    <ol class="flow-timeline">${(o.timeline||[{ts:o.reportadoEm,texto:'Ocorrência registrada no histórico de demonstração'}]).map(e=>`<li><time>${new Date(e.ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</time><span>${dependencias.escHtml(e.texto)}</span></li>`).join('')}</ol>
    ${dependencias.renderAnexos(o)}
  `;
  panel.classList.add('open');
  body.querySelector('#confirmar-triagem')?.addEventListener('click',()=>{
    o.confirmado=true;
    dependencias.registrarEtapa(o,'confirmada','Ocorrência confirmada');
    if(!dependencias.salvarPrototipo()){o.confirmado=false;o.timeline.pop();return;}
    dependencias.acionarAjuda(o);
    dependencias.salvarPrototipo();dependencias.atualizarFluxo();openOcorrencia(o);
  });
  body.querySelector('#apoio-bairro-form')?.addEventListener('submit',e=>{
    e.preventDefault();
    const pessoa=candidatosApoio.find(p=>p.id===new FormData(e.currentTarget).get('pessoa'));
    if(!pessoa||!dependencias.canActZone(o.bairro)||o.status==='resolvida')return;
    o.apoiosBairro=[...apoios,{pessoaId:pessoa.id,nome:pessoa.nome,bairro:pessoa.bairroOrigem,ts:Date.now()}];
    const detalhe=`Pedido de apoio registrado para ${pessoa.nome} · ${pessoa.bairroOrigem}`;
    dependencias.registrarEtapa(o,'apoio-bairro',detalhe);
    dependencias.auditPush('Operação','Registrou pedido de apoio',`${o.protocolo} · ${detalhe}`,[o.bairro]);
    dependencias.salvarPrototipo();
    openOcorrencia(o);
  });
  body.querySelectorAll('[data-wa-pessoa]').forEach(btn=>{btn.onclick=()=>dependencias.abrirWhatsapp(o,btn.dataset.waPessoa);});
  const abrir=document.getElementById('open-whatsapp-oc');if(abrir)abrir.onclick=()=>dependencias.abrirWhatsapp(o);
  document.getElementById('report-submit').onclick=()=>dependencias.salvarAnexos(o);
  const oficial=document.getElementById('acionar-oficial-btn');
  if(oficial)oficial.onclick=()=>{
    const servico=prompt('Qual serviço você contatou? Este registro não envia um acionamento.','Bombeiros 193');
    if(!servico)return;
    o.acionamentoOficial={servico,quando:Date.now()};
    dependencias.registrarEtapa(o,'contato',`Contato informado: ${servico}`);
    dependencias.auditPush(o.responsavel.nome,'Registrou contato com serviço',`${o.protocolo}: ${servico}`,[o.bairro]);
    dependencias.salvarPrototipo();openOcorrencia(o);
  };
  if(!dependencias.canActZone(o.bairro)){
    body.querySelectorAll('button,input,textarea').forEach(el=>{el.disabled=true;});
    const note=document.createElement('p');note.className='view-only-note';note.textContent='Perfil de visualização desta demonstração. Troque o perfil para testar as ações.';body.appendChild(note);
  }
}
 async function iniciar(){
 (currentPanelOcId=null);
(STATUS_BADGE={ ativa:['ativa','AGUARDANDO EQUIPE'], em_atendimento:['ativa','EM ATENDIMENTO'], resolvida:['resolvida','RESOLVIDA'] });
setInterval(()=>{
  if(!currentPanelOcId) return;
  const o = dependencias.ocorrencias.find(x=>x.id===currentPanelOcId);
  if(o && o.status==='em_atendimento'){
    const el = document.getElementById('live-atendimento');
    if(el) el.textContent = dependencias.minutosDesde(o.confirmadoEm)+' min';
  }
}, 5000);
 return true;
 }
 return {iniciar,get currentPanelOcId(){return currentPanelOcId;},set currentPanelOcId(valor){currentPanelOcId=valor;},get STATUS_BADGE(){return STATUS_BADGE;},badgeChip,openOcorrencia};
 }
});
})(globalThis);
