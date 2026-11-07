/* Cadastro territorial, referências e recorte com contexto municipal explícito. */
(function(root){
'use strict';
async function criar({db,municipio,config,bairros=[],conectado=false,adaptadores=root}){
const normalizarTerritorio = texto => String(texto || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const areasCadastradas = ['zonas','bairros'].flatMap(tipo =>
  db.lista(tipo,municipio.id).filter(area=>area.verificacao!=='Rejeitado')
    .map(area=>({...area,chave:tipo+':'+area.id,tipoArea:tipo==='zonas'?'Zona':'Bairro'}))
);
const adaptador=adaptadores[config.referencias(municipio).catalogoBairros];
const fontesPublicas=!conectado&&adaptador?await adaptador.carregar().catch(()=>null):null;
const chaveZona = nome => {const match=normalizarTerritorio(nome).match(/^zona\s*0*(\d+)$/);return match ? String(Number(match[1])) : '';};
for(const [grupo,tipoArea] of (conectado?[]:[[fontesPublicas?.zonasNumeradas,'Zona'],[fontesPublicas?.bairros,'Bairro'],[fontesPublicas?.zonas,'Zona cartográfica']])){
  grupo?.features.forEach(feature=>{
    const {id,nome}=feature.properties;
    const existente=areasCadastradas.find(area=>area.tipoArea===tipoArea && (normalizarTerritorio(area.nome)===normalizarTerritorio(nome) || (tipoArea==='Zona' && chaveZona(nome) && chaveZona(area.nome)===chaveZona(nome))));
    if(existente){if(!existente.geojson){existente.geojson=feature.geometry;existente.fonte=grupo.source;}return;}
    areasCadastradas.push({id,nome,tipoArea,chave:'publico:'+tipoArea+':'+(id||nome),geojson:feature.geometry,fonte:grupo.source});
  });
}
const areas = [...areasCadastradas,...(bairros.length?bairros.map(b=>({
  nome:b.nome,chave:'demo:'+b.nome,tipoArea:'Zona demonstrativa',demo:b
})):[])];
const selecao = new Set();
const areasPorChave=new Map(areas.map(area=>[area.chave,area]));
const areasSelecionadas=()=>[...selecao].map(chave=>areasPorChave.get(chave)).filter(Boolean);
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

return {normalizarTerritorio,areasCadastradas,areas,selecao,areasSelecionadas,pertence,noRecorte,recorteLabel};
}
root.AlertaEventoTerritorio={criar};
})(globalThis);
