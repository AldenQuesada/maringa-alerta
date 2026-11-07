/* Domínio de presenca: dependências explícitas, sem estado compartilhado entre arquivos. */
(function(root){
'use strict';
function criar({db,norm,oferentes,limitesGPS}){
const geofence=(point,geometry)=>{
  if(!point||!geometry||!["Polygon","MultiPolygon"].includes(geometry.type))return false;
  const insideRing=ring=>{let hit=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])hit=!hit;
  }return hit;};
  const insidePolygon=rings=>Array.isArray(rings)&&rings.length>0&&insideRing(rings[0])&&!rings.slice(1).some(insideRing);
  return (geometry.type==="Polygon"?[geometry.coordinates]:geometry.coordinates).some(insidePolygon);
 };
function situacaoBairro(bairro) {
  const pessoas=oferentes().filter(x=>norm(x.bairro||x.zona)===norm(bairro));
  const ativos=pessoas.filter(x=>x.checkin_status==="presente"&&x.checkin_bairro&&norm(x.checkin_bairro)===norm(bairro));
  return {bairro,colaboradores:pessoas.length,ativos:ativos.length,percentual:pessoas.length?Math.round(100*ativos.length/pessoas.length):0,pessoas};
 }
function registrarCheckin({colaboradorId,bairro,lat,lng,precisao,geometry,origem="IBGE 2022"}={}) {
  const item=db.registro("voluntarios",colaboradorId);
  if(!item)throw Error("Colaborador não cadastrado nesta Prefeitura.");
   if(item.status_simulacao==="simulado")throw Error("Cadastro de demonstração não permite check-in real.");
  const origemBairro=String(item.bairro||item.zona||"").trim();
  if(!origemBairro||norm(origemBairro)!==norm(bairro))throw Error("A pessoa só pode registrar presença no bairro de cadastro.");
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||!Number.isFinite(precisao)||precisao>(root.AlertaRegrasOperacionais?.gpsPrecisaoMaxima??limitesGPS.precisaoMaximaMetros)||precisao<0)
   throw Error("GPS insuficiente para validar chegada (precisão exigida: até "+(root.AlertaRegrasOperacionais?.gpsPrecisaoMaxima??limitesGPS.precisaoMaximaMetros)+" m).");
  if(!geometry||!geofence([lng,lat],geometry))throw Error("Fora do polígono do bairro cadastrado ou malha não disponível.");
  return db.gravar("voluntarios",{...item,checkin_status:"presente",checkin_bairro:origemBairro,
   checkin_em:new Date().toISOString(),checkin_lat:lat,checkin_lng:lng,checkin_precisao:precisao,
   checkin_fonte:origem,checkin_tipo:"autodeclarado_local"},colaboradorId);
 }
function registrarSaida(colaboradorId) {
  const item=db.registro("voluntarios",colaboradorId);
  if(!item||item.checkin_status!=="presente")throw Error("Não há chegada ativa para este colaborador.");
  return db.gravar("voluntarios",{...item,checkin_status:"finalizado",...(!root.AlertaNuvem?.ativo?{checkout_em:new Date().toISOString()}: {})},colaboradorId);
 }
return {geofence,situacaoBairro,registrarCheckin,registrarSaida};
}
root.AlertaCrisePresenca={criar};
})(globalThis);
