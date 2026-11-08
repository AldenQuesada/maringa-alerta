/* Controlador mapa: estado próprio e dependências de outros domínios declaradas. */
(function(root){'use strict';
root.AlertaEventoControladores.definir('mapa',{
 dependencias:{
  "sortGravidade": "contexto",
  "rnd": "contexto",
  "pick": "contexto",
  "escHtml": "contexto",
  "randPointInBox": "contexto",
  "tenantId": "contexto",
  "prefeituraContexto": "contexto",
  "tenantConfig": "contexto",
  "storageKey": "contexto",
  "bairros": "regioes",
  "MUNICIPIO_CENTER": "regioes",
  "tiposAjuda": "equipes",
  "nomesVol": "equipes",
  "tiposOcorrencia": "equipes",
  "GRAV_LABEL": "equipes",
  "GRAV_COLOR": "equipes",
  "RESP_LABEL": "equipes",
  "RESP_COLOR": "equipes",
  "STATUS_COLOR": "equipes",
  "ocorrencias": "cadastro-territorial",
  "voluntarios": "cadastro-territorial",
  "idCounter": "cadastro-territorial",
  "areasCadastradas": "cadastro-territorial",
  "areas": "cadastro-territorial",
  "selecao": "cadastro-territorial",
  "camadasVisiveis": "cadastro-territorial",
  "ocorrenciaVisivel": "cadastro-territorial",
  "selectZone": "recorte",
  "atualizarRecorte": "recorte",
  "applyZoneVisibility": "recorte",
  "configurarMarcadorPessoa": "pessoas",
  "openOcorrencia": "ocorrencias",
  "acionarAjuda": "conversas"
},
 criar(dependencias){
 let map,estiloArea,navegacaoMapa,ocLayer,volLayer,officialLayer,heatLayer,heatOn;
 function rebuildHeat(){
  const pontos = dependencias.ocorrencias
    .filter(o=> (o.status==='ativa'||o.status==='em_atendimento') && dependencias.ocorrenciaVisivel(o))
    .map(o=> [o.pos[0], o.pos[1], o.gravidade/3]);
  heatLayer.setLatLngs(pontos);
}
function volIcon(aoVivo=false,status='indefinido',deslocamento=0){
  const anchor=deslocamento?[12-((deslocamento-1)%5-2)*16,12-Math.floor((deslocamento-1)/5)*16]:[12,12];
  return L.divIcon({className:'vol-marker',html:`<div class="vol-dot ${status==='local'?'mapa-ativo':'mapa-inativo'}${aoVivo?' vol-live':''}"></div>`,iconSize:[24,24],iconAnchor:anchor});
}
function ocIcon(status){
  const color = dependencias.STATUS_COLOR[status] || dependencias.STATUS_COLOR.ativa;
  return L.divIcon({
    className:'', iconSize:[20,20], iconAnchor:[10,10],
    html:`<div class="oc-pulse" style="--oc:${color}"><div class="ring"></div><div class="core"></div></div>`
  });
}
function gerarVoluntarios(){
  // voluntarios de "antes desta funcionalidade existir": sem CPF/endereco reais, so os campos minimos
  // para o resto do sistema (fila de contribuicoes, mobilizacao) funcionar igual para todo mundo.
  dependencias.bairros.forEach(b=>{
    const n = Math.floor(dependencias.rnd(5,9));
    for(let i=0;i<n;i++){
      const pos = dependencias.randPointInBox(b.poly);
      const ajuda = i===0?'Comida':i===1?'Mão de obra':dependencias.pick(dependencias.tiposAjuda);
      const v = {
        demo:true, id:"v"+(dependencias.idCounter++), tenantId:dependencias.tenantId, nome:dependencias.pick(dependencias.nomesVol), ajuda, contribuicoes:[ajuda], bairro:b.nome, pos, ativo:false,
        cpf:null, endereco:null, alertaPreferencia:'todos',
        disponibilidadeZona: Math.random()<0.5 ? 'qualquer_zona' : 'somente_minha',
        temVeiculo:false, tipoVeiculo:null, aceitaReembolso:null, consentimentoLGPD:true,
        cadastradoEm: Date.now() - Math.floor(dependencias.rnd(60,600))*60000,
      };
      v.marker = L.marker(pos, { icon: volIcon(), title:v.nome }).addTo(volLayer);
      dependencias.configurarMarcadorPessoa(v.marker,v);
      dependencias.voluntarios.push(v);
    }
  });
}
function gerarOcorrencia(config={}){
  const b = dependencias.bairros.find(z=>z.nome===config.zona)||dependencias.pick(dependencias.bairros);
  const pos = dependencias.randPointInBox(b.poly);
  const t = config.tipo||dependencias.pick(dependencias.tiposOcorrencia);
  const numId = dependencias.idCounter++;
  const o = {
    id:"oc"+numId, tenantId:dependencias.tenantId, demo:true, confirmado:true, protocolo:dependencias.tenantConfig.prefixo+"-"+String(10000+numId).slice(-5), tipo:t.tipo, icone:t.icone, bairro:b.nome, pos,
    gravidade: dependencias.sortGravidade(t.gravBase), responsabilidade: dependencias.pick(t.resp),
    reportadoEm: Date.now() - Math.floor(dependencias.rnd(0,5))*60000,
    confirmadoEm:null, resolvidoEm:null,
    tempoEstimado: Math.floor(dependencias.rnd(25,110)),
    status:"ativa", responsavel: b.equipe.responsavel,
    fotoTag: dependencias.pick(["Foto enviada via WhatsApp","Reportado por morador","Capturado por equipe"]),
    voluntariosProx: [],
  };
  o.timeline=[{tipo:'confirmada',texto:'Ocorrência confirmada na demonstração',ts:o.reportadoEm}];

  const marker = L.marker(pos, { icon: ocIcon(o.status) }).addTo(ocLayer);
  marker.on('click', ()=>dependencias.openOcorrencia(o));
  o.marker = marker;
  refreshOcTooltip(o);
  dependencias.ocorrencias.push(o);
  dependencias.acionarAjuda(o);
  dependencias.applyZoneVisibility();
  rebuildHeat();
  return o;
}
function refreshOcTooltip(o){
  if(!o.marker)return;
  const statusLabel = o.remota ? o.registro.status.toLocaleUpperCase('pt-BR') : o.confirmado===false ? 'EM TRIAGEM' : o.status==='ativa' ? 'AGUARDANDO EQUIPE' : o.status==='em_atendimento' ? 'EM ATENDIMENTO' : 'RESOLVIDA';
  o.marker.unbindTooltip();
  o.marker.bindTooltip(
    `<div class="tt-title">${o.icone} ${dependencias.escHtml(o.tipo)}</div>
     <div class="tt-row">${dependencias.escHtml(o.bairro)} · ${statusLabel}</div>
     <div class="tt-row">Gravidade: <b style="color:${dependencias.GRAV_COLOR[o.gravidade]}">${dependencias.GRAV_LABEL[o.gravidade]}</b> · Resp.: <b style="color:${dependencias.RESP_COLOR[o.responsabilidade]}">${dependencias.RESP_LABEL[o.responsabilidade]}</b></div>
     <div class="tt-row">Responsável: ${dependencias.escHtml(o.responsavel.nome)}</div>`,
    { className:'oc-tooltip', direction:'top', offset:[0,-10] }
  );
}
 async function iniciar(){
 (map=L.map('map', { zoomControl:true, attributionControl:true, zoomSnap:0, zoomDelta:0.5 }).setView(dependencias.MUNICIPIO_CENTER||[0,0], dependencias.MUNICIPIO_CENTER?13:2));
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:'&copy; OpenStreetMap contributors',
  subdomains:'abc', maxZoom:19
}).addTo(map);
(estiloArea={color:'#f2c230',weight:2.2,opacity:.85,dashArray:'7,5',fillOpacity:.06,fillColor:'#f2c230'});
dependencias.areas.forEach(area=>{
  try{
    if(area.demo) area.layer=L.polygon(area.demo.poly,estiloArea);
    else if(area.geojson){
      const geo=typeof area.geojson==='string'?JSON.parse(area.geojson):area.geojson;
      const geometria=geo.type==='Feature'?geo.geometry:geo;
      if(['Polygon','MultiPolygon'].includes(geometria?.type)) area.layer=L.geoJSON(geometria,{style:area.tipoArea==='Bairro'
        ? {...estiloArea,color:'#3daae4',fillColor:'#3daae4',weight:1.4,dashArray:null}:estiloArea});
    }
    if(!area.layer?.getBounds().isValid()){ area.layer=null; return; }
    area.layer.bindTooltip(dependencias.escHtml([area.nome,area.tipoArea,area.fonte].filter(Boolean).join(' · ')),{sticky:true});
    area.layer.on('click',()=>dependencias.selectZone(area.chave));
    if(dependencias.camadasVisiveis[area.tipoArea]!==false) area.layer.addTo(map);
  }catch(_){ area.layer=null; }
});
(navegacaoMapa=window.AlertaMapaNavegacao.instalar({
  map, L, limites:AlertaGestaoDados.config.limites(dependencias.prefeituraContexto),
  vistaInicial:AlertaGestaoDados.config.vistaMapa(dependencias.prefeituraContexto,'evento'),
  arrasteNoMinimo:true, zonas:[
    ...dependencias.bairros.map(b=>b.poly),
    ...dependencias.areasCadastradas.filter(a=>a.layer).map(a=>{
      const limites=a.layer.getBounds();
      return [limites.getSouthWest(),limites.getNorthEast(),limites.getNorthWest()];
    })
  ],
  aoRestaurar: () => {
    if(dependencias.selecao.size){ dependencias.selecao.clear(); dependencias.atualizarRecorte(); }
  }
}));
(ocLayer=L.layerGroup().addTo(map));
(volLayer=L.layerGroup().addTo(map));
(officialLayer=L.layerGroup().addTo(map));
(heatLayer=L.heatLayer([], { radius:34, blur:28, maxZoom:17, gradient:{0.2:'#2ecf78',0.5:'#f2c230',0.8:'#ff8a3b',1.0:'#ff3b3b'} }));
(heatOn=false);
 return true;
 }
 return {iniciar,get map(){return map;},get estiloArea(){return estiloArea;},get navegacaoMapa(){return navegacaoMapa;},get ocLayer(){return ocLayer;},get volLayer(){return volLayer;},get officialLayer(){return officialLayer;},get heatLayer(){return heatLayer;},set heatLayer(valor){heatLayer=valor;},get heatOn(){return heatOn;},set heatOn(valor){heatOn=valor;},rebuildHeat,volIcon,ocIcon,gerarVoluntarios,gerarOcorrencia,refreshOcTooltip};
 }
});
})(globalThis);
