/* ---------- menu de zonas (sidebar) ---------- */
const zoneListEl = document.getElementById('zone-list');

document.getElementById('territory-search').addEventListener('input',renderZoneList);
const controleCamadas=document.getElementById('territory-layers');
Object.entries(camadasVisiveis).filter(([tipo])=>areas.some(area=>area.tipoArea===tipo)).forEach(([tipo,visivel])=>{
  const label=document.createElement('label');
  const check=document.createElement('input');
  check.type='checkbox';
  check.checked=visivel;
  label.append(check, ' '+tipo);
  controleCamadas.append(label);
  check.onchange=()=>{camadasVisiveis[tipo]=check.checked;applyZoneVisibility();};
});
function renderZoneList(){
  const focado = zoneListEl.contains(document.activeElement) ? document.activeElement.dataset.area : null;
  const busca=normalizarTerritorio(document.getElementById('territory-search').value);
  const alertas=zonasComAlertaAtivo();
  const abertas=ocorrencias.filter(o=>noEvento(o)&&noFiltro(o)&&(o.status==='ativa'||o.status==='em_atendimento'));
  const visiveis=areas.filter(area=>selecao.has(area.chave)||normalizarTerritorio(area.nome).includes(busca));
  zoneListEl.innerHTML = `<button type="button" class="zone-item todos ${selecao.size?'':'active'}" data-area="" aria-pressed="${!selecao.size}">Todo o município</button>
    ${!areasCadastradas.length?'<p class="territory-hint">Áreas de demonstração. Importe o cadastro municipal em Gestão.</p>':''}
    ${visiveis.map(area=>{
      const selecionada=selecao.has(area.chave);
      const total=abertas.filter(o=>pertence(area,o.bairro)).length;
      return `<button type="button" class="zone-item ${selecionada?'active':''}" data-area="${escHtml(area.chave)}" aria-pressed="${selecionada}">
        <span class="zi-dot"></span><span class="zi-text" title="${escHtml([area.nome,area.tipoArea,area.layer?area.fonte:'Sem limite no mapa'].filter(Boolean).join(' · '))}"><span class="zi-name">${[...alertas].some(z=>pertence(area,z))?'🌦 ':''}${escHtml(area.nome)}</span>
        <span class="zi-count">${area.tipoArea}${area.layer?'':' · sem limite no mapa'}</span></span><span class="zi-badge">${total}</span></button>`;
    }).join('')}`;
  zoneListEl.querySelectorAll('button').forEach(botao=>{
    botao.onclick=()=>selectZone(botao.dataset.area);
    if(focado!==null && botao.dataset.area===focado) botao.focus({preventScroll:true});
  });
}

function selectZone(chave){
  if(!chave) selecao.clear();
  else if(selecao.has(chave)) selecao.delete(chave);
  else selecao.add(chave);
  atualizarRecorte();
  if(!selecao.size){ navegacaoMapa.restaurar(); return; }
  const limites=L.latLngBounds([]);
  areasSelecionadas().forEach(area=>{ if(area.layer) limites.extend(area.layer.getBounds()); });
  if(limites.isValid()) map.fitBounds(limites,{padding:[40,40]});
}

function atualizarRecorte(){
  renderZoneList();
  applyZoneVisibility();
  updateZoneStrip();
  updateKpis();
  renderOfficialMarkers();
  rebuildHeat();
  if(currentPanelOcId && !ocorrencias.some(o=>o.id===currentPanelOcId && ocorrenciaVisivel(o))) document.getElementById('panel-close').click();
  if(!filaOverlay.hidden) renderFila();
  if(!relatorioOverlay.hidden) renderRelatorioEvento();
  if(!alertasOverlay.hidden) renderAlertasBody();
  if(!adminOverlay.hidden) renderAdminBody();
  if(!auditOverlay.hidden) renderAudit();
  if(!chatOverlay.hidden){
    renderChatContacts();
    if(!chatContatos().some(c=>c.id===chatContatoAtivo)){
      chatContatoAtivo=null;
      document.getElementById('chat-thread').textContent='Selecione um contato.';
    }
  }
}

function applyZoneVisibility(){
  areas.forEach(area=>{
    if(!area.layer) return;
    if(selecao.has(area.chave)||(!selecao.size&&camadasVisiveis[area.tipoArea]!==false)) area.layer.addTo(map);
    else area.layer.remove();
  });
  ocorrencias.forEach(o=>{
    const historico=filtroOcorrencias?.obter().situacoes.includes('resolvida');
    if(!o.marker&&o.status==='resolvida'&&historico&&o.pos){o.marker=L.marker(o.pos,{icon:ocIcon(o.status)});o.marker.on('click',()=>openOcorrencia(o));refreshOcTooltip(o);}
    if(!o.marker)return;
    const show=ocorrenciaVisivel(o)&&(o.status!=='resolvida'||historico);
    const has=ocLayer.hasLayer(o.marker);
    if(show&&!has)o.marker.addTo(ocLayer);
    if(!show&&has)ocLayer.removeLayer(o.marker);
  });
  voluntarios.forEach(v=>{
    const show = noRecorte(v.bairro);
    const has = volLayer.hasLayer(v.marker);
    if(show && !has) v.marker.addTo(volLayer);
    if(!show && has) volLayer.removeLayer(v.marker);
  });
  renderCollaborators();
}

