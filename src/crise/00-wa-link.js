/* Maringá Unida · Núcleo da simulação de assistência pós-evento.
   Não envia mensagens nem substitui autenticação, banco, reservas ou APIs oficiais.
   Reaproveita as coleções locais da Gestão; não modifica o mapa de eventos. */
(function(root,factory) {
  const api=factory(root);
  if(typeof module==="object"&&module.exports)module.exports=api;
  root.MaringaCrise=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(root) {
"use strict";
const ZONAS_MARINGA=[
 {nome:"Zona 7",lat:-23.3995,lng:-51.9395},
 {nome:"Jardim Alvorada",lat:-23.387,lng:-51.912},
 {nome:"Conjunto Requião",lat:-23.436,lng:-51.956},
 {nome:"Jardim Universo",lat:-23.443,lng:-51.923},
 {nome:"Vila Esperança",lat:-23.382,lng:-51.951},
 {nome:"Centro Cívico",lat:-23.4225,lng:-51.9365}
];
const COMPATIBILIDADE={
 "Alimentação":["FORNECER ALIMENTAÇÃO"],
 "Telhas e cobertura":["PEDREIRO","CARPINTEIRO","MATERIAL DE CONSTRUÇÃO","CAMIONETE","CAMINHÃO BASCULANTE"],
 "Apoio financeiro":[],
 "Abrigo e moradia":[],
 "Roupas e cobertores":[],
 "Medicamentos e saúde":[],
 "Limpeza e remoção":["LIMPEZA","PÁ CARREGADEIRA","RETROESCAVADEIRA","BOBCAT","MOTOSSERRA COM OPERADOR"],
 "Material de construção":["MATERIAL DE CONSTRUÇÃO","PEDREIRO","CARPINTEIRO"],
 "Eletricidade e gerador":["ELETRICISTA","GERADOR"],
 "Água potável":[],
 "Transporte":["CAMIONETE","CAMINHÃO BASCULANTE","CAMINHÃO GARRA"],
 "Cuidados especiais":["CUIDADOR","ATENDER PESSOAS COM NECESSIDADES ESPECIAIS"],
 "Laudos de prejuízos":["LAUDO","EMITIR LAUDOS DE PREJUÍZOS"],
 "Apoio a empreendedores":["ESPAÇO EM FREEZER PARA PERECÍVEIS","AMBIENTE DE TRABALHO"],
 "Outro":[]
};
const LIMITE_MENSAGEM=2500;
const norm=x=>String(x??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const telefone=x=>String(x??"").replace(/\D/g,"");
const mesmoTelefone=(a,b)=>{const x=telefone(a),y=telefone(b);return x&&y&&(x===y||x.length>=10&&y.length>=10&&x.slice(-11)===y.slice(-11));};
const resumoPonto=(x,c=0)=>({lat:Number(x.lat),lng:Number(x.lng),label:x.nome});
function waLink(numero,mensagem) {
 const n=telefone(numero);
 if(n.length<10||n.length>13)return null;
 const full=n.startsWith("55")?n:"55"+n;
 return "https://wa.me/"+full+"?text="+encodeURIComponent(String(mensagem||"").slice(0,LIMITE_MENSAGEM));
}
function criar({armazenamento=root.localStorage,municipioId=null,escopoMunicipal=false}={}) {
 const D=root.AlertaGestaoDados;
 if(!D)throw Error("Carregue gestao/dados.js primeiro.");
 const db=D.criar(armazenamento,escopoMunicipal&&municipioId?{municipioId}:{});
 if(municipioId&&db.municipioAtivo()?.id!==municipioId&&!escopoMunicipal)db.selecionarMunicipio(municipioId);
 const prefeitura=()=>db.municipioAtivo();
 function zonas() {
  const locais=db.lista("zonas").map(x=>x.nome).filter(Boolean);
  const base=prefeitura()?.id==="maringa"?ZONAS_MARINGA.map(x=>x.nome):[];
  return [...new Set([...base,...locais])].sort((a,b)=>a.localeCompare(b,"pt-BR"));
 }
 function pontoDaZona(nome) {
  const z=ZONAS_MARINGA.find(z=>norm(z.nome)===norm(nome));
  if(prefeitura()?.id==="maringa"&&z)return resumoPonto(z);
  const p=prefeitura();
  return p?.lat!==undefined&&p?.lng!==undefined?{lat:Number(p.lat),lng:Number(p.lng),label:p.nome}:null;
 }
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
  const origemBairro=String(item.bairro||item.zona||"").trim();
  if(!origemBairro||norm(origemBairro)!==norm(bairro))throw Error("A pessoa só pode registrar presença no bairro de cadastro.");
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||!Number.isFinite(precisao)||precisao>100||precisao<0)
   throw Error("GPS insuficiente para validar chegada (precisão exigida: até 100 m).");
  if(!geometry||!geofence([lng,lat],geometry))throw Error("Fora do polígono do bairro cadastrado ou malha não disponível.");
  return db.gravar("voluntarios",{...item,checkin_status:"presente",checkin_bairro:origemBairro,
   checkin_em:new Date().toISOString(),checkin_lat:lat,checkin_lng:lng,checkin_precisao:precisao,
   checkin_fonte:origem,checkin_tipo:"autodeclarado_local"},colaboradorId);
 }
