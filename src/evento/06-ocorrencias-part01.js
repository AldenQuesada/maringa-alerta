/* ---------- painel de ocorrência (direita) ---------- */
let currentPanelOcId = null;

const STATUS_BADGE = { ativa:['ativa','AGUARDANDO EQUIPE'], em_atendimento:['ativa','EM ATENDIMENTO'], resolvida:['resolvida','RESOLVIDA'] };

function badgeChip(label, color){
  return `<span class="badge" style="background:${color}22;color:${color};border:1px solid ${color}66">${label}</span>`;
}

function openOcorrencia(o){
  currentPanelOcId=o.id;
  const panel=document.getElementById('panel'), body=document.getElementById('panel-body');
  const [badgeClass,badgeLabel]=o.confirmado===false?['ativa','EM TRIAGEM']:(STATUS_BADGE[o.status]||STATUS_BADGE.ativa);
  document.getElementById('panel-title').innerHTML=`${o.icone} ${escHtml(o.tipo)} <span class="badge ${badgeClass}">${badgeLabel}</span><div style="font-family:var(--mono);font-size:10px;color:var(--muted);width:100%;margin-top:5px">${escHtml(o.protocolo)} · ${escHtml(o.bairro)}</div>`;
  const pessoas=participantesDaConversa(o);
  const apoios=o.apoiosBairro||[];
  const candidatosApoio=pessoasMunicipio().filter(p=>p.bairroOrigem
    && normalizarTerritorio(p.bairroOrigem)!==normalizarTerritorio(o.bairro)
    && !apoios.some(apoio=>apoio.pessoaId===p.id));
  const noLocal=pessoas.filter(p=>p.status==='no_local').length;
  const convidados=pessoas.filter(p=>p.status==='convidado').length;
  const concluidos=pessoas.filter(p=>p.status==='concluida').length;
  const mensagem=o.confirmado===false?'Relato salvo para triagem. Ainda não houve acionamento.':o.status==='resolvida'?'Atendimento concluído. Obrigado a quem ajudou.':noLocal?`${noLocal} ${noLocal===1?'pessoa confirmou':'pessoas confirmaram'} chegada. O atendimento continua.`:o.atendimentoEquipe?`${o.atendimentoEquipe.nome}: encaminhamento simulado. Aguardando chegada.`:`${convidados} ${convidados===1?'convite enviado':'convites enviados'}. Aguardando confirmação de chegada.`;
  const tempoChegada=o.confirmadoEm?Math.max(0,Math.round((o.confirmadoEm-o.reportadoEm)/60000)):null;
  body.innerHTML=`
    <div class="photo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M4 7h3l2-3h6l2 3h3v12H4z"/><circle cx="12" cy="13" r="3.4"/></svg><div class="tag">${escHtml(o.fotoTag||'Registro de demonstração')}</div></div>
    <div class="grid2" style="margin-bottom:12px">${badgeChip('Gravidade: '+GRAV_LABEL[o.gravidade],GRAV_COLOR[o.gravidade])}${badgeChip('Resp.: '+RESP_LABEL[o.responsabilidade],RESP_COLOR[o.responsabilidade])}</div>
    <div class="flow-note">${escHtml(mensagem)}${o.confirmado!==false&&o.responsavel?.id!=='sem-responsavel'?'<small>Aviso simulado ao responsável regional. ': '<small>'}${concluidos?`${concluidos} participação(ões) concluída(s).`:''}</small></div>
    <div class="grid2"><div class="field"><label>${tempoChegada===null?'Recebida há':'Tempo até chegada'}</label><div class="val mono">${tempoChegada===null?minutosDesde(o.reportadoEm):tempoChegada} min</div></div><div class="field"><label>${o.status==='resolvida'?'Tempo total':'Em atendimento'}</label><div class="val mono" id="live-atendimento">${o.status==='resolvida'?`${o.tempoReal||0} min`:o.confirmadoEm?`${minutosDesde(o.confirmadoEm)} min`:'Aguardando chegada'}</div></div></div>
    ${o.orientacaoAjuda?`<div class="demo-caption">${escHtml(o.orientacaoAjuda)}</div>`:''}
    ${o.gravidade===3&&o.status!=='resolvida'?`<div class="sla-box">Contatos de emergência: <a href="tel:192">SAMU 192</a> · <a href="tel:193">Bombeiros 193</a> · <a href="tel:199">Defesa Civil 199</a><div class="demo-caption">Esta demonstração não aciona esses serviços.</div>${o.acionamentoOficial?`<div>Contato registrado: ${escHtml(o.acionamentoOficial.servico)}</div>`:`<button class="admin-btn" id="acionar-oficial-btn">Registrar contato com serviço</button>`}</div>`:''}
    <div class="resp-card"><div class="avatar">${initials(o.responsavel.nome)}</div><div><div class="name">${escHtml(o.responsavel.nome)}</div><div class="role">${escHtml(o.responsavel.cargo)} · responsável da zona</div><div class="demo-caption">${escHtml(o.responsavel.tel)}</div></div></div>
    ${pessoas.length?`<div class="flow-actions"><button class="admin-btn primary" id="open-whatsapp-oc">Abrir WhatsApp simulado</button></div>`:''}
    <div class="flow-title">Pessoas e equipe acionadas</div>
    ${pessoas.map(p=>{const v=voluntarios.find(x=>x.id===p.id);return `<div class="flow-person"><div class="avatar small">${initials(p.nome)}</div><div class="person-copy"><div class="p-name">${escHtml(p.nome)}</div><div class="p-help">${v?escHtml(v.ajuda)+' · '+fmtDist(map.distance(v.pos,o.pos)):'Atendimento de demonstração'}</div><span class="flow-tag ${p.status}">${PARTICIPACAO_LABEL[p.status]||'Encaminhamento registrado'}</span></div><button class="admin-btn" data-wa-pessoa="${escHtml(p.id)}" aria-label="Ver conversa de ${escHtml(p.nome)}">Conversa</button></div>`;}).join('')||'<p class="demo-caption">Sem participações registradas nesta ocorrência de histórico.</p>'}
    <div class="flow-title">Apoio de outro bairro</div>
    ${apoios.map(a=>`<p class="demo-caption">${escHtml(a.nome)} · ${escHtml(a.bairro)} · Pedido registrado</p>`).join('')}
    ${canActZone(o.bairro)&&o.status!=='resolvida'&&candidatosApoio.length?`<form id="apoio-bairro-form">
      <select name="pessoa" aria-label="Pessoa de outro bairro" required><option value="">Selecione a pessoa</option>
      ${candidatosApoio.map(p=>`<option value="${escHtml(p.id)}">${escHtml(p.nome+' · '+p.bairroOrigem)}</option>`).join('')}</select>
      <button class="admin-btn" type="submit">Registrar pedido de apoio</button>
      <p class="demo-caption">Registro local nesta demonstração.</p></form>`:''}
    ${o.organizacoes?.length?`<div class="flow-title">Organizações e equipes previstas</div><p class="demo-caption">Acionamento preparado neste navegador. Nenhum aviso real foi enviado.</p>${o.organizacoes.map(x=>`<p>${escHtml(x.nome)} · Preparado</p>`).join('')}`:''}
    ${o.endereco?`<div class="flow-title">Local e relato</div><p>${escHtml(o.endereco)} · ${escHtml(o.acesso||'')}</p><p>${escHtml(o.descricao||'')}</p><p>Origem: ${escHtml(o.origem||'Operador')} · Evento: ${escHtml(o.evento||'Não informado')}</p><p>Riscos: ${escHtml(o.riscos||'Não informados')} · Pessoas afetadas: ${escHtml(o.afetados||'Não informado')}</p>${(o.relatos||[]).map(r=>`<p>${escHtml(r.origem)} · ${escHtml(r.descricao||r.endereco)}</p><div class="attachment-previews">${(r.fotos||[]).map(f=>`<img src="${escHtml(f.dados)}" alt="${escHtml(f.nome)}">`).join('')}</div>`).join('')}`:''}
    ${o.confirmado===false&&canActZone(o.bairro)?'<button type="button" id="confirmar-triagem" class="admin-btn primary">Confirmar e acionar</button>':''}
    <div class="flow-title">Histórico da ocorrência</div>
    <ol class="flow-timeline">${(o.timeline||[{ts:o.reportadoEm,texto:'Ocorrência registrada no histórico de demonstração'}]).map(e=>`<li><time>${new Date(e.ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</time><span>${escHtml(e.texto)}</span></li>`).join('')}</ol>
    ${renderAnexos(o)}
  `;
  panel.classList.add('open');
  body.querySelector('#confirmar-triagem')?.addEventListener('click',()=>{
    o.confirmado=true;
    registrarEtapa(o,'confirmada','Ocorrência confirmada');
    if(!salvarPrototipo()){o.confirmado=false;o.timeline.pop();return;}
    acionarAjuda(o);
    salvarPrototipo();atualizarFluxo();openOcorrencia(o);
  });
  body.querySelector('#apoio-bairro-form')?.addEventListener('submit',e=>{
    e.preventDefault();
    const pessoa=candidatosApoio.find(p=>p.id===new FormData(e.currentTarget).get('pessoa'));
    if(!pessoa||!canActZone(o.bairro)||o.status==='resolvida')return;
    o.apoiosBairro=[...apoios,{pessoaId:pessoa.id,nome:pessoa.nome,bairro:pessoa.bairroOrigem,ts:Date.now()}];
    const detalhe=`Pedido de apoio registrado para ${pessoa.nome} · ${pessoa.bairroOrigem}`;
    registrarEtapa(o,'apoio-bairro',detalhe);
    auditPush('Operação','Registrou pedido de apoio',`${o.protocolo} · ${detalhe}`,[o.bairro]);
    salvarPrototipo();
    openOcorrencia(o);
  });
  body.querySelectorAll('[data-wa-pessoa]').forEach(btn=>{btn.onclick=()=>abrirWhatsapp(o,btn.dataset.waPessoa);});
  const abrir=document.getElementById('open-whatsapp-oc');if(abrir)abrir.onclick=()=>abrirWhatsapp(o);
  document.getElementById('report-submit').onclick=()=>salvarAnexos(o);
  const oficial=document.getElementById('acionar-oficial-btn');
  if(oficial)oficial.onclick=()=>{
    const servico=prompt('Qual serviço você contatou? Este registro não envia um acionamento.','Bombeiros 193');
    if(!servico)return;
    o.acionamentoOficial={servico,quando:Date.now()};
    registrarEtapa(o,'contato',`Contato informado: ${servico}`);
    auditPush(o.responsavel.nome,'Registrou contato com serviço',`${o.protocolo}: ${servico}`,[o.bairro]);
    salvarPrototipo();openOcorrencia(o);
  };
  if(!canActZone(o.bairro)){
    body.querySelectorAll('button,input,textarea').forEach(el=>{el.disabled=true;});
    const note=document.createElement('p');note.className='view-only-note';note.textContent='Perfil de visualização desta demonstração. Troque o perfil para testar as ações.';body.appendChild(note);
  }
}

// mantem o cronometro de atendimento correndo enquanto o painel estiver aberto
setInterval(()=>{
  if(!currentPanelOcId) return;
  const o = ocorrencias.find(x=>x.id===currentPanelOcId);
  if(o && o.status==='em_atendimento'){
    const el = document.getElementById('live-atendimento');
    if(el) el.textContent = minutosDesde(o.confirmadoEm)+' min';
  }
}, 5000);
