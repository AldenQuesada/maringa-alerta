
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
