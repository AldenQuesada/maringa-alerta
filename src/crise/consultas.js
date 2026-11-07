/* Domínio de consultas: dependências explícitas, sem estado compartilhado entre arquivos. */
(function(root){
'use strict';
function criar({db,norm,mesmoTelefone}){
const prefeitura=()=>db.municipioAtivo();
function zonas() {
  return [...new Set(db.lista("zonas").map(x=>x.nome).filter(Boolean))]
   .sort((a,b)=>a.localeCompare(b,"pt-BR",{numeric:true}));
 }
function pontoDaZona(nome) {
  const zona=db.lista("zonas").find(z=>norm(z.nome)===norm(nome));
  if(!zona)return null;
  const lat=Number(zona.lat),lng=Number(zona.lng);
  if(zona.lat!==""&&zona.lng!==""&&zona.lat!=null&&zona.lng!=null&&Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180)
   return {lat,lng,label:zona.nome};
  if(!zona.geojson)return null;
  try {
   const geo=typeof zona.geojson==="string"?JSON.parse(zona.geojson):zona.geojson;
   const pontos=[];
   const walk=c=>{if(Array.isArray(c)&&typeof c[0]==="number"&&typeof c[1]==="number")pontos.push(c);else if(Array.isArray(c))c.forEach(walk);};
   walk(geo.coordinates||geo.geometry?.coordinates||[]);
   if(!pontos.length)return null;
   const west=Math.min(...pontos.map(p=>p[0])),east=Math.max(...pontos.map(p=>p[0]));
   const south=Math.min(...pontos.map(p=>p[1])),north=Math.max(...pontos.map(p=>p[1]));
   if(![west,east,south,north].every(Number.isFinite))return null;
   return {lat:(south+north)/2,lng:(west+east)/2,label:zona.nome};
  }catch(_){return null}
 }
function oferentes() {return db.lista("voluntarios");}
function pedidos(){return db.lista("solicitacoes");}
function mobilizacoes(){return db.lista("mobilizacoes");}
function apoios(){return db.lista("apoios");}
function encontrarPessoa(tel) {return oferentes().find(x=>mesmoTelefone(x.telefone,tel))||null;}
function encontrarIdentidade(tel){
  return encontrarPessoa(tel)||pedidos().find(x=>mesmoTelefone(x.telefone,tel))||null;
 }
return {prefeitura,zonas,pontoDaZona,oferentes,pedidos,mobilizacoes,apoios,encontrarPessoa,encontrarIdentidade};
}
root.AlertaCriseConsultas={criar};
})(globalThis);
