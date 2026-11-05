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
const areas = [...areasCadastradas,...(demoMode?bairros.map(b=>({
  nome:b.nome,chave:'demo:'+b.nome,tipoArea:'Zona demonstrativa',demo:b
})):[])];
const camadasVisiveis={Zona:true,Bairro:true,'Zona cartográfica':false,'Zona demonstrativa':demoMode};
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

