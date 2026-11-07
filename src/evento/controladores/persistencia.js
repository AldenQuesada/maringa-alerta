/* Controlador persistencia: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('persistencia',{
 dependencias:{
  "conectado": "contexto",
  "tenantId": "contexto",
  "storageKey": "contexto",
  "bairros": "regioes",
  "ocorrencias": "cadastro-territorial",
  "voluntarios": "cadastro-territorial",
  "idCounter": "cadastro-territorial",
  "normalizarTerritorio": "cadastro-territorial",
  "eventoAtivo": "cadastro-territorial",
  "eventosCache": "cadastro-territorial",
  "eventosMunicipio": "cadastro-territorial",
  "abriuEventoDaUrl": "cadastro-territorial",
  "noEvento": "cadastro-territorial",
  "ocLayer": "mapa",
  "volLayer": "mapa",
  "volIcon": "mapa",
  "ocIcon": "mapa",
  "refreshOcTooltip": "mapa",
  "atualizarRecorte": "recorte",
  "configurarMarcadorPessoa": "pessoas",
  "currentPanelOcId": "ocorrencias",
  "openOcorrencia": "ocorrencias",
  "eventStart": "resumo",
  "alertaIdCursor": "escalonamento",
  "alertasClimaticos": "escalonamento",
  "prontidao": "escalonamento",
  "chatHistorico": "mensagens",
  "estadoPronto": "conversas",
  "ultimaSerializacao": "conversas",
  "registrarEtapa": "conversas",
  "enviarMensagemDemo": "conversas"
},
 criar(dependencias){

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
    dependencias.registrarEtapa(o,'complemento','Complemento opcional salvo');
    if(pendencias){
      dependencias.enviarMensagemDemo(o.responsavel.id,`Necessidade/observação em ${o.protocolo}: ${pendencias}`,o,'pendencia');
      dependencias.registrarEtapa(o,'pendencia','Observação encaminhada automaticamente ao responsável');
    }
    salvarPrototipo();dependencias.openOcorrencia(o);
  }).catch(()=>{err.textContent='Não foi possível ler a imagem. Você pode tentar novamente; isso não impede o término da ajuda.';});
}
function salvarPrototipo(){
  if(dependencias.conectado)return false;
  if(!dependencias.estadoPronto)return;
  try{
    const dados={versao:1,tenantId:dependencias.tenantId,idCounter:dependencias.idCounter,eventStart:dependencias.eventStart,
      voluntarios:dependencias.voluntarios.map(({marker,...v})=>v),
      ocorrencias:dependencias.ocorrencias.map(({marker,responsavel,...o})=>({...o,responsavelId:responsavel?.id})),
      chatHistorico:dependencias.chatHistorico,alertasClimaticos:dependencias.alertasClimaticos,prontidao:dependencias.prontidao,alertaIdCursor:dependencias.alertaIdCursor};
    const serializado=JSON.stringify(dados);
    if(serializado===dependencias.ultimaSerializacao)return true;
    if(localStorage.getItem(dependencias.storageKey('operacao'))!==dependencias.ultimaSerializacao){
      const aviso=document.getElementById('demo-save-status');aviso.textContent='Os dados foram alterados em outra aba. Recarregue antes de continuar; não substituímos os dados salvos.';aviso.hidden=false;return false;
    }
    localStorage.setItem(dependencias.storageKey('operacao'),serializado);
    dependencias.ultimaSerializacao=serializado;
    document.getElementById('demo-save-status').hidden=true;
    return true;
  }catch(e){const aviso=document.getElementById('demo-save-status');aviso.textContent='Não foi possível salvar neste navegador.';aviso.hidden=false;return false;}
}
function restaurarPrototipo(dados){
  dependencias.idCounter=dados.idCounter||1;if(Number.isFinite(dados.eventStart))dependencias.eventStart=dados.eventStart;
  dependencias.voluntarios=dados.voluntarios.map(v=>{
    const marker=L.marker(v.pos,{icon:dependencias.volIcon(),title:v.nome}).addTo(dependencias.volLayer);
    dependencias.configurarMarcadorPessoa(marker,{...v,demo:v.cpf==null&&v.endereco==null});
    return {...v,tenantId:dependencias.tenantId,marker};
  });
  dependencias.ocorrencias=dados.ocorrencias.map(item=>{
    const o={...item,tenantId:dependencias.tenantId,responsavel:responsavelDaOcorrencia(item.bairro),marker:null};
    if(o.status!=='resolvida'){
      o.marker=L.marker(o.pos,{icon:dependencias.ocIcon(o.status)}).addTo(dependencias.ocLayer);
      o.marker.on('click',()=>dependencias.openOcorrencia(o));dependencias.refreshOcTooltip(o);
    }
    return o;
  });
  Object.assign(dependencias.chatHistorico,dados.chatHistorico||{});
  dependencias.alertasClimaticos.push(...(dados.alertasClimaticos||[]));Object.assign(dependencias.prontidao,dados.prontidao||{});
  dependencias.alertaIdCursor=dados.alertaIdCursor||1;
  dependencias.ultimaSerializacao=JSON.stringify(dados);
  return true;
}
function responsavelDaOcorrencia(nome){
  const demo=dependencias.bairros.find(b=>b.nome===nome);
  if(demo)return demo.equipe.responsavel;
  const registro=AlertaGestaoDados.criar().lista('responsaveis',dependencias.tenantId).find(p=>dependencias.normalizarTerritorio(p.bairro||p.zona)===dependencias.normalizarTerritorio(nome));
  return registro?{id:registro.id,nome:registro.nome,cargo:registro.cargo||'Responsável',tel:registro.telefone||''}
    :{id:'sem-responsavel',nome:'Não cadastrado',cargo:'Responsável',tel:''};
}
function atualizarFiltroEventos(){
  const select=document.getElementById('filtro-evento');
  dependencias.eventosCache=AlertaGestaoDados.criar(undefined,{municipioId:dependencias.tenantId}).lista('eventos');const lista=dependencias.eventosMunicipio();
  if(!dependencias.abriuEventoDaUrl&&dependencias.eventoAtivo){const grupo=EventosMapa.membros(dependencias.eventoAtivo,lista);if(grupo.length>1)dependencias.eventoAtivo='mapa:'+EventosMapa.raiz(dependencias.eventoAtivo,lista);dependencias.abriuEventoDaUrl=true;}
  const grupos=lista.filter(e=>EventosMapa.membros(e.id,lista).length>1&&EventosMapa.raiz(e.id,lista)===e.id);
  select.replaceChildren(new Option('Todos os eventos',''),...grupos.map(e=>new Option('Mapa conjunto · '+e.nome,'mapa:'+e.id)),...lista.map(e=>new Option(e.nome,e.id)));
  if(![...select.options].some(e=>e.value===dependencias.eventoAtivo))dependencias.eventoAtivo='';
  select.value=dependencias.eventoAtivo;renderEventoReferencias();
}
function renderEventoReferencias(){
  const target=document.getElementById('evento-referencias'),lista=dependencias.eventosMunicipio();
  const ids=dependencias.eventoAtivo.startsWith('mapa:')?EventosMapa.membros(dependencias.eventoAtivo.slice(5),lista):[dependencias.eventoAtivo];
  EventoReferencias.render(target,lista.filter(e=>ids.includes(e.id)));
}
 async function iniciar(){
 document.getElementById('filtro-evento').addEventListener('change',e=>{
  dependencias.eventoAtivo=e.target.value;renderEventoReferencias();
  if(dependencias.currentPanelOcId&&!dependencias.noEvento(dependencias.ocorrencias.find(o=>o.id===dependencias.currentPanelOcId)||{}))document.getElementById('panel-close').click();
  dependencias.atualizarRecorte();
});
 return true;
 }
 return {iniciar,salvarAnexos,salvarPrototipo,restaurarPrototipo,responsavelDaOcorrencia,atualizarFiltroEventos,renderEventoReferencias};
 }
});
})(globalThis);