function updateZoneStrip(){
  const strip = document.getElementById('zone-strip');
  strip.style.display = selecao.size ? 'flex' : 'none';
  strip.textContent = selecao.size ? recorteLabel() : '';
  strip.title = bairros.filter(b=>noRecorte(b.nome)).map(b=>{
    const faltando=itensQueFaltamNaZona(b.nome).map(item=>item.tipo);
    return [b.nome,b.equipamentos.join(', '),faltando.length?'Necessidades: '+faltando.join(', '):''].filter(Boolean).join(' · ');
  }).join('\n');
}

function pessoasMunicipio(){
  const cadastro=AlertaGestaoDados.criar();
  return [
    ...cadastro.lista('pessoas',tenantId).filter(p=>p.status!=='Inativo'&&p.verificacao!=='Rejeitado')
      .map(p=>({...p,id:'rh:'+p.id,oficial:true,sub:[p.funcao,...(Array.isArray(p.papeis)?p.papeis:[])].map(papel=>PAPEL_LABEL[papel]||papel).join(' · ')})),
    ...cadastro.lista('voluntarios',tenantId).map(p=>({...p,id:'cad:'+p.id,
      sub:[...['ajudas','maquinas','empreendedores','materiais'].flatMap(chave=>Array.isArray(p[chave])?p[chave]:[]),p.contribuicao].filter(Boolean).join(', ')})),
    ...todosFuncionarios().map(p=>({...p,oficial:true,sub:PAPEL_LABEL[p.papel],demo:true})),
    ...voluntarios.map(v=>({...v,zona:v.bairro,sub:(v.contribuicoes||[v.ajuda]).join(', '),demo:true,disponibilidade:estadoPessoa(v.id)}))
  ].map(p=>({...p,bairroOrigem:p.bairro||p.zona}));
}
function pontoPessoa(p){
  if(p.pos) return p.pos;
  const lat=Number(p.checkin_lat),lng=Number(p.checkin_lng);
  if(p.checkin_status==='presente'&&p.checkin_lat!==''&&p.checkin_lng!==''&&Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180) return [lat,lng];
  return null;
}
function statusPessoaMapa(p){
  const participacoes=ocorrencias.flatMap(o=>o.participacoes||[]).filter(x=>x.voluntarioId===p.id);
  if(participacoes.some(x=>x.status==='no_local') || p.checkin_status==='presente') return ['local','No local · chegada registrada'];
  if(participacoes.some(x=>x.status==='em_caminho') || p.checkin_status==='em_caminho') return ['caminho','A caminho · deslocamento confirmado'];
  if(p.checkin_status==='finalizado'||participacoes.some(x=>x.status==='concluida')) return ['fora','Fora da obra · saída registrada'];
  const ficticio=p.demo===true && (p.oficial || (p.cpf==null && p.endereco==null));
  if(ficticio){
    const numero=Number(String(p.id).replace(/\D/g,''));
    if(Number.isFinite(numero)){
      return [
        ['local','No local · situação simulada'],
        ['caminho','A caminho · situação simulada'],
        ['fora','Fora da obra · situação simulada']
      ][numero%3];
    }
  }
  return ['indefinido','Situação não informada'];
}
function textoMarcadorPessoa(p){
  const [,status]=statusPessoaMapa(p);
  return `<strong>${escHtml(p.nome)}</strong><br>${escHtml([p.sub||p.ajuda,p.bairroOrigem||p.bairro||p.zona,status,p.demo?'Demonstração':''].filter(Boolean).join(' · '))}`;
}
function configurarMarcadorPessoa(marcador,p){
  marcador.setIcon(volIcon(!!posicaoAtual(p.id),statusPessoaMapa(p)[0]));
  marcador.bindTooltip(textoMarcadorPessoa(p),{direction:'top',offset:[0,-8]});
  marcador.on('click',()=>mostrarFicha(p.id));
  return marcador;
}
function pessoasPainel(){
  return pessoasMunicipio().filter(p=>noRecorte(p.bairroOrigem));
}

let fichaAberta=null;
const marcadoresPessoas=new Map();
function mostrarFicha(id){
  if(currentPanelOcId) document.getElementById('panel-close').click();
  fichaAberta=id;
  const painel=document.getElementById('floatwin-body');
  if(painel.hidden || document.getElementById('floatwin').classList.contains('minimized')) document.getElementById('floatwin-min').click();
  renderCollaborators();
  document.getElementById('ficha-pessoa')?.scrollIntoView({block:'nearest'});
}

