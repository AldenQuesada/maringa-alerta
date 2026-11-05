/* ---------- mapa ---------- */
const map = L.map('map', { zoomControl:true, attributionControl:true, zoomSnap:0, zoomDelta:0.5 }).setView(MARINGA_CENTER, 13);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution:'&copy; OpenStreetMap contributors',
  subdomains:'abc', maxZoom:19
}).addTo(map);
const estiloArea={color:'#f2c230',weight:2.2,opacity:.85,dashArray:'7,5',fillOpacity:.06,fillColor:'#f2c230'};
areas.forEach(area=>{
  try{
    if(area.demo) area.layer=L.polygon(area.demo.poly,estiloArea);
    else if(area.geojson){
      const geo=typeof area.geojson==='string'?JSON.parse(area.geojson):area.geojson;
      const geometria=geo.type==='Feature'?geo.geometry:geo;
      if(['Polygon','MultiPolygon'].includes(geometria?.type)) area.layer=L.geoJSON(geometria,{style:area.tipoArea==='Bairro'
        ? {...estiloArea,color:'#3daae4',fillColor:'#3daae4',weight:1.4,dashArray:null}:estiloArea});
    }
    if(!area.layer?.getBounds().isValid()){ area.layer=null; return; }
    area.layer.bindTooltip(escHtml([area.nome,area.tipoArea,area.fonte].filter(Boolean).join(' · ')),{sticky:true});
    area.layer.on('click',()=>selectZone(area.chave));
    if(camadasVisiveis[area.tipoArea]!==false) area.layer.addTo(map);
  }catch(_){ area.layer=null; }
});

// Mantém navegação dentro da área de Maringá sem interferir na seleção de ocorrências.
const navegacaoMapa = window.AlertaMapaNavegacao.instalar({
  map, L, zonas:[
    ...bairros.map(b=>b.poly),
    ...areasCadastradas.filter(a=>a.layer).map(a=>{
      const limites=a.layer.getBounds();
      return [limites.getSouthWest(),limites.getNorthEast(),limites.getNorthWest()];
    })
  ],
  aoRestaurar: () => {
    if(selecao.size){ selecao.clear(); atualizarRecorte(); }
  }
});

const ocLayer = L.layerGroup().addTo(map);
const volLayer = L.layerGroup().addTo(map);
const officialLayer = L.layerGroup().addTo(map);
let heatLayer = L.heatLayer([], { radius:34, blur:28, maxZoom:17, gradient:{0.2:'#2ecf78',0.5:'#f2c230',0.8:'#ff8a3b',1.0:'#ff3b3b'} });
let heatOn = false;

function rebuildHeat(){
  const pontos = ocorrencias
    .filter(o=> (o.status==='ativa'||o.status==='em_atendimento') && ocorrenciaVisivel(o))
    .map(o=> [o.pos[0], o.pos[1], o.gravidade/3]);
  heatLayer.setLatLngs(pontos);
}

function volIcon(aoVivo=false,status='indefinido'){
  return L.divIcon({className:'vol-marker',html:`<div class="vol-dot pessoa-${status}${aoVivo?' vol-live':''}"></div>`,iconSize:[24,24],iconAnchor:[12,12]});
}
function ocIcon(status){
  const color = STATUS_COLOR[status] || STATUS_COLOR.ativa;
  return L.divIcon({
    className:'', iconSize:[20,20], iconAnchor:[10,10],
    html:`<div class="oc-pulse" style="--oc:${color}"><div class="ring"></div><div class="core"></div></div>`
  });
}

function gerarVoluntarios(){
  // voluntarios de "antes desta funcionalidade existir": sem CPF/endereco reais, so os campos minimos
  // para o resto do sistema (fila de contribuicoes, mobilizacao) funcionar igual para todo mundo.
  bairros.forEach(b=>{
    const n = Math.floor(rnd(5,9));
    for(let i=0;i<n;i++){
      const pos = randPointInBox(b.poly);
      const ajuda = i===0?'Comida':i===1?'Mão de obra':pick(tiposAjuda);
      const v = {
        demo:true, id:"v"+(idCounter++), tenantId, nome:pick(nomesVol), ajuda, contribuicoes:[ajuda], bairro:b.nome, pos, ativo:false,
        cpf:null, endereco:null, alertaPreferencia:'todos',
        disponibilidadeZona: Math.random()<0.5 ? 'qualquer_zona' : 'somente_minha',
        temVeiculo:false, tipoVeiculo:null, aceitaReembolso:null, consentimentoLGPD:true,
        cadastradoEm: Date.now() - Math.floor(rnd(60,600))*60000,
      };
      v.marker = L.marker(pos, { icon: volIcon(), title:v.nome }).addTo(volLayer);
      configurarMarcadorPessoa(v.marker,v);
      voluntarios.push(v);
    }
  });
}

function gerarOcorrencia(config={}){
  const b = bairros.find(z=>z.nome===config.zona)||pick(bairros);
  const pos = randPointInBox(b.poly);
  const t = config.tipo||pick(tiposOcorrencia);
  const numId = idCounter++;
  const o = {
    id:"oc"+numId, tenantId, demo:true, confirmado:true, protocolo:tenantConfig.prefixo+"-"+String(10000+numId).slice(-5), tipo:t.tipo, icone:t.icone, bairro:b.nome, pos,
    gravidade: sortGravidade(t.gravBase), responsabilidade: pick(t.resp),
    reportadoEm: Date.now() - Math.floor(rnd(0,5))*60000,
    confirmadoEm:null, resolvidoEm:null,
    tempoEstimado: Math.floor(rnd(25,110)),
    status:"ativa", responsavel: b.equipe.responsavel,
    fotoTag: pick(["Foto enviada via WhatsApp","Reportado por morador","Capturado por equipe"]),
    voluntariosProx: [],
  };
  o.timeline=[{tipo:'confirmada',texto:'Ocorrência confirmada na demonstração',ts:o.reportadoEm}];

  const marker = L.marker(pos, { icon: ocIcon(o.status) }).addTo(ocLayer);
  marker.on('click', ()=>openOcorrencia(o));
  o.marker = marker;
  refreshOcTooltip(o);
  ocorrencias.push(o);
  acionarAjuda(o);
  applyZoneVisibility();
  rebuildHeat();
  return o;
}

function refreshOcTooltip(o){
  if(!o.marker)return;
  const statusLabel = o.confirmado===false ? 'EM TRIAGEM' : o.status==='ativa' ? 'AGUARDANDO EQUIPE' : o.status==='em_atendimento' ? 'EM ATENDIMENTO' : 'RESOLVIDA';
  o.marker.unbindTooltip();
  o.marker.bindTooltip(
    `<div class="tt-title">${o.icone} ${escHtml(o.tipo)}</div>
     <div class="tt-row">${escHtml(o.bairro)} · ${statusLabel}</div>
     <div class="tt-row">Gravidade: <b style="color:${GRAV_COLOR[o.gravidade]}">${GRAV_LABEL[o.gravidade]}</b> · Resp.: <b style="color:${RESP_COLOR[o.responsabilidade]}">${RESP_LABEL[o.responsabilidade]}</b></div>
     <div class="tt-row">Responsável: ${escHtml(o.responsavel.nome)}</div>`,
    { className:'oc-tooltip', direction:'top', offset:[0,-10] }
  );
}

