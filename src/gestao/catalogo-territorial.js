/* Consulta territorial por prefeitura; cache isolado por município e fonte. */
(function(root){
'use strict';
function criar({obterBanco,config,fetch,adaptadores=root}){
 const cache=new Map();
 function consultar(chave,executar){
  if(!cache.has(chave))cache.set(chave,Promise.resolve().then(executar).catch(()=>{cache.delete(chave);return null;}));
  return cache.get(chave);
 }
 function zonasOficiais(){
  const db=obterBanco(),p=db.municipioAtivo();
  if(db.tipo==='supabase')return Promise.resolve(db.lista('zonas'));
  if(!/^\d{7}$/.test(String(p?.codigo_ibge||'')))return Promise.resolve([]);
  return consultar('zonas:'+p.id+':'+p.codigo_ibge,async()=>{
   const url='https://servicodados.ibge.gov.br/api/v1/localidades/municipios/'+encodeURIComponent(p.codigo_ibge)+'/subdistritos';
   const response=await fetch(url,{cache:'force-cache'});
   if(!response.ok)throw Error('Consulta IBGE indisponível');
   const rows=await response.json();
   if(!Array.isArray(rows))throw Error('Resposta territorial inválida');
   return rows.filter(x=>/^zona\s*0*\d+$/i.test(String(x.nome||'').trim())).map(x=>({nome:'Zona '+Number(String(x.nome).match(/\d+/)[0]),codigo:String(x.id),externalId:'ibge-subdistrito:'+x.id,fonte:'IBGE · Subdistritos',verificacao:'Pendente'})).sort((a,b)=>Number(a.nome.match(/\d+/)[0])-Number(b.nome.match(/\d+/)[0]));
  });
 }
 function bairrosOficiais(){
  const db=obterBanco(),p=db.municipioAtivo();
  if(db.tipo==='supabase')return Promise.resolve(db.lista('bairros'));
  const nome=config.referencias(p).catalogoBairros,adaptador=adaptadores[nome];
  if(!adaptador)return Promise.resolve([]);
  return consultar('bairros:'+p.id+':'+p.codigo_ibge+':'+nome,async()=>{
   const data=await adaptador.carregar();
   return data.bairros.features.map(f=>({nome:String(f.properties?.nome||'').trim(),codigo:String(f.properties?.codigo_bairro||f.properties?.codigo||''),externalId:String(f.id||f.properties?.id||''),fonte:data.bairros.source,geojson:JSON.stringify(f.geometry),verificacao:'Pendente'})).filter(x=>x.nome);
  });
 }
 return {zonasOficiais,bairrosOficiais};
}
root.AlertaCatalogoTerritorial={criar};
})(globalThis);