function renderOfficialMarkers(){
  officialLayer.clearLayers();
  marcadoresPessoas.clear();
  pessoasPainel().filter(p=>(p.oficial||p.id.startsWith('cad:'))&&pontoPessoa(p)).forEach(p=>{
    const marcador=configurarMarcadorPessoa(L.marker(pontoPessoa(p),{icon:volIcon(),title:p.nome}),p).addTo(officialLayer);
    marcadoresPessoas.set(p.id,marcador);
  });
}

function atualizarCadastroMapa(){
  renderOfficialMarkers();
  renderCollaborators();
  updateKpis();
}
window.addEventListener('storage',e=>{
  if(e.key===AlertaGestaoDados.CHAVE) atualizarCadastroMapa();
});
window.addEventListener('focus',atualizarCadastroMapa);

const localizacoes=new Map();
const VALIDADE_GPS_MS=90000;
const RAIO_CHECK_IN_M=150;
function posicaoAtual(id){
  const atual=localizacoes.get(id);
  return atual?.pos && Date.now()-atual.ts<=VALIDADE_GPS_MS ? atual : null;
}
function atualizarPontoAoVivo(id){
  const voluntario=voluntarios.find(v=>v.id===id);
  if(!voluntario?.marker)return;
  const atual=posicaoAtual(id);
  voluntario.marker.setLatLng(atual?.pos||voluntario.pos);
  const pessoa={...voluntario,demo:voluntario.cpf==null&&voluntario.endereco==null};
  voluntario.marker.setIcon(volIcon(!!atual,statusPessoaMapa(pessoa)[0]));
  voluntario.marker.setTooltipContent(textoMarcadorPessoa(pessoa));
}
function pararLocalizacao(id){
  const atual=localizacoes.get(id);
  if(!atual)return;
  navigator.geolocation.clearWatch(atual.watch);
  clearTimeout(atual.expiracao);
  localizacoes.delete(id);
  atualizarPontoAoVivo(id);
}
function checkInValido(o,id){
  const atual=posicaoAtual(id);
  return atual?.ocorrenciaId===o.id && Number.isFinite(atual.precisao)
    && map.distance(atual.pos,o.pos)+atual.precisao<=RAIO_CHECK_IN_M;
}
function colaboradorAtivo(id){
  const pessoa=pessoasMunicipio().find(p=>p.id===id);
  if(pessoa?.id.startsWith('cad:')) return pessoa.checkin_status==='presente'&&normalizarTerritorio(pessoa.checkin_bairro)===normalizarTerritorio(pessoa.bairroOrigem);
  const atual=posicaoAtual(id);
  const ocorrencia=atual&&ocorrencias.find(o=>o.id===atual.ocorrenciaId);
  if(ocorrencia?.participacoes?.some(p=>p.voluntarioId===id&&p.status==='no_local'&&p.checkInGPS)) return true;
  const [situacao,descricao]=pessoa?statusPessoaMapa(pessoa):[];
  return situacao==='local'&&descricao==='No local · situação simulada';
}
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
function posicionarColaboradores(x,y){
  janelaColaboradores.style.right='auto';
  janelaColaboradores.style.left=Math.max(0,Math.min(x,areaMapa.clientWidth-janelaColaboradores.offsetWidth))+'px';
  janelaColaboradores.style.top=Math.max(0,Math.min(y,areaMapa.clientHeight-janelaColaboradores.offsetHeight))+'px';
}
function ajustarJanelaColaboradores(){
  if(janelaColaboradores.style.left) posicionarColaboradores(janelaColaboradores.offsetLeft,janelaColaboradores.offsetTop);
}
barraColaboradores.addEventListener('pointerdown',e=>{
  if(!e.isPrimary||e.button!==0||e.target.closest('button'))return;
  arrasteColaboradores={id:e.pointerId,x:e.clientX-janelaColaboradores.offsetLeft,y:e.clientY-janelaColaboradores.offsetTop};
  barraColaboradores.setPointerCapture(e.pointerId);
  barraColaboradores.classList.add('dragging');
});
barraColaboradores.addEventListener('pointermove',e=>{
  if(arrasteColaboradores?.id!==e.pointerId)return;
  posicionarColaboradores(e.clientX-arrasteColaboradores.x,e.clientY-arrasteColaboradores.y);
});
barraColaboradores.addEventListener('lostpointercapture',()=>{
  arrasteColaboradores=null;
  barraColaboradores.classList.remove('dragging');
});
new ResizeObserver(ajustarJanelaColaboradores).observe(areaMapa);
document.getElementById('floatwin-min').onclick=e=>{
  const recolhido=janelaColaboradores.classList.toggle('minimized');
  document.getElementById('floatwin-body').hidden=recolhido;
  e.currentTarget.textContent=recolhido?'+':'_';
  const rotulo=recolhido?'Abrir colaboradores':'Recolher colaboradores';
  e.currentTarget.title=rotulo;
  e.currentTarget.setAttribute('aria-label',rotulo);
  e.currentTarget.setAttribute('aria-expanded',String(!recolhido));
  ajustarJanelaColaboradores();
};

