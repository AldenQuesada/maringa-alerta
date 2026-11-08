/* Controlador painel-colaboradores: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('painel-colaboradores',{
 dependencias:{
  "initials": "contexto",
  "escHtml": "contexto",
  "PAPEL_LABEL": "regioes",
  "ocorrencias": "cadastro-territorial",
  "voluntarios": "cadastro-territorial",
  "normalizarTerritorio": "cadastro-territorial",
  "areas": "cadastro-territorial",
  "selecao": "cadastro-territorial",
  "areasSelecionadas": "cadastro-territorial",
  "pertence": "cadastro-territorial",
  "filtroOcorrencias": "cadastro-territorial",
  "ocorrenciaVisivel": "cadastro-territorial",
  "map": "mapa",
  "pessoasMunicipio": "pessoas",
  "referenciaPessoa": "pessoas",
  "pontoPessoa": "pessoas",
  "statusPessoaMapa": "pessoas",
  "pessoasPainel": "pessoas",
  "fichaAberta": "pessoas",
  "marcadoresPessoas": "pessoas",
  "posicaoAtual": "pessoas",
  "colaboradorAtivo": "pessoas",
  "chatOverlay": "mensagens",
  "chatContatoAtivo": "mensagens",
  "renderChatContacts": "mensagens",
  "openChatThread": "mensagens",
  "isViewOnly": "permissoes"
},
 criar(dependencias){
 let janelaColaboradores,barraColaboradores,areaMapa,arrasteColaboradores;
 function renderCollaborators(){
  const body=document.getElementById('floatwin-body');
  const pessoas=dependencias.pessoasPainel();
  const todosCadastrados=dependencias.pessoasMunicipio().filter(p=>!p.oficial&&!p.demo);
  const exibidos=pessoas.filter(p=>!p.oficial&&!p.demo).length;
  const ocultos=Math.max(0,todosCadastrados.length-exibidos);
  const semTerritorio=todosCadastrados.filter(p=>!String(p.bairroOrigem||'').trim()).length;
  const avisoRecorte=dependencias.selecao.size&&ocultos
    ? ocultos+' colaborador(es) não aparecem no recorte selecionado'+(semTerritorio?' ('+semTerritorio+' sem bairro/zona confirmado).':'.')+' Selecione "Todo o município" para conferir a lista completa.'
    : !dependencias.selecao.size&&semTerritorio
      ? semTerritorio+' colaborador(es) aguardam identificação do bairro ou zona; continuam cadastrados e listados em "Bairro a confirmar".'
      : !dependencias.selecao.size&&!todosCadastrados.length
        ? (globalThis.AlertaNuvem?.ativo
          ? 'Não há colaboradores cadastrados para esta prefeitura. Gerencie os cadastros de colaboradores na Gestão.'
          : 'Não há colaboradores cadastrados para esta prefeitura neste navegador. Este protótipo utiliza armazenamento local e não sincroniza cadastros entre dispositivos.')
        : '';
  const antes=body.scrollTop;
  const comFiltro=dependencias.filtroOcorrencias&&dependencias.filtroOcorrencias.descricao()!=='Sem filtros de ocorrência';
  const pessoasEmOcorrencias=new Set(comFiltro?dependencias.ocorrencias.filter(dependencias.ocorrenciaVisivel).flatMap(o=>(o.participacoes||[]).map(p=>p.voluntarioId)):[]);
  const item=p=>{
    const aberto=dependencias.fichaAberta===p.id;
    const [situacao,descricaoSituacao]=dependencias.statusPessoaMapa(p);
    const telefone=String(p.telefone||p.tel||'').replace(/[^+\d]/g,'');
    const email=String(p.email||'');
    const contato=telefone?`tel:${telefone}`:/^[^\s@]+@[^\s@]+$/.test(email)?`mailto:${encodeURIComponent(email)}`:'';
    return `<div class="person-card${pessoasEmOcorrencias.has(p.id)?' filter-participante':''}"${aberto?' id="ficha-pessoa"':''}>
      <button type="button" class="collab-row person-toggle" data-person="${dependencias.escHtml(p.id)}" aria-expanded="${aberto}">
        <span class="c-avatar">${dependencias.escHtml(dependencias.initials(p.nome))}</span><span class="c-info"><span class="c-name">${dependencias.escHtml(p.nome)}${pessoasEmOcorrencias.has(p.id)?' · em ocorrência filtrada':''}</span>
        <span class="c-meta">${dependencias.escHtml([p.sub,p.bairroOrigem].filter(Boolean).join(' · '))}</span></span>
        <span class="person-status-dot pessoa-${situacao}" title="${dependencias.escHtml(descricaoSituacao)}" aria-label="${dependencias.escHtml(descricaoSituacao)}" role="img"></span>
      </button>
      ${aberto?`<div class="person-details">
        <div>${dependencias.escHtml([p.cargo,p.orgao,p.sub,p.bairroOrigem].filter(Boolean).join(' · '))}</div>
        <div>${dependencias.posicaoAtual(p.id)?'Localização ao vivo · '+new Date(dependencias.posicaoAtual(p.id).ts).toLocaleTimeString('pt-BR'):p.pos?'Ponto de demonstração · posição fixa':dependencias.referenciaPessoa(p)?.aproximado?'Localização aproximada da área':'Localização indisponível'}</div>
        <div class="person-actions">
          <button type="button" class="admin-btn" data-chat="${dependencias.escHtml(p.id)}"${dependencias.isViewOnly()?' disabled':''} title="Abre uma conversa interna simulada">Chat interno</button>
          ${contato&&!dependencias.isViewOnly()?`<a class="admin-btn" href="${dependencias.escHtml(contato)}" title="Abre o telefone ou e-mail cadastrado">Contatar</a>`:'<button class="admin-btn" disabled>Contatar</button>'}
          ${dependencias.pontoPessoa(p)?`<button type="button" class="admin-btn" data-locate="${dependencias.escHtml(p.id)}">Ver no mapa</button>`:''}
        </div></div>`:''}
    </div>`;
  };
  const selecionadas=dependencias.areasSelecionadas();
  const grupos=new Map(selecionadas.map(area=>[area.chave,{nome:area.nome,pessoas:[]}]));
  pessoas.forEach(p=>{
    const origem=dependencias.normalizarTerritorio(p.bairroOrigem);
    const direto=origem&&selecionadas.find(area=>[area.id,area.nome].some(valor=>dependencias.normalizarTerritorio(valor)===origem));
    const area=direto||selecionadas.find(area=>dependencias.pertence(area,p.bairroOrigem));
    if(area){
      grupos.get(area.chave).pessoas.push(p);
      return;
    }
    const bairro=dependencias.areas.find(a=>a.tipoArea==='Bairro'&&a.id===p.bairroOrigem);
    const nome=bairro?.nome||p.bairroOrigem||'Bairro a confirmar';
    const chave=dependencias.normalizarTerritorio(nome);
    if(!grupos.has(chave)) grupos.set(chave,{nome,pessoas:[]});
    grupos.get(chave).pessoas.push(p);
  });
  if(!selecionadas.length){
    function indiceDoGrupo(grupo){
      const nome=dependencias.normalizarTerritorio(grupo.nome);
      const demonstracao=grupo.pessoas.every(p=>p.demo);
      const indice=dependencias.areas.findIndex(area=>dependencias.normalizarTerritorio(area.nome)===nome
        && (demonstracao?!!area.demo:!area.demo));
      return indice<0?Infinity:indice;
    }
    const ordenados=[...grupos.entries()].sort(([,a],[,b])=>
      indiceDoGrupo(a)-indiceDoGrupo(b)||a.nome.localeCompare(b.nome,'pt-BR'));
    grupos.clear();
    ordenados.forEach(([chave,grupo])=>grupos.set(chave,grupo));
  }
  const papeis=Object.keys(dependencias.PAPEL_LABEL);
  const ordem=p=>{const i=papeis.indexOf(p.papel||p.funcao);return i<0?papeis.length:i;};
  const ordemSituacao={local:0,caminho:1,fora:2,indefinido:3};
  const compararPessoas=(a,b)=>{
    const diferenca=ordemSituacao[dependencias.statusPessoaMapa(a)[0]]-ordemSituacao[dependencias.statusPessoaMapa(b)[0]];
    return diferenca||ordem(a)-ordem(b)||a.nome.localeCompare(b.nome,'pt-BR');
  };
  document.getElementById('fw-count').textContent=pessoas.filter(p=>!p.oficial).length;
  body.innerHTML=(avisoRecorte?'<p class="equipe-nota" role="status">'+dependencias.escHtml(avisoRecorte)+'</p>':'')+[...grupos.values()].map(grupo=>{
    const oficiais=grupo.pessoas.filter(p=>p.oficial).sort(compararPessoas);
    const colaboradores=grupo.pessoas.filter(p=>!p.oficial).sort(compararPessoas);
    const ativos=colaboradores.filter(p=>dependencias.colaboradorAtivo(p.id)).length;
    const percentual=colaboradores.length?Math.round(100*ativos/colaboradores.length):0;
    return `<section class="person-territory">
      <h4>${dependencias.escHtml(grupo.nome)} <span class="equipe-kpis" title="${globalThis.AlertaNuvem?.ativo?'Ativos incluem presenças registradas.':'Ativos incluem presenças registradas e, para cadastros fictícios, situações simuladas.'}">Colab: ${colaboradores.length} · Act: ${ativos} · ${percentual}%</span></h4>
      <h3 class="person-section">Responsáveis da equipe</h3>
      ${oficiais.map(item).join('')||'<p>Nenhum responsável cadastrado.</p>'}
      <h3 class="person-section">Colaboradores · ${colaboradores.length}</h3>
      ${colaboradores.map(item).join('')||'<p>Nenhum colaborador cadastrado.</p>'}
      <p class="equipe-nota">${globalThis.AlertaNuvem?.ativo?'Act: presença registrada.':'Act: presença registrada e situações simuladas.'}</p>
    </section>`;
  }).join('')||'<p>Nenhuma equipe no recorte.</p>';
  body.scrollTop=antes;
  body.querySelectorAll('[data-person]').forEach(botao=>botao.onclick=()=>{
    dependencias.fichaAberta=dependencias.fichaAberta===botao.dataset.person?null:botao.dataset.person;
    renderCollaborators();
    [...body.querySelectorAll('[data-person]')].find(el=>el.dataset.person===botao.dataset.person)?.focus({preventScroll:true});
  });
  body.querySelector('[data-chat]')?.addEventListener('click',e=>{
    if(dependencias.isViewOnly()) return;
    dependencias.chatContatoAtivo=e.currentTarget.dataset.chat;
    dependencias.chatOverlay.hidden=false;
    dependencias.renderChatContacts();
    dependencias.openChatThread(dependencias.chatContatoAtivo);
  });
  body.querySelector('[data-locate]')?.addEventListener('click',e=>{
    const id=e.currentTarget.dataset.locate;
    const marcador=dependencias.marcadoresPessoas.get(id)||dependencias.voluntarios.find(v=>v.id===id)?.marker;
    if(!marcador)return;
    dependencias.map.setView(marcador.getLatLng(),Math.max(dependencias.map.getZoom(),15),{animate:false});
    const rect=janelaColaboradores.getBoundingClientRect(),mapa=areaMapa.getBoundingClientRect();
    if(rect.left<mapa.left+mapa.width*.65) dependencias.map.panBy([-Math.min(rect.width/2,120),0],{animate:false});
    else dependencias.map.panBy([Math.min(rect.width/2,120),0],{animate:false});
    marcador.openTooltip();
  });
}
 async function iniciar(){
 (janelaColaboradores=document.getElementById('floatwin'));
(barraColaboradores=document.getElementById('floatwin-head'));
(areaMapa=document.getElementById('mapwrap'));
(arrasteColaboradores=null);
 return true;
 }
 return {iniciar,renderCollaborators,get janelaColaboradores(){return janelaColaboradores;},get barraColaboradores(){return barraColaboradores;},get areaMapa(){return areaMapa;},get arrasteColaboradores(){return arrasteColaboradores;},set arrasteColaboradores(valor){arrasteColaboradores=valor;}};
 }
});
})(globalThis);
