
(async function(){
"use strict";
const tenantId='maringa';
const tenantConfig={nome:'Maringá',marca:'MARINGÁ ALERTA',prefixo:'MA'};
const storageKey=nome=>`alerta_prototipo_v2_${tenantId}_${nome}`;
// O Mapa de Evento usa somente o contexto local de Maringá.


/* ---------- zonas de demonstração sobre o mapa de Maringá ---------- */
const equipePool = [
  {nome:"Marcos Teixeira", cargo:"Vereador"},
  {nome:"Fernanda Lopes", cargo:"Secretária de Assistência Social"},
  {nome:"Ricardo Bittencourt", cargo:"Chefe de Defesa Civil"},
  {nome:"Juliana Prado", cargo:"Subsecretária de Obras"},
  {nome:"Eduardo Namiki", cargo:"Vereador"},
  {nome:"Carla Mendonça", cargo:"Coordenadora Regional"},
  {nome:"Paulo Henrique Camargo", cargo:"Chefe de Departamento"},
  {nome:"Renata Sakamoto", cargo:"Subsecretária de Assistência Social"},
  {nome:"Vitor Almeida Rocha", cargo:"Coordenador de Campo"},
  {nome:"Simone Aparecida Dias", cargo:"Vereadora"},
  {nome:"André Luiz Ferraz", cargo:"Chefe de Defesa Civil"},
  {nome:"Patrícia Gonçalves", cargo:"Subsecretária de Obras"},
  {nome:"Thiago Moraes Vilela", cargo:"Coordenador Regional"},
  {nome:"Luciana Barreto", cargo:"Secretária de Infraestrutura"},
  {nome:"Fábio Cardoso Neto", cargo:"Chefe de Departamento"},
  {nome:"Mariana Esteves", cargo:"Subsecretária de Saúde"},
  {nome:"Rogério Villela", cargo:"Coordenador de Campo"},
  {nome:"Daniela Freitas", cargo:"Vereadora"},
];
let equipeCursor = 0;
function nextEquipe(){ return equipePool[(equipeCursor++) % equipePool.length]; }

const equipamentosPool = ["2 motosserras","1 caminhão basculante","1 retroescavadeira","Kit de resgate","Gerador móvel","1 caminhão-pipa","Equipe de eletricistas","Ambulância de apoio"];

const bairros = [
  { nome:"Zona 7", center:[-23.3995,-51.9395],
    poly:[[-23.392,-51.950],[-23.392,-51.930],[-23.408,-51.930],[-23.408,-51.950]] },
  { nome:"Jardim Alvorada", center:[-23.3870,-51.9120],
    poly:[[-23.380,-51.922],[-23.380,-51.902],[-23.396,-51.902],[-23.396,-51.922]] },
  { nome:"Conjunto Requião", center:[-23.4360,-51.9560],
    poly:[[-23.428,-51.966],[-23.428,-51.946],[-23.446,-51.946],[-23.446,-51.966]] },
  { nome:"Jardim Universo", center:[-23.4430,-51.9230],
    poly:[[-23.435,-51.933],[-23.435,-51.913],[-23.452,-51.913],[-23.452,-51.933]] },
  { nome:"Vila Esperança", center:[-23.3820,-51.9510],
    poly:[[-23.374,-51.962],[-23.374,-51.941],[-23.392,-51.941],[-23.392,-51.962]] },
  { nome:"Centro Cívico", center:[-23.4225,-51.9365],
    poly:[[-23.415,-51.946],[-23.415,-51.927],[-23.430,-51.927],[-23.430,-51.946]] },
];
let funcIdCursor = 1;
const PAPEL_LABEL = { responsavel:"Responsável", substituto:"Substituto", coordenador:"Coordenador" };
bairros.forEach(b=>{
  b.equipamentos = [equipamentosPool[Math.floor(Math.random()*equipamentosPool.length)], equipamentosPool[Math.floor(Math.random()*equipamentosPool.length)]];
  b.equipe = { responsavel: nextEquipe(), substituto: nextEquipe(), coordenador: nextEquipe() };
  // Pontos fixos de demonstração, sem compartilhamento ao vivo.
  Object.entries(b.equipe).forEach(([papel,p])=>{
    p.id = "f"+(funcIdCursor++);
    p.papel = papel;
    p.zona = b.nome;
    p.pos = randPointInBox(b.poly);
    p.tel = "(44) 9" + Math.floor(1000+Math.random()*8999) + "-" + Math.floor(1000+Math.random()*8999);
  });
});
const MARINGA_CENTER = [-23.4205, -51.9333];

// roster plano de todos os funcionarios internos (mesmos objetos referenciados em bairros[].equipe)
function todosFuncionarios(){
  return bairros.flatMap(b=> Object.values(b.equipe));
}

/* ---------- persistencia local das edicoes da administracao ---------- */
const ADMIN_KEY = storageKey("admin");
function loadAdminState(){
  try{ return JSON.parse(localStorage.getItem(ADMIN_KEY) || (tenantId==='maringa'?localStorage.getItem("maringa_admin_v1"):null) || "null"); }catch(e){ return null; }
}
function saveAdminState(){
  try{
    localStorage.setItem(ADMIN_KEY, JSON.stringify({
      funcionarios: todosFuncionarios().map(p=>({id:p.id, nome:p.nome, cargo:p.cargo, tel:p.tel})),
      equipes: equipesPrefeitura.map(e=>({id:e.id, nome:e.nome, zona:e.zona, recursos:e.recursos, membros:e.membros, status:e.status})),
    }));
  }catch(e){ /* storage pode estar bloqueado; prototipo continua funcionando sem persistir */ }
}
const adminSaved = loadAdminState();
if(adminSaved && adminSaved.funcionarios){
  adminSaved.funcionarios.forEach(saved=>{
    const p = todosFuncionarios().find(x=>x.id===saved.id);
    if(p){ p.nome=saved.nome; p.cargo=saved.cargo; p.tel=saved.tel; }
  });
}

/* ---------- equipes da prefeitura (recursos/equipamentos) ---------- */
const recursoTipos = ["Motosserra","Caminhão basculante","Retroescavadeira","Kit de resgate","Gerador móvel","Caminhão-pipa","Eletricistas","Ambulância"];
let equipePrefIdCursor = 1;
const equipesPrefeitura = [];
function nomesVolEquipe(){ return ["Juliano Mesquita","Camila Dutra","Osvaldo Reis","Tainá Borges","Wesley Cunha","Aline Pacheco","Diego Farah","Yasmin Rezende"]; }

if(adminSaved && adminSaved.equipes && adminSaved.equipes.length){
  adminSaved.equipes.forEach(e=> equipesPrefeitura.push(e));
  equipePrefIdCursor = Math.max(...adminSaved.equipes.map(e=>parseInt(e.id.replace('eq',''))||0)) + 1;
} else {
  bairros.forEach(b=>{
    const n = Math.floor(rnd(1,3));
    for(let i=0;i<n;i++){
      const recursos = [];
      const nRec = Math.floor(rnd(2,4));
      const usados = new Set();
      for(let j=0;j<nRec;j++){
        let tipo = pick(recursoTipos);
        if(usados.has(tipo)) continue;
        usados.add(tipo);
        const qtd = Math.floor(rnd(1,4));
        recursos.push({ tipo, qtd, emUso: Math.floor(rnd(0, qtd+1)) });
      }
      equipesPrefeitura.push({
        id:"eq"+(equipePrefIdCursor++),
        nome:`Equipe ${b.nome} ${i+1}`,
        zona: b.nome,
        recursos,
        membros: [pick(nomesVolEquipe()), pick(nomesVolEquipe())],
        status: Math.random()<0.6 ? "disponível" : "em campo",
      });
    }
  });
}

/* opcoes de contribuicao: numeradas de proposito, para o morador poder digitar so o numero no whatsapp.
   o rotulo e o "tipo" canonico sao separados porque o tipo e o que entra na conta de itensEssenciaisZona. */
const tiposContribuicao = [
  {num:1, label:"Motosserra", tipo:"Motosserra"},
  {num:2, label:"Caminhão / transporte de carga", tipo:"Caminhão"},
  {num:3, label:"Transporte de pessoas (carro/van)", tipo:"Transporte de pessoas"},
  {num:4, label:"Mão de obra (braço)", tipo:"Mão de obra"},
  {num:5, label:"Doação de comida", tipo:"Comida"},
  {num:6, label:"Doação de roupas/cobertores", tipo:"Roupas/cobertores"},
  {num:7, label:"Gerador", tipo:"Gerador"},
  {num:8, label:"Resgate de animais", tipo:"Resgate de animais"},
  {num:9, label:"Primeiros socorros / saúde", tipo:"Primeiros socorros"},
  {num:10, label:"Abrigo temporário", tipo:"Abrigo temporário"},
];
const tiposAjuda = tiposContribuicao.map(t=>t.tipo);
// quanto desse tipo uma zona precisa ter, somando os colaboradores cadastrados que oferecem aquele tipo
const itensEssenciaisZona = [
  {tipo:"Motosserra", minimo:2}, {tipo:"Caminhão", minimo:1}, {tipo:"Transporte de pessoas", minimo:1},
  {tipo:"Mão de obra", minimo:5}, {tipo:"Comida", minimo:2}, {tipo:"Roupas/cobertores", minimo:2}, {tipo:"Gerador", minimo:1},
];
function itensQueFaltamNaZona(zona){
  return itensEssenciaisZona.map(it=>{
    const tem = voluntarios.filter(v=>v.bairro===zona && (v.contribuicoes||[]).includes(it.tipo)).length;
    return { tipo:it.tipo, tem, minimo:it.minimo, falta: Math.max(0, it.minimo-tem) };
  }).filter(r=>r.falta>0);
}
const PREF_ALERTA = { antes:"Antes do evento (alertas preventivos)", durante:"Durante o evento (convocação ativa)", depois:"Só depois (para ajudar na reconstrução)", todos:"Em todas as fases" };
function validaCPF(cpf){
  cpf = (cpf||'').replace(/\D/g,'');
  if(cpf.length!==11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let soma=0; for(let i=0;i<9;i++) soma += parseInt(cpf[i])*(10-i);
  let resto = (soma*10)%11; if(resto===10) resto=0;
  if(resto!==parseInt(cpf[9])) return false;
  soma=0; for(let i=0;i<10;i++) soma += parseInt(cpf[i])*(11-i);
  resto = (soma*10)%11; if(resto===10) resto=0;
  return resto===parseInt(cpf[10]);
}
function fmtCPF(cpf){ cpf=(cpf||'').replace(/\D/g,''); return cpf.length===11 ? cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,'$1.$2.$3-$4') : cpf; }
function maskCPF(cpf){ if(!cpf) return '—'; const d=cpf.replace(/\D/g,''); return d.length===11 ? `***.***.${d.slice(6,9)}-${d.slice(9)}` : '—'; }
const nomesVol = ["Antônio Silva","Beatriz Nunes","Carlos Eduardo","Débora Franco","Elias Martins","Fabiana Rocha","Gustavo Peres","Helena Duarte","Igor Salles","Joana Ribas","Kleber Souza","Larissa Toledo","Maurício Teles","Natália Viegas","Otávio Brandão","Priscila Farias"];
const tiposOcorrencia = [
  {tipo:"Distribuição de água e alimentos", icone:"🤝", gravBase:1, resp:["publica"]},
  {tipo:"Árvore caída sobre via", icone:"🌳", gravBase:2, resp:["publica","publica","mista"]},
  {tipo:"Telhado destruído", icone:"🏠", gravBase:2, resp:["privada","privada","mista"]},
  {tipo:"Alagamento residencial", icone:"🌊", gravBase:2, resp:["mista","privada","publica"]},
  {tipo:"Poste de energia caído", icone:"⚡", gravBase:2, resp:["publica"]},
  {tipo:"Deslizamento de barranco", icone:"⛰️", gravBase:3, resp:["publica","mista"]},
  {tipo:"Família ilhada", icone:"🚨", gravBase:3, resp:["publica"]},
  {tipo:"Rede elétrica exposta", icone:"⚠️", gravBase:3, resp:["publica"]},
];
const GRAV_LABEL = {1:"Baixa", 2:"Média", 3:"Alta"};
const GRAV_COLOR = {1:"#8b9aad", 2:"#f2c230", 3:"#ff3b3b"};
const RESP_LABEL = {publica:"Pública", privada:"Privada", mista:"Mista"};
const RESP_COLOR = {publica:"#3ba7ff", privada:"#b06bff", mista:"#2ecf78"};
const STATUS_COLOR = {ativa:"#ff3b3b", em_atendimento:"#ffb020", resolvida:"#2ecf78"};
function sortGravidade(base){
  const r = Math.random();
  const g = base + (r<0.15?-1:r>0.85?1:0);
  return Math.max(1, Math.min(3, g));
}

function rnd(a,b){return a+Math.random()*(b-a)}
function pick(arr){return arr[Math.floor(Math.random()*arr.length)]}
function initials(nome){ return nome.split(' ').map(p=>p[0]).slice(0,2).join(''); }
function escHtml(s){ return String(s).replace(/[&<>"]/g, c=>({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[c])); }
function minutosDesde(ts){ return Math.max(0, Math.round((Date.now()-ts)/60000)); }
function fmtDist(m){ return m<1000 ? Math.round(m)+"m" : (m/1000).toFixed(1)+"km"; }
function randPointInBox(poly){
  const lats = poly.map(p=>p[0]), lngs = poly.map(p=>p[1]);
  return [ rnd(Math.min(...lats),Math.max(...lats)), rnd(Math.min(...lngs),Math.max(...lngs)) ];
}

let ocorrencias = [], voluntarios = [], idCounter = 1;
const gestao = AlertaGestaoDados.criar();
const normalizarTerritorio = texto => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const areasCadastradas = ['zonas','bairros'].flatMap(tipo =>
  gestao.lista(tipo,tenantId).filter(area=>area.verificacao!=='Rejeitado')
    .map(area=>({...area,chave:tipo+':'+area.id,tipoArea:tipo==='zonas'?'Zona':'Bairro'}))
);
const fontesPublicas=await MaringaBairros.carregar().catch(()=>null);
const chaveZona = nome => {const match=normalizarTerritorio(nome).match(/^zona\s*0*(\d+)$/);return match ? String(Number(match[1])) : '';};
for(const [grupo,tipoArea] of [[fontesPublicas?.zonasNumeradas,'Zona'],[fontesPublicas?.bairros,'Bairro'],[fontesPublicas?.zonas,'Zona cartográfica']]){
  grupo?.features.forEach(feature=>{
    const {id,nome}=feature.properties;
    const existente=areasCadastradas.find(area=>area.tipoArea===tipoArea && (normalizarTerritorio(area.nome)===normalizarTerritorio(nome) || (tipoArea==='Zona' && chaveZona(nome) && chaveZona(area.nome)===chaveZona(nome))));
    if(existente){if(!existente.geojson){existente.geojson=feature.geometry;existente.fonte=grupo.source;}return;}
    areasCadastradas.push({id,nome,tipoArea,chave:'publico:'+tipoArea+':'+(id||nome),geojson:feature.geometry,fonte:grupo.source});
  });
}
const areas = [...areasCadastradas,...bairros.map(b=>({
  nome:b.nome,chave:'demo:'+b.nome,tipoArea:'Zona demonstrativa',demo:b
}))];
const camadasVisiveis={Zona:true,Bairro:true,'Zona cartográfica':false,'Zona demonstrativa':true};
let eventoAtivo=new URLSearchParams(location.search).get('evento')||'';
let eventosCache=[];const eventosMunicipio=()=>eventosCache;
let abriuEventoDaUrl=false;
const noEvento=o=>EventosMapa.corresponde(o,eventoAtivo,eventosMunicipio());
let filtroOcorrencias=null;
const noFiltro=o=>!filtroOcorrencias||filtroOcorrencias.corresponde(o);
const ocorrenciaVisivel=o=>noRecorte(o.bairro)&&noEvento(o)&&noFiltro(o);
const selecao = new Set();
const areasPorChave=new Map(areas.map(area=>[area.chave,area]));
const areasSelecionadas=()=>[...selecao].map(chave=>areasPorChave.get(chave));
function pertence(area, territorio){
  const nome = normalizarTerritorio(territorio);
  if(nome && [area.id,area.nome].some(valor=>normalizarTerritorio(valor)===nome)) return true;
  if(area.tipoArea!=='Zona') return false;
  return areasCadastradas.some(bairro=>bairro.tipoArea==='Bairro'
    && bairro.zona && [area.id,area.nome].some(valor=>normalizarTerritorio(valor)===normalizarTerritorio(bairro.zona))
    && nome && [bairro.id,bairro.nome].some(valor=>normalizarTerritorio(valor)===nome));
}
const noRecorte = territorio => !selecao.size || areasSelecionadas().some(area=>pertence(area,territorio));
const recorteLabel = () => areasSelecionadas().map(area=>area.nome).join(', ') || 'Todo o município';
let currentRole = {tipo:"visualizacao"}; // sem sessão ativa, apenas leitura

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
    id:"oc"+numId, tenantId, confirmado:true, protocolo:tenantConfig.prefixo+"-"+String(10000+numId).slice(-5), tipo:t.tipo, icone:t.icone, bairro:b.nome, pos,
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
  // A Gestão é a fonte dos cadastros: atualiza os eventos e as opções dos
  // filtros junto dos recursos e equipes ao retornar ao mapa ou mudar outra aba.
  atualizarFiltroEventos();
  filtroOcorrencias?.atualizarOpcoes();
  atualizarRecorte();
  montarMarcadoresPublicos();
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

function closePanel(){ document.getElementById('panel').classList.remove('open'); currentPanelOcId = null; }
document.getElementById('panel-close').onclick = closePanel;

function showReco(o){
  const banner = document.getElementById('reco-banner');
  banner.textContent = `🏅 Reconhecimento oficial: equipe de ${o.bairro} resolveu em ${o.tempoReal} min — ato da Prefeitura em preparação`;
  banner.classList.add('show');
  setTimeout(()=>banner.classList.remove('show'), 5200);
}

/* Cadastro de colaboradores: somente pela rota canônica ./atendimento/.
   A entrada do Mapa de Evento reutiliza a mesma coleção da Gestão e dos demais mapas. */

function updateKpis(){
  const ocList = ocorrencias.filter(ocorrenciaVisivel);
  const volList = pessoasPainel().filter(p=>!p.oficial);
  const abertas = ocList.filter(o=>o.status==='ativa'||o.status==='em_atendimento');
  const resolvidas = ocList.filter(o=>o.status==='resolvida');
  document.getElementById('kpi-ativas').textContent = abertas.length;
  document.getElementById('kpi-resolvidas').textContent = resolvidas.length;
  document.getElementById('kpi-voluntarios').textContent = volList.length;
  document.getElementById('kpi-tempo').textContent = resolvidas.length>0
    ? Math.round(resolvidas.reduce((s,o)=>s+o.tempoReal,0)/resolvidas.length)+"min" : "—";
  renderResumo(abertas);
}

function renderResumo(abertas){
  const el = document.getElementById('sidebar-footer');
  const porGrav = {1:0,2:0,3:0};
  const porResp = {publica:0, privada:0, mista:0};
  abertas.forEach(o=>{ porGrav[o.gravidade]++; porResp[o.responsabilidade]++; });

  const resolvidas = ocorrencias
    .filter(o=> o.status==='resolvida' && ocorrenciaVisivel(o))
    .sort((a,c)=> (c.resolvidoEm||0) - (a.resolvidoEm||0))
    .slice(0,5);

  el.innerHTML = `
    <div class="sf-label">Gravidade (${escHtml(recorteLabel())})</div>
    <div class="sf-row"><span style="color:${GRAV_COLOR[3]}">Alta</span><b>${porGrav[3]}</b></div>
    <div class="sf-row"><span style="color:${GRAV_COLOR[2]}">Média</span><b>${porGrav[2]}</b></div>
    <div class="sf-row"><span style="color:${GRAV_COLOR[1]}">Baixa</span><b>${porGrav[1]}</b></div>
    <div class="sf-label" style="margin-top:10px">Responsabilidade</div>
    <div class="sf-row"><span style="color:${RESP_COLOR.publica}">Pública</span><b>${porResp.publica}</b></div>
    <div class="sf-row"><span style="color:${RESP_COLOR.privada}">Privada</span><b>${porResp.privada}</b></div>
    <div class="sf-row"><span style="color:${RESP_COLOR.mista}">Mista</span><b>${porResp.mista}</b></div>
    <div class="sf-label" style="margin-top:10px">Resolvidas recentes</div>
    ${resolvidas.map(o=>`<div class="sf-resolvida" data-oc="${o.id}">${o.icone} ${escHtml(o.tipo)} <span>${o.relatorio?'· complemento salvo':'· concluída'}</span></div>`).join('') || '<div style="color:var(--muted);font-size:10.5px">Nenhuma ainda.</div>'}
  `;
  el.querySelectorAll('.sf-resolvida').forEach(elm=>{
    elm.onclick = ()=>{ const o = ocorrencias.find(x=>x.id===elm.dataset.oc); if(o) openOcorrencia(o); };
  });
}

let eventStart = Date.now() - (4*60+12)*60000;
function tickClock(){
  const now = new Date();
  document.getElementById('clock').textContent=new Intl.DateTimeFormat('pt-BR',{
    dateStyle:'short',timeStyle:'short',timeZone:'America/Sao_Paulo'
  }).format(now);
}
setInterval(tickClock, 30000);

/* ---------- administracao interna ---------- */
let adminTab = 'func';
const adminOverlay = document.getElementById('admin-overlay');
document.getElementById('open-admin').onclick = ()=>{ adminOverlay.hidden=false; renderAdminBody(); };
document.getElementById('admin-close').onclick = ()=>{ adminOverlay.hidden=true; };
adminOverlay.addEventListener('click', e=>{ if(e.target===adminOverlay) adminOverlay.hidden=true; });
document.getElementById('admin-tabs').querySelectorAll('.mtab').forEach(btn=>{
  btn.onclick = ()=>{
    adminTab = btn.dataset.tab;
    document.getElementById('admin-tabs').querySelectorAll('.mtab').forEach(b=>b.classList.toggle('active', b===btn));
    renderAdminBody();
  };
});

function renderAdminBody(){
  const body = document.getElementById('admin-body');
  if(adminTab==='func') return renderAdminFunc(body);
  if(adminTab==='equipes') return renderAdminEquipes(body);
  renderAdminColab(body);
}

function renderAdminFunc(body){
  const grupos = { responsavel:'Responsáveis', substituto:'Substitutos', coordenador:'Coordenadores' };
  let html = '';
  Object.entries(grupos).forEach(([papel,label])=>{
    let lista = todosFuncionarios().filter(p=>p.papel===papel && noRecorte(p.zona));
    if(currentRole && currentRole.tipo==='responsavel') lista = lista.filter(p=>p.zona===currentRole.zona);
    if(!lista.length) return;
    html += `<div class="admin-section-title">${label}</div>
      <table class="admin-table"><thead><tr><th>Zona</th><th>Nome</th><th>Cargo</th><th>Telefone</th><th></th></tr></thead><tbody>
      ${lista.map(p=>`
        <tr data-id="${p.id}">
          <td>${escHtml(p.zona)}</td>
          <td><input value="${escHtml(p.nome)}" data-field="nome"></td>
          <td><input value="${escHtml(p.cargo)}" data-field="cargo"></td>
          <td><input value="${escHtml(p.tel)}" data-field="tel"></td>
          <td><button class="admin-btn primary" data-action="save-func">Salvar</button></td>
        </tr>
      `).join('')}
      </tbody></table>`;
  });
  body.innerHTML = html;
  body.querySelectorAll('[data-action="save-func"]').forEach(btn=>{
    btn.onclick = ()=>{
      const tr = btn.closest('tr');
      const p = todosFuncionarios().find(x=>x.id===tr.dataset.id);
      if(!p) return;
      p.nome = tr.querySelector('[data-field="nome"]').value.trim() || p.nome;
      p.cargo = tr.querySelector('[data-field="cargo"]').value.trim() || p.cargo;
      p.tel = tr.querySelector('[data-field="tel"]').value.trim() || p.tel;
      saveAdminState();
      auditPush('Administração', 'Editou funcionário', `${p.nome} (${PAPEL_LABEL[p.papel]}, ${p.zona})`,[p.zona]);
      updateZoneStrip(); renderZoneList(); renderOfficialMarkers(); renderCollaborators(); renderChatContacts();
      btn.textContent = 'Salvo ✓'; setTimeout(()=>btn.textContent='Salvar', 1400);
    };
  });
}

function recursosResumo(e){
  const disp = e.recursos.reduce((s,r)=>s+(r.qtd-r.emUso),0);
  const uso = e.recursos.reduce((s,r)=>s+r.emUso,0);
  return {disp, uso, texto: e.recursos.map(r=>`${r.tipo} ${r.qtd-r.emUso}/${r.qtd} livre`).join(', ')};
}

function renderAdminEquipes(body){
  const zonasAtivas = {};
  ocorrencias.filter(o=>o.status==='ativa'||o.status==='em_atendimento').forEach(o=>{ zonasAtivas[o.bairro]=(zonasAtivas[o.bairro]||0)+1; });
  const souResponsavel = currentRole && currentRole.tipo==='responsavel';
  const equipesVisiveis=equipesPrefeitura.filter(e=>noRecorte(e.zona) && (!souResponsavel || e.zona===currentRole.zona));
  body.innerHTML = `
    <div class="admin-section-title">Equipes e equipamentos cadastrados</div>
    <table class="admin-table"><thead><tr><th>Equipe</th><th>Zona</th><th>Recursos</th><th>Membros</th><th>Status</th><th>Ocorrências na zona</th><th></th></tr></thead><tbody>
      ${equipesVisiveis.map(e=>{
        const r = recursosResumo(e);
        const falta = zonasAtivas[e.zona] > 0 && r.disp===0;
        return `<tr data-id="${e.id}">
          <td><input value="${escHtml(e.nome)}" data-field="nome"></td>
          <td>
            <select data-field="zona">${bairros.map(b=>`<option value="${escHtml(b.nome)}" ${b.nome===e.zona?'selected':''}>${escHtml(b.nome)}</option>`).join('')}</select>
          </td>
          <td style="font-size:10.5px;color:var(--muted)">${escHtml(r.texto)}</td>
          <td><input value="${escHtml(e.membros.join(', '))}" data-field="membros"></td>
          <td>
            <select data-field="status">
              <option ${e.status==='disponível'?'selected':''}>disponível</option>
              <option ${e.status==='em campo'?'selected':''}>em campo</option>
            </select>
          </td>
          <td style="text-align:center">${zonasAtivas[e.zona]||0} ${falta?`<div style="color:var(--red);font-size:9.5px">sem equip. livre</div>`:''}</td>
          <td style="display:flex;gap:4px">
            <button class="admin-btn primary" data-action="save-eq">Salvar</button>
            ${souResponsavel ? '' : '<button class="admin-btn danger" data-action="del-eq">Remover</button>'}
          </td>
        </tr>`;
      }).join('')}
    </tbody></table>
    ${souResponsavel ? '' : `
    <div class="admin-section-title">Nova equipe</div>
    <div class="admin-new-form" id="new-eq-form">
      <input placeholder="Nome da equipe" id="neq-nome">
      <select id="neq-zona">${bairros.map(b=>`<option value="${escHtml(b.nome)}">${escHtml(b.nome)}</option>`).join('')}</select>
      <input placeholder="Recursos: ex. Motosserra x2, Caminhão x1" id="neq-recursos">
      <input placeholder="Membros, separados por vírgula" id="neq-membros">
      <button class="admin-btn primary" id="neq-add">+ Adicionar equipe</button>
    </div>`}
  `;
  body.querySelectorAll('[data-action="save-eq"]').forEach(btn=>{
    btn.onclick = ()=>{
      const tr = btn.closest('tr');
      const e = equipesPrefeitura.find(x=>x.id===tr.dataset.id);
      if(!e) return;
      e.nome = tr.querySelector('[data-field="nome"]').value.trim() || e.nome;
      e.zona = tr.querySelector('[data-field="zona"]').value;
      e.membros = tr.querySelector('[data-field="membros"]').value.split(',').map(s=>s.trim()).filter(Boolean);
      e.status = tr.querySelector('[data-field="status"]').value;
      saveAdminState();
      auditPush('Administração', 'Editou equipe', `${e.nome} (${e.zona})`,[e.zona]);
      btn.textContent = 'Salvo ✓'; setTimeout(()=>renderAdminEquipes(body), 900);
    };
  });
  body.querySelectorAll('[data-action="del-eq"]').forEach(btn=>{
    btn.onclick = ()=>{
      const tr = btn.closest('tr');
      const idx = equipesPrefeitura.findIndex(x=>x.id===tr.dataset.id);
      if(idx>-1){ auditPush('Administração', 'Removeu equipe', equipesPrefeitura[idx].nome,[equipesPrefeitura[idx].zona]); equipesPrefeitura.splice(idx,1); }
      saveAdminState();
      renderAdminEquipes(body);
    };
  });
  const addBtn = document.getElementById('neq-add');
  if(addBtn) addBtn.onclick = ()=>{
    const nome = document.getElementById('neq-nome').value.trim();
    const zona = document.getElementById('neq-zona').value;
    const recTxt = document.getElementById('neq-recursos').value.trim();
    const membros = document.getElementById('neq-membros').value.split(',').map(s=>s.trim()).filter(Boolean);
    if(!nome){ return; }
    const recursos = recTxt.split(',').map(s=>s.trim()).filter(Boolean).map(s=>{
      const m = s.match(/^(.*?)\s*x\s*(\d+)$/i);
      return m ? {tipo:m[1].trim(), qtd:parseInt(m[2]), emUso:0} : {tipo:s, qtd:1, emUso:0};
    });
    equipesPrefeitura.push({ id:"eq"+(equipePrefIdCursor++), nome, zona, recursos: recursos.length?recursos:[{tipo:'Mão de obra',qtd:1,emUso:0}], membros: membros.length?membros:['A definir'], status:'disponível' });
    saveAdminState();
    auditPush('Administração', 'Criou equipe', `${nome} (${zona})`,[zona]);
    renderAdminEquipes(body);
  };
}

function renderAdminColab(body){
  // Leitura do mesmo cadastro utilizado pela Gestão e pelo Mapa de Colaboradores.
  // Os voluntários legados do simulador continuam visíveis, mas não são um segundo cadastro.
  const visiveis=pessoasMunicipio().filter(v=>!v.oficial&&noRecorte(v.bairroOrigem));
  body.innerHTML='<div class="admin-section-title">Colaboradores do município</div>'+
    '<p style="font-size:11px;color:var(--muted);margin:8px 0 14px">A inclusão, edição e exclusão acontecem exclusivamente no cadastro da Gestão. Registros do simulador são identificados como demonstração.</p>'+
    '<a class="admin-btn primary" href="gestao/#voluntarios" style="display:inline-block;margin-bottom:15px">Gerenciar colaboradores na Gestão</a>'+
    '<table class="admin-table"><thead><tr><th>Nome</th><th>Origem</th><th>Território de cadastro</th><th>Capacidades</th><th>Presença</th></tr></thead><tbody>'+
    (visiveis.map(v=>{
      const canonico=String(v.id).startsWith("cad:");
      const capacidades=v.sub||(Array.isArray(v.contribuicoes)?v.contribuicoes.join(", "):v.ajuda||"");
      const status=canonico?(v.checkin_status==="presente"?"Chegada GPS registrada":v.checkin_status==="finalizado"?"Saída registrada":"Não confirmado"):estadoPessoa(v.id)+" (simulação)";
      return '<tr><td>'+escHtml(v.nome)+'</td><td>'+(canonico?"Cadastro municipal":"Simulação")+'</td>'+
        '<td>'+escHtml(v.bairroOrigem||"Não informado")+'</td><td>'+escHtml(capacidades||"A definir")+'</td>'+
        '<td>'+escHtml(status)+'</td></tr>';
    }).join("")||'<tr><td colspan="5" style="color:var(--muted)">Nenhum colaborador nesta visão.</td></tr>')+
    '</tbody></table>';
}

/* ---------- triagem automatica por prioridade ---------- */
function calcPrioridade(o){ return AlertaFluxo.prioridade(o,Date.now()); }

const filaOverlay = document.getElementById('fila-overlay');
document.getElementById('open-fila').onclick = ()=>{ filaOverlay.hidden=false; renderFila(); };
document.getElementById('fila-close').onclick = ()=>{ filaOverlay.hidden=true; };
filaOverlay.addEventListener('click', e=>{ if(e.target===filaOverlay) filaOverlay.hidden=true; });

function renderFila(){
  const body = document.getElementById('fila-body');
  // A entrada cidadã não confirma nem aciona uma ocorrência: segue para triagem.
  const relatosCidadaos = isViewOnly() ? [] : AlertaGestaoDados.criar(undefined,{municipioId:tenantId})
    .lista('relatos',tenantId).filter(r=>r.status==='Em triagem');
  const lista = ocorrencias
    .filter(o=> o.status==='ativa'||o.status==='em_atendimento')
    .filter(ocorrenciaVisivel)
    .map(o=>({o, score:calcPrioridade(o)}))
    .sort((a,c)=>c.score-a.score);
  body.innerHTML = `
    <div style="font-size:11px;color:var(--muted);margin-bottom:12px">Gravidade define a ordem; o tempo de espera desempata dentro de cada classe. Presença da equipe e propriedade pública/privada não reduzem o risco. Recorte: ${escHtml(recorteLabel())}.</div>
    ${relatosCidadaos.length?'<section class="fila-relatos"><h3>Relatos enviados por cidadãos · '+relatosCidadaos.length+'</h3><p style="font-size:11px;color:var(--muted)">Ainda não são ocorrências confirmadas. Consulte os dados e fotografias na Gestão antes do acionamento.</p>'+relatosCidadaos.map(r=>'<div class="fila-item"><div class="fila-rank">●</div><div class="fila-info"><div class="fi-title">Relato cidadão · '+escHtml(r.endereco)+'</div><div class="fi-meta">'+escHtml((r.pessoas_no_local||[]).filter(x=>x!=="NÃO HÁ").join(" · ")||"Sem pessoas vulneráveis informadas")+' · Em triagem</div></div></div>').join('')+'<a href="./gestao/#relatos" target="_blank" rel="noopener" class="sidebar-btn" style="display:inline-block;margin:9px 0 16px">Abrir relatos na Gestão</a></section>':''}
    ${lista.map(({o,score},i)=>`
      <div class="fila-item" data-oc="${o.id}">
        <div class="fila-rank">#${i+1}</div>
        <div class="fila-info">
          <div class="fi-title">${o.icone} ${escHtml(o.tipo)} · ${escHtml(o.bairro)}</div>
          <div class="fi-meta">${GRAV_LABEL[o.gravidade]} gravidade · ${RESP_LABEL[o.responsabilidade]} · ${o.status==='ativa'?`aguardando há ${minutosDesde(o.reportadoEm)}min`:'em atendimento'}</div>
        </div>
        <div class="fila-score">${GRAV_LABEL[o.gravidade]}</div>
      </div>
    `).join('') || '<div style="color:var(--muted);font-size:12px">Nenhuma ocorrência em aberto nesta visão.</div>'}
  `;
  body.querySelectorAll('.fila-item').forEach(elm=>{
    elm.onclick = ()=>{ const o = ocorrencias.find(x=>x.id===elm.dataset.oc); if(o){ filaOverlay.hidden=true; openOcorrencia(o); } };
  });
}

/* ---------- alerta de SLA / escalonamento ---------- */
const SLA_LIMITE_MIN = 2; // no relogio simulado do prototipo; num evento real seria configuravel (ex. 20-30min)
setInterval(()=>{
  ocorrencias.forEach(o=>{
    if(o.confirmado!==false && o.status==='ativa' && o.gravidade===3 && !o._escalado && minutosDesde(o.reportadoEm) >= SLA_LIMITE_MIN){
      o._escalado = true;
      const zona = bairros.find(b=>b.nome===o.bairro);
      const coord = zona?.equipe?.coordenador;
      if(!coord)return;
      if(!chatHistorico[coord.id]) chatHistorico[coord.id] = [];
      chatHistorico[coord.id].push({ de:'eles', texto:`⚠ SLA excedido: "${o.tipo}" em ${o.bairro} sem confirmação de presença há ${minutosDesde(o.reportadoEm)}min. Precisa de apoio?`, ts: Date.now() });
      renderChatContacts();
      const b = document.getElementById('alert-banner');
      b.style.background = 'rgba(255,59,59,.15)'; b.style.border='1px solid var(--red)'; b.style.color='var(--red)';
      b.textContent = `⏱ SLA excedido: ocorrência de alta gravidade em ${o.bairro} sem confirmação há ${minutosDesde(o.reportadoEm)}min — coordenador notificado`;
      b.classList.add('show');
      setTimeout(()=>b.classList.remove('show'), 6500);
    }
  });
}, 15000);

/* ---------- alertas meteorológicos e pré-ativação ----------
   Fontes e alertas abaixo são simulados. A integração com fontes oficiais depende
   de verificar os canais, os termos e a disponibilidade para cada município. */
const alertaTipos = [
  {tipo:"Chuva intensa", nivel:"laranja"},
  {tipo:"Vendaval / rajadas de vento", nivel:"laranja"},
  {tipo:"Risco de alagamento", nivel:"amarelo"},
  {tipo:"Queda de granizo", nivel:"amarelo"},
  {tipo:"Ciclone extratropical", nivel:"vermelho"},
];
const NIVEL_COLOR = {amarelo:"#f2c230", laranja:"#ff8a3b", vermelho:"#ff3b3b"};
const NIVEL_LABEL = {amarelo:"Atenção", laranja:"Perigo", vermelho:"Grande perigo"};
const fontesAlerta = ["INMET","SIMEPAR","Defesa Civil PR"];

let alertaIdCursor = 1;
const alertasClimaticos = [];
const prontidao = {}; // alertaId -> { pessoaId: {status:'pendente'|'confirmado'|'indisponivel', respondidoEm} }

function pessoaNome(id){
  const f = todosFuncionarios().find(p=>p.id===id); if(f) return f.nome;
  const v = voluntarios.find(x=>x.id===id); if(v) return v.nome;
  return id;
}

function gerarAlerta(){
  const t = pick(alertaTipos);
  const nZonas = Math.floor(rnd(1,4));
  const zonasAfetadas = [...bairros].sort(()=>Math.random()-0.5).slice(0,nZonas).map(b=>b.nome);
  const alerta = {
    id:"al"+(alertaIdCursor++), fonte: pick(fontesAlerta),
    nivel: t.nivel, tipo: t.tipo, zonasAfetadas,
    emitidoEm: Date.now(), janelaHoras: Math.floor(rnd(3,18)),
  };
  alertasClimaticos.unshift(alerta);
  auditPush(alerta.fonte, 'Emitiu alerta meteorológico', `${alerta.tipo} (${NIVEL_LABEL[alerta.nivel]}) em ${zonasAfetadas.join(', ')}`,zonasAfetadas);
  dispararPreAtivacao(alerta);
  return alerta;
}

function dispararPreAtivacao(alerta){
  prontidao[alerta.id] = {};
  const pessoas = [
    ...todosFuncionarios().filter(p=> alerta.zonasAfetadas.includes(p.zona)),
    ...voluntarios.filter(v=> alerta.zonasAfetadas.includes(v.bairro) && ['antes','todos'].includes(v.alertaPreferencia||'todos')),
  ];
  pessoas.forEach(p=>{
    prontidao[alerta.id][p.id] = { status:'pendente', respondidoEm:null };
    if(!chatHistorico[p.id]) chatHistorico[p.id] = [];
    chatHistorico[p.id].push({
      de:'eu',
      texto:`[Alerta ${NIVEL_LABEL[alerta.nivel]} · ${alerta.fonte}] ${alerta.tipo} previsto para sua zona nas próximas ${alerta.janelaHoras}h. Você está disponível para ajudar se a situação piorar?`,
      ts: Date.now(),
    });
    setTimeout(()=>{
      const r = Math.random();
      const status = r<0.55 ? 'confirmado' : r<0.82 ? 'indisponivel' : 'pendente';
      prontidao[alerta.id][p.id] = { status, respondidoEm: status==='pendente'?null:Date.now() };
      if(status!=='pendente'){
        chatHistorico[p.id].push({ de:'eles', texto: status==='confirmado' ? 'Confirmado, estou disponível se precisar.' : 'Não vou conseguir dessa vez, desculpa.', ts: Date.now() });
      }
      renderProntidaoIfOpen();
      renderChatContacts();
    }, 3000 + Math.random()*9000);
  });
  renderAlertasIfOpen();
  renderProntidaoIfOpen();
  showAlertBanner(alerta);
  marcarZonasEmAlerta();
}

function showAlertBanner(alerta){
  const b = document.getElementById('alert-banner');
  b.style.background = NIVEL_COLOR[alerta.nivel]+'22';
  b.style.border = '1px solid '+NIVEL_COLOR[alerta.nivel];
  b.style.color = NIVEL_COLOR[alerta.nivel];
  b.textContent = `🌦 Alerta ${NIVEL_LABEL[alerta.nivel]} (${alerta.fonte}): ${alerta.tipo} em ${alerta.zonasAfetadas.join(', ')} — pré-ativação de equipe disparada`;
  b.classList.add('show');
  setTimeout(()=>b.classList.remove('show'), 6500);
}

function zonasComAlertaAtivo(){
  const agora = Date.now();
  const ativas = new Set();
  alertasClimaticos.forEach(a=>{
    if(agora - a.emitidoEm < a.janelaHoras*3600000) a.zonasAfetadas.forEach(z=>ativas.add(z));
  });
  return ativas;
}

function marcarZonasEmAlerta(){
  const ativas = zonasComAlertaAtivo();
  areas.filter(area=>area.layer).forEach(area=>{
    const emAlerta = [...ativas].some(z=>pertence(area,z));
    area.layer.setStyle(emAlerta
      ? { color:'#ff8a3b', weight:2.8, opacity:.95, dashArray:'3,5', fillOpacity:.1, fillColor:'#ff8a3b' }
      : { color:'#f2c230', weight:2.2, opacity:.85, dashArray:'7,5', fillOpacity:.06, fillColor:'#f2c230' });
  });
  renderZoneList();
}

const alertasOverlay = document.getElementById('alertas-overlay');
let alertasTab = 'alertas';
document.getElementById('open-alertas').onclick = ()=>{ alertasOverlay.hidden=false; renderAlertasBody(); };
document.getElementById('alertas-close').onclick = ()=>{ alertasOverlay.hidden=true; };
alertasOverlay.addEventListener('click', e=>{ if(e.target===alertasOverlay) alertasOverlay.hidden=true; });
document.getElementById('alertas-tabs').querySelectorAll('.mtab').forEach(btn=>{
  btn.onclick = ()=>{
    alertasTab = btn.dataset.tab;
    document.getElementById('alertas-tabs').querySelectorAll('.mtab').forEach(b=>b.classList.toggle('active', b===btn));
    renderAlertasBody();
  };
});
function renderAlertasIfOpen(){ if(!alertasOverlay.hidden && alertasTab==='alertas') renderAlertasBody(); }
function renderProntidaoIfOpen(){ if(!alertasOverlay.hidden && alertasTab==='prontidao') renderAlertasBody(); }

function renderAlertasBody(){
  const body = document.getElementById('alertas-body');
  if(alertasTab==='alertas') return renderAlertasTab(body);
  renderProntidaoTab(body);
}

function renderAlertasTab(body){
  body.innerHTML = `
    <button class="admin-btn primary" id="gerar-alerta-btn" style="margin-bottom:14px">🔔 Simular novo alerta meteorológico</button>
    ${alertasClimaticos.filter(a=>a.zonasAfetadas.some(noRecorte)).map(a=>{
      const minutos = minutosDesde(a.emitidoEm);
      const ativo = minutos < a.janelaHoras*60;
      return `<div class="alert-card">
        <span class="alert-nivel" style="background:${NIVEL_COLOR[a.nivel]}22;color:${NIVEL_COLOR[a.nivel]}">${NIVEL_LABEL[a.nivel]}</span>
        <strong style="margin-left:8px">${escHtml(a.tipo)}</strong>
        <div class="alert-meta">Fonte: ${escHtml(a.fonte)} · emitido há ${minutos} min · janela de ${a.janelaHoras}h · ${ativo?'<span style="color:var(--green)">em vigor</span>':'<span style="color:var(--muted)">expirado</span>'}</div>
        <div class="alert-zonas">${a.zonasAfetadas.filter(noRecorte).map(z=>`<span>${escHtml(z)}</span>`).join('')}</div>
      </div>`;
    }).join('') || '<div style="color:var(--muted);font-size:12px">Nenhum alerta emitido ainda. Clique no botão acima para simular um.</div>'}
  `;
  document.getElementById('gerar-alerta-btn').onclick = ()=>{ gerarAlerta(); renderAlertasTab(body); };
}

function renderProntidaoTab(body){
  const zonasRelevantes = bairros.filter(b=> noRecorte(b.nome) && alertasClimaticos.some(a=>a.zonasAfetadas.includes(b.nome)));
  if(!zonasRelevantes.length){
    body.innerHTML = '<div style="color:var(--muted);font-size:12px">Nenhuma zona em alerta ainda. A prontidão aparece aqui depois que um alerta for emitido.</div>';
    return;
  }
  body.innerHTML = zonasRelevantes.map(b=>{
    const alertasDaZona = alertasClimaticos.filter(a=>a.zonasAfetadas.includes(b.nome));
    const ultimoAlerta = alertasDaZona[0];
    const mapa = prontidao[ultimoAlerta.id] || {};
    const pessoas = [
      ...todosFuncionarios().filter(p=>p.zona===b.nome).map(p=>({id:p.id, nome:p.nome, tipo:PAPEL_LABEL[p.papel]})),
      ...voluntarios.filter(v=>v.bairro===b.nome).map(v=>({id:v.id, nome:v.nome, tipo:'Colaborador'})),
    ];
    const conf = pessoas.filter(p=> mapa[p.id]?.status==='confirmado').length;
    const indisp = pessoas.filter(p=> mapa[p.id]?.status==='indisponivel').length;
    const pend = pessoas.length - conf - indisp;
    const pct = n => pessoas.length ? (n/pessoas.length*100) : 0;
    return `<div class="prontidao-zone">
      <h4>${escHtml(b.nome)} <span style="font-size:10.5px;color:var(--muted);font-family:var(--mono)">· alerta ${NIVEL_LABEL[ultimoAlerta.nivel].toLowerCase()} (${escHtml(ultimoAlerta.tipo)})</span></h4>
      <div class="prontidao-bar">
        <div style="width:${pct(conf)}%;background:var(--green)"></div>
        <div style="width:${pct(indisp)}%;background:var(--red)"></div>
        <div style="width:${pct(pend)}%;background:var(--muted)"></div>
      </div>
      <div class="prontidao-legend">
        <span><i style="background:var(--green)"></i>Confirmados: ${conf}</span>
        <span><i style="background:var(--red)"></i>Indisponíveis: ${indisp}</span>
        <span><i style="background:var(--muted)"></i>Sem resposta: ${pend}</span>
      </div>
      <div class="prontidao-people">
        ${pessoas.map(p=>{
          const st = mapa[p.id]?.status || 'pendente';
          const cor = st==='confirmado'?'var(--green)':st==='indisponivel'?'var(--red)':'var(--muted)';
          return `<span class="pp-chip" style="color:${cor};border-color:${cor}66">${escHtml(p.nome.split(' ')[0])} · ${escHtml(p.tipo)}</span>`;
        }).join('')}
      </div>
    </div>`;
  }).join('');
}

/* ---------- chat interno (simulacao de whatsapp) ---------- */
const chatOverlay = document.getElementById('chat-overlay');
const chatHistorico = {}; // id -> [{de:'eu'|'eles', texto, ts}]
const respostasAuto = [
  "Recebido, chegando em breve.",
  "Estou a caminho, deve levar uns 10 minutos.",
  "Mensagem recebida. Vou conferir a informação.",
  "Vou enviar a foto da situação em seguida.",
  "Precisamos de mais um caminhão aqui, pode verificar disponibilidade?",
  "Obrigado por avisar.",
];
let chatContatoAtivo = null;

document.getElementById('open-chat').onclick = ()=>{ chatOverlay.hidden=false; renderChatContacts(); };
document.getElementById('chat-close').onclick = ()=>{ chatOverlay.hidden=true; };
chatOverlay.addEventListener('click', e=>{ if(e.target===chatOverlay) chatOverlay.hidden=true; });

function chatContatos(){
  return pessoasPainel().map(p=>({id:p.id,nome:p.nome,sub:[p.sub,p.zona].filter(Boolean).join(' · ')}));
}

function renderChatContacts(){
  const el = document.getElementById('chat-contacts');
  if(!el) return;
  el.innerHTML = chatContatos().map(c=>`
    <div class="chat-contact${chatContatoAtivo===c.id?' active':''}" data-id="${c.id}">
      <div>${escHtml(c.nome)}</div>
      <div class="cc-role">${escHtml(c.sub)}</div>
    </div>
  `).join('');
  el.querySelectorAll('.chat-contact').forEach(elm=>{
    elm.onclick = ()=>{ chatContatoAtivo = elm.dataset.id; renderChatContacts(); openChatThread(elm.dataset.id); };
  });
}

function openChatThread(id){
  const contato = chatContatos().find(c=>c.id===id);
  if(!contato) return;
  if(!chatHistorico[id]){
    chatHistorico[id] = [
      { de:'eles', texto:`Oi, aqui é ${contato.nome.split(' ')[0]}. Pode me passar instruções?`, ts: Date.now()-9*60000 },
    ];
  }
  const thread = document.getElementById('chat-thread');
  thread.innerHTML = `
    <div class="chat-messages" id="chat-messages"></div>
    <div class="chat-input-row">
      <input type="text" id="chat-input" placeholder="Mensagem para ${escHtml(contato.nome.split(' ')[0])}...">
      <button id="chat-send">Enviar</button>
    </div>
  `;
  renderChatMessages(id);
  document.getElementById('chat-send').onclick = ()=>sendChatMsg(id);
  document.getElementById('chat-input').addEventListener('keydown', e=>{ if(e.key==='Enter') sendChatMsg(id); });
}

function renderChatMessages(id){
  const box = document.getElementById('chat-messages');
  if(!box) return;
  box.innerHTML = (chatHistorico[id]||[]).map(m=>`
    <div class="chat-bubble ${m.de==='eu'?'me':'them'}">${escHtml(m.texto)}<span class="cb-time">${new Date(m.ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span></div>
  `).join('');
  box.scrollTop = box.scrollHeight;
}

function sendChatMsg(id){
  const input = document.getElementById('chat-input');
  const texto = input.value.trim();
  if(!texto) return;
  input.value = '';
  if(!navigator.onLine){
    const filaId=enfileirarOffline('chat', { contatoId:id, texto });
    chatHistorico[id].push({ de:'eu', texto:texto+' ⏳ (aguardando reconexão simulada)', ts:Date.now(),filaId });
    salvarPrototipo();
    renderChatMessages(id);
    return;
  }
  chatHistorico[id].push({ de:'eu', texto, ts:Date.now() });
  renderChatMessages(id);
  setTimeout(()=>{
    chatHistorico[id].push({ de:'eles', texto: pick(respostasAuto), ts:Date.now() });
    if(chatContatoAtivo===id)renderChatMessages(id);
    salvarPrototipo();
  }, 1400 + Math.random()*1600);
}

/* ---------- log de auditoria imutavel (cadeia de hash) ---------- */
const AUDIT_KEY = storageKey('audit');
let auditLog = [];
try{ auditLog = JSON.parse(localStorage.getItem(AUDIT_KEY) || "[]"); }catch(e){ auditLog = []; }

async function sha256(str){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
}
let auditSequencia=Promise.resolve();
function auditPayload({ts,ator,acao,detalhe,prev,territorios}){
  return JSON.stringify({ts,ator,acao,detalhe,prev,territorios});
}
function auditPush(ator, acao, detalhe, territorios){
  const ts=Date.now();
  auditSequencia=auditSequencia.then(async()=>{
    const prev=auditLog.length?auditLog[auditLog.length-1].hash:'0';
    const entrada={ts,ator,acao,detalhe,prev,territorios};
    const hash=await sha256(auditPayload(entrada));
    auditLog.push({...entrada,hash});
    try{localStorage.setItem(AUDIT_KEY,JSON.stringify(auditLog));}catch(e){}
    renderAuditIfOpen();
  }).catch(()=>{});
  return auditSequencia;
}
async function verificarIntegridadeAudit(){
  await auditSequencia;
  for(let i=0;i<auditLog.length;i++){
    const e = auditLog[i];
    const prevEsperado = i===0 ? '0' : auditLog[i-1].hash;
    const payload = auditPayload({...e,prev:prevEsperado});
    const recalculado = await sha256(payload);
    if(recalculado !== e.hash || e.prev !== prevEsperado) return {ok:false, indice:i};
  }
  return {ok:true};
}

const auditOverlay = document.getElementById('audit-overlay');
document.getElementById('open-audit').onclick = ()=>{ auditOverlay.hidden=false; renderAudit(); };
document.getElementById('audit-close').onclick = ()=>{ auditOverlay.hidden=true; };
auditOverlay.addEventListener('click', e=>{ if(e.target===auditOverlay) auditOverlay.hidden=true; });
function renderAuditIfOpen(){ if(!auditOverlay.hidden) renderAudit(); }

function renderAudit(){
  const body = document.getElementById('audit-body');
  body.innerHTML = `
    <div style="font-size:11px;color:var(--muted);margin-bottom:12px">Cada ação fica registrada com o hash da entrada anterior, formando uma cadeia. Editar ou apagar uma entrada no meio quebra a cadeia a partir dali. A verificação percorre toda a cadeia municipal. Registros gerais e antigos sem território aparecem em todos os recortes.</div>
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <button class="admin-btn primary" id="audit-verify">🔒 Verificar integridade</button>
      <button class="admin-btn danger" id="audit-tamper">⚠ Simular adulteração (demo)</button>
    </div>
    <div id="audit-result" style="margin-bottom:12px;font-size:12px"></div>
    <table class="admin-table"><thead><tr><th>Quando</th><th>Ator</th><th>Ação</th><th>Detalhe</th><th>Hash</th></tr></thead><tbody>
      ${auditLog.filter(e=>!selecao.size||!e.territorios?.length||e.territorios.some(noRecorte)).reverse().map(e=>`
        <tr><td style="white-space:nowrap">${new Date(e.ts).toLocaleTimeString('pt-BR')}</td><td>${escHtml(e.ator)}</td><td>${escHtml(e.acao)}</td><td>${escHtml(e.detalhe)}</td><td style="font-family:var(--mono);font-size:9.5px;color:var(--muted)">${e.hash.slice(0,10)}…</td></tr>
      `).join('') || '<tr><td colspan="5" style="color:var(--muted)">Nenhuma ação registrada ainda.</td></tr>'}
    </tbody></table>
  `;
  document.getElementById('audit-verify').onclick = async ()=>{
    const r = await verificarIntegridadeAudit();
    document.getElementById('audit-result').innerHTML = r.ok
      ? `<span style="color:var(--green)">✓ Cadeia municipal íntegra: ${auditLog.length} entradas, nenhuma adulteração detectada.</span>`
      : `<span style="color:var(--red)">✗ Adulteração detectada na entrada #${r.indice+1} — o hash não corresponde ao conteúdo.</span>`;
  };
  document.getElementById('audit-tamper').onclick = ()=>{
    if(!auditLog.length){ document.getElementById('audit-result').textContent = 'Não há entradas para adulterar ainda.'; return; }
    auditLog[0].detalhe = auditLog[0].detalhe + ' (editado depois, sem recalcular o hash)';
    try{ localStorage.setItem(AUDIT_KEY, JSON.stringify(auditLog)); }catch(e){}
    renderAudit();
  };
}

/* ---------- pagina publica de status (visao do morador, sem dados internos) ---------- */
function statusSteps(o){
  const steps = [
    { label:'Ocorrência recebida', done:true },
    ...(o.confirmado===false?[{label:'Em triagem',done:false,now:true}]:[]),
    { label:'Equipe confirmou presença na área', done: o.status!=='ativa', now: o.status==='ativa'&&o.confirmado!==false },
    { label:'Atendimento concluído', done: o.status==='resolvida', now: o.status==='em_atendimento' },
  ];
  return steps.map(s=> s.done ? {...s, cls:'done'} : s.now ? {...s, cls:'now'} : {...s, cls:'pending'});
}

function renderStatusResultado(o){
  const el = document.getElementById('status-resultado');
  if(!o){
    el.innerHTML = '<div style="color:var(--red);font-size:12.5px;margin-top:8px">Protocolo não encontrado. Confira o código recebido no WhatsApp.</div>';
    return;
  }
  const steps = statusSteps(o);
  el.innerHTML = `
    <div class="status-result-card">
      <div style="font-size:13px;font-weight:700;margin-bottom:2px">${o.icone} ${escHtml(o.tipo)}</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:14px">Zona: ${escHtml(o.bairro)} · Protocolo ${escHtml(o.protocolo)}</div>
      ${steps.map(s=>`<div class="status-step ${s.cls}"><span class="dot2"></span><span>${s.label}</span></div>`).join('')}
      ${o.status==='resolvida'
        ? `<div style="margin-top:12px;font-size:12px;color:var(--green)">✓ Atendida em ${o.tempoChegada+o.tempoAtendimento} minutos.</div>
           ${o.relatorio && o.relatorio.fotosPublicas ? `
              <div class="grid2" style="margin-top:10px">
                ${o.relatorio.fotoAtual?`<img src="${o.relatorio.fotoAtual}" alt="Situação inicial" style="width:100%;border-radius:6px">`:""}
                ${o.relatorio.fotoFinal?`<img src="${o.relatorio.fotoFinal}" alt="Situação final" style="width:100%;border-radius:6px">`:""}
              </div>` : `<div style="margin-top:8px;font-size:11px;color:var(--muted)">Não há fotos públicas neste registro.</div>`}`
        : o.tempoEstimado>0?`<div style="margin-top:12px;font-size:12px;color:var(--muted)">Tempo estimado: ${o.tempoEstimado} minutos a partir do recebimento.</div>`:'<div style="margin-top:12px;font-size:12px;color:var(--muted)">Tempo estimado ainda não informado.</div>'}
    </div>
  `;
}

document.getElementById('status-buscar').onclick = ()=>{
  const codigo = document.getElementById('status-protocolo').value.trim().toUpperCase();
  const o = ocorrencias.find(x=>x.protocolo===codigo);
  renderStatusResultado(o);
};
document.getElementById('status-protocolo').addEventListener('keydown', e=>{ if(e.key==='Enter') document.getElementById('status-buscar').click(); });
document.getElementById('status-voltar').onclick = (e)=>{ e.preventDefault(); location.hash=''; };

function applyRoute(){
  const isStatus = location.hash === '#status';
  document.getElementById('app-view').hidden = isStatus;
  document.getElementById('status-view').hidden = !isStatus;
  if(isStatus) document.getElementById('status-resultado').innerHTML = '';

}
window.addEventListener('hashchange', applyRoute);
applyRoute();

/* ---------- relatorio pos-evento analitico ---------- */
const relatorioOverlay = document.getElementById('relatorio-overlay');
document.getElementById('open-relatorio-evento').onclick = ()=>{ relatorioOverlay.hidden=false; renderRelatorioEvento(); };
document.getElementById('relatorio-close').onclick = ()=>{ relatorioOverlay.hidden=true; };
document.getElementById('relatorio-print').onclick = ()=>{ window.print(); };
relatorioOverlay.addEventListener('click', e=>{ if(e.target===relatorioOverlay) relatorioOverlay.hidden=true; });

function renderRelatorioEvento(){
  const body = document.getElementById('relatorio-body');
  const filtradas=ocorrencias.filter(ocorrenciaVisivel);
  const resolvidas=filtradas.filter(o=>o.status==='resolvida');
  const ativas=filtradas.filter(o=>o.status==='ativa'||o.status==='em_atendimento');
  const comChegada=filtradas.filter(o=>Number.isFinite(o.confirmadoEm)&&Number.isFinite(o.reportadoEm));
  const tempoResposta=comChegada.length?Math.round(comChegada.reduce((s,o)=>s+Math.max(0,o.confirmadoEm-o.reportadoEm),0)/comChegada.length/60000):null;
  const comDuracao=resolvidas.filter(o=>Number.isFinite(o.tempoReal));
  const tempoMedioGeral=comDuracao.length?Math.round(comDuracao.reduce((s,o)=>s+o.tempoReal,0)/comDuracao.length):null;

  const porZona = (selecao.size?areasSelecionadas():areas).map(b=>{
    const ocz = filtradas.filter(o=>pertence(b,o.bairro));
    const resz = ocz.filter(o=>o.status==='resolvida');
    const tempo = resz.length ? Math.round(resz.reduce((s,o)=>s+o.tempoReal,0)/resz.length) : null;
    return { zona:b.nome, total:ocz.length, resolvidas:resz.length, ativas:ocz.length-resz.length, tempo };
  });

  const rankingColab = {};
  filtradas.forEach(o=> (o.participacoes||[]).filter(p=>p.status==='concluida').forEach(p=>{rankingColab[p.voluntarioId]=(rankingColab[p.voluntarioId]||0)+1;}));
  const topColab = Object.entries(rankingColab).sort((a,c)=>c[1]-a[1]).slice(0,5).map(([id,n])=>({nome:pessoaNome(id), n}));

  let totalProntos=0, totalConf=0;
  const idsRecorte=new Set(pessoasPainel().map(p=>p.id));
  Object.values(prontidao).forEach(mapa=>{
    Object.entries(mapa).filter(([id])=>!selecao.size||idsRecorte.has(id)).forEach(([,st])=>{ totalProntos++; if(st.status==='confirmado') totalConf++; });
  });
  const pctProntidao = totalProntos ? Math.round(totalConf/totalProntos*100) : null;

  body.innerHTML = `
    <div style="font-size:11px;color:var(--muted);margin-bottom:14px">Gerado em ${new Date().toLocaleString('pt-BR')} · ${escHtml(tenantConfig.nome)} · ${escHtml(recorteLabel())} · ${escHtml(document.getElementById('filtro-evento').selectedOptions[0]?.textContent||'Todos')} · ${escHtml(filtroOcorrencias?.descricao()||'Sem filtros de ocorrência')} · evento de demonstração. Consolidado automaticamente a partir dos registros do protótipo.</div>
    <div class="rel-grid">
      <div class="rel-tile"><b>${filtradas.length}</b><span>Ocorrências totais</span></div>
      <div class="rel-tile"><b>${resolvidas.length}</b><span>Resolvidas</span></div>
      <div class="rel-tile"><b>${ativas.length}</b><span>Ainda abertas</span></div>
      <div class="rel-tile"><b>${tempoResposta===null?'—':tempoResposta+'min'}</b><span>Tempo médio até chegada</span></div><div class="rel-tile"><b>${tempoMedioGeral===null?'—':tempoMedioGeral+'min'}</b><span>Tempo médio até conclusão</span></div>
      <div class="rel-tile"><b>${pessoasPainel().filter(p=>!p.oficial).length}</b><span>Colaboradores cadastrados</span></div>
      <div class="rel-tile"><b>${pctProntidao!==null?pctProntidao+'%':'—'}</b><span>Prontidão confirmada pré-evento</span></div>
    </div>
    <h3 style="font-size:13px;margin-bottom:8px">Desempenho por zona</h3>
    <table class="rel-table"><thead><tr><th>Zona</th><th>Total</th><th>Resolvidas</th><th>Ainda abertas</th><th>Tempo médio</th></tr></thead><tbody>
      ${porZona.map(z=>`<tr><td>${escHtml(z.zona)}</td><td>${z.total}</td><td>${z.resolvidas}</td><td>${z.ativas}</td><td>${z.tempo!==null?z.tempo+'min':'—'}</td></tr>`).join('')}
    </tbody></table>
    <h3 style="font-size:13px;margin-bottom:8px">Colaboradores que mais ajudaram</h3>
    <table class="rel-table"><thead><tr><th>Nome</th><th>Participações concluídas</th></tr></thead><tbody>
      ${topColab.map(c=>`<tr><td>${escHtml(c.nome)}</td><td>${c.n}</td></tr>`).join('') || '<tr><td colspan="2" style="color:var(--muted)">As participações aparecem aqui quando a pessoa confirma o término.</td></tr>'}
    </tbody></table>
    <div style="font-size:11px;color:var(--muted);margin-top:8px">Contagens das confirmações de término nesta demonstração. O agradecimento é automático, sem nota de qualidade ou comprovação adicional.</div>
  `;
}

/* ---------- modo offline: cache do shell + fila de mensagens ---------- */
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(()=>{ /* alguns navegadores/visualizacoes bloqueiam; segue sem offline */ });
}
const OFFLINE_QUEUE_KEY = storageKey('offline');
let filaOffline = [];
try{ filaOffline = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]'); }catch(e){ filaOffline = []; }

function atualizarBannerOffline(){
  document.getElementById('offline-banner').hidden = navigator.onLine;
}
function enfileirarOffline(tipo,dados){
  const id=crypto.randomUUID();
  filaOffline.push({id,tipo,dados,ts:Date.now()});
  try{localStorage.setItem(OFFLINE_QUEUE_KEY,JSON.stringify(filaOffline));}catch(e){}
  return id;
}
function processarFilaOffline(){
  if(!filaOffline.length)return;
  filaOffline=filaOffline.filter(item=>{
    if(item.tipo!=='chat')return true;
    const id=item.dados.contatoId;
    chatHistorico[id]=chatHistorico[id]||[];
    const pendente=chatHistorico[id].find(m=>m.filaId===item.id);
    if(pendente){pendente.texto=item.dados.texto+' (reconexão simulada)';delete pendente.filaId;}
    else chatHistorico[id].push({de:'eu',texto:item.dados.texto+' (reconexão simulada)',ts:item.ts});
    return false;
  });
  try{localStorage.setItem(OFFLINE_QUEUE_KEY,JSON.stringify(filaOffline));}catch(e){}
  renderChatContacts();salvarPrototipo();
}
window.addEventListener('offline', atualizarBannerOffline);
window.addEventListener('online', ()=>{ atualizarBannerOffline(); processarFilaOffline(); });
atualizarBannerOffline();

/* ---------- controle de acesso por papel (simulado, nao e seguranca real) ---------- */
function canAdmin(){ return !!currentRole && currentRole.tipo==='admin'; }
function canActZone(zona){ return !!currentRole && (currentRole.tipo==='admin' || (currentRole.tipo==='responsavel' && currentRole.zona===zona)); }
function isViewOnly(){ return !currentRole || currentRole.tipo==='visualizacao'; }

function applyRolePermissions(){
  document.getElementById('open-audit').style.display = canAdmin() ? '' : 'none';
  document.getElementById('open-admin').style.display = isViewOnly() ? 'none' : '';
  document.getElementById('demo-new').disabled = isViewOnly();
}
function selecionarPerfilDemo(perfil) {
  currentRole = perfil && ['admin','responsavel','visualizacao'].includes(perfil.tipo)
    ? perfil : {tipo:'visualizacao'};
  applyRolePermissions();
  renderCollaborators();
  if(currentPanelOcId) {
    const o=ocorrencias.find(x=>x.id===currentPanelOcId);
    if(o)openOcorrencia(o);
  }
  if(!document.getElementById('admin-overlay').hidden){
    if(isViewOnly())document.getElementById('admin-overlay').hidden=true;
    else renderAdminBody();
  }
  if(!canAdmin())document.getElementById('audit-overlay').hidden=true;
}
if(window.AlertaSessao && window.AlertaSessaoUI){
  const servicoSessao = AlertaSessao.criar({ municipioId:tenantId });
  const sessaoAtual = servicoSessao.obterSessao();
  selecionarPerfilDemo(sessaoAtual?.conta?.perfil || {tipo:'visualizacao'});
  AlertaSessaoUI.criar({
    target:document.getElementById('session-anchor'),
    sessao:servicoSessao,
    municipio:tenantConfig.nome,
    zonas:bairros.map(b=>b.nome),
    aoMudar:atual=>selecionarPerfilDemo(atual?.conta?.perfil || {tipo:'visualizacao'})
  });
}else{
  selecionarPerfilDemo({tipo:'visualizacao'});
  const item=document.createElement('span'); item.textContent='Sessão indisponível';
  document.getElementById('session-anchor').appendChild(item);
}
applyRoute();

document.getElementById('heat-toggle').onclick = (e)=>{
  heatOn = !heatOn;
  if(heatOn){ rebuildHeat(); heatLayer.addTo(map); e.target.textContent = '🔥 Mapa de gravidade: ligado'; }
  else { map.removeLayer(heatLayer); e.target.textContent = '🔥 Mapa de gravidade: desligado'; }
};

/* ---------- fluxo simples de ajuda e WhatsApp de demonstracao ---------- */
let whatsappContexto = null;
let estadoPronto = false;
let ultimaSerializacao = null;
const PARTICIPACAO_LABEL = {convidado:'Convite enviado', no_local:'No local', concluida:'Ajuda concluída', recusada:'Não pode ir'};

function registrarEtapa(o, tipo, texto){
  o.timeline = o.timeline || [];
  o.timeline.push({tipo, texto, ts:Date.now()});
}

function enviarMensagemDemo(id, texto, o, tipo='sistema', pessoa=false){
  chatHistorico[id] = chatHistorico[id] || [];
  chatHistorico[id].push({de:pessoa?'eles':'eu', texto, ts:Date.now(), ocorrenciaId:o.id, tipo, pessoa});
}

function estadoPessoa(id){
  const participacoes = ocorrencias.flatMap(o=>o.participacoes||[]).filter(p=>p.voluntarioId===id);
  if(participacoes.some(p=>p.status==='no_local')) return 'no local';
  if(participacoes.some(p=>p.status==='convidado')) return 'convidado';
  return 'disponível';
}

function acionarAjuda(o, candidatos=voluntarios){
  if(o.atendimentoEquipe && o.atendimentoEquipe.status!=='concluida')return {ok:true,novos:[]};
  const resultado = AlertaFluxo.ativar(o, candidatos.filter(v=>v.bairro===o.bairro), ocorrencias, {
    agora:Date.now(), limite:2, distancia:(v,oc)=>map.distance(v.pos,oc.pos)
  });
  if(!o.responsavelAvisadoEm&&o.responsavel?.id!=='sem-responsavel'){
    o.responsavelAvisadoEm=Date.now();
    registrarEtapa(o,'responsavel','Responsável da região avisado automaticamente');
    enviarMensagemDemo(o.responsavel.id,`Ocorrência confirmada: ${o.tipo}, ${o.bairro}. Protocolo ${o.protocolo}. O sistema já iniciou o acionamento conforme a necessidade.`,o,'aviso_regional');
  }
  (resultado.novos||[]).forEach(id=>{
    const v=voluntarios.find(p=>p.id===id);
    if(!v) return;
    enviarMensagemDemo(id,`Olá, ${v.nome.split(' ')[0]}. Há uma ocorrência confirmada em ${o.bairro}: ${o.tipo}.\n\nLocal: ponto indicado no mapa · ${o.protocolo}.\n${o.orientacaoAjuda||""}\nResponsável: ${o.responsavel.nome}, ${o.responsavel.tel}.\n\nSe puder ajudar, confirme quando chegar. Ao terminar, é só avisar por aqui.`,o,'convite');
    registrarEtapa(o,'convite',`Convite enviado a ${v.nome}`);
  });
  if(resultado.ok && !resultado.resolvida && (resultado.encaminhamentoEspecializado || resultado.faltam>0) && !o.atendimentoEquipe){
    const especial=o.encaminhamentoEspecializado;
    o.pendenciaTecnica=true;
    o.atendimentoEquipe={id:`equipe:${o.id}`, nome:especial?.servico || 'Equipe municipal de apoio', status:'acionada'};
    enviarMensagemDemo(o.atendimentoEquipe.id,`Acionamento de demonstração: ${o.tipo}, ${o.bairro}.\nProtocolo ${o.protocolo}.\n${especial?.motivo || 'Não há voluntários disponíveis suficientes. A equipe municipal foi acionada para completar o atendimento, e o responsável regional já foi avisado.'}\n\nConfirme a chegada e o término por aqui.`,o,'encaminhamento');
    registrarEtapa(o,'encaminhamento',`${o.atendimentoEquipe.nome}: encaminhamento simulado registrado`);
  }
  AlertaFluxo.sincronizarDisponibilidade(voluntarios,ocorrencias);
  return resultado;
}

function calcularTempos(o){
  if(o.status!=='resolvida') return;
  o.resolvidoEm=o.resolvidoEm||Date.now();
  o.tempoChegada=Math.max(0,Math.round(((o.confirmadoEm||o.resolvidoEm)-o.reportadoEm)/60000));
  o.tempoAtendimento=Math.max(0,Math.round((o.resolvidoEm-(o.confirmadoEm||o.resolvidoEm))/60000));
  o.tempoReal=o.tempoChegada+o.tempoAtendimento;
}

function atualizarFluxo(){
  AlertaFluxo.sincronizarDisponibilidade(voluntarios,ocorrencias);
  voluntarios.forEach(v=>atualizarPontoAoVivo(v.id));
  ocorrencias.forEach(o=>{
    calcularTempos(o);
    if(o.marker){o.marker.setIcon(ocIcon(o.status));refreshOcTooltip(o);}
  });
  applyZoneVisibility();updateKpis();renderZoneList();rebuildHeat();renderChatContacts();
  if(currentPanelOcId){const o=ocorrencias.find(x=>x.id===currentPanelOcId);if(o)openOcorrencia(o);}
  if(chatContatoAtivo && !chatOverlay.hidden) renderChatMessages(chatContatoAtivo);
  if(!filaOverlay.hidden)renderFila();
  if(!relatorioOverlay.hidden)renderRelatorioEvento();
  salvarPrototipo();
}

function participantesDaConversa(o){
  const pessoas=(o.participacoes||[]).map(p=>{
    const v=voluntarios.find(x=>x.id===p.voluntarioId);
    return v?{id:v.id,nome:v.nome,status:p.status}:null;
  }).filter(Boolean);
  if(o.atendimentoEquipe) pessoas.push({id:o.atendimentoEquipe.id,nome:o.atendimentoEquipe.nome,status:o.atendimentoEquipe.status});
  return pessoas;
}

function abrirWhatsapp(o, pessoaId){
  const pessoas=participantesDaConversa(o);
  const pessoa=pessoas.find(p=>p.id===pessoaId)||pessoas.find(p=>p.status==='convidado'||p.status==='acionada')||pessoas[0];
  if(!pessoa)return;
  whatsappContexto={ocorrenciaId:o.id,pessoaId:pessoa.id};
  document.getElementById('whatsapp-overlay').hidden=false;
  renderWhatsapp();
}

function renderWhatsapp(){
  if(!whatsappContexto)return;
  const o=ocorrencias.find(x=>x.id===whatsappContexto.ocorrenciaId);
  if(!o)return;
  const pessoas=participantesDaConversa(o), pessoa=pessoas.find(p=>p.id===whatsappContexto.pessoaId);
  if(!pessoa)return;
  document.getElementById('wa-demo-protocolo').textContent=`${o.protocolo} · ${o.bairro}`;
  const select=document.getElementById('wa-demo-pessoa');
  select.innerHTML=pessoas.map(p=>`<option value="${escHtml(p.id)}">${escHtml(p.nome)}</option>`).join('');
  select.value=pessoa.id;
  select.onchange=()=>{whatsappContexto.pessoaId=select.value;renderWhatsapp();};
  const box=document.getElementById('wa-demo-messages');
  const mensagens=(chatHistorico[pessoa.id]||[]).filter(m=>m.ocorrenciaId===o.id);
  box.innerHTML=mensagens.map(m=>`<div class="wa-message${m.pessoa?' pessoa':''}">${escHtml(m.texto)}<time>${new Date(m.ts).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</time></div>`).join('');
  box.scrollTop=box.scrollHeight;
  const chegou=pessoa.status==='no_local', terminou=pessoa.status==='concluida';
  document.getElementById('wa-cheguei').disabled=chegou||terminou||pessoa.status==='recusada'||o.status==='resolvida';
  document.getElementById('wa-terminei').disabled=!chegou;
  document.getElementById('wa-demo-status').textContent=terminou?'Obrigado! Sua participação terminou.':chegou?'Presença registrada. Quando terminar, avise por aqui.':'Confirme ao chegar. O responsável da região já foi avisado.';
  const gps=document.getElementById('wa-localizacao');
  const individual=voluntarios.some(v=>v.id===pessoa.id);
  const compartilhando=localizacoes.get(pessoa.id)?.ocorrenciaId===o.id;
  gps.hidden=!individual||terminou||pessoa.status==='recusada'||o.status==='resolvida';
  gps.textContent=compartilhando?'Parar localização':'Ativar localização';
  gps.setAttribute('aria-pressed',String(compartilhando));
  gps.onclick=()=>{
    if(compartilhando){
      pararLocalizacao(pessoa.id);
      renderCollaborators();renderWhatsapp();
    }else iniciarLocalizacao(o,pessoa.id);
  };
  if(individual&&!chegou&&!terminou&&pessoa.status!=='recusada'&&o.status!=='resolvida'){
    document.getElementById('wa-cheguei').disabled=!checkInValido(o,pessoa.id);
    const atual=posicaoAtual(pessoa.id);
    document.getElementById('wa-demo-status').textContent=checkInValido(o,pessoa.id)
      ? 'Localização confirmada no local. Toque em Cheguei.'
      : !compartilhando?'Ative a localização deste dispositivo para fazer o check-in.'
      : !atual?'Aguardando um sinal de localização recente.'
      : `Check-in indisponível. Distância aproximada: ${Math.round(map.distance(atual.pos,o.pos))} m. Aproxime-se do ponto da ocorrência e aguarde uma posição precisa.`;
  }
  const proxima=ocorrencias.find(x=>x.id!==o.id && (x.participacoes||[]).some(p=>p.voluntarioId===pessoa.id&&p.status==='convidado'));
  const proximoBtn=document.getElementById('wa-demo-next');
  proximoBtn.hidden=!terminou||!proxima;
  if(proxima){proximoBtn.textContent=`Ver outro convite · ${proxima.bairro}`;proximoBtn.onclick=()=>abrirWhatsapp(proxima,pessoa.id);}
  document.getElementById('wa-demo-input').placeholder='Escreva Cheguei ou Terminei';
}

function iniciarLocalizacao(o,id){
  if(!navigator.geolocation){
    document.getElementById('wa-demo-status').textContent='Localização indisponível neste dispositivo.';
    return;
  }
  localizacoes.forEach((_,pessoaId)=>pararLocalizacao(pessoaId));
  const sessao={ocorrenciaId:o.id};
  localizacoes.set(id,sessao);
  const atualizar=()=>{
    atualizarPontoAoVivo(id);
    renderCollaborators();
    if(whatsappContexto?.pessoaId===id && whatsappContexto.ocorrenciaId===o.id) renderWhatsapp();
  };
  sessao.watch=navigator.geolocation.watchPosition(({coords,timestamp})=>{
    if(localizacoes.get(id)!==sessao)return;
    Object.assign(sessao,{pos:[coords.latitude,coords.longitude],precisao:coords.accuracy,ts:timestamp});
    clearTimeout(sessao.expiracao);
    sessao.expiracao=setTimeout(atualizar,Math.max(1,timestamp+VALIDADE_GPS_MS-Date.now()+1));
    atualizar();
  },erro=>{
    if(localizacoes.get(id)!==sessao)return;
    pararLocalizacao(id);
    atualizar();
    if(whatsappContexto?.pessoaId===id && whatsappContexto.ocorrenciaId===o.id){
      document.getElementById('wa-demo-status').textContent=erro.code===1?'Permissão de localização negada.':'Sinal de localização indisponível. Tente novamente.';
    }
  },{enableHighAccuracy:true,maximumAge:0,timeout:20000});
  renderWhatsapp();
}

function confirmarWhatsApp(acao){
  if(!whatsappContexto)return;
  const o=ocorrencias.find(x=>x.id===whatsappContexto.ocorrenciaId), id=whatsappContexto.pessoaId;
  if(!o)return;
  const equipe=o.atendimentoEquipe?.id===id?o.atendimentoEquipe:null;
  const pessoa=participantesDaConversa(o).find(p=>p.id===id);
  if(!pessoa)return;
  let resultado;
  if(equipe){
    if(acao==='cheguei'){
      if(equipe.status!=='acionada')return;
      equipe.status='no_local';equipe.chegouEm=Date.now();
      o.status='em_atendimento';o.confirmadoEm=o.confirmadoEm||Date.now();
    }else{
      if(equipe.status!=='no_local')return;
      equipe.status='concluida';equipe.terminouEm=Date.now();
      if(o.encaminhamentoEspecializado)o.encaminhamentoEspecializado.status='concluido';
      o.pendenciaTecnica=false;
      const pendente=(o.participacoes||[]).some(p=>p.status==='convidado'||p.status==='no_local');
      if(!pendente){o.status='resolvida';o.resolvidoEm=Date.now();}
    }
    resultado={ok:true};
  }else{
    const antes=(o.participacoes||[]).find(p=>p.voluntarioId===id)?.status;
    if(acao==='cheguei'&&antes!=='convidado')return;
    if(acao==='cheguei'&&!checkInValido(o,id)){
      document.getElementById('wa-demo-status').textContent='O check-in exige localização ativa e posição confirmada no local.';
      return;
    }
    if(acao==='terminei'&&antes!=='no_local')return;
    resultado=acao==='cheguei'?AlertaFluxo.chegar(o,id,Date.now()):AlertaFluxo.terminar(o,id,Date.now());
  }
  if(!resultado.ok){document.getElementById('wa-demo-status').textContent=resultado.motivo||'Esta confirmação já foi registrada.';return;}
  if(!equipe){
    if(acao==='cheguei') o.participacoes.find(p=>p.voluntarioId===id).checkInGPS=true;
    else pararLocalizacao(id);
  }
  enviarMensagemDemo(id,acao==='cheguei'?'Cheguei':'Terminei',o,acao,true);
  enviarMensagemDemo(id,acao==='cheguei'?'Chegada registrada. Obrigado por ajudar.':'Obrigado pela ajuda! Sua participação foi encerrada.',o,'resposta');
  registrarEtapa(o,acao,`${pessoa.nome}: ${acao==='cheguei'?'chegada confirmada':'ajuda concluída'}`);
  auditPush(pessoa.nome,acao==='cheguei'?'Chegada pelo WhatsApp simulado':'Término pelo WhatsApp simulado',o.protocolo,[o.bairro]);
  AlertaFluxo.sincronizarDisponibilidade(voluntarios,ocorrencias);
  if(acao==='terminei'&&!equipe){
    const v=voluntarios.find(x=>x.id===id);
    if(v){
      const abertas=ocorrencias.filter(x=>x.id!==o.id&&['ativa','em_atendimento'].includes(x.status)).sort((a,b)=>AlertaFluxo.prioridade(b)-AlertaFluxo.prioridade(a));
      for(const outra of abertas){
        const convite=acionarAjuda(outra,[v]);
        if((convite.novos||[]).includes(id)){
          enviarMensagemDemo(id,`Há outra ocorrência em ${outra.bairro} precisando de ajuda. Se puder continuar, veja o novo convite ${outra.protocolo}.`,o,'proximo_convite');
          break;
        }
      }
    }
  }
  atualizarFluxo();renderWhatsapp();
}

function renderAnexos(o){
  const r=o.relatorio||{};
  return `<details class="optional-report"><summary>Fotos e observações opcionais</summary><div class="report-form">
    <p class="demo-caption">Estes registros complementam o atendimento. Não são necessários para confirmar o término da ajuda.</p>
    <div class="field"><label for="foto-atual">Foto da situação inicial</label><input type="file" accept="image/*" id="foto-atual" class="file-in"></div>
    <div class="field"><label for="foto-final">Foto da situação final</label><input type="file" accept="image/*" id="foto-final" class="file-in"></div>
    <div class="field"><label for="pendencias">Observações e necessidades restantes</label><textarea id="pendencias" rows="2" class="file-in" placeholder="Opcional">${escHtml(r.pendencias||'')}</textarea></div>
    <label style="font-size:11px;display:flex;gap:7px;align-items:flex-start;margin-bottom:12px"><input type="checkbox" id="fotos-publicas"${r.fotosPublicas?' checked':''}>Mostrar as fotos no status público desta demonstração</label>
    <button class="admin-btn" id="report-submit">Salvar complemento</button><div id="report-err" class="demo-caption" role="status"></div>
    <div class="attachment-previews">${r.fotoAtual?`<img src="${r.fotoAtual}" alt="Situação inicial registrada">`:''}${r.fotoFinal?`<img src="${r.fotoFinal}" alt="Situação final registrada">`:''}</div>
  </div></details>`;
}

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
function instalarCadastroOcorrencia(){
  CadastroOcorrenciaMapa.instalar({
    tenantId,tenantConfig,areas,tiposOcorrencia,map,ocLayer,MARINGA_CENTER,
    normalizarTerritorio,pertence,canActZone,responsavelDaOcorrencia,ocIcon,
    refreshOcTooltip,salvarPrototipo,acionarAjuda,atualizarFluxo,atualizarFiltroEventos,
    openOcorrencia,fecharMenuMobile,obterOcorrencias:()=>ocorrencias,
    proximoId:()=>idCounter++,reverterId:id=>{if(idCounter===id+1)idCounter=id;},
    setEventoFiltro:id=>{if(!noEvento({eventoId:id}))eventoAtivo=id;},
    obterEventoSelecionado:()=>EventosMapa.selecionadoIndividual(eventoAtivo)
  });
}

function iniciarControlesDemo(){
  document.querySelector('.brand').innerHTML=`<span class="dot"></span>${escHtml(tenantConfig.marca)}`;
  document.querySelector('.status-brand').textContent=tenantConfig.marca;
  document.title=tenantConfig.marca;
  atualizarFiltroEventos();
  instalarCadastroOcorrencia();
  document.getElementById('whatsapp-close').onclick=()=>document.getElementById('whatsapp-overlay').hidden=true;
  document.getElementById('whatsapp-overlay').onclick=e=>{if(e.target.id==='whatsapp-overlay')e.currentTarget.hidden=true;};
  document.getElementById('wa-cheguei').onclick=()=>confirmarWhatsApp('cheguei');
  document.getElementById('wa-terminei').onclick=()=>confirmarWhatsApp('terminei');
  function enviar(){
    const input=document.getElementById('wa-demo-input');
    const texto=input.value.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[.!]/g,'');
    input.value='';
    if(['cheguei','estou no local','ja cheguei'].includes(texto))confirmarWhatsApp('cheguei');
    else if(['terminei','conclui','finalizei','ja terminei'].includes(texto))confirmarWhatsApp('terminei');
    else document.getElementById('wa-demo-status').textContent='Nesta simulação, use Cheguei ou Terminei. No sistema real, a conversa será recebida pelo WhatsApp.';
  }
  document.getElementById('wa-demo-send').onclick=enviar;
  document.getElementById('wa-demo-input').onkeydown=e=>{if(e.key==='Enter')enviar();};
  document.getElementById('mobile-menu').onclick=()=>{
    const abriu=document.getElementById('sidebar').classList.toggle('open');
    document.getElementById('menu-backdrop').classList.toggle('open',abriu);
    document.getElementById('mobile-menu').setAttribute('aria-expanded',String(abriu));
  };
  document.getElementById('menu-backdrop').onclick=fecharMenuMobile;
  document.querySelectorAll('.sidebar-actions button,.sidebar-actions a').forEach(el=>el.addEventListener('click',fecharMenuMobile));
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    fecharMenuMobile();document.querySelectorAll('.modal-overlay:not([hidden]):not(#role-overlay)').forEach(el=>{el.hidden=true;});
  });
  window.addEventListener('beforeunload',salvarPrototipo);
  window.addEventListener('pagehide',()=>localizacoes.forEach((_,id)=>pararLocalizacao(id)));
  setInterval(salvarPrototipo,5000);
}

function fecharMenuMobile(){
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('menu-backdrop').classList.remove('open');
  document.getElementById('mobile-menu').setAttribute('aria-expanded','false');
}

iniciarControlesDemo();
if(window.innerWidth<=860)document.getElementById('floatwin-min').click();
const recuperacao=OperacaoRestauracao.ler(localStorage,storageKey('operacao'),tenantId);
if(recuperacao.estado==='bloqueado'){
  const overlay=document.createElement('div');overlay.className='recuperacao-overlay';
  overlay.innerHTML='<section class="recuperacao-card" role="alertdialog" aria-modal="true" aria-labelledby="recuperacao-title"><h2 id="recuperacao-title">Seus dados foram preservados</h2><p id="recuperacao-motivo"></p><p>O mapa foi interrompido para impedir que os dados sejam substituídos. Salve uma cópia e procure suporte para recuperar o conteúdo.</p><button type="button" id="recuperacao-backup">Baixar cópia dos dados</button></section>';
  overlay.querySelector('#recuperacao-motivo').textContent=recuperacao.motivo;
  const backup=overlay.querySelector('#recuperacao-backup');backup.hidden=recuperacao.original===null;
  backup.onclick=()=>{const url=URL.createObjectURL(new Blob([recuperacao.original],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='backup-mapa-operacional.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  document.body.appendChild(overlay);(backup.hidden?overlay.querySelector('h2'):backup).focus();
  return;
}
if(recuperacao.estado==='restauravel'){restaurarPrototipo(recuperacao.dados);ultimaSerializacao=recuperacao.original;}
if(recuperacao.estado==='vazio'){
gerarVoluntarios();
for(let i=0;i<5;i++) gerarOcorrencia();
gerarOcorrencia({zona:bairros[0].nome,tipo:tiposOcorrencia[0]});

// historico de ocorrencias ja resolvidas antes da sessao atual, distribuidas entre os bairros
bairros.forEach(b=>{
  const n = Math.floor(rnd(1,3));
  for(let i=0;i<n;i++){
    const t = pick(tiposOcorrencia);
    const tChegada = Math.floor(rnd(10,35)), tAtend = Math.floor(rnd(20,70));
    const reportado = Date.now()-Math.floor(rnd(60,230))*60000;
    const numIdHist = idCounter++;
    ocorrencias.push({
      id:"oc"+numIdHist, protocolo:tenantConfig.prefixo+"-"+String(10000+numIdHist).slice(-5), tipo:t.tipo, icone:t.icone, bairro:b.nome, pos: randPointInBox(b.poly),
      gravidade: sortGravidade(t.gravBase), responsabilidade: pick(t.resp),
      reportadoEm: reportado, confirmadoEm: reportado+tChegada*60000, resolvidoEm: reportado+(tChegada+tAtend)*60000,
      status:"resolvida", tempoChegada:tChegada, tempoAtendimento:tAtend, tempoReal: tChegada+tAtend,
      responsavel: b.equipe.responsavel, voluntariosProx: [], marker:null,
    });
  }
});


}
filtroOcorrencias=FiltrosOcorrencias.montar({target:document.getElementById('filtros-ocorrencias'),
 obterDados:()=>({ocorrencias,tipos:[...tiposOcorrencia.map(x=>x.tipo),...gestao.lista('ocorrencias',tenantId).map(x=>x.nome)],
 organizacoes:['saude','emergencias','parceiros','equipes'].flatMap(modulo=>gestao.lista(modulo,tenantId).map(x=>({id:modulo+':'+x.id,nome:x.nome})))}),
 aoMudar:()=>atualizarRecorte()});
document.getElementById('fil-toggle').click();
PainelEventos.iniciar({painel:document.getElementById('eventos-painel'),barra:document.getElementById('eventos-painel-head'),
 abrir:document.getElementById('eventos-open'),fechar:document.getElementById('eventos-close'),area:document.getElementById('mapwrap'),
 aoAbrir:()=>filtroOcorrencias.atualizarOpcoes()});
setInterval(()=>{const f=filtroOcorrencias.obter();if(f.horas||f.espera)atualizarRecorte();},30000);
estadoPronto=true;
saveAdminState();
atualizarFluxo();
tickClock();
renderOfficialMarkers();
processarFilaOffline();
const buscaMapa=document.getElementById('event-search');
const resultadosMapa=document.getElementById('event-results');
const listarRecursosPublicos=()=>['bases','riscos','pontos','saude','emergencias','parceiros','abrigos']
 .flatMap(modulo=>gestao.lista(modulo,tenantId).filter(item=>item.verificacao!=='Rejeitado').map(item=>({...item,modulo})));
const layerRecursosPublicos=L.layerGroup().addTo(map);
let marcadorBusca;
function montarMarcadoresPublicos(){
 layerRecursosPublicos.clearLayers();
 const registros=listarRecursosPublicos().filter(x=>{
  if(x.lat===undefined||x.lat===null||x.lat===""||x.lng===undefined||x.lng===null||x.lng==="")return false;
  const lat=Number(x.lat),lng=Number(x.lng);
  return Number.isFinite(lat)&&Number.isFinite(lng)&&lat>=-24&&lat<=-23&&lng>=-52.5&&lng<=-51.2;
 });
 for(const r of registros){
  const doacoes=r.modulo==='bases'&&r.tipo==='Centro de coleta de donativos';
  const simbolo=doacoes?'📦':r.modulo==='riscos'?'⚠️':r.modulo==='bases'?'🏠':r.modulo==='saude'?'🏥':'📍';
  const ic=L.divIcon({className:'ponto-publico-marker',html:'<span title="'+escHtml(r.nome)+'">'+simbolo+'</span>',iconSize:[30,30],iconAnchor:[15,30]});
  const geolocalizacao=r.geo_status||'Localização cadastrada';
  const source=/^https:\/\//.test(r.url_fonte||'')?'<a href="'+escHtml(r.url_fonte)+'" target="_blank" rel="noopener">Fonte pública</a>':'';
  const route=r.endereco?'<a href="https://www.google.com/maps/search/?api=1&amp;query='+encodeURIComponent(r.endereco+', Maringá, PR')+'" target="_blank" rel="noopener">Ver endereço no mapa</a>':'';
  const observacao=doacoes?'<p><strong>Donativos:</strong> '+escHtml(r.itens_aceitos||'Confirmar antes de doar')+'</p><p>'+escHtml(r.horario||'Horário a confirmar')+'</p>':'';
  const aviso='<small>Coordenada: '+escHtml(geolocalizacao)+'. Cadastro: '+escHtml(r.verificacao||'Sem validação')+'. Confirme antes do deslocamento.</small>';
  const html='<div class="ponto-publico-popup"><strong>'+simbolo+' '+escHtml(r.nome)+'</strong><p>'+escHtml(r.endereco||r.localizacao||'')+'</p>'+observacao+aviso+'<div>'+[route,source].filter(Boolean).join(' · ')+'</div></div>';
  L.marker([Number(r.lat),Number(r.lng)],{icon:ic,title:r.nome}).bindPopup(html).addTo(layerRecursosPublicos);
 }
 return registros.length;
}

void AlertaImportacaoPublica.carregar(gestao).then(()=>{
 montarMarcadoresPublicos();
 if(buscaMapa.value.trim())buscarNoMapa();
}).catch(error=>console.warn("Centros de doações: referências indisponíveis",error));
montarMarcadoresPublicos();
function incluirTerritorio(territorio){
  if(noRecorte(territorio)) return;
  const area=areas.find(a=>a.tipoArea==='Bairro'&&pertence(a,territorio))||areas.find(a=>pertence(a,territorio));
  if(area) selectZone(area.chave);
}
function abrirRecurso(recurso){
  incluirTerritorio(recurso.bairro||recurso.zona);
  marcadorBusca?.remove();
  const pos=[Number(recurso.lat),Number(recurso.lng)];
  const localizado=recurso.lat && recurso.lng && pos.every(Number.isFinite);
  const conteudo=`<strong>${escHtml(recurso.nome)}</strong><br>${escHtml(recurso.endereco||recurso.localizacao||'')}`;
  if(localizado){
    marcadorBusca=L.marker(pos).addTo(map).bindPopup(conteudo);
    map.setView(pos,Math.max(map.getZoom(),15));
    marcadorBusca.openPopup();
  }else{
    L.popup().setLatLng(map.getCenter()).setContent(conteudo+'<br>Sem coordenadas cadastradas.').openOn(map);
  }
}
function buscarNoMapa(){
  const termos=normalizarTerritorio(buscaMapa.value).split(/\s+/).filter(Boolean);
  resultadosMapa.replaceChildren();
  resultadosMapa.hidden=!termos.length;
  buscaMapa.setAttribute('aria-expanded',String(!!termos.length));
  if(!termos.length)return;
  const grupos=[
    ['Bairros e zonas',areas.map(a=>({nome:a.nome,meta:a.tipoArea,abrir:()=>{if(!selecao.has(a.chave))selectZone(a.chave);}}))],
    ['Ocorrências',ocorrencias.map(o=>({nome:o.tipo,meta:[o.protocolo,o.bairro,o.endereco].filter(Boolean).join(' · '),territorio:o.bairro,
      abrir:()=>{if(!noEvento(o)){eventoAtivo='';atualizarFiltroEventos();atualizarRecorte();}incluirTerritorio(o.bairro);if(o.pos)map.panTo(o.pos);openOcorrencia(o);}}))],
    ['Pessoas',pessoasMunicipio().map(p=>({nome:p.nome,meta:[p.sub,p.bairroOrigem].filter(Boolean).join(' · '),territorio:p.bairroOrigem,
      abrir:()=>{incluirTerritorio(p.bairroOrigem);mostrarFicha(p.id);}}))],
    ['Unidades e pontos cadastrados',listarRecursosPublicos().map(r=>({nome:r.nome,meta:[r.tipo,r.categoria,r.endereco,r.localizacao].filter(Boolean).join(' · '),
      territorio:r.bairro||r.zona,abrir:()=>abrirRecurso(r)}))]
  ];
  for(const [titulo,registros] of grupos){
    const encontrados=registros.filter(r=>termos.every(t=>normalizarTerritorio(r.nome+' '+r.meta).includes(t)));
    if(!encontrados.length)continue;
    const secao=document.createElement('section');
    const cabecalho=document.createElement('h3');
    cabecalho.textContent=titulo;
    secao.append(cabecalho);
    encontrados.forEach(r=>{
      const botao=document.createElement('button');
      botao.type='button';
      botao.textContent=[r.nome,r.meta,r.territorio&&!noRecorte(r.territorio)?'Fora do filtro':''].filter(Boolean).join(' · ');
      botao.onclick=()=>{buscaMapa.value='';buscarNoMapa();r.abrir();};
      secao.append(botao);
    });
    resultadosMapa.append(secao);
  }
  if(!resultadosMapa.childElementCount) resultadosMapa.textContent='Nenhum resultado em Maringá.';
}
buscaMapa.addEventListener('input',buscarNoMapa);
buscaMapa.addEventListener('keydown',e=>{
  if(e.key==='Enter'){e.preventDefault();resultadosMapa.querySelector('button')?.click();}
});
document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&!resultadosMapa.hidden){buscaMapa.value='';buscarNoMapa();buscaMapa.focus();}
});
document.addEventListener('click',e=>{
  if(!e.target.closest('.event-search')&&!resultadosMapa.hidden){buscaMapa.value='';buscarNoMapa();}
});

const bairroSolicitado=new URLSearchParams(location.search).get('bairro');
if(bairroSolicitado){
  const area=areasCadastradas.find(a=>normalizarTerritorio(a.nome)===normalizarTerritorio(bairroSolicitado));
  if(area) selectZone(area.chave);
}

})();
