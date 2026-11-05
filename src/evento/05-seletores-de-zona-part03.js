function renderCollaborators(){
  const body=document.getElementById('floatwin-body');
  const pessoas=pessoasPainel();
  const antes=body.scrollTop;
  const comFiltro=filtroOcorrencias&&filtroOcorrencias.descricao()!=='Sem filtros de ocorrência';
  const pessoasEmOcorrencias=new Set(comFiltro?ocorrencias.filter(ocorrenciaVisivel).flatMap(o=>(o.participacoes||[]).map(p=>p.voluntarioId)):[]);
  const item=p=>{
    const aberto=fichaAberta===p.id;
    const [situacao,descricaoSituacao]=statusPessoaMapa(p);
    const telefone=String(p.telefone||p.tel||'').replace(/[^+\d]/g,'');
    const email=String(p.email||'');
    const contato=telefone?`tel:${telefone}`:/^[^\s@]+@[^\s@]+$/.test(email)?`mailto:${encodeURIComponent(email)}`:'';
    return `<div class="person-card${pessoasEmOcorrencias.has(p.id)?' filter-participante':''}"${aberto?' id="ficha-pessoa"':''}>
      <button type="button" class="collab-row person-toggle" data-person="${escHtml(p.id)}" aria-expanded="${aberto}">
        <span class="c-avatar">${escHtml(initials(p.nome))}</span><span class="c-info"><span class="c-name">${escHtml(p.nome)}${pessoasEmOcorrencias.has(p.id)?' · em ocorrência filtrada':''}</span>
        <span class="c-meta">${escHtml([p.sub,p.bairroOrigem].filter(Boolean).join(' · '))}</span></span>
        <span class="person-status-dot pessoa-${situacao}" title="${escHtml(descricaoSituacao)}" aria-label="${escHtml(descricaoSituacao)}" role="img"></span>
      </button>
      ${aberto?`<div class="person-details">
        <div>${escHtml([p.cargo,p.orgao,p.sub,p.bairroOrigem].filter(Boolean).join(' · '))}</div>
        <div>${posicaoAtual(p.id)?'Localização ao vivo · '+new Date(posicaoAtual(p.id).ts).toLocaleTimeString('pt-BR'):p.pos?'Ponto de demonstração · posição fixa':'Localização indisponível'}</div>
        <div class="person-actions">
          <button type="button" class="admin-btn" data-chat="${escHtml(p.id)}"${isViewOnly()?' disabled':''} title="Abre uma conversa interna simulada">Chat interno</button>
          ${contato&&!isViewOnly()?`<a class="admin-btn" href="${escHtml(contato)}" title="Abre o telefone ou e-mail cadastrado">Contatar</a>`:'<button class="admin-btn" disabled>Contatar</button>'}
          ${pontoPessoa(p)?`<button type="button" class="admin-btn" data-locate="${escHtml(p.id)}">Ver no mapa</button>`:''}
        </div></div>`:''}
    </div>`;
  };
  const selecionadas=areasSelecionadas();
  const grupos=new Map(selecionadas.map(area=>[area.chave,{nome:area.nome,pessoas:[]}]));
  pessoas.forEach(p=>{
    const origem=normalizarTerritorio(p.bairroOrigem);
    const direto=origem&&selecionadas.find(area=>[area.id,area.nome].some(valor=>normalizarTerritorio(valor)===origem));
    const area=direto||selecionadas.find(area=>pertence(area,p.bairroOrigem));
    if(area){
      grupos.get(area.chave).pessoas.push(p);
      return;
    }
    const bairro=areas.find(a=>a.tipoArea==='Bairro'&&a.id===p.bairroOrigem);
    const nome=bairro?.nome||p.bairroOrigem||'Bairro a confirmar';
    const chave=normalizarTerritorio(nome);
    if(!grupos.has(chave)) grupos.set(chave,{nome,pessoas:[]});
    grupos.get(chave).pessoas.push(p);
  });
  if(!selecionadas.length){
    function indiceDoGrupo(grupo){
      const nome=normalizarTerritorio(grupo.nome);
      const demonstracao=grupo.pessoas.every(p=>p.demo);
      const indice=areas.findIndex(area=>normalizarTerritorio(area.nome)===nome
        && (demonstracao?!!area.demo:!area.demo));
      return indice<0?Infinity:indice;
    }
    const ordenados=[...grupos.entries()].sort(([,a],[,b])=>
      indiceDoGrupo(a)-indiceDoGrupo(b)||a.nome.localeCompare(b.nome,'pt-BR'));
    grupos.clear();
    ordenados.forEach(([chave,grupo])=>grupos.set(chave,grupo));
  }
  const papeis=Object.keys(PAPEL_LABEL);
  const ordem=p=>{const i=papeis.indexOf(p.papel||p.funcao);return i<0?papeis.length:i;};
  const ordemSituacao={local:0,caminho:1,fora:2,indefinido:3};
  const compararPessoas=(a,b)=>{
    const diferenca=ordemSituacao[statusPessoaMapa(a)[0]]-ordemSituacao[statusPessoaMapa(b)[0]];
    return diferenca||ordem(a)-ordem(b)||a.nome.localeCompare(b.nome,'pt-BR');
  };
  document.getElementById('fw-count').textContent=pessoas.filter(p=>!p.oficial).length;
  body.innerHTML=[...grupos.values()].map(grupo=>{
    const oficiais=grupo.pessoas.filter(p=>p.oficial).sort(compararPessoas);
    const colaboradores=grupo.pessoas.filter(p=>!p.oficial).sort(compararPessoas);
    const ativos=colaboradores.filter(p=>colaboradorAtivo(p.id)).length;
    const percentual=colaboradores.length?Math.round(100*ativos/colaboradores.length):0;
    return `<section class="person-territory">
      <h4>${escHtml(grupo.nome)} <span class="equipe-kpis" title="Ativos incluem presenças registradas e, para cadastros fictícios, situações simuladas.">Colab: ${colaboradores.length} · Act: ${ativos} · ${percentual}%</span></h4>
      <h3 class="person-section">Responsáveis da equipe</h3>
      ${oficiais.map(item).join('')||'<p>Nenhum responsável cadastrado.</p>'}
      <h3 class="person-section">Colaboradores · ${colaboradores.length}</h3>
      ${colaboradores.map(item).join('')||'<p>Nenhum colaborador cadastrado.</p>'}
      <p class="equipe-nota">Act: presença registrada e situações simuladas.</p>
    </section>`;
  }).join('')||'<p>Nenhuma equipe no recorte.</p>';
  body.scrollTop=antes;
  body.querySelectorAll('[data-person]').forEach(botao=>botao.onclick=()=>{
    fichaAberta=fichaAberta===botao.dataset.person?null:botao.dataset.person;
    renderCollaborators();
    [...body.querySelectorAll('[data-person]')].find(el=>el.dataset.person===botao.dataset.person)?.focus({preventScroll:true});
  });
  body.querySelector('[data-chat]')?.addEventListener('click',e=>{
    if(isViewOnly()) return;
    chatContatoAtivo=e.currentTarget.dataset.chat;
    chatOverlay.hidden=false;
    renderChatContacts();
    openChatThread(chatContatoAtivo);
  });
  body.querySelector('[data-locate]')?.addEventListener('click',e=>{
    const id=e.currentTarget.dataset.locate;
    const marcador=marcadoresPessoas.get(id)||voluntarios.find(v=>v.id===id)?.marker;
    if(!marcador)return;
    map.setView(marcador.getLatLng(),Math.max(map.getZoom(),15),{animate:false});
    const rect=janelaColaboradores.getBoundingClientRect(),mapa=areaMapa.getBoundingClientRect();
    if(rect.left<mapa.left+mapa.width*.65) map.panBy([-Math.min(rect.width/2,120),0],{animate:false});
    else map.panBy([Math.min(rect.width/2,120),0],{animate:false});
    marcador.openTooltip();
  });
}

const janelaColaboradores=document.getElementById('floatwin');
const barraColaboradores=document.getElementById('floatwin-head');
const areaMapa=document.getElementById('mapwrap');
let arrasteColaboradores=null;
