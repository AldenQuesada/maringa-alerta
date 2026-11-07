/* Controlador pessoas: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('pessoas',{
 dependencias:{
  "escHtml": "contexto",
  "tenantId": "contexto",
  "exibirEquipesLegadas": "contexto",
  "PAPEL_LABEL": "regioes",
  "todosFuncionarios": "regioes",
  "ocorrencias": "cadastro-territorial",
  "voluntarios": "cadastro-territorial",
  "gestao": "cadastro-territorial",
  "normalizarTerritorio": "cadastro-territorial",
  "areas": "cadastro-territorial",
  "noRecorte": "cadastro-territorial",
  "filtroOcorrencias": "cadastro-territorial",
  "map": "mapa",
  "officialLayer": "mapa",
  "volIcon": "mapa",
  "atualizarRecorte": "recorte",
  "renderCollaborators": "painel-colaboradores",
  "currentPanelOcId": "ocorrencias",
  "estadoPessoa": "conversas",
  "atualizarFiltroEventos": "persistencia",
  "montarMarcadoresPublicos": "inicializacao",
  "atualizarFiltroCadastros": "busca"
},
 criar(dependencias){
 let fichaAberta,marcadoresPessoas,assinaturaTerritorial,ultimaAssinaturaTerritorial,localizacoes,VALIDADE_GPS_MS,RAIO_CHECK_IN_M;
 function pessoasMunicipio(){
  const cadastro=AlertaGestaoDados.criar();
  return [
    ...cadastro.lista('pessoas',dependencias.tenantId).filter(p=>p.status!=='Inativo'&&p.verificacao!=='Rejeitado')
      .map(p=>({...p,id:'rh:'+p.id,oficial:true,sub:[p.funcao,...(Array.isArray(p.papeis)?p.papeis:[])].map(papel=>dependencias.PAPEL_LABEL[papel]||papel).join(' · ')})),
    ...cadastro.lista('voluntarios',dependencias.tenantId).map(p=>({...p,id:'cad:'+p.id,
      sub:[...['ajudas','maquinas','empreendedores','materiais'].flatMap(chave=>Array.isArray(p[chave])?p[chave]:[]),p.contribuicao].filter(Boolean).join(', ')})),
    ...(dependencias.exibirEquipesLegadas?dependencias.todosFuncionarios().map(p=>({...p,oficial:true,sub:dependencias.PAPEL_LABEL[p.papel],demo:true})):[]),
    ...dependencias.voluntarios.map(v=>({...v,zona:v.bairro,sub:(v.contribuicoes||[v.ajuda]).join(', '),demo:true,disponibilidade:dependencias.estadoPessoa(v.id)}))
  ].map(p=>({...p,bairroOrigem:p.bairro||p.zona}));
}
function referenciaPessoa(p){
  if(p.pos) return {pos:p.pos,aproximado:false};
  const lat=Number(p.checkin_lat),lng=Number(p.checkin_lng);
  if(p.checkin_status==='presente'&&p.checkin_lat!==''&&p.checkin_lng!==''&&p.checkin_lat!=null&&p.checkin_lng!=null&&Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180) return {pos:[lat,lng],aproximado:false};
  // Sem localização individual, usa apenas o centro da área já cadastrada.
  for(const nome of [p.bairroOrigem,p.bairro,p.zona].filter(Boolean)){
    const area=dependencias.areas.find(a=>!a.demo&&a.layer&&[a.id,a.nome].some(x=>dependencias.normalizarTerritorio(x)===dependencias.normalizarTerritorio(nome)));
    const bounds=area?.layer?.getBounds();
    if(bounds?.isValid()){const centro=bounds.getCenter();return {pos:[centro.lat,centro.lng],aproximado:true,area:area.nome};}
  }
  return null;
}
function pontoPessoa(p){return referenciaPessoa(p)?.pos||null;}
function statusPessoaMapa(p){
  const participacoes=dependencias.ocorrencias.flatMap(o=>o.participacoes||[]).filter(x=>x.voluntarioId===p.id);
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
  const local=referenciaPessoa(p);
  return `<strong>${dependencias.escHtml(p.nome)}</strong><br>${dependencias.escHtml([p.sub||p.ajuda,p.bairroOrigem||p.bairro||p.zona,status,local?.aproximado?'Localização aproximada da área':'',p.demo?'Demonstração':''].filter(Boolean).join(' · '))}`;
}
function configurarMarcadorPessoa(marcador,p,deslocamento=0){
  marcador.setIcon(dependencias.volIcon(!!posicaoAtual(p.id),statusPessoaMapa(p)[0],deslocamento));
  marcador.bindTooltip(textoMarcadorPessoa(p),{direction:'top',offset:[0,-8]});
  marcador.on('click',()=>mostrarFicha(p.id));
  return marcador;
}
function pessoasPainel(){
  return pessoasMunicipio().filter(p=>dependencias.noRecorte(p.bairroOrigem));
}
function mostrarFicha(id){
  if(dependencias.currentPanelOcId) document.getElementById('panel-close').click();
  fichaAberta=id;
  const painel=document.getElementById('floatwin-body');
  if(painel.hidden || document.getElementById('floatwin').classList.contains('minimized')) document.getElementById('floatwin-min').click();
  dependencias.renderCollaborators();
  document.getElementById('ficha-pessoa')?.scrollIntoView({block:'nearest'});
}
function renderOfficialMarkers(){
  dependencias.officialLayer.clearLayers();
  marcadoresPessoas.clear();
  const referenciasPorArea=new Map();
  pessoasPainel().filter(p=>(p.oficial||p.id.startsWith('cad:'))&&pontoPessoa(p)).forEach(p=>{
    const referencia=referenciaPessoa(p);
    let deslocamento=0;
    if(referencia.aproximado){const chave=dependencias.normalizarTerritorio(referencia.area);deslocamento=(referenciasPorArea.get(chave)||0)+1;referenciasPorArea.set(chave,deslocamento);}
    const marcador=configurarMarcadorPessoa(L.marker(referencia.pos,{icon:dependencias.volIcon(),title:p.nome}),p,deslocamento).addTo(dependencias.officialLayer);
    marcadoresPessoas.set(p.id,marcador);
  });
}
function atualizarCadastroMapa(){
  // Alterações dos limites territoriais exigem reconstruir as camadas, não reaproveitar polígonos antigos.
  const assinatura=assinaturaTerritorial();
  if(assinatura!==ultimaAssinaturaTerritorial){
   ultimaAssinaturaTerritorial=assinatura;location.reload();return;
  }
  // A Gestão é a fonte dos cadastros: atualiza os eventos e as opções dos
  // filtros junto dos recursos e equipes ao retornar ao mapa ou mudar outra aba.
  dependencias.atualizarFiltroEventos();
  dependencias.filtroOcorrencias?.atualizarOpcoes();
  dependencias.atualizarRecorte();
  dependencias.montarMarcadoresPublicos();
  dependencias.atualizarFiltroCadastros();
}
function posicaoAtual(id){
  const atual=localizacoes.get(id);
  return atual?.pos && Date.now()-atual.ts<=VALIDADE_GPS_MS ? atual : null;
}
function atualizarPontoAoVivo(id){
  const voluntario=dependencias.voluntarios.find(v=>v.id===id);
  if(!voluntario?.marker)return;
  const atual=posicaoAtual(id);
  voluntario.marker.setLatLng(atual?.pos||voluntario.pos);
  const pessoa={...voluntario,demo:voluntario.cpf==null&&voluntario.endereco==null};
  voluntario.marker.setIcon(dependencias.volIcon(!!atual,statusPessoaMapa(pessoa)[0]));
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
    && dependencias.map.distance(atual.pos,o.pos)+atual.precisao<=RAIO_CHECK_IN_M;
}
function colaboradorAtivo(id){
  const pessoa=pessoasMunicipio().find(p=>p.id===id);
  if(pessoa?.id.startsWith('cad:')) return pessoa.checkin_status==='presente'&&dependencias.normalizarTerritorio(pessoa.checkin_bairro)===dependencias.normalizarTerritorio(pessoa.bairroOrigem);
  const atual=posicaoAtual(id);
  const ocorrencia=atual&&dependencias.ocorrencias.find(o=>o.id===atual.ocorrenciaId);
  if(ocorrencia?.participacoes?.some(p=>p.voluntarioId===id&&p.status==='no_local'&&p.checkInGPS)) return true;
  const [situacao,descricao]=pessoa?statusPessoaMapa(pessoa):[];
  return situacao==='local'&&descricao==='No local · situação simulada';
}
 async function iniciar(){
 (fichaAberta=null);
(marcadoresPessoas=new Map());
(assinaturaTerritorial=()=>JSON.stringify(["zonas","bairros"].flatMap(modulo=>
 dependencias.gestao.lista(modulo,dependencias.tenantId).map(x=>[modulo,x.id,x.nome,x.zona,x.geojson,x.verificacao]))));
(ultimaAssinaturaTerritorial=assinaturaTerritorial());
window.addEventListener('storage',e=>{
  if(e.key===AlertaGestaoDados.CHAVE) atualizarCadastroMapa();
});
window.addEventListener('focus',atualizarCadastroMapa);
(localizacoes=new Map());
(VALIDADE_GPS_MS=AlertaGestaoDados.parametros.gps.validadeMs);
(RAIO_CHECK_IN_M=AlertaGestaoDados.parametros.gps.raioCheckinMetros);
 return true;
 }
 return {iniciar,pessoasMunicipio,referenciaPessoa,pontoPessoa,statusPessoaMapa,textoMarcadorPessoa,configurarMarcadorPessoa,pessoasPainel,get fichaAberta(){return fichaAberta;},set fichaAberta(valor){fichaAberta=valor;},get marcadoresPessoas(){return marcadoresPessoas;},mostrarFicha,renderOfficialMarkers,get assinaturaTerritorial(){return assinaturaTerritorial;},get ultimaAssinaturaTerritorial(){return ultimaAssinaturaTerritorial;},set ultimaAssinaturaTerritorial(valor){ultimaAssinaturaTerritorial=valor;},atualizarCadastroMapa,get localizacoes(){return localizacoes;},get VALIDADE_GPS_MS(){return VALIDADE_GPS_MS;},get RAIO_CHECK_IN_M(){return RAIO_CHECK_IN_M;},posicaoAtual,atualizarPontoAoVivo,pararLocalizacao,checkInValido,colaboradorAtivo};
 }
});
})(globalThis);
